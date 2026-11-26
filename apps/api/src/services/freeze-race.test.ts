import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computeBalances, proposeTransfers } from "@babki/shared";
import type { ServiceContext } from "../context";
import * as expenses from "../data/expenses";
import * as members from "../data/members";
import { addCarpathiansExpenses, createTrip, type Trip } from "../test/carpathians";
import { createTestDb, type TestDb } from "../test/db";
import * as expenseService from "./expense.service";
import { loadSettlement } from "./settlement.service";

// NFR-08 / ADR-0006: an expense edit and the first "reported paid" arriving together must not
// both succeed. EP-15 … EP-20 are not built yet, so the mark is played by `firstMark` below: the
// transaction ADR-0006 prescribes (compute the list from the stored expenses → save every transfer
// as Open → move one to Reported paid). When EP-15 exists, replace it with the real service call.
let db: TestDb;
let trip: Trip;
const ctx = (): ServiceContext => ({ prisma: db.prisma });

beforeEach(async () => {
  db = createTestDb();
  trip = await createTrip(ctx());
  await addCarpathiansExpenses(ctx(), trip);
});
afterEach(async () => {
  await db.cleanup();
});

async function firstMark(): Promise<"marked" | "already"> {
  return db.prisma.$transaction(async (tx) => {
    if ((await tx.transfer.count({ where: { ledgerId: trip.ledgerId } })) > 0) return "already";
    const order = (await members.listMembersByLedger(tx, trip.ledgerId)).map((m) => m.id);
    const rows = await expenses.listExpensesByLedger(tx, trip.ledgerId);
    const list = proposeTransfers(
      computeBalances(
        order,
        rows.map((e) => ({ title: e.title, amountKopecks: e.amountKopecks, payerId: e.payerId, shares: e.shares })),
      ),
    );
    for (const [i, t] of list.entries()) {
      await tx.transfer.create({
        data: {
          ledgerId: trip.ledgerId,
          fromMemberId: t.fromMemberId,
          toMemberId: t.toMemberId,
          amountKopecks: BigInt(t.amountKopecks),
          ...(i === 0 ? { state: "REPORTED_PAID" as const, reportedVia: "COORDINATOR" as const, reportedAt: new Date() } : {}),
        },
      });
    }
    return "marked";
  });
}

const groceriesId = async () =>
  (await db.prisma.expense.findFirstOrThrow({ where: { ledgerId: trip.ledgerId, title: "Groceries" } })).id;

const edit = async (expenseId: string) =>
  expenseService.editExpense(ctx(), {
    accountId: trip.accountId,
    ledgerId: trip.ledgerId,
    expenseId,
    body: {
      title: "Groceries",
      amountKopecks: 200_000,
      payerId: trip.max,
      split: { mode: "EQUAL", participantIds: [trip.olia, trip.max, trip.iryna, trip.andrii] },
    },
  });

describe("An expense edit and the first mark at the same time (NFR-08, BR-36)", () => {
  it("an edit and the first mark are serialised: the saved list always matches the expenses, over 25 rounds", async () => {
    let editWon = 0;
    let markWon = 0;
    for (let round = 0; round < 25; round++) {
      await db.prisma.transfer.deleteMany({ where: { ledgerId: trip.ledgerId } });
      const id = await groceriesId();
      await db.prisma.expense.update({ where: { id }, data: { amountKopecks: 185_050 } });
      await db.prisma.share.deleteMany({ where: { expenseId: id } });
      await db.prisma.share.createMany({
        data: [
          [trip.olia, 46_263],
          [trip.max, 46_263],
          [trip.iryna, 46_262],
          [trip.andrii, 46_262],
        ].map(([memberId, amountKopecks]) => ({ expenseId: id, memberId: memberId as string, amountKopecks: amountKopecks as number })),
      });

      const [editResult, markResult] = await Promise.allSettled([edit(id), firstMark()]);
      const editOk = editResult.status === "fulfilled";
      const markOk = markResult.status === "fulfilled" && markResult.value === "marked";

      // The two are serialised. Either the edit ran first (both succeed and the list was computed
      // from the edited expense) or the mark ran first (the edit is refused with 409).
      expect(markOk, `round ${round}: mark ${markResult.status}`).toBe(true);
      if (editOk) editWon++;
      else {
        markWon++;
        expect(editResult.status === "rejected" ? editResult.reason : null, `round ${round}`).toMatchObject({ code: "SETTLEMENT_STARTED" });
      }

      // The saved list is exactly the list of the expenses as they now are: never a stale one.
      const state = await loadSettlement(db.prisma, await db.prisma.ledger.findUniqueOrThrow({ where: { id: trip.ledgerId } }));
      expect(state.source).toBe("SAVED");
      const fresh = proposeTransfers(state.balances).map((t) => [t.fromMemberId, t.toMemberId, t.amountKopecks]);
      const shown = state.transfers.map((t) => [t.fromMemberId, t.toMemberId, t.amountKopecks]);
      expect(shown, `round ${round} (edit ${editOk ? "first" : "refused"})`).toEqual(fresh);
      const stored = await db.prisma.expense.findUniqueOrThrow({ where: { id } });
      expect(stored.amountKopecks).toBe(editOk ? 200_000 : 185_050);
    }
    expect(editWon + markWon).toBe(25);
  });

  it("after the mark has won, every later edit and add is refused and changes nothing", async () => {
    expect(await firstMark()).toBe("marked");
    const id = await groceriesId();
    const before = await db.prisma.expense.findUniqueOrThrow({ where: { id }, include: { shares: true } });

    await expect(edit(id)).rejects.toMatchObject({ code: "SETTLEMENT_STARTED" });
    await expect(
      expenseService.addExpense(ctx(), {
        accountId: trip.accountId,
        ledgerId: trip.ledgerId,
        body: { title: "Late", amountKopecks: 100, payerId: trip.olia, split: { mode: "EQUAL", participantIds: [trip.olia] } },
      }),
    ).rejects.toMatchObject({ code: "SETTLEMENT_STARTED" });

    const after = await db.prisma.expense.findUniqueOrThrow({ where: { id }, include: { shares: true } });
    expect(after).toEqual(before);
    expect(await db.prisma.expense.count({ where: { ledgerId: trip.ledgerId } })).toBe(4);
  });

  it("a second mark after the first changes nothing (the saved list is never recalculated, A-06)", async () => {
    await firstMark();
    const first = await db.prisma.transfer.findMany({ where: { ledgerId: trip.ledgerId }, orderBy: { id: "asc" } });
    expect(await firstMark()).toBe("already");
    expect(await db.prisma.transfer.findMany({ where: { ledgerId: trip.ledgerId }, orderBy: { id: "asc" } })).toEqual(first);
  });
});
