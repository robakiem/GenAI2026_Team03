import { errorResponseSchema, type ErrorCode } from "@babki/shared";
import type { ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    // null when the answer is not in the error format (for example the API is not running)
    readonly code: ErrorCode | null,
    message: string,
  ) {
    super(message);
  }
}

export async function apiGet<T>(path: string, schema: ZodType<T>): Promise<T> {
  const res = await fetch(path);
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = errorResponseSchema.safeParse(body);
    throw parsed.success
      ? new ApiError(res.status, parsed.data.error.code, parsed.data.error.message)
      : new ApiError(res.status, null, `Unexpected response ${res.status}`);
  }
  return schema.parse(body);
}
