import { ApiError } from "../api/client";
import { uk } from "./uk";

// Map an API error to a Ukrainian message from the dictionary (NFR-11, A-15).
export function messageForError(error: unknown): string {
  if (error instanceof ApiError && error.code && error.code in uk.errors) {
    return uk.errors[error.code as keyof typeof uk.errors];
  }
  return uk.errors.default;
}
