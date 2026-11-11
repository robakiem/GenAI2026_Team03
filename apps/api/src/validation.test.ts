import { describe, expect, it } from "vitest";
import { z } from "zod";
import { addMemberSchema, createLedgerSchema, signUpSchema } from "@babki/shared";
import { AppError } from "./errors";
import { parseBody } from "./validation";

function catchError(fn: () => unknown): AppError {
  try {
    fn();
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error("expected an AppError to be thrown");
}

const name = (length: number) => "x".repeat(length);

describe("ledger name validation (US-004)", () => {
  it("accepts a name of 1 and 60 characters and trims it", () => {
    expect(parseBody(createLedgerSchema, { name: "  Carpathians  ", coordinatorName: "Olia" })).toEqual({
      name: "Carpathians",
      coordinatorName: "Olia",
    });
    expect(parseBody(createLedgerSchema, { name: name(60), coordinatorName: "Olia" }).name).toHaveLength(60);
  });

  it("A blank or too long name is refused", () => {
    for (const value of ["", "   ", name(61)]) {
      const error = catchError(() => parseBody(createLedgerSchema, { name: value, coordinatorName: "Olia" }));
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.details?.[0]?.field).toBe("name");
      expect(["TOO_SHORT", "TOO_LONG"]).toContain(error.details?.[0]?.code);
    }
  });
});

describe("member name validation (US-005)", () => {
  it("accepts 1 and 40 characters, refuses 41", () => {
    expect(parseBody(addMemberSchema, { name: name(40) }).name).toHaveLength(40);
    const error = catchError(() => parseBody(addMemberSchema, { name: name(41) }));
    expect(error.details?.[0]?.code).toBe("TOO_LONG");
  });

  it("reports a missing name as REQUIRED", () => {
    const error = catchError(() => parseBody(addMemberSchema, {}));
    expect(error.details?.[0]?.code).toBe("REQUIRED");
  });
});

describe("limits at their boundaries (contracts 2.1)", () => {
  const passwordOf = (length: number) => parseBody(signUpSchema, { email: "olia@example.com", password: name(length) });
  // 64 + 1 + 60 + 1 + 60 + 1 + 63 + ".com" = 254 characters; ".comm" makes 255.
  const emailOf = (tld: string) => `${name(64)}@${"b".repeat(60)}.${"c".repeat(60)}.${"d".repeat(63)}.${tld}`;

  it("accepts a ledger, Coordinator and member name of 1 character", () => {
    expect(parseBody(createLedgerSchema, { name: "K", coordinatorName: "O" })).toEqual({ name: "K", coordinatorName: "O" });
    expect(parseBody(addMemberSchema, { name: "M" }).name).toBe("M");
  });

  it("accepts a password of 8 and 128 characters, refuses 7 and 129", () => {
    expect(passwordOf(8).password).toHaveLength(8);
    expect(passwordOf(128).password).toHaveLength(128);
    expect(catchError(() => passwordOf(7)).details?.[0]).toMatchObject({ field: "password", code: "TOO_SHORT" });
    expect(catchError(() => passwordOf(129)).details?.[0]).toMatchObject({ field: "password", code: "TOO_LONG" });
  });

  it("accepts an e-mail of 254 characters, refuses 255", () => {
    expect(parseBody(signUpSchema, { email: emailOf("com"), password: "password1" }).email).toHaveLength(254);
    const error = catchError(() => parseBody(signUpSchema, { email: emailOf("comm"), password: "password1" }));
    expect(error.details).toContainEqual(expect.objectContaining({ field: "email", code: "TOO_LONG" }));
  });
});

describe("integer fields (contracts 2.1, 3.4)", () => {
  const amountSchema = z.object({ amountKopecks: z.number().int() });

  it("reports a fractional amount as NOT_AN_INTEGER and a string as INVALID_TYPE", () => {
    const fraction = catchError(() => parseBody(amountSchema, { amountKopecks: 150.5 }));
    expect(fraction.details?.[0]).toMatchObject({ field: "amountKopecks", code: "NOT_AN_INTEGER" });
    const text = catchError(() => parseBody(amountSchema, { amountKopecks: "150" }));
    expect(text.details?.[0]).toMatchObject({ field: "amountKopecks", code: "INVALID_TYPE" });
  });
});

describe("account validation (US-004)", () => {
  it("normalises the e-mail and accepts a valid one", () => {
    expect(parseBody(signUpSchema, { email: "  Olia@Example.COM ", password: "password1" }).email).toBe(
      "olia@example.com",
    );
  });

  it("refuses an invalid e-mail and a short password", () => {
    expect(catchError(() => parseBody(signUpSchema, { email: "not-an-email", password: "password1" })).details?.[0]?.code).toBe(
      "INVALID_EMAIL",
    );
    const short = catchError(() => parseBody(signUpSchema, { email: "olia@example.com", password: "short" }));
    expect(short.details?.[0]?.field).toBe("password");
    expect(short.details?.[0]?.code).toBe("TOO_SHORT");
  });
});
