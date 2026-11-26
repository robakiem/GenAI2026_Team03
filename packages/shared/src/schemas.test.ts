import { describe, expect, it } from "vitest";
import { ERROR_CODES, ERROR_STATUS, errorResponseSchema, VALIDATION_DETAIL_CODES } from "./errors";
import { healthResponseSchema } from "./health";
import { deriveLedgerState, isFullySettled } from "./ledger";
import { LIMITS } from "./limits";
import {
  addMemberSchema,
  createExpenseSchema,
  createLedgerSchema,
  expenseBodySchema,
  paymentDetailsSchema,
  signInSchema,
  signUpSchema,
  toMemberNameKey,
} from "./schemas";
import { validateInput, zodErrorToDetails } from "./validation";

// One home for every input rule (contracts 2.1): the same schema serves the forms and the API.
const detailsOf = (schema: Parameters<typeof validateInput>[0], input: unknown) => {
  const result = validateInput(schema, input);
  if (result.success) throw new Error("expected a validation failure");
  return result.details.map((d) => [d.field, d.code]);
};
const expense = (over: Record<string, unknown> = {}) => ({
  title: "Lunch",
  amountKopecks: 1000,
  payerId: "m1",
  split: { mode: "EQUAL", participantIds: ["m1", "m2"] },
  ...over,
});

describe("Sign-up and sign-in", () => {
  it("normalises the e-mail: trimmed and lower-cased", () => {
    expect(signUpSchema.parse({ email: "  Olia@Example.COM ", password: "password1" }).email).toBe("olia@example.com");
    expect(signInSchema.parse({ email: " A@B.co ", password: "x" }).email).toBe("a@b.co");
  });

  it.each([
    [{ email: "not-an-email", password: "password1" }, [["email", "INVALID_EMAIL"]]],
    [{ email: "a@b.co", password: "short" }, [["password", "TOO_SHORT"]]],
    [{ email: "a@b.co", password: "p".repeat(129) }, [["password", "TOO_LONG"]]],
    [{ password: "password1" }, [["email", "REQUIRED"]]],
    [{ email: 42, password: "password1" }, [["email", "INVALID_TYPE"]]],
    [{ email: `${"a".repeat(250)}@b.co`, password: "password1" }, [["email", "TOO_LONG"]]],
  ])("rejects %j", (input, expected) => {
    expect(detailsOf(signUpSchema, input)).toEqual(expected);
  });

  it("accepts the password boundaries 8 and 128", () => {
    for (const length of [LIMITS.password.min, LIMITS.password.max]) {
      expect(signUpSchema.safeParse({ email: "a@b.co", password: "p".repeat(length) }).success).toBe(true);
    }
  });

  it("sign-in does not check the e-mail format: a wrong address must read as bad credentials", () => {
    expect(signInSchema.safeParse({ email: "whatever", password: "x" }).success).toBe(true);
    expect(detailsOf(signInSchema, { email: "", password: "" })).toEqual([
      ["email", "TOO_SHORT"],
      ["password", "TOO_SHORT"],
    ]);
  });
});

describe("Ledger and member names", () => {
  it("trims names and refuses a blank one", () => {
    expect(createLedgerSchema.parse({ name: "  Carpathians ", coordinatorName: " Olia " })).toEqual({
      name: "Carpathians",
      coordinatorName: "Olia",
    });
    expect(detailsOf(createLedgerSchema, { name: "   ", coordinatorName: "Olia" })).toEqual([["name", "TOO_SHORT"]]);
    expect(detailsOf(addMemberSchema, { name: "" })).toEqual([["name", "TOO_SHORT"]]);
  });

  it("accepts the length boundaries and refuses one more", () => {
    expect(createLedgerSchema.safeParse({ name: "x".repeat(60), coordinatorName: "y".repeat(40) }).success).toBe(true);
    expect(detailsOf(createLedgerSchema, { name: "x".repeat(61), coordinatorName: "y".repeat(41) })).toEqual([
      ["name", "TOO_LONG"],
      ["coordinatorName", "TOO_LONG"],
    ]);
  });

  it("the unique-name key ignores case and surrounding spaces (BR-19)", () => {
    expect(toMemberNameKey("  MAX ")).toBe(toMemberNameKey("max"));
    expect(toMemberNameKey("Max")).not.toBe(toMemberNameKey("Maks"));
  });
});

