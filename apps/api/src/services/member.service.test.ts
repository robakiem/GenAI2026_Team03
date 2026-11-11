import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ServiceContext } from "../context";
import { AppError } from "../errors";
import { createTestDb, type TestDb } from "../test/db";
import * as authService from "./auth.service";
import * as ledgerService from "./ledger.service";
import * as memberService from "./member.service";

let db: TestDb;
const ctx = (): ServiceContext => ({ prisma: db.prisma });

beforeEach(() => {
  db = createTestDb();
});
afterEach(async () => {
  await db.cleanup();
});

async function newLedger(): Promise<{ accountId: string; ledgerId: string }> {
  const { account } = await authService.signUp(ctx(), { email: "olia@example.com", password: "password1" });
  const { ledger } = await ledgerService.createLedger(ctx(), {
    accountId: account.id,
    name: "Carpathians",
    coordinatorName: "Olia",
  });
  return { accountId: account.id, ledgerId: ledger.id };
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

describe("MemberService (US-005)", () => {
  it("adds friends in order with a distinct link each", async () => {
    const { accountId, ledgerId } = await newLedger();
    const max = await memberService.addMember(ctx(), { accountId, ledgerId, name: "Max" });
    const iryna = await memberService.addMember(ctx(), { accountId, ledgerId, name: "Iryna" });
    const andrii = await memberService.addMember(ctx(), { accountId, ledgerId, name: "Andrii" });

    expect([max.member.position, iryna.member.position, andrii.member.position]).toEqual([2, 3, 4]);
    expect(max.member.isCoordinator).toBe(false);
    const tokens = new Set([max.member.linkToken, iryna.member.linkToken, andrii.member.linkToken]);
    expect(tokens.size).toBe(3);
    expect(max.member.linkToken).toHaveLength(22);
  });

  it("A duplicate name is refused", async () => {
    const { accountId, ledgerId } = await newLedger();
    await memberService.addMember(ctx(), { accountId, ledgerId, name: "Max" });
    for (const duplicate of ["Max", "MAX", "max"]) {
      const error = await expectError(memberService.addMember(ctx(), { accountId, ledgerId, name: duplicate }));
      expect(error.code).toBe("MEMBER_NAME_TAKEN");
    }
    expect(await db.prisma.member.count({ where: { ledgerId } })).toBe(2); // Olia + Max only
  });

  it("refuses the 21st member", async () => {
    const { accountId, ledgerId } = await newLedger();
    // Coordinator is #1; add 19 friends to reach the limit of 20.
    for (let i = 1; i <= 19; i++) {
      await memberService.addMember(ctx(), { accountId, ledgerId, name: `Friend ${i}` });
    }
    const error = await expectError(memberService.addMember(ctx(), { accountId, ledgerId, name: "One too many" }));
    expect(error.code).toBe("MEMBER_LIMIT_REACHED");
    expect(error.params).toEqual({ limit: 20 });
  });

  it("refuses adding a member to another Coordinator's ledger", async () => {
    const { ledgerId } = await newLedger();
    const { account: other } = await authService.signUp(ctx(), { email: "max@example.com", password: "password1" });
    const error = await expectError(memberService.addMember(ctx(), { accountId: other.id, ledgerId, name: "Max" }));
    expect(error.code).toBe("LEDGER_NOT_FOUND");
  });
});
