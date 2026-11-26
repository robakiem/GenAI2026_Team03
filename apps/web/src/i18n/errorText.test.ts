import { describe, expect, it } from "vitest";
import { ERROR_CODES, LIMITS, type ValidationDetailCode, VALIDATION_DETAIL_CODES } from "@babki/shared";
import { ApiError } from "../api/client";
import { fieldMessages, messageForCode, messageForError } from "./errorText";
import { uk } from "./uk";

// NFR-11, A-15: the user sees Ukrainian text mapped from the error code, never the developer message.
describe("messageForCode", () => {
  // Codes the screens can actually trigger today must have their own text, not the generic one.
  const reachable = [
    "VALIDATION_ERROR",
    "EMAIL_TAKEN",
    "INVALID_CREDENTIALS",
    "MEMBER_NAME_TAKEN",
    "MEMBER_LIMIT_REACHED",
    "LEDGER_NOT_FOUND",
    "EXPENSE_NOT_FOUND",
    "MEMBER_NOT_FOUND",
    "LINK_NOT_FOUND",
    "MEMBER_NOT_IN_LEDGER",
    "AMOUNT_TOO_SMALL",
    "SHARES_SUM_MISMATCH",
    "PERCENT_SUM_MISMATCH",
    "SETTLEMENT_STARTED",
    "LEDGER_CLOSED",
    "UNAUTHENTICATED",
  ] as const;

  it.each(reachable)("%s has its own Ukrainian message", (code) => {
    const text = messageForCode(code, { limit: 20, differenceKopecks: 1, differenceBp: 1 });
    expect(text).not.toBe(uk.errors.default);
    expect(text).toMatch(/[А-Яа-яІіЇїЄє]/);
  });

  it("every catalogue code gives some non-empty text, never undefined or a raw code", () => {
    for (const code of ERROR_CODES) {
      const text = messageForCode(code);
      expect(text, code).toBeTruthy();
      expect(text, code).not.toContain(code);
    }
  });

  it("an unknown code falls back to the generic message", () => {
    expect(messageForCode("SOMETHING_NEW")).toBe(uk.errors.default);
  });

  it("the amounts in sum-mismatch messages come from the params, formatted as money", () => {
    expect(messageForCode("SHARES_SUM_MISMATCH", { differenceKopecks: 250 })).toContain("2.50");
    expect(messageForCode("SHARES_SUM_MISMATCH", { differenceKopecks: 1 })).toContain("0.01");
    expect(messageForCode("PERCENT_SUM_MISMATCH", { differenceBp: 1 })).toContain("0.01");
    expect(messageForCode("PERCENT_SUM_MISMATCH", { differenceBp: 1000 })).toContain("10");
  });

  it("the member limit in the message is the one the server sent, else the shared limit", () => {
    expect(messageForCode("MEMBER_LIMIT_REACHED", { limit: 7 })).toContain("7");
    expect(messageForCode("MEMBER_LIMIT_REACHED")).toContain(String(LIMITS.membersPerLedger));
  });

  it("a missing or non-numeric param does not produce NaN or undefined in the text", () => {
    const variants: (Record<string, string | number> | undefined)[] = [undefined, {}, { differenceKopecks: "abc" }];
    for (const params of variants) {
      const text = messageForCode("SHARES_SUM_MISMATCH", params);
      expect(text).not.toMatch(/NaN|undefined/);
    }
  });
});

describe("messageForError", () => {
  it("uses the code of an ApiError, not its English developer message", () => {
    const error = new ApiError(409, "EMAIL_TAKEN", "An account with this e-mail already exists.");
    expect(messageForError(error)).toBe(uk.errors.EMAIL_TAKEN);
  });

  it.each([
    ["an ApiError without a code (API down)", new ApiError(502, null, "Unexpected response 502")],
    ["a network TypeError", new TypeError("Failed to fetch")],
    ["a string", "boom"],
    ["undefined", undefined],
  ])("%s gives the generic message", (_name, error) => {
    expect(messageForError(error)).toBe(uk.errors.default);
  });
});

describe("fieldMessages", () => {
  const detail = (field: string, code: ValidationDetailCode) => ({ field, code, message: "x" });

  it("maps each detail code to a Ukrainian field message", () => {
    const result = fieldMessages(
      [detail("a", "REQUIRED"), detail("b", "INVALID_EMAIL"), detail("c", "DUPLICATE_ITEM"), detail("d", "OUT_OF_RANGE")],
      {},
    );
    expect(result).toEqual({
      a: uk.fieldErrors.required,
      b: uk.fieldErrors.invalidEmail,
      c: uk.fieldErrors.duplicate,
      d: uk.fieldErrors.invalid,
    });
  });

  it("a blank name (TOO_SHORT with minimum 1) says 'fill in', a password says 'at least 8'", () => {
    const result = fieldMessages([detail("name", "TOO_SHORT"), detail("password", "TOO_SHORT")], {
      name: { min: 1 },
      password: { min: LIMITS.password.min },
    });
    expect(result.name).toBe(uk.fieldErrors.required);
    expect(result.password).toBe(uk.fieldErrors.tooShort(LIMITS.password.min));
    expect(result.password).toContain("8");
  });

  it("TOO_LONG quotes the field's maximum, and falls back to the generic text without one", () => {
    expect(fieldMessages([detail("title", "TOO_LONG")], { title: { max: LIMITS.expenseTitle.max } }).title).toContain("60");
    expect(fieldMessages([detail("title", "TOO_LONG")], {}).title).toBe(uk.fieldErrors.invalid);
  });

  it("the first problem of a field wins", () => {
    const result = fieldMessages([detail("email", "REQUIRED"), detail("email", "INVALID_EMAIL")], {});
    expect(result.email).toBe(uk.fieldErrors.required);
  });

  it("every detail code the API can send produces a message", () => {
    for (const code of VALIDATION_DETAIL_CODES) {
      expect(fieldMessages([detail("f", code)], { f: { min: 2, max: 5 } }).f, code).toBeTruthy();
    }
  });

  it("no details means no messages", () => {
    expect(fieldMessages([], {})).toEqual({});
  });
});
