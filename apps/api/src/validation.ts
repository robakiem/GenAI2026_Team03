import type { z } from "zod";
import { zodErrorToDetails } from "@babki/shared";
import { AppError } from "./errors";

// Validate a request body with a shared Zod schema and, on failure, raise the
// single error format with field-level `details` (contracts 3.1).
export function parseBody<S extends z.ZodType>(schema: S, body: unknown): z.output<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", "Request body is invalid.", undefined, zodErrorToDetails(result.error, body));
  }
  return result.data;
}
