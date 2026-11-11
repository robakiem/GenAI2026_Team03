import { useState } from "react";
import { validateInput, type ValidationDetail } from "@babki/shared";
import type { ZodType } from "zod";
import { ApiError } from "../api/client";
import { fieldMessages, type FieldLimits } from "../i18n/errorText";

// Field errors of a form, so the user is told what is wrong (US-004): the shared schema checks the
// input before it is sent (BR-13), and a VALIDATION_ERROR from the API is shown the same way.
export function useFieldErrors(limits: FieldLimits, apiError: unknown) {
  const [clientDetails, setClientDetails] = useState<ValidationDetail[]>([]);
  const apiDetails = apiError instanceof ApiError && apiError.code === "VALIDATION_ERROR" ? (apiError.details ?? []) : [];
  const details = clientDetails.length > 0 ? clientDetails : apiDetails;

  // The parsed (trimmed, normalised) value to send, or null after showing the field errors.
  function validate<T>(schema: ZodType<T>, input: unknown): T | null {
    const result = validateInput(schema, input);
    setClientDetails(result.success ? [] : result.details);
    return result.success ? result.data : null;
  }

  return {
    errors: fieldMessages(details, limits),
    validate,
    // Shown as the form's banner: every error that is not already shown at a field.
    bannerError: details.length > 0 ? null : apiError,
  };
}
