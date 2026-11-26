import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import type { ServiceContext } from "./context";
import { readSessionCookie } from "./cookies";
import { uniqueViolationTarget } from "./data/prisma-error";
import * as memberService from "./services/member.service";
import * as settlementService from "./services/settlement.service";
import { createTrip, type Trip } from "./test/carpathians";
import { createTestDb, type TestDb } from "./test/db";
import { overrideInTransaction } from "./test/faults";

// Branches that the main scenarios do not reach but real traffic can.
let db: TestDb;
let trip: Trip;
const ctx = (): ServiceContext => ({ prisma: db.prisma });

beforeEach(async () => {
  db = createTestDb();
  trip = await createTrip(ctx());
});
afterEach(async () => {
  await db.cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Saved transfers are listed by the payer's position, then the receiver's (CD-17)", () => {
  it("whatever order the rows were saved in", async () => {
    const save = (from: string, to: string, amountKopecks: bigint) =>
      db.prisma.transfer.create({ data: { ledgerId: trip.ledgerId, fromMemberId: from, toMemberId: to, amountKopecks } });
    // saved in the reverse of the expected order
    await save(trip.andrii, trip.olia, 300n);
    await save(trip.iryna, trip.max, 200n);
    await save(trip.iryna, trip.olia, 250n);
    await save(trip.max, trip.olia, 100n);

    const { transfers, source, ledgerState } = await settlementService.getSettlement(ctx(), {
      accountId: trip.accountId,
      ledgerId: trip.ledgerId,
    });
    expect(source).toBe("SAVED");
    expect(ledgerState).toBe("SETTLING");
    expect(transfers.map((t) => [t.fromMemberId, t.toMemberId])).toEqual([
      [trip.max, trip.olia],
      [trip.iryna, trip.olia],
      [trip.iryna, trip.max],
      [trip.andrii, trip.olia],
    ]);
    expect(transfers.every((t) => typeof t.amountKopecks === "number")).toBe(true);
  });

  it("a closed ledger with every transfer confirmed is fully settled; one unconfirmed is not (BR-46)", async () => {
    await db.prisma.transfer.create({
      data: { ledgerId: trip.ledgerId, fromMemberId: trip.max, toMemberId: trip.olia, amountKopecks: 100n, state: "CONFIRMED" },
    });
    const get = () => settlementService.getSettlement(ctx(), { accountId: trip.accountId, ledgerId: trip.ledgerId });
    expect((await get()).fullySettled).toBe(false); // not closed yet
    await db.prisma.ledger.update({ where: { id: trip.ledgerId }, data: { closedAt: new Date() } });
    expect(await get()).toMatchObject({ fullySettled: true, ledgerState: "CLOSED" });
    await db.prisma.transfer.create({
      data: { ledgerId: trip.ledgerId, fromMemberId: trip.iryna, toMemberId: trip.olia, amountKopecks: 5n, state: "REPORTED_PAID" },
    });
    expect((await get()).fullySettled).toBe(false);
  });
});

describe("Member service backstops", () => {
  it("a name clash that slips past the check (a concurrent insert) is still MEMBER_NAME_TAKEN, not a 500", async () => {
    // The pre-check says "free" although the name exists: the unique index is the last line.
    const blind = overrideInTransaction(db.prisma, "member", { findUnique: () => Promise.resolve(null) });
    await expect(
      memberService.addMember({ prisma: blind }, { accountId: trip.accountId, ledgerId: trip.ledgerId, name: "max" }),
    ).rejects.toMatchObject({ code: "MEMBER_NAME_TAKEN" });
    expect(await db.prisma.member.count({ where: { ledgerId: trip.ledgerId } })).toBe(4);
  });

  it("an unexpected unique violation (the position slot) is not disguised as a name clash", async () => {
    // the next position is reported as 3 (taken), so the insert collides on (ledgerId, position)
    const clash = overrideInTransaction(db.prisma, "member", { count: () => Promise.resolve(2) });
    const error = await memberService
      .addMember({ prisma: clash }, { accountId: trip.accountId, ledgerId: trip.ledgerId, name: "Newcomer" })
      .catch((e: unknown) => e);
    expect(error).not.toMatchObject({ code: "MEMBER_NAME_TAKEN" });
    expect(uniqueViolationTarget(error)).toContain("position");
  });

  it("payment details of a member that is not in this ledger are MEMBER_NOT_FOUND", async () => {
    await expect(
      memberService.setPaymentDetails(ctx(), { accountId: trip.accountId, ledgerId: trip.ledgerId, memberId: "nope", paymentDetails: "x" }),
    ).rejects.toMatchObject({ code: "MEMBER_NOT_FOUND" });
  });
});

describe("Unique-violation target formats", () => {
  it("reads a string target and an array target; ignores a violation without any", () => {
    expect(uniqueViolationTarget({ code: "P2002", meta: { target: "Member_nameKey_key" } })).toEqual(["Member_nameKey_key"]);
    expect(uniqueViolationTarget({ code: "P2002", meta: { target: ["a", "b"] } })).toEqual(["a", "b"]);
    expect(uniqueViolationTarget({ code: "P2002", meta: {} })).toBeNull();
    expect(uniqueViolationTarget({ code: "P2002" })).toBeNull();
    expect(uniqueViolationTarget({ code: "P2025" })).toBeNull();
  });
});

describe("Cookie header parsing", () => {
  const read = (header: string | undefined) => readSessionCookie({ headers: { cookie: header } } as unknown as Request);
  it.each([
    [undefined, undefined],
    ["", undefined],
    ["other=1", undefined],
    ["garbage; babki_session=abc", "abc"],
    ["a=1; babki_session=abc; b=2", "abc"],
    ["babki_session=a%20b", "a b"],
    ["babki_session=%E0%A4%A", "%E0%A4%A"],
  ])("%j → %j", (header, expected) => {
    expect(read(header)).toBe(expected);
  });
});

describe("Configuration", () => {
  it("uses PORT and DATABASE_URL from the environment when set", async () => {
    vi.stubEnv("PORT", "4555");
    vi.stubEnv("DATABASE_URL", "file:/tmp/custom.db");
    const { config } = await import("./config");
    expect(config).toEqual({ port: 4555, databaseUrl: "file:/tmp/custom.db" });
  });

  it("defaults to port 3001 and the local SQLite file inside apps/api/prisma", async () => {
    vi.stubEnv("PORT", "");
    vi.stubEnv("DATABASE_URL", "");
    delete process.env.PORT;
    delete process.env.DATABASE_URL;
    const { config } = await import("./config");
    expect(config.port).toBe(3001);
    expect(config.databaseUrl).toMatch(/^file:.*apps\/api\/prisma\/babki\.db$/);
  });
});
