import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ServiceContext } from "../context";
import { AppError } from "../errors";
import { addCarpathiansExpenses, createTrip, type Trip } from "../test/carpathians";
import { createTestDb, type TestDb } from "../test/db";
import * as linkService from "./link.service";
import * as memberService from "./member.service";

let db: TestDb;
let trip: Trip;
const ctx = (): ServiceContext => ({ prisma: db.prisma });
const OLIA_DETAILS = "Card 0000 0000 0000 0001, Olia K.";

beforeEach(async () => {
  db = createTestDb();
  trip = await createTrip(ctx());
});
afterEach(async () => {
  await db.cleanup();
});

async function expectError(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error("expected an AppError to be thrown");
}

const setDetails = (memberId: string, paymentDetails: string | null) =>
  memberService.setPaymentDetails(ctx(), { accountId: trip.accountId, ledgerId: trip.ledgerId, memberId, paymentDetails });

describe("LinkService: member page (US-009, US-030, US-050, EP-18)", () => {
  it("Max opens his link on a phone", async () => {
    await addCarpathiansExpenses(ctx(), trip);
    await setDetails(trip.olia, OLIA_DETAILS);
    expect(await linkService.getMemberPage(ctx(), trip.tokens.max)).toEqual({
      ledger: { name: "Carpathians", state: "ACTIVE", fullySettled: false },
      member: { name: "Max" },
      youPay: [
        {
          toMemberId: trip.olia,
          toName: "Olia",
          amountKopecks: 36_213,
          state: "OPEN",
          reportedVia: null,
          paymentDetails: OLIA_DETAILS,
        },
      ],
      youReceive: [],
      breakdown: {
        lines: [
          { title: "House rent", paidKopecks: 0, shareKopecks: 150_000 },
          { title: "Groceries", paidKopecks: 185_050, shareKopecks: 46_263 },
          { title: "Funicular", paidKopecks: 0, shareKopecks: 25_000 },
        ],
        totalPaidKopecks: 185_050,
        totalSharesKopecks: 221_263,
        balanceKopecks: -36_213,
      },
    });
  });

  it("Iryna sees only her own transfer", async () => {
    await addCarpathiansExpenses(ctx(), trip);
    const page = await linkService.getMemberPage(ctx(), trip.tokens.iryna);
    expect(page.youPay.map((t) => t.amountKopecks)).toEqual([193_262]);
    const text = JSON.stringify(page);
    expect(text).not.toContain("36213");
    expect(text).not.toContain("135262");
    expect(text).not.toContain("364737");
    expect(text).not.toContain(trip.tokens.max);
  });

  it("A receiver's balance equals what she should receive", async () => {
    await addCarpathiansExpenses(ctx(), trip);
    await setDetails(trip.olia, OLIA_DETAILS);
    const page = await linkService.getMemberPage(ctx(), trip.tokens.olia);
    expect(page.youPay).toEqual([]);
    expect(page.youReceive.map((t) => [t.fromName, t.amountKopecks])).toEqual([
      ["Max", 36_213],
      ["Iryna", 193_262],
      ["Andrii", 135_262],
    ]);
    expect(page.youReceive.reduce((sum, t) => sum + t.amountKopecks, 0)).toBe(page.breakdown.balanceKopecks);
    // A receive-only member sees no one's payment details (BR-43).
    expect(JSON.stringify(page)).not.toContain(OLIA_DETAILS);
  });

  it("Missing details cannot be copied", async () => {
    await addCarpathiansExpenses(ctx(), trip);
    const page = await linkService.getMemberPage(ctx(), trip.tokens.iryna);
    expect(page.youPay[0]?.paymentDetails).toBeNull();
  });

  it("a member of a ledger with no expenses has nothing to pay, receive or show", async () => {
    const page = await linkService.getMemberPage(ctx(), trip.tokens.andrii);
    expect(page.youPay).toEqual([]);
    expect(page.youReceive).toEqual([]);
    expect(page.breakdown.lines).toEqual([]);
  });

  it.each([
    ["a text that was never issued", () => "never-issued-token-xyz1"],
    ["a valid link with its last character removed", () => trip.tokens.max.slice(0, -1)],
    ["an internal member id", () => trip.max],
  ])("An unknown link shows a neutral message: %s", async (_name, token) => {
    const error = await expectError(linkService.getMemberPage(ctx(), token()));
    expect(error.code).toBe("LINK_NOT_FOUND");
    expect(error.message).not.toContain("Carpathians");
    expect(error.message).not.toContain("Max");
  });
});

describe("MemberService: payment details (US-050, EP-10)", () => {
  it("Iryna copies Olia's details: the text is stored exactly", async () => {
    const { member } = await setDetails(trip.olia, OLIA_DETAILS);
    expect(member.paymentDetails).toBe(OLIA_DETAILS);
  });

  it("clearing the details stores none", async () => {
    await setDetails(trip.olia, OLIA_DETAILS);
    expect((await setDetails(trip.olia, null)).member.paymentDetails).toBeNull();
  });

  it("a member of another ledger is not found", async () => {
    const other = await createTrip(ctx(), "ivan@example.com");
    expect((await expectError(setDetails(other.max, "x"))).code).toBe("MEMBER_NOT_FOUND");
  });
});
