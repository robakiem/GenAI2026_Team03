import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTrip, type Trip } from "../test/carpathians";
import { createTestDb, type TestDb } from "../test/db";

// The database is the last line of defence: even code that skips the services cannot store an
// invalid state (contracts 1.9 CHECK constraints, unique indexes and foreign keys).
let db: TestDb;
let trip: Trip;

beforeEach(async () => {
  db = createTestDb();
  trip = await createTrip({ prisma: db.prisma });
});
afterEach(async () => {
  await db.cleanup();
});

const expense = (over: Record<string, unknown> = {}) =>
  db.prisma.expense.create({
    data: { ledgerId: trip.ledgerId, title: "t", amountKopecks: 100, payerId: trip.olia, splitMode: "EQUAL", ...over },
  });

describe("CHECK constraints", () => {
  it.each([0, -1, 100_000_000])("an expense of %i kopecks cannot be stored", async (amountKopecks) => {
    await expect(expense({ amountKopecks })).rejects.toThrow();
    expect(await db.prisma.expense.count()).toBe(0);
  });

  it("the boundaries 1 and 99 999 999 can be stored", async () => {
    await expect(expense({ amountKopecks: 1 })).resolves.toBeDefined();
    await expect(expense({ amountKopecks: 99_999_999 })).resolves.toBeDefined();
  });

  it.each([0, -5])("a share of %i kopecks cannot be stored (BR-03)", async (amountKopecks) => {
    const e = await expense();
    await expect(db.prisma.share.create({ data: { expenseId: e.id, memberId: trip.max, amountKopecks } })).rejects.toThrow();
  });

  it.each([0, 10_001])("a percentage of %i bp cannot be stored", async (percentBp) => {
    const e = await expense();
    await expect(
      db.prisma.share.create({ data: { expenseId: e.id, memberId: trip.max, amountKopecks: 1, percentBp } }),
    ).rejects.toThrow();
  });

  it("a member position outside 1…20 cannot be stored (BR-20)", async () => {
    for (const position of [0, 21]) {
      await expect(
        db.prisma.member.create({
          data: { ledgerId: trip.ledgerId, name: `x${position}`, nameKey: `x${position}`, position, linkToken: randomUUID() },
        }),
      ).rejects.toThrow();
    }
  });

  it("a transfer to oneself or of 0 kopecks cannot be stored (BR-24)", async () => {
    const base = { ledgerId: trip.ledgerId, fromMemberId: trip.max, toMemberId: trip.olia, amountKopecks: 100n };
    await expect(db.prisma.transfer.create({ data: { ...base, toMemberId: trip.max } })).rejects.toThrow();
    await expect(db.prisma.transfer.create({ data: { ...base, amountKopecks: 0n } })).rejects.toThrow();
    await expect(db.prisma.transfer.create({ data: base })).resolves.toBeDefined();
  });
});

describe("Uniqueness and references", () => {
  it("one transfer per ordered pair in a ledger", async () => {
    const data = { ledgerId: trip.ledgerId, fromMemberId: trip.max, toMemberId: trip.olia, amountKopecks: 100n };
    await db.prisma.transfer.create({ data });
    await expect(db.prisma.transfer.create({ data })).rejects.toThrow();
  });

  it("a member name is unique per ledger ignoring case, but may repeat in another ledger (BR-19)", async () => {
    const other = await createTrip({ prisma: db.prisma }, "second@example.com");
    expect(other.ledgerId).not.toBe(trip.ledgerId); // "Max" exists in both ledgers
    expect(await db.prisma.member.count({ where: { nameKey: "max" } })).toBe(2);
    await expect(
      db.prisma.member.create({
        data: { ledgerId: trip.ledgerId, name: "MAX", nameKey: "max", position: 5, linkToken: randomUUID() },
      }),
    ).rejects.toThrow();
  });

  it("link tokens are globally unique", async () => {
    const token = (await db.prisma.member.findUniqueOrThrow({ where: { id: trip.max } })).linkToken;
    await expect(
      db.prisma.member.create({ data: { ledgerId: trip.ledgerId, name: "Z", nameKey: "z", position: 5, linkToken: token } }),
    ).rejects.toThrow();
  });

  it("an expense cannot name a payer that does not exist, and a member with expenses cannot be deleted", async () => {
    await expect(expense({ payerId: "nobody" })).rejects.toThrow();
    await expense();
    await expect(db.prisma.member.delete({ where: { id: trip.olia } })).rejects.toThrow();
  });

  it("deleting a ledger removes its members, expenses and shares, but nothing of another ledger", async () => {
    const other = await createTrip({ prisma: db.prisma }, "third@example.com");
    const mine = await expense();
    await db.prisma.share.create({ data: { expenseId: mine.id, memberId: trip.olia, amountKopecks: 100 } });
    await db.prisma.ledger.delete({ where: { id: trip.ledgerId } });
    expect(await db.prisma.member.count({ where: { ledgerId: trip.ledgerId } })).toBe(0);
    expect(await db.prisma.expense.count()).toBe(0);
    expect(await db.prisma.share.count()).toBe(0);
    expect(await db.prisma.member.count({ where: { ledgerId: other.ledgerId } })).toBe(4);
  });

  it("deleting an account removes its sessions", async () => {
    await db.prisma.session.create({ data: { id: "s1", accountId: trip.accountId, expiresAt: new Date(Date.now() + 1000) } });
    await db.prisma.ledger.deleteMany({ where: { coordinatorId: trip.accountId } });
    await db.prisma.account.delete({ where: { id: trip.accountId } });
    expect(await db.prisma.session.count()).toBe(0);
  });
});

describe("Money round trip through storage", () => {
  it("the largest transfer (500 × 99 999 999 kopecks) survives BigInt storage exactly (CD-14)", async () => {
    const amount = 500n * 99_999_999n;
    await db.prisma.transfer.create({
      data: { ledgerId: trip.ledgerId, fromMemberId: trip.max, toMemberId: trip.olia, amountKopecks: amount },
    });
    const stored = await db.prisma.transfer.findFirstOrThrow();
    expect(stored.amountKopecks).toBe(amount);
    expect(Number.isSafeInteger(Number(stored.amountKopecks))).toBe(true);
  });
});
