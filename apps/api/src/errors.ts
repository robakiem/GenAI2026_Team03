import type { ErrorRequestHandler, RequestHandler } from "express";
import { ERROR_STATUS, type ErrorCode, type ErrorResponse, type ValidationDetail } from "@babki/shared";

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly params?: Record<string, string | number>,
    readonly details?: ValidationDetail[],
  ) {
    super(message);
  }
}

function toResponse(
  code: ErrorCode,
  message: string,
  params?: Record<string, string | number>,
  details?: ValidationDetail[],
): ErrorResponse {
  return { error: { code, message, ...(details && { details }), ...(params && { params }) } };
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError("NOT_FOUND", "Route not found."));
};

// body-parser reports malformed JSON as an error carrying type "entity.parse.failed".
function isBodyParseError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "type" in err && err.type === "entity.parse.failed";
}

// Express 4 arguments are required for Express to recognise an error handler
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(ERROR_STATUS[err.code]).json(toResponse(err.code, err.message, err.params, err.details));
    return;
  }
  if (isBodyParseError(err)) {
    res.status(ERROR_STATUS.MALFORMED_JSON).json(toResponse("MALFORMED_JSON", "Request body is not valid JSON."));
    return;
  }
  console.error(err);
  res.status(ERROR_STATUS.INTERNAL_ERROR).json(toResponse("INTERNAL_ERROR", "Unexpected server error."));
};
