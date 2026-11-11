import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../test/db";
import { insertMember } from "./members";
import { uniqueViolationTarget } from "./prisma-error";

let db: TestDb;

beforeEach(() => {
  db = createTestDb();
});
afterEach(async () => {
  await db.cleanup();
});

describe("uniqueViolationTarget", () => {
  it("names the columns of the unique constraint that was hit", async () => {
    const account = await db.prisma.account.create({ data: { email: "olia@example.com", passwordHash: "x" } });
    const ledger = await db.prisma.ledger.create({ data: { name: "Carpathians", coordinatorId: account.id } });
    const max = { ledgerId: ledger.id, name: "Max", nameKey: "max", isCoordinator: false };
    await insertMember(db.prisma, { ...max, position: 1, linkToken: "a".repeat(22) });

    const sameName = await insertMember(db.prisma, { ...max, position: 2, linkToken: "b".repeat(22) }).catch(
      (error: unknown) => error,
    );
    expect(uniqueViolationTarget(sameName)).toContain("nameKey");

    const sameEmail = await db.prisma.account
      .create({ data: { email: "olia@example.com", passwordHash: "x" } })
      .catch((error: unknown) => error);
    expect(uniqueViolationTarget(sameEmail)).toEqual(["email"]);
  });

  it("returns null for an error that is not a unique violation", () => {
    expect(uniqueViolationTarget(new Error("boom"))).toBeNull();
  });
});
