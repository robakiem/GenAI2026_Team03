import { errorResponseSchema, type ErrorCode, type ValidationDetail } from "@babki/shared";
import type { ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    // null when the answer is not in the error format (for example the API is not running)
    readonly code: ErrorCode | null,
    message: string,
    readonly details?: ValidationDetail[],
    readonly params?: Record<string, string | number>,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown, schema?: ZodType<T>): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = errorResponseSchema.safeParse(data);
    if (parsed.success) {
      const { code, message, details, params } = parsed.data.error;
      throw new ApiError(res.status, code, message, details, params);
    }
    throw new ApiError(res.status, null, `Unexpected response ${res.status}`);
  }
  return schema ? schema.parse(data) : (data as T);
}

export const apiGet = <T>(path: string, schema: ZodType<T>): Promise<T> => request("GET", path, undefined, schema);

export const apiPost = <T>(path: string, body?: unknown, schema?: ZodType<T>): Promise<T> =>
  request("POST", path, body, schema);
