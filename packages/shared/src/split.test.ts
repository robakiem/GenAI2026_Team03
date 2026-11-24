import { describe, expect, it } from "vitest";
import { splitExpense, type SplitOutcome } from "./split";
import { ANDRII, IRYNA, MAX, MEMBER_ORDER, OLIA } from "./test/carpathians";

const amountsOf = (outcome: SplitOutcome) => {
  if (!outcome.ok) throw new Error(`expected a split, got ${outcome.code}`);
  return outcome.shares.map((share) => [share.memberId, share.amountKopecks]);
};

const sumOf = (outcome: SplitOutcome) => {
  if (!outcome.ok) throw new Error(`expected a split, got ${outcome.code}`);
  return outcome.shares.reduce((sum, share) => sum + share.amountKopecks, 0);
};

describe("US-019: equal split", () => {
  // The participants are deliberately listed in reverse: the selection order must not matter (BR-05).
  it.each([
    [10_000, 3334, 3333, 3333],
    [20_000, 6667, 6667, 6666],
    [100, 34, 33, 33],
    [4, 2, 1, 1],
  ])("Leftover kopecks go to the earliest members: %i", (amount, olia, max, iryna) => {
    const outcome = splitExpense(amount, { mode: "EQUAL", participantIds: [IRYNA, MAX, OLIA] }, MEMBER_ORDER);
    expect(amountsOf(outcome)).toEqual([
      [OLIA, olia],
      [MAX, max],
      [IRYNA, iryna],
    ]);
  });

  it("Groceries 1850.50 shared by four gives 462.63, 462.63, 462.62, 462.62", () => {
    const outcome = splitExpense(185_050, { mode: "EQUAL", participantIds: [...MEMBER_ORDER] }, MEMBER_ORDER);
    expect(amountsOf(outcome)).toEqual([
      [OLIA, 46263],
      [MAX, 46263],
      [IRYNA, 46262],
      [ANDRII, 46262],
    ]);
  });

  it.each([
    [1, [OLIA, MAX]],
    [2, [OLIA, MAX, IRYNA]],
  ])("An amount too small is refused: %i kopecks", (amount, participants) => {
    expect(splitExpense(amount, { mode: "EQUAL", participantIds: participants }, MEMBER_ORDER)).toEqual({
      ok: false,
      code: "AMOUNT_TOO_SMALL",
      params: { participantCount: participants.length },
    });
  });

  it("an amount that gives each participant exactly 0.01 is accepted", () => {
    const outcome = splitExpense(3, { mode: "EQUAL", participantIds: [OLIA, MAX, IRYNA] }, MEMBER_ORDER);
    expect(amountsOf(outcome)).toEqual([
      [OLIA, 1],
      [MAX, 1],
      [IRYNA, 1],
    ]);
  });

  it("a single participant carries the whole amount", () => {
    const outcome = splitExpense(12_345, { mode: "EQUAL", participantIds: [MAX] }, MEMBER_ORDER);
    expect(amountsOf(outcome)).toEqual([[MAX, 12_345]]);
  });

  it("equal shares have no percentage", () => {
    const outcome = splitExpense(100, { mode: "EQUAL", participantIds: [OLIA] }, MEMBER_ORDER);
    expect(outcome.ok && outcome.shares[0]?.percentBp).toBeNull();
  });
});

describe("US-020-a: specific amounts", () => {
  const funicular = (andrii: number) =>
    splitExpense(
      90_000,
      {
        mode: "AMOUNTS",
        shares: [
          { memberId: OLIA, amountKopecks: 25_000 },
          { memberId: MAX, amountKopecks: 25_000 },
          { memberId: IRYNA, amountKopecks: 25_000 },
          { memberId: ANDRII, amountKopecks: andrii },
        ],
      },
      MEMBER_ORDER,
    );

  it("The funicular is split by agreed amounts", () => {
    expect(amountsOf(funicular(15_000))).toEqual([
      [OLIA, 25_000],
      [MAX, 25_000],
      [IRYNA, 25_000],
      [ANDRII, 15_000],
    ]);
  });

  it.each([
    [14_999, 1],
    [15_001, 1],
    [10_000, 5000],
  ])("Amounts that do not add up are refused with the difference: Andrii %i", (andrii, difference) => {
    expect(funicular(andrii)).toEqual({
      ok: false,
      code: "SHARES_SUM_MISMATCH",
      params: { differenceKopecks: difference },
    });
  });

  it("shares come back in ledger order whatever the input order", () => {
    const outcome = splitExpense(
      300,
      {
        mode: "AMOUNTS",
        shares: [
          { memberId: IRYNA, amountKopecks: 100 },
          { memberId: OLIA, amountKopecks: 200 },
        ],
      },
      MEMBER_ORDER,
    );
    expect(amountsOf(outcome)).toEqual([
      [OLIA, 200],
      [IRYNA, 100],
    ]);
  });
});

