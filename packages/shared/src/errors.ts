import { z } from "zod";

// Catalogue of error codes with their HTTP status: prompts/4.3_technical_contracts_RESULT.md, section 3.3
export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  MALFORMED_JSON: 400,
  MEMBER_NOT_IN_LEDGER: 400,
  AMOUNT_TOO_SMALL: 400,
  SHARES_SUM_MISMATCH: 400,
  PERCENT_SUM_MISMATCH: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  NOT_THE_PAYER: 403,
  NOT_THE_RECEIVER: 403,
  LEDGER_NOT_FOUND: 404,
  EXPENSE_NOT_FOUND: 404,
  MEMBER_NOT_FOUND: 404,
  LINK_NOT_FOUND: 404,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  MEMBER_NAME_TAKEN: 409,
  MEMBER_LIMIT_REACHED: 409,
  SETTLEMENT_STARTED: 409,
  LEDGER_CLOSED: 409,
  INVALID_STATE: 409,
  STALE_TRANSFER: 409,
  INTERNAL_ERROR: 500,
  DB_UNAVAILABLE: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export const ERROR_CODES = Object.keys(ERROR_STATUS) as [ErrorCode, ...ErrorCode[]];

// Codes of field-level errors inside `details` (section 3.1)
export const VALIDATION_DETAIL_CODES = [
  "REQUIRED",
  "INVALID_TYPE",
  "NOT_AN_INTEGER",
  "OUT_OF_RANGE",
  "TOO_SHORT",
  "TOO_LONG",
  "INVALID_EMAIL",
  "TOO_FEW_ITEMS",
  "DUPLICATE_ITEM",
] as const;

export const validationDetailSchema = z.object({
  field: z.string(),
  code: z.enum(VALIDATION_DETAIL_CODES),
  message: z.string(),
});

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    details: z.array(validationDetailSchema).optional(),
    params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  }),
});

export type ValidationDetail = z.infer<typeof validationDetailSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
