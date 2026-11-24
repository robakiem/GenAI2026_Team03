import { describe, expect, it } from "vitest";
import { computeBalances, memberBreakdown, proposeTransfers, type SettlementExpense } from "./settlement";
import { splitExpense, type SplitInput } from "./split";
import { ANDRII, CARPATHIANS, IRYNA, MAX, MEMBER_ORDER, OLIA } from "./test/carpathians";

// Build an expense the way the API stores it: the shares come from the shared split function.
function expense(title: string, amountKopecks: number, payerId: string, split: SplitInput): SettlementExpense {
  const outcome = splitExpense(amountKopecks, split, MEMBER_ORDER);
  if (!outcome.ok) throw new Error(`test data is invalid: ${outcome.code}`);
  return { title, amountKopecks, payerId, shares: outcome.shares };
}

const equal = (...participantIds: string[]): SplitInput => ({ mode: "EQUAL", participantIds });

const balanceMap = (expenses: SettlementExpense[]) =>
  Object.fromEntries(computeBalances(MEMBER_ORDER, expenses).map((b) => [b.memberId, b.balanceKopecks]));

const settle = (expenses: SettlementExpense[]) => proposeTransfers(computeBalances(MEMBER_ORDER, expenses));

describe("US-016, US-017, US-018: balances after an expense", () => {
  it("Coordinator records a purchase they paid for", () => {
    const rent = [expense("House rent", 600_000, OLIA, equal(OLIA, MAX, IRYNA, ANDRII))];
    expect(rent[0]?.shares.map((s) => s.amountKopecks)).toEqual([150_000, 150_000, 150_000, 150_000]);
    expect(balanceMap(rent)).toEqual({ [OLIA]: 450_000, [MAX]: -150_000, [IRYNA]: -150_000, [ANDRII]: -150_000 });
    expect(settle(rent)).toEqual([
      { fromMemberId: MAX, toMemberId: OLIA, amountKopecks: 150_000 },
      { fromMemberId: IRYNA, toMemberId: OLIA, amountKopecks: 150_000 },
      { fromMemberId: ANDRII, toMemberId: OLIA, amountKopecks: 150_000 },
    ]);
  });

  it("A friend paid but does not share the expense", () => {
    const tickets = [expense("Tickets", 10_000, MAX, equal(OLIA, IRYNA))];
    expect(balanceMap(tickets)).toEqual({ [OLIA]: -5000, [MAX]: 10_000, [IRYNA]: -5000, [ANDRII]: 0 });
  });

  it("Three of four friends share a taxi", () => {
    const taxi = [expense("Taxi", 42_000, IRYNA, equal(OLIA, IRYNA, ANDRII))];
    expect(taxi[0]?.shares.map((s) => s.amountKopecks)).toEqual([14_000, 14_000, 14_000]);
    expect(balanceMap(taxi)).toEqual({ [OLIA]: -14_000, [MAX]: 0, [IRYNA]: 28_000, [ANDRII]: -14_000 });
  });

  it("The funicular is split by agreed amounts", () => {
    const funicular = [
      expense("Funicular", 90_000, ANDRII, {
        mode: "AMOUNTS",
        shares: [
          { memberId: OLIA, amountKopecks: 25_000 },
          { memberId: MAX, amountKopecks: 25_000 },
          { memberId: IRYNA, amountKopecks: 25_000 },
          { memberId: ANDRII, amountKopecks: 15_000 },
        ],
      }),
    ];
    expect(balanceMap(funicular)).toEqual({ [OLIA]: -25_000, [MAX]: -25_000, [IRYNA]: -25_000, [ANDRII]: 75_000 });
  });

  it("A cost is split 50 / 30 / 20", () => {
    const cabin = [
      expense("Cabin", 100_000, OLIA, {
        mode: "PERCENTAGES",
        shares: [
          { memberId: OLIA, percentBp: 5000 },
          { memberId: MAX, percentBp: 3000 },
          { memberId: IRYNA, percentBp: 2000 },
        ],
      }),
    ];
    expect(balanceMap(cabin)).toEqual({ [OLIA]: 50_000, [MAX]: -30_000, [IRYNA]: -20_000, [ANDRII]: 0 });
  });

  it("balances come in ledger order and a ledger with no expenses has all zeros", () => {
    expect(computeBalances(MEMBER_ORDER, [])).toEqual(MEMBER_ORDER.map((memberId) => ({ memberId, balanceKopecks: 0 })));
  });
});