describe("US-020-b: percentages", () => {
  it("A cost is split 50 / 30 / 20", () => {
    const outcome = splitExpense(
      100_000,
      {
        mode: "PERCENTAGES",
        shares: [
          { memberId: OLIA, percentBp: 5000 },
          { memberId: MAX, percentBp: 3000 },
          { memberId: IRYNA, percentBp: 2000 },
        ],
      },
      MEMBER_ORDER,
    );
    expect(outcome).toEqual({
      ok: true,
      shares: [
        { memberId: OLIA, amountKopecks: 50_000, percentBp: 5000 },
        { memberId: MAX, amountKopecks: 30_000, percentBp: 3000 },
        { memberId: IRYNA, amountKopecks: 20_000, percentBp: 2000 },
      ],
    });
  });

  it("A leftover kopeck goes to the earlier member", () => {
    const outcome = splitExpense(
      10_001,
      {
        mode: "PERCENTAGES",
        shares: [
          { memberId: MAX, percentBp: 5000 },
          { memberId: OLIA, percentBp: 5000 },
        ],
      },
      MEMBER_ORDER,
    );
    expect(amountsOf(outcome)).toEqual([
      [OLIA, 5001],
      [MAX, 5000],
    ]);
  });

  it.each([
    [3333, 3333, 3333, 1],
    [5000, 3000, 1000, 1000],
  ])("Percentages that do not add up to 100 are refused: %i / %i / %i", (olia, max, iryna, difference) => {
    const outcome = splitExpense(
      9000,
      {
        mode: "PERCENTAGES",
        shares: [
          { memberId: OLIA, percentBp: olia },
          { memberId: MAX, percentBp: max },
          { memberId: IRYNA, percentBp: iryna },
        ],
      },
      MEMBER_ORDER,
    );
    expect(outcome).toEqual({ ok: false, code: "PERCENT_SUM_MISMATCH", params: { differenceBp: difference } });
  });

  it("a split that would give someone 0.00 is refused", () => {
    const outcome = splitExpense(
      1,
      {
        mode: "PERCENTAGES",
        shares: [
          { memberId: OLIA, percentBp: 5000 },
          { memberId: MAX, percentBp: 5000 },
        ],
      },
      MEMBER_ORDER,
    );
    expect(outcome).toEqual({ ok: false, code: "AMOUNT_TOO_SMALL", params: { participantCount: 2 } });
  });
});

describe("BR-02, BR-03: shares always add up exactly and are never 0.00", () => {
  it("holds for many amounts and groups of every split mode", () => {
    for (let amount = 7; amount < 200_000; amount += 7919) {
      for (let count = 1; count <= MEMBER_ORDER.length; count++) {
        const ids = MEMBER_ORDER.slice(0, count);
        const equal = splitExpense(amount, { mode: "EQUAL", participantIds: ids }, MEMBER_ORDER);
        expect(sumOf(equal)).toBe(amount);

        const base = Math.floor(10_000 / count);
        const percents = ids.map((memberId, i) => ({ memberId, percentBp: i === 0 ? 10_000 - base * (count - 1) : base }));
        const percent = splitExpense(amount, { mode: "PERCENTAGES", shares: percents }, MEMBER_ORDER);
        expect(sumOf(percent)).toBe(amount);
        if (percent.ok) expect(percent.shares.every((share) => share.amountKopecks >= 1)).toBe(true);
      }
    }
  });
});
