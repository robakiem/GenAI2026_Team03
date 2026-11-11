import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ServiceContext } from "../context";
import { AppError } from "../errors";
import { createTestDb, type TestDb } from "../test/db";
import * as authService from "./auth.service";
import * as ledgerService from "./ledger.service";

let db: TestDb;
const ctx = (): ServiceContext => ({ prisma: db.prisma });

beforeEach(() => {
  db = createTestDb();
});
afterEach(async () => {
  await db.cleanup();
});

async function newCoordinator(email = "olia@example.com"): Promise<string> {
  const { account } = await authService.signUp(ctx(), { email, password: "password1" });
  return account.id;
}

async function expectError(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error("expected an AppError to be thrown");
}

describe("LedgerService", () => {
  it("Coordinator creates a trip ledger", async () => {
    const accountId = await newCoordinator();
    const { ledger, members } = await ledgerService.createLedger(ctx(), {
      accountId,
      name: "Carpathians",
      coordinatorName: "Olia",
    });

    expect(ledger.name).toBe("Carpathians");
    expect(ledger.state).toBe("ACTIVE");
    expect(ledger.closedAt).toBeNull();
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ name: "Olia", position: 1, isCoordinator: true, paymentDetails: null });
    expect(members[0]?.linkToken).toHaveLength(22);
    // persisted, not just returned
    expect(await db.prisma.ledger.count()).toBe(1);
    expect(await db.prisma.member.count()).toBe(1);
  });

  it("keeps two ledgers with the same name separate", async () => {
    const accountId = await newCoordinator();
    const a = await ledgerService.createLedger(ctx(), { accountId, name: "Carpathians", coordinatorName: "Olia" });
    const b = await ledgerService.createLedger(ctx(), { accountId, name: "Carpathians", coordinatorName: "Olia" });
    expect(a.ledger.id).not.toBe(b.ledger.id);
    expect((await ledgerService.listLedgers(ctx(), accountId)).ledgers).toHaveLength(2);
  });

  it("shows a Coordinator only their own ledgers", async () => {
    const olia = await newCoordinator("olia@example.com");
    const other = await newCoordinator("max@example.com");
    const { ledger } = await ledgerService.createLedger(ctx(), { accountId: olia, name: "Carpathians", coordinatorName: "Olia" });

    expect((await ledgerService.listLedgers(ctx(), other)).ledgers).toHaveLength(0);
    const error = await expectError(ledgerService.getLedger(ctx(), { accountId: other, ledgerId: ledger.id }));
    expect(error.code).toBe("LEDGER_NOT_FOUND");
  });
});