describe("US-044: who pays whom", () => {
  it("Proposed transfers for the Carpathians trip", () => {
    expect(balanceMap(CARPATHIANS)).toEqual({
      [OLIA]: 364_737,
      [MAX]: -36_213,
      [IRYNA]: -193_262,
      [ANDRII]: -135_262,
    });
    expect(settle(CARPATHIANS)).toEqual([
      { fromMemberId: MAX, toMemberId: OLIA, amountKopecks: 36_213 },
      { fromMemberId: IRYNA, toMemberId: OLIA, amountKopecks: 193_262 },
      { fromMemberId: ANDRII, toMemberId: OLIA, amountKopecks: 135_262 },
    ]);
  });

  it("Debts that cancel out are netted", () => {
    const expenses = [expense("For Max", 10_000, OLIA, equal(MAX)), expense("For Iryna", 10_000, MAX, equal(IRYNA))];
    expect(settle(expenses)).toEqual([{ fromMemberId: IRYNA, toMemberId: OLIA, amountKopecks: 10_000 }]);
  });

  it("The same expenses in a different order give the same list", () => {
    const forward = settle(CARPATHIANS);
    expect(settle([...CARPATHIANS].reverse())).toEqual(forward);
    expect(settle([CARPATHIANS[2], CARPATHIANS[0], CARPATHIANS[3], CARPATHIANS[1]])).toEqual(forward);
  });

  it("an empty ledger or all-zero balances need no transfers", () => {
    expect(settle([])).toEqual([]);
    expect(settle([expense("Own lunch", 5000, MAX, equal(MAX))])).toEqual([]);
  });

  it("several creditors: every transfer list zeroes all balances with at most n − 1 transfers", () => {
    const expenses = [
      expense("Rent", 100_000, OLIA, equal(OLIA, MAX, IRYNA, ANDRII)),
      expense("Car", 60_000, MAX, equal(OLIA, MAX, IRYNA, ANDRII)),
      expense("Museum", 9_999, IRYNA, equal(OLIA, ANDRII)),
    ];
    const balances = computeBalances(MEMBER_ORDER, expenses);
    expect(balances.reduce((sum, b) => sum + b.balanceKopecks, 0)).toBe(0);

    const transfers = proposeTransfers(balances);
    const after = new Map(balances.map((b) => [b.memberId, b.balanceKopecks]));
    for (const t of transfers) {
      expect(t.amountKopecks).toBeGreaterThan(0);
      after.set(t.fromMemberId, after.get(t.fromMemberId)! + t.amountKopecks);
      after.set(t.toMemberId, after.get(t.toMemberId)! - t.amountKopecks);
    }
    expect([...after.values()].every((v) => v === 0)).toBe(true);
    const nonZero = balances.filter((b) => b.balanceKopecks !== 0).length;
    expect(transfers.length).toBeLessThanOrEqual(nonZero - 1);
    // Transfers are listed by the debtor's ledger position (CD-17).
    const debtorOrder = transfers.map((t) => MEMBER_ORDER.indexOf(t.fromMemberId as (typeof MEMBER_ORDER)[number]));
    expect(debtorOrder).toEqual([...debtorOrder].sort((a, b) => a - b));
  });

  it("ties between equal debts are broken by ledger order, not input order", () => {
    const balances = [
      { memberId: OLIA, balanceKopecks: -100 },
      { memberId: MAX, balanceKopecks: -100 },
      { memberId: IRYNA, balanceKopecks: 100 },
      { memberId: ANDRII, balanceKopecks: 100 },
    ];
    expect(proposeTransfers(balances)).toEqual([
      { fromMemberId: OLIA, toMemberId: IRYNA, amountKopecks: 100 },
      { fromMemberId: MAX, toMemberId: ANDRII, amountKopecks: 100 },
    ]);
  });
});

describe("US-048: recalculation after changes", () => {
  it("Correcting an amount updates the transfers at once", () => {
    const before = [expense("Groceries", 30_000, OLIA, equal(OLIA, MAX, IRYNA))];
    expect(settle(before)).toEqual([
      { fromMemberId: MAX, toMemberId: OLIA, amountKopecks: 10_000 },
      { fromMemberId: IRYNA, toMemberId: OLIA, amountKopecks: 10_000 },
    ]);
    const after = [expense("Groceries", 15_000, OLIA, equal(OLIA, MAX, IRYNA))];
    expect(settle(after)).toEqual([
      { fromMemberId: MAX, toMemberId: OLIA, amountKopecks: 5000 },
      { fromMemberId: IRYNA, toMemberId: OLIA, amountKopecks: 5000 },
    ]);
  });
});

describe("US-021: records without a limit", () => {
  it("500 expenses are recorded and the 501st works too", () => {
    const lunch = () => expense("Lunch", 1000, OLIA, equal(OLIA, MAX));
    const expenses = Array.from({ length: 500 }, lunch);
    expect(balanceMap(expenses)[OLIA]).toBe(250_000);
    expect(balanceMap(expenses)[MAX]).toBe(-250_000);
    expenses.push(lunch());
    expect(balanceMap(expenses)[OLIA]).toBe(250_500);
  });
});

describe("US-030: my breakdown", () => {
  it("Max checks his amount", () => {
    expect(memberBreakdown(MAX, CARPATHIANS)).toEqual({
      lines: [
        { title: "House rent", paidKopecks: 0, shareKopecks: 150_000 },
        { title: "Groceries", paidKopecks: 185_050, shareKopecks: 46_263 },
        { title: "Funicular", paidKopecks: 0, shareKopecks: 25_000 },
      ],
      totalPaidKopecks: 185_050,
      totalSharesKopecks: 221_263,
      balanceKopecks: -36_213,
    });
  });

  it("A receiver's balance equals what she should receive", () => {
    const olia = memberBreakdown(OLIA, CARPATHIANS);
    expect(olia.totalPaidKopecks).toBe(600_000);
    expect(olia.totalSharesKopecks).toBe(235_263);
    expect(olia.balanceKopecks).toBe(364_737);
    const toOlia = settle(CARPATHIANS)
      .filter((t) => t.toMemberId === OLIA)
      .reduce((sum, t) => sum + t.amountKopecks, 0);
    expect(toOlia).toBe(364_737);
  });

  it("a member with no expenses sees an empty breakdown", () => {
    expect(memberBreakdown(MAX, [])).toEqual({ lines: [], totalPaidKopecks: 0, totalSharesKopecks: 0, balanceKopecks: 0 });
  });
});
