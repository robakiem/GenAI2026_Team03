import type { z } from "zod";
import type { ValidationDetail, ValidationDetailCode } from "./errors";

type Issue = z.ZodError["issues"][number];

export type ValidationResult<T> = { success: true; data: T } | { success: false; details: ValidationDetail[] };

// Check input with a shared schema: the parsed value, or the `details` of contracts 3.1. The API
// answers VALIDATION_ERROR with them; the forms show them at their fields before sending.
export function validateInput<S extends z.ZodType>(schema: S, input: unknown): ValidationResult<z.output<S>> {
  const result = schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, details: zodErrorToDetails(result.error, input) };
}

// Turn a Zod error into the API's `details` array (contracts 3.1): one { field, code, message } per issue.
export function zodErrorToDetails(error: z.ZodError, input: unknown): ValidationDetail[] {
  return error.issues.map((issue) => ({
    field: formatPath(issue.path),
    code: detailCode(issue, input),
    message: issue.message,
  }));
}

function formatPath(path: ReadonlyArray<PropertyKey>): string {
  let out = "";
  for (const key of path) {
    if (typeof key === "number") out += `[${key}]`;
    else out += out ? `.${String(key)}` : String(key);
  }
  return out;
}

function detailCode(issue: Issue, input: unknown): ValidationDetailCode {
  switch (issue.code) {
    case "invalid_type":
      if (valueAtPath(input, issue.path) === undefined) return "REQUIRED";
      // Zod 4 reports a failed .int() (e.g. 150.5) as invalid_type with expected "int".
      return issue.expected === "int" ? "NOT_AN_INTEGER" : "INVALID_TYPE";
    case "too_small":
      if (issue.origin === "number") return "OUT_OF_RANGE";
      if (issue.origin === "array") return "TOO_FEW_ITEMS";
      return "TOO_SHORT";
    case "too_big":
      return issue.origin === "number" ? "OUT_OF_RANGE" : "TOO_LONG";
    case "invalid_format":
      return "format" in issue && issue.format === "email" ? "INVALID_EMAIL" : "INVALID_TYPE";
    case "not_multiple_of":
      return "NOT_AN_INTEGER";
    default:
      return "INVALID_TYPE";
  }
}

function valueAtPath(input: unknown, path: ReadonlyArray<PropertyKey>): unknown {
  let current = input;
  for (const key of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current;
}