describe("Expense body", () => {
  it("accepts all three split modes", () => {
    expect(expenseBodySchema.safeParse(expense()).success).toBe(true);
    expect(
      expenseBodySchema.safeParse(expense({ split: { mode: "AMOUNTS", shares: [{ memberId: "m1", amountKopecks: 1000 }] } })).success,
    ).toBe(true);
    expect(
      expenseBodySchema.safeParse(expense({ split: { mode: "PERCENTAGES", shares: [{ memberId: "m1", percentBp: 10_000 }] } })).success,
    ).toBe(true);
  });

  it.each([
    [{ amountKopecks: 0 }, [["amountKopecks", "OUT_OF_RANGE"]]],
    [{ amountKopecks: 100_000_000 }, [["amountKopecks", "OUT_OF_RANGE"]]],
    [{ amountKopecks: 1.5 }, [["amountKopecks", "NOT_AN_INTEGER"]]],
    [{ amountKopecks: "10" }, [["amountKopecks", "INVALID_TYPE"]]],
    [{ title: "  " }, [["title", "TOO_SHORT"]]],
    [{ title: "t".repeat(61) }, [["title", "TOO_LONG"]]],
    [{ payerId: "" }, [["payerId", "TOO_SHORT"]]],
    [{ split: { mode: "EQUAL", participantIds: [] } }, [["split.participantIds", "TOO_FEW_ITEMS"]]],
    [{ split: { mode: "EQUAL", participantIds: ["m1", "m1"] } }, [["split.participantIds[1]", "DUPLICATE_ITEM"]]],
    [{ split: { mode: "NOPE" } }, [["split.mode", "INVALID_TYPE"]]],
    [
      { split: { mode: "AMOUNTS", shares: [{ memberId: "m1", amountKopecks: 5 }, { memberId: "m1", amountKopecks: 5 }] } },
      [["split.shares[1].memberId", "DUPLICATE_ITEM"]],
    ],
    [
      { split: { mode: "PERCENTAGES", shares: [{ memberId: "m1", percentBp: 0 }] } },
      [["split.shares[0].percentBp", "OUT_OF_RANGE"]],
    ],
    [
      { split: { mode: "PERCENTAGES", shares: [{ memberId: "m1", percentBp: 10_001 }] } },
      [["split.shares[0].percentBp", "OUT_OF_RANGE"]],
    ],
  ])("rejects %j", (over, expected) => {
    expect(detailsOf(expenseBodySchema, expense(over))).toEqual(expected);
  });

  it("a missing field is REQUIRED, not INVALID_TYPE", () => {
    expect(detailsOf(expenseBodySchema, {})).toEqual([
      ["title", "REQUIRED"],
      ["amountKopecks", "REQUIRED"],
      ["payerId", "REQUIRED"],
      ["split", "REQUIRED"],
    ]);
  });

  it("the idempotency key is optional, 1…64 characters", () => {
    expect(createExpenseSchema.safeParse(expense()).success).toBe(true);
    expect(createExpenseSchema.safeParse(expense({ clientRequestId: "k".repeat(64) })).success).toBe(true);
    expect(detailsOf(createExpenseSchema, expense({ clientRequestId: "" }))).toEqual([["clientRequestId", "TOO_SHORT"]]);
    expect(detailsOf(createExpenseSchema, expense({ clientRequestId: "k".repeat(65) }))).toEqual([["clientRequestId", "TOO_LONG"]]);
  });
});

