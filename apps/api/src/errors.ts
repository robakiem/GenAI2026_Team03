import type { ErrorRequestHandler, RequestHandler } from "express";
import { ERROR_STATUS, type ErrorCode, type ErrorResponse } from "@babki/shared";

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly params?: Record<string, string | number>,
  ) {
    super(message);
  }
}

function toResponse(code: ErrorCode, message: string, params?: Record<string, string | number>): ErrorResponse {
  return { error: { code, message, ...(params && { params }) } };
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError("NOT_FOUND", "Route not found."));
};

// Express 4 arguments are required for Express to recognise an error handler
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(ERROR_STATUS[err.code]).json(toResponse(err.code, err.message, err.params));
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(ERROR_STATUS.MALFORMED_JSON).json(toResponse("MALFORMED_JSON", "Request body is not valid JSON."));
    return;
  }
  console.error(err);
  res.status(ERROR_STATUS.INTERNAL_ERROR).json(toResponse("INTERNAL_ERROR", "Unexpected server error."));
};
