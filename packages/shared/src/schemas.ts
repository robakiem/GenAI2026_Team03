import { z } from "zod";
import { LIMITS } from "./limits";

// Normalise an e-mail the same way the server stores it (contracts 1.1): trimmed + lower-cased.
const normaliseEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : value);

// The key that makes a member name unique per ledger, ignoring case (BR-19). One home for the rule.
export const toMemberNameKey = (name: string): string => name.trim().toLowerCase();

// ---- Request bodies (validated by the API, reused by the forms) ----

export const signUpSchema = z.object({
  email: z.preprocess(normaliseEmail, z.email().max(LIMITS.email.max)),
  password: z.string().min(LIMITS.password.min).max(LIMITS.password.max),
});
export type SignUpBody = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  // No format check on sign-in: a wrong e-mail must read as INVALID_CREDENTIALS, not a field error.
  email: z.preprocess(normaliseEmail, z.string().min(1)),
  password: z.string().min(1),
});
export type SignInBody = z.infer<typeof signInSchema>;

export const createLedgerSchema = z.object({
  name: z.string().trim().min(LIMITS.ledgerName.min).max(LIMITS.ledgerName.max),
  coordinatorName: z.string().trim().min(LIMITS.memberName.min).max(LIMITS.memberName.max),
});
export type CreateLedgerBody = z.infer<typeof createLedgerSchema>;

export const addMemberSchema = z.object({
  name: z.string().trim().min(LIMITS.memberName.min).max(LIMITS.memberName.max),
});
export type AddMemberBody = z.infer<typeof addMemberSchema>;

// ---- Response objects (contracts 2.3), used by the web client to parse answers ----

export const ledgerStateSchema = z.enum(["ACTIVE", "SETTLING", "CLOSED"]);
export type LedgerState = z.infer<typeof ledgerStateSchema>;

export const accountSchema = z.object({
  id: z.string(),
  email: z.string(),
});
export type Account = z.infer<typeof accountSchema>;

export const ledgerSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: ledgerStateSchema,
  createdAt: z.string(),
  closedAt: z.string().nullable(),
});
export type Ledger = z.infer<typeof ledgerSchema>;

export const memberSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.number().int(),
  isCoordinator: z.boolean(),
  paymentDetails: z.string().nullable(),
  linkToken: z.string(),
});
export type Member = z.infer<typeof memberSchema>;

export const accountResponseSchema = z.object({ account: accountSchema });
export const ledgerWithMembersSchema = z.object({ ledger: ledgerSchema, members: z.array(memberSchema) });
export const ledgersListSchema = z.object({ ledgers: z.array(ledgerSchema) });
export const memberCreatedSchema = z.object({ member: memberSchema });

export type AccountResponse = z.infer<typeof accountResponseSchema>;
export type LedgerWithMembers = z.infer<typeof ledgerWithMembersSchema>;
export type LedgersList = z.infer<typeof ledgersListSchema>;
export type MemberCreated = z.infer<typeof memberCreatedSchema>;
