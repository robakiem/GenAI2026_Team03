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

// ---- Expenses (EP-11 … EP-13, contracts 2.3) ----

const idSchema = z.string().min(1);
const amountKopecksSchema = z.number().int().min(LIMITS.amountKopecks.min).max(LIMITS.amountKopecks.max);
const percentBpSchema = z.number().int().min(LIMITS.percentBp.min).max(LIMITS.percentBp.max);

// The same member twice in one split is a DUPLICATE_ITEM detail (contracts 3.1) at the second occurrence.
function noDuplicates<T>(idOf: (item: T) => string, suffix: string) {
  return (items: T[], ctx: z.RefinementCtx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      const id = idOf(item);
      if (seen.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: "The same member is listed twice.",
          path: suffix ? [index, suffix] : [index],
          params: { detail: "DUPLICATE_ITEM" },
        });
      }
      seen.add(id);
    });
  };
}

export const splitSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("EQUAL"),
    participantIds: z.array(idSchema).min(1).superRefine(noDuplicates((id: string) => id, "")),
  }),
  z.object({
    mode: z.literal("AMOUNTS"),
    shares: z
      .array(z.object({ memberId: idSchema, amountKopecks: amountKopecksSchema }))
      .min(1)
      .superRefine(noDuplicates((share: { memberId: string }) => share.memberId, "memberId")),
  }),
  z.object({
    mode: z.literal("PERCENTAGES"),
    shares: z
      .array(z.object({ memberId: idSchema, percentBp: percentBpSchema }))
      .min(1)
      .superRefine(noDuplicates((share: { memberId: string }) => share.memberId, "memberId")),
  }),
]);

// EP-12: the full replacement of an expense.
export const expenseBodySchema = z.object({
  title: z.string().trim().min(LIMITS.expenseTitle.min).max(LIMITS.expenseTitle.max),
  amountKopecks: amountKopecksSchema,
  payerId: idSchema,
  split: splitSchema,
});
export type ExpenseBody = z.infer<typeof expenseBodySchema>;

// EP-11: the same body plus the optional idempotency key (CD-11).
export const createExpenseSchema = expenseBodySchema.extend({
  clientRequestId: z.string().min(LIMITS.clientRequestId.min).max(LIMITS.clientRequestId.max).optional(),
});
export type CreateExpenseBody = z.infer<typeof createExpenseSchema>;

// EP-10: free text up to 100 characters; empty (or blank) means "no details" and is stored as null.
export const paymentDetailsSchema = z.object({
  paymentDetails: z
    .string()
    .max(LIMITS.paymentDetails.max)
    .nullable()
    .transform((value) => (value === null || value.trim() === "" ? null : value)),
});
export type PaymentDetailsBody = z.infer<typeof paymentDetailsSchema>;

export const splitModeSchema = z.enum(["EQUAL", "AMOUNTS", "PERCENTAGES"]);
export type SplitMode = z.infer<typeof splitModeSchema>;

export const expenseSchema = z.object({
  id: z.string(),
  title: z.string(),
  amountKopecks: z.number().int(),
  payerId: z.string(),
  splitMode: splitModeSchema,
  shares: z.array(z.object({ memberId: z.string(), amountKopecks: z.number().int(), percentBp: z.number().int().nullable() })),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Expense = z.infer<typeof expenseSchema>;

export const expenseResponseSchema = z.object({ expense: expenseSchema });
export const expensesListSchema = z.object({ expenses: z.array(expenseSchema) });
export type ExpenseResponse = z.infer<typeof expenseResponseSchema>;
export type ExpensesList = z.infer<typeof expensesListSchema>;

// ---- Settlement (EP-14, contracts 2.4) ----

export const transferStateSchema = z.enum(["OPEN", "REPORTED_PAID", "CONFIRMED"]);
export type TransferState = z.infer<typeof transferStateSchema>;
export const reportedViaSchema = z.enum(["PAYER_LINK", "COORDINATOR"]);
export const confirmedViaSchema = z.enum(["RECEIVER_LINK", "COORDINATOR"]);

export const transferSchema = z.object({
  id: z.string().nullable(),
  fromMemberId: z.string(),
  toMemberId: z.string(),
  amountKopecks: z.number().int(),
  state: transferStateSchema,
  reportedVia: reportedViaSchema.nullable(),
  reportedAt: z.string().nullable(),
  confirmedVia: confirmedViaSchema.nullable(),
  confirmedAt: z.string().nullable(),
});
export type Transfer = z.infer<typeof transferSchema>;

export const settlementSchema = z.object({
  source: z.enum(["PROPOSED", "SAVED"]),
  ledgerState: ledgerStateSchema,
  fullySettled: z.boolean(),
  balances: z.array(z.object({ memberId: z.string(), balanceKopecks: z.number().int() })),
  transfers: z.array(transferSchema),
});
export type Settlement = z.infer<typeof settlementSchema>;

// ---- Member page (EP-18, contracts 2.4) ----

export const memberPageSchema = z.object({
  ledger: z.object({ name: z.string(), state: ledgerStateSchema, fullySettled: z.boolean() }),
  member: z.object({ name: z.string() }),
  youPay: z.array(
    z.object({
      toMemberId: z.string(),
      toName: z.string(),
      amountKopecks: z.number().int(),
      state: transferStateSchema,
      reportedVia: reportedViaSchema.nullable(),
      paymentDetails: z.string().nullable(),
    }),
  ),
  youReceive: z.array(
    z.object({
      fromMemberId: z.string(),
      fromName: z.string(),
      amountKopecks: z.number().int(),
      state: transferStateSchema,
      reportedVia: reportedViaSchema.nullable(),
    }),
  ),
  breakdown: z.object({
    lines: z.array(z.object({ title: z.string(), paidKopecks: z.number().int(), shareKopecks: z.number().int() })),
    totalPaidKopecks: z.number().int(),
    totalSharesKopecks: z.number().int(),
    balanceKopecks: z.number().int(),
  }),
});
export type MemberPage = z.infer<typeof memberPageSchema>;
