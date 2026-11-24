import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CreateExpenseBody } from "@babki/shared";
import type { ServiceContext } from "../context";
import { AppError } from "../errors";
import { addCarpathiansExpenses, createTrip, startSettlement, type Trip } from "../test/carpathians";
import { createTestDb, type TestDb } from "../test/db";
import * as expenseService from "./expense.service";
import * as settlementService from "./settlement.service";

let db: TestDb;
let trip: Trip;
const ctx = (): ServiceContext => ({ prisma: db.prisma });

beforeEach(async () => {
  db = createTestDb();
  trip = await createTrip(ctx());
});
afterEach(async () => {
  await db.cleanup();
});

async function expectError(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error("expected an AppError to be thrown");
}

const add = (body: CreateExpenseBody, ledgerId = trip.ledgerId, accountId = trip.accountId) =>
  expenseService.addExpense(ctx(), { accountId, ledgerId, body });

const edit = (expenseId: string, body: CreateExpenseBody) =>
  expenseService.editExpense(ctx(), { accountId: trip.accountId, ledgerId: trip.ledgerId, expenseId, body });

const settlement = () => settlementService.getSettlement(ctx(), { accountId: trip.accountId, ledgerId: trip.ledgerId });

const balances = async () =>
  Object.fromEntries((await settlement()).balances.map((b) => [b.memberId, b.balanceKopecks]));

const lunch = (amountKopecks: number, payerId: string): CreateExpenseBody => ({
  title: "Lunch",
  amountKopecks,
  payerId,
  split: { mode: "EQUAL", participantIds: [trip.olia, trip.max] },
});

