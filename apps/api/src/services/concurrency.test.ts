import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ServiceContext } from "../context";
import { createTrip, type Trip } from "../test/carpathians";
import { createTestDb, type TestDb } from "../test/db";
import * as authService from "./auth.service";
import * as expenseService from "./expense.service";
import * as memberService from "./member.service";

// Parallel requests (NFR-08, BR-34, contracts CD-11): a double click or two devices must never
// create duplicates or break a uniqueness rule.
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

const body = (clientRequestId?: string) => ({
  title: "Taxi",
  amountKopecks: 42_000,
  payerId: trip.olia,
  split: { mode: "EQUAL" as const, participantIds: [trip.olia, trip.max, trip.iryna] },
  clientRequestId,
});
const add = (clientRequestId?: string) =>
  expenseService.addExpense(ctx(), { accountId: trip.accountId, ledgerId: trip.ledgerId, body: body(clientRequestId) });
const count = () => db.prisma.expense.count({ where: { ledgerId: trip.ledgerId } });

describe("Double submit and parallel requests", () => {
  it("the same clientRequestId sent five times at once saves one expense and answers all five with it (CD-11)", async () => {
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => add("double-click-1")));
    expect(results.filter((r) => r.status === "rejected")).toEqual([]);
    const answers = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    expect(await count()).toBe(1);
    expect(new Set(answers.map((r) => r.expense.id)).size).toBe(1);
    expect(answers.filter((r) => r.created)).toHaveLength(1);
  });

  it("different clientRequestIds at once are all saved", async () => {
    const results = await Promise.allSettled(["a", "b", "c", "d"].map((id) => add(id)));
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(await count()).toBe(4);
  });

  it("the same clientRequestId in two different ledgers is two expenses (the key is per ledger)", async () => {
    const other = await createTrip(ctx(), "other@example.com");
    await add("shared-key");
    await expenseService.addExpense(ctx(), {
      accountId: other.accountId,
      ledgerId: other.ledgerId,
      body: { ...body("shared-key"), payerId: other.olia, split: { mode: "EQUAL", participantIds: [other.olia] } },
    });
    expect(await db.prisma.expense.count()).toBe(2);
  });

  it("two members with the same name added at once: exactly one wins, the other gets MEMBER_NAME_TAKEN", async () => {
    const results = await Promise.allSettled([
      memberService.addMember(ctx(), { accountId: trip.accountId, ledgerId: trip.ledgerId, name: "Taras" }),
      memberService.addMember(ctx(), { accountId: trip.accountId, ledgerId: trip.ledgerId, name: "taras" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "MEMBER_NAME_TAKEN" });
    const names = await db.prisma.member.findMany({ where: { ledgerId: trip.ledgerId }, orderBy: { position: "asc" } });
    expect(names.map((m) => m.position)).toEqual([1, 2, 3, 4, 5]);
  });

  it("members added at once get distinct positions with no gap or duplicate (BR-20)", async () => {
    const results = await Promise.allSettled(
      ["A", "B", "C", "D"].map((name) => memberService.addMember(ctx(), { accountId: trip.accountId, ledgerId: trip.ledgerId, name })),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const rows = await db.prisma.member.findMany({ where: { ledgerId: trip.ledgerId }, orderBy: { position: "asc" } });
    expect(rows).toHaveLength(4 + ok);
    expect(rows.map((m) => m.position)).toEqual(rows.map((_, i) => i + 1));
  });

  it("two sign-ups with the same e-mail at once: one account, one EMAIL_TAKEN", async () => {
    const signUp = () => authService.signUp(ctx(), { email: "race@example.com", password: "password1" });
    const results = await Promise.allSettled([signUp(), signUp()]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason).toMatchObject({ code: "EMAIL_TAKEN" });
    expect(await db.prisma.account.count({ where: { email: "race@example.com" } })).toBe(1);
  });
});
