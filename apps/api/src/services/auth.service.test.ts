import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ServiceContext } from "../context";
import { AppError } from "../errors";
import { createTestDb, type TestDb } from "../test/db";
import * as authService from "./auth.service";

let db: TestDb;
const ctx = (): ServiceContext => ({ prisma: db.prisma });

beforeEach(() => {
  db = createTestDb();
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

describe("AuthService", () => {
  it("signs up a Coordinator, persisting the account and a session", async () => {
    const { account, session } = await authService.signUp(ctx(), { email: "olia@example.com", password: "password1" });
    expect(account.email).toBe("olia@example.com");
    expect(await db.prisma.account.count()).toBe(1);
    expect(await db.prisma.session.findUnique({ where: { id: session.id } })).not.toBeNull();
  });

  it("refuses a duplicate e-mail", async () => {
    await authService.signUp(ctx(), { email: "olia@example.com", password: "password1" });
    const error = await expectError(authService.signUp(ctx(), { email: "olia@example.com", password: "password2" }));
    expect(error.code).toBe("EMAIL_TAKEN");
  });

  it("signs in with the right password and refuses the wrong one", async () => {
    await authService.signUp(ctx(), { email: "olia@example.com", password: "password1" });
    const ok = await authService.signIn(ctx(), { email: "olia@example.com", password: "password1" });
    expect(ok.account.email).toBe("olia@example.com");
    const wrongPassword = await expectError(authService.signIn(ctx(), { email: "olia@example.com", password: "nope12345" }));
    const unknownEmail = await expectError(authService.signIn(ctx(), { email: "ghost@example.com", password: "password1" }));
    expect(wrongPassword.code).toBe("INVALID_CREDENTIALS");
    expect(unknownEmail.code).toBe("INVALID_CREDENTIALS");
  });

  it("checks every character of a long Cyrillic password", async () => {
    // 40 Cyrillic letters are 80 UTF-8 bytes, beyond the 72 bytes bcrypt reads by itself.
    const start = "ж".repeat(36);
    await authService.signUp(ctx(), { email: "olia@example.com", password: `${start}абвг` });
    const error = await expectError(authService.signIn(ctx(), { email: "olia@example.com", password: `${start}дежз` }));
    expect(error.code).toBe("INVALID_CREDENTIALS");
    const ok = await authService.signIn(ctx(), { email: "olia@example.com", password: `${start}абвг` });
    expect(ok.account.email).toBe("olia@example.com");
  });

  it("authenticates a valid session and rejects an expired one", async () => {
    const { account, session } = await authService.signUp(ctx(), { email: "olia@example.com", password: "password1" });
    const authed = await authService.authenticate(ctx(), session.id);
    expect(authed?.account.id).toBe(account.id);

    await db.prisma.session.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await authService.authenticate(ctx(), session.id)).toBeNull();
  });

  it("signs out idempotently", async () => {
    const { session } = await authService.signUp(ctx(), { email: "olia@example.com", password: "password1" });
    await authService.signOut(ctx(), session.id);
    await authService.signOut(ctx(), session.id); // no error on a second call
    expect(await db.prisma.session.count()).toBe(0);
  });
});