describe("ExpenseService: add (US-016 … US-021)", () => {
  it("Coordinator records a purchase they paid for", async () => {
    const all = [trip.olia, trip.max, trip.iryna, trip.andrii];
    const { expense, created } = await add({
      title: "House rent",
      amountKopecks: 600_000,
      payerId: trip.olia,
      split: { mode: "EQUAL", participantIds: all },
    });
    expect(created).toBe(true);
    expect(expense.splitMode).toBe("EQUAL");
    expect(expense.shares.map((s) => s.amountKopecks)).toEqual([150_000, 150_000, 150_000, 150_000]);
    expect(await balances()).toEqual({
      [trip.olia]: 450_000,
      [trip.max]: -150_000,
      [trip.iryna]: -150_000,
      [trip.andrii]: -150_000,
    });
  });

  it("A friend paid but does not share the expense", async () => {
    await add({
      title: "Tickets",
      amountKopecks: 10_000,
      payerId: trip.max,
      split: { mode: "EQUAL", participantIds: [trip.olia, trip.iryna] },
    });
    expect(await balances()).toEqual({ [trip.olia]: -5000, [trip.max]: 10_000, [trip.iryna]: -5000, [trip.andrii]: 0 });
  });

  it("A payer who is not in the ledger is refused", async () => {
    const petro = await createTrip(ctx(), "petro@example.com");
    const error = await expectError(add(lunch(10_000, petro.olia)));
    expect(error.code).toBe("MEMBER_NOT_IN_LEDGER");
    expect(error.details?.[0]?.field).toBe("payerId");
    expect((await expenseService.listExpenses(ctx(), { accountId: trip.accountId, ledgerId: trip.ledgerId })).expenses).toEqual([]);
  });

  it("A person outside the ledger cannot be a participant", async () => {
    const petro = await createTrip(ctx(), "petro@example.com");
    const error = await expectError(
      add({ title: "Bus", amountKopecks: 10_000, payerId: trip.olia, split: { mode: "EQUAL", participantIds: [trip.max, petro.olia] } }),
    );
    expect(error.code).toBe("MEMBER_NOT_IN_LEDGER");
    expect(error.details?.[0]?.field).toBe("split.participantIds[1]");
  });

  it("An amount too small is refused", async () => {
    const error = await expectError(
      add({ title: "Gum", amountKopecks: 2, payerId: trip.olia, split: { mode: "EQUAL", participantIds: [trip.olia, trip.max, trip.iryna] } }),
    );
    expect(error.code).toBe("AMOUNT_TOO_SMALL");
    expect(error.params).toEqual({ participantCount: 3 });
  });

  it("Amounts that do not add up are refused with the difference", async () => {
    const error = await expectError(
      add({
        title: "Funicular",
        amountKopecks: 90_000,
        payerId: trip.andrii,
        split: {
          mode: "AMOUNTS",
          shares: [
            { memberId: trip.olia, amountKopecks: 25_000 },
            { memberId: trip.max, amountKopecks: 25_000 },
            { memberId: trip.iryna, amountKopecks: 25_000 },
            { memberId: trip.andrii, amountKopecks: 14_999 },
          ],
        },
      }),
    );
    expect(error.code).toBe("SHARES_SUM_MISMATCH");
    expect(error.params).toEqual({ differenceKopecks: 1 });
  });

  it("Percentages that do not add up to 100 are refused", async () => {
    const error = await expectError(
      add({
        title: "Cabin",
        amountKopecks: 9000,
        payerId: trip.olia,
        split: {
          mode: "PERCENTAGES",
          shares: [
            { memberId: trip.olia, percentBp: 5000 },
            { memberId: trip.max, percentBp: 3000 },
            { memberId: trip.iryna, percentBp: 1000 },
          ],
        },
      }),
    );
    expect(error.code).toBe("PERCENT_SUM_MISMATCH");
    expect(error.params).toEqual({ differenceBp: 1000 });
  });

  it("A cost is split 50 / 30 / 20 and the entered percentages are kept (G-14)", async () => {
    const { expense } = await add({
      title: "Cabin",
      amountKopecks: 100_000,
      payerId: trip.olia,
      split: {
        mode: "PERCENTAGES",
        shares: [
          { memberId: trip.iryna, percentBp: 2000 },
          { memberId: trip.olia, percentBp: 5000 },
          { memberId: trip.max, percentBp: 3000 },
        ],
      },
    });
    expect(expense.shares).toEqual([
      { memberId: trip.olia, amountKopecks: 50_000, percentBp: 5000 },
      { memberId: trip.max, amountKopecks: 30_000, percentBp: 3000 },
      { memberId: trip.iryna, amountKopecks: 20_000, percentBp: 2000 },
    ]);
  });

  it("a repeated submission with the same clientRequestId returns the saved expense, no duplicate (CD-11)", async () => {
    const body = { ...lunch(10_000, trip.olia), clientRequestId: "b3d1c7e2-5a0f-4c1e-9a55-0f6e2d7c1a10" };
    const first = await add(body);
    const again = await add(body);
    expect(again.created).toBe(false);
    expect(again.expense.id).toBe(first.expense.id);
    expect((await expenseService.listExpenses(ctx(), { accountId: trip.accountId, ledgerId: trip.ledgerId })).expenses).toHaveLength(1);
  });

  it("another Coordinator's ledger reads as not found", async () => {
    const other = await createTrip(ctx(), "ivan@example.com");
    const error = await expectError(add(lunch(10_000, trip.olia), trip.ledgerId, other.accountId));
    expect(error.code).toBe("LEDGER_NOT_FOUND");
  });

  it("lists expenses in creation order", async () => {
    await addCarpathiansExpenses(ctx(), trip);
    const { expenses } = await expenseService.listExpenses(ctx(), { accountId: trip.accountId, ledgerId: trip.ledgerId });
    expect(expenses.map((e) => e.title)).toEqual(["House rent", "Groceries", "Taxi", "Funicular"]);
  });
});

describe("ExpenseService: edit (US-031, US-048)", () => {
  it("The amount is corrected", async () => {
    const { expense } = await add(lunch(10_000, trip.olia));
    const edited = await edit(expense.id, lunch(12_000, trip.olia));
    expect(edited.expense.id).toBe(expense.id);
    expect(edited.expense.shares.map((s) => s.amountKopecks)).toEqual([6000, 6000]);
    expect(await balances()).toMatchObject({ [trip.olia]: 6000, [trip.max]: -6000 });
    expect((await expenseService.listExpenses(ctx(), { accountId: trip.accountId, ledgerId: trip.ledgerId })).expenses).toHaveLength(1);
  });

  it("The payer is corrected", async () => {
    const { expense } = await add(lunch(10_000, trip.olia));
    await edit(expense.id, lunch(10_000, trip.max));
    expect(await balances()).toMatchObject({ [trip.olia]: -5000, [trip.max]: 5000 });
  });

  it("Correcting an amount updates the transfers at once", async () => {
    const groceries = (amountKopecks: number): CreateExpenseBody => ({
      title: "Groceries",
      amountKopecks,
      payerId: trip.olia,
      split: { mode: "EQUAL", participantIds: [trip.olia, trip.max, trip.iryna] },
    });
    const { expense } = await add(groceries(30_000));
    expect((await settlement()).transfers.map((t) => t.amountKopecks)).toEqual([10_000, 10_000]);
    await edit(expense.id, groceries(15_000));
    expect((await settlement()).transfers.map((t) => t.amountKopecks)).toEqual([5000, 5000]);
  });

  it("A refused edit does not change the list", async () => {
    const { expense } = await add(lunch(10_000, trip.olia));
    const before = await settlement();
    const error = await expectError(
      edit(expense.id, { ...lunch(10_000, trip.olia), split: { mode: "EQUAL", participantIds: [trip.olia, "mem_petro"] } }),
    );
    expect(error.code).toBe("MEMBER_NOT_IN_LEDGER");
    expect(await settlement()).toEqual(before);
  });

  it("an unknown expense, or one of another ledger, is not found", async () => {
    expect((await expectError(edit("exp_missing", lunch(100, trip.olia)))).code).toBe("EXPENSE_NOT_FOUND");
    const other = await createTrip(ctx(), "ivan@example.com");
    const foreign = await expenseService.addExpense(ctx(), {
      accountId: other.accountId,
      ledgerId: other.ledgerId,
      body: { title: "X", amountKopecks: 100, payerId: other.olia, split: { mode: "EQUAL", participantIds: [other.olia] } },
    });
    expect((await expectError(edit(foreign.expense.id, lunch(100, trip.olia)))).code).toBe("EXPENSE_NOT_FOUND");
  });
});

