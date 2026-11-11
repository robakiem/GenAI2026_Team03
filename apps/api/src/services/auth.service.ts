import bcrypt from "bcryptjs";
import type { Account as AccountDto } from "@babki/shared";
import type { ServiceContext } from "../context";
import * as accounts from "../data/accounts";
import { isUniqueViolation } from "../data/prisma-error";
import * as sessions from "../data/sessions";
import { AppError } from "../errors";
import { toAccountDto } from "./mappers";
import { newSessionId } from "./tokens";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (A-09, ADR-0005)
const BCRYPT_COST = 10;
// Compared against when the e-mail is unknown, so sign-in takes a similar time whether or
// not an account exists (no timing oracle on which field was wrong, ADR-0005).
const DUMMY_HASH = bcrypt.hashSync("babki-dummy-password", BCRYPT_COST);

export interface SessionInfo {
  id: string;
  expiresAt: Date;
}

async function createSession(ctx: ServiceContext, accountId: string): Promise<SessionInfo> {
  const id = newSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sessions.insertSession(ctx.prisma, { id, accountId, expiresAt });
  return { id, expiresAt };
}

export async function signUp(
  ctx: ServiceContext,
  input: { email: string; password: string },
): Promise<{ account: AccountDto; session: SessionInfo }> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const account = await accounts.insertAccount(ctx.prisma, { email: input.email, passwordHash }).catch((error) => {
    if (isUniqueViolation(error)) {
      throw new AppError("EMAIL_TAKEN", "An account with this e-mail already exists.");
    }
    throw error;
  });
  const session = await createSession(ctx, account.id);
  return { account: toAccountDto(account), session };
}

export async function signIn(
  ctx: ServiceContext,
  input: { email: string; password: string },
): Promise<{ account: AccountDto; session: SessionInfo }> {
  const account = await accounts.findAccountByEmail(ctx.prisma, input.email);
  const matches = await bcrypt.compare(input.password, account?.passwordHash ?? DUMMY_HASH);
  if (!account || !matches) {
    throw new AppError("INVALID_CREDENTIALS", "The e-mail or password is incorrect.");
  }
  const session = await createSession(ctx, account.id);
  return { account: toAccountDto(account), session };
}

export async function signOut(ctx: ServiceContext, sessionId: string | undefined): Promise<void> {
  if (sessionId) {
    await sessions.deleteSessionById(ctx.prisma, sessionId);
  }
}

// Used by the requireCoordinator middleware: resolve the cookie to an account and extend the session.
export async function authenticate(
  ctx: ServiceContext,
  sessionId: string | undefined,
): Promise<{ account: AccountDto; expiresAt: Date } | null> {
  if (!sessionId) return null;
  const session = await sessions.findSessionWithAccount(ctx.prisma, sessionId);
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await sessions.deleteSessionById(ctx.prisma, sessionId);
    return null;
  }
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sessions.updateSessionExpiry(ctx.prisma, sessionId, expiresAt);
  return { account: toAccountDto(session.account), expiresAt };
}
