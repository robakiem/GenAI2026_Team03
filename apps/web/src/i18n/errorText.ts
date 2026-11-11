import { LIMITS, type ValidationDetail, type ValidationDetailCode } from "@babki/shared";
import { ApiError } from "../api/client";
import { uk } from "./uk";

// Map an API error to a Ukrainian message from the dictionary (NFR-11, A-15).
export function messageForError(error: unknown): string {
  if (!(error instanceof ApiError) || !error.code) return uk.errors.default;
  if (error.code === "MEMBER_LIMIT_REACHED") {
    // params.limit comes with the error (contracts 3.3), so the text never repeats the number.
    const limit = error.params?.limit;
    return uk.errors.MEMBER_LIMIT_REACHED(typeof limit === "number" ? limit : LIMITS.membersPerLedger);
  }
  if (error.code in uk.errors) {
    const text = uk.errors[error.code as keyof typeof uk.errors];
    if (typeof text === "string") return text;
  }
  return uk.errors.default;
}

interface Limit {
  min?: number;
  max?: number;
}
export type FieldLimits = Partial<Record<string, Limit>>;

// One Ukrainian message per invalid field, from the `details` codes (contracts 3.1) and the shared
// limits of that field. The first problem of a field wins.
export function fieldMessages(details: ValidationDetail[], limits: FieldLimits): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const { field, code } of details) {
    messages[field] ??= fieldMessage(code, limits[field]);
  }
  return messages;
}

function fieldMessage(code: ValidationDetailCode, limit: Limit | undefined): string {
  switch (code) {
    case "REQUIRED":
      return uk.fieldErrors.required;
    case "TOO_SHORT":
      // A name that is empty after trimming is TOO_SHORT with minimum 1: "fill in", not "at least 1".
      return limit?.min && limit.min > 1 ? uk.fieldErrors.tooShort(limit.min) : uk.fieldErrors.required;
    case "TOO_LONG":
      return limit?.max ? uk.fieldErrors.tooLong(limit.max) : uk.fieldErrors.invalid;
    case "INVALID_EMAIL":
      return uk.fieldErrors.invalidEmail;
    default:
      return uk.fieldErrors.invalid;
  }
}