describe("Freeze and close (BR-36, BR-44)", () => {
  it("no expense can be added or edited after the first reported payment", async () => {
    const { expense } = await add(lunch(10_000, trip.olia));
    await startSettlement(ctx(), trip);
    expect((await expectError(add(lunch(5000, trip.olia)))).code).toBe("SETTLEMENT_STARTED");
    expect((await expectError(edit(expense.id, lunch(5000, trip.olia)))).code).toBe("SETTLEMENT_STARTED");
  });

  it("a repeat of an already saved submission still answers with the expense after the freeze (CD-11)", async () => {
    const body = { ...lunch(10_000, trip.olia), clientRequestId: "retry-1" };
    const first = await add(body);
    await startSettlement(ctx(), trip);
    const again = await add(body);
    expect(again).toEqual({ expense: first.expense, created: false });
  });

  it("no expense can be added or edited on a closed ledger", async () => {
    const { expense } = await add(lunch(10_000, trip.olia));
    await db.prisma.ledger.update({ where: { id: trip.ledgerId }, data: { closedAt: new Date() } });
    expect((await expectError(add(lunch(5000, trip.olia)))).code).toBe("LEDGER_CLOSED");
    expect((await expectError(edit(expense.id, lunch(5000, trip.olia)))).code).toBe("LEDGER_CLOSED");
  });
});

describe("SettlementService (US-044, EP-14)", () => {
  it("Proposed transfers for the Carpathians trip", async () => {
    await addCarpathiansExpenses(ctx(), trip);
    expect(await settlement()).toEqual({
      source: "PROPOSED",
      ledgerState: "ACTIVE",
      fullySettled: false,
      balances: [
        { memberId: trip.olia, balanceKopecks: 364_737 },
        { memberId: trip.max, balanceKopecks: -36_213 },
        { memberId: trip.iryna, balanceKopecks: -193_262 },
        { memberId: trip.andrii, balanceKopecks: -135_262 },
      ],
      transfers: [trip.max, trip.iryna, trip.andrii].map((from, i) => ({
        id: null,
        fromMemberId: from,
        toMemberId: trip.olia,
        amountKopecks: [36_213, 193_262, 135_262][i],
        state: "OPEN",
        reportedVia: null,
        reportedAt: null,
        confirmedVia: null,
        confirmedAt: null,
      })),
    });
  });

  it("an empty ledger needs no transfers", async () => {
    const result = await settlement();
    expect(result.transfers).toEqual([]);
    expect(result.balances.every((b) => b.balanceKopecks === 0)).toBe(true);
  });

  it("after the first mark the saved transfers are read, not recalculated", async () => {
    await addCarpathiansExpenses(ctx(), trip);
    await startSettlement(ctx(), trip);
    const result = await settlement();
    expect(result.source).toBe("SAVED");
    expect(result.ledgerState).toBe("SETTLING");
    expect(result.transfers).toHaveLength(1);
    expect(result.transfers[0]).toMatchObject({ fromMemberId: trip.max, amountKopecks: 36_213, state: "REPORTED_PAID" });
    expect(typeof result.transfers[0]?.id).toBe("string");
  });
});