describe("Payment details (EP-10)", () => {
  it.each([
    ["Card 0000", "Card 0000"],
    ["", null],
    ["   ", null],
    [null, null],
    ["x".repeat(100), "x".repeat(100)],
  ])("%j is stored as %j", (input, stored) => {
    expect(paymentDetailsSchema.parse({ paymentDetails: input }).paymentDetails).toBe(stored);
  });

  it("101 characters are refused", () => {
    expect(detailsOf(paymentDetailsSchema, { paymentDetails: "x".repeat(101) })).toEqual([["paymentDetails", "TOO_LONG"]]);
  });
});

describe("validateInput and zodErrorToDetails", () => {
  it("returns the parsed value on success", () => {
    expect(validateInput(addMemberSchema, { name: " Max " })).toEqual({ success: true, data: { name: "Max" } });
  });

  it("returns one detail per problem with a dotted/indexed field path", () => {
    const result = addMemberSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodErrorToDetails(result.error, {})).toEqual([{ field: "name", code: "REQUIRED", message: expect.any(String) as string }]);
    }
  });

  it("a body that is not an object reports the root field as an empty string", () => {
    expect(detailsOf(addMemberSchema, [1])).toEqual([["", "INVALID_TYPE"]]);
    expect(detailsOf(addMemberSchema, null)).toEqual([["", "INVALID_TYPE"]]);
  });
});

describe("Ledger state (BR-46, CD-03)", () => {
  it.each([
    [null, false, "ACTIVE"],
    [null, true, "SETTLING"],
    [new Date(), false, "CLOSED"],
    ["2026-01-01T00:00:00Z", true, "CLOSED"],
  ] as const)("closedAt=%j hasTransfers=%j → %s", (closedAt, hasTransfers, state) => {
    expect(deriveLedgerState(closedAt, hasTransfers)).toBe(state);
  });

  it.each([
    [new Date(), ["CONFIRMED", "CONFIRMED"], true],
    [new Date(), ["CONFIRMED", "REPORTED_PAID"], false],
    [new Date(), ["CONFIRMED", "OPEN"], false],
    [new Date(), [], false],
    [null, ["CONFIRMED"], false],
  ] as const)("closed=%j states=%j → fully settled %j", (closedAt, states, expected) => {
    expect(isFullySettled(closedAt, states)).toBe(expected);
  });
});

describe("Error catalogue (contracts 3.3)", () => {
  it("every code has an HTTP status of 400…599 and the list is complete", () => {
    expect(ERROR_CODES.length).toBe(Object.keys(ERROR_STATUS).length);
    for (const code of ERROR_CODES) {
      expect(ERROR_STATUS[code], code).toBeGreaterThanOrEqual(400);
      expect(ERROR_STATUS[code], code).toBeLessThan(600);
    }
  });

  it("only INTERNAL_ERROR and DB_UNAVAILABLE are server errors; everything else is the client's", () => {
    const server = ERROR_CODES.filter((code) => ERROR_STATUS[code] >= 500);
    expect(server.sort()).toEqual(["DB_UNAVAILABLE", "INTERNAL_ERROR"]);
  });

  it("the error response schema accepts details and params and refuses an unknown code", () => {
    const ok = { error: { code: "VALIDATION_ERROR", message: "m", details: [{ field: "f", code: VALIDATION_DETAIL_CODES[0], message: "m" }], params: { a: 1, b: "x" } } };
    expect(errorResponseSchema.safeParse(ok).success).toBe(true);
    expect(errorResponseSchema.safeParse({ error: { code: "NOPE", message: "m" } }).success).toBe(false);
    expect(errorResponseSchema.safeParse({ error: { code: "NOT_FOUND" } }).success).toBe(false);
  });

  it("the health response is exactly ok/babki-api/ok", () => {
    expect(healthResponseSchema.safeParse({ status: "ok", service: "babki-api", db: "ok" }).success).toBe(true);
    expect(healthResponseSchema.safeParse({ status: "ok", service: "other", db: "ok" }).success).toBe(false);
  });
});
