import { describe, expect, it } from "vitest";
import { formatBp, formatKopecks, parseAmount, parsePercent } from "./money";
import { computeBalances, proposeTransfers, type SettlementExpense } from "./settlement";
import { splitExpense, type SplitInput } from "./split";

// Property-based tests: instead of a few hand-picked examples, thousands of generated cases must
// satisfy the invariants of BR-02…BR-09 and BR-23…BR-27. The generator is seeded, so a failure
// is reproducible: the failing seed is part of the message.
function rng(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  return { next, int, shuffle };
}

const CASES = 500;
const ids = (n: number) => Array.from({ length: n }, (_, i) => `m${String(i + 1).padStart(2, "0")}`);
const MAX_AMOUNT = 99_999_999;

function randomEqual(r: ReturnType<typeof rng>) {
  const order = ids(r.int(1, 20));
  const participants = r.shuffle(order).slice(0, r.int(1, order.length));
  const amount = r.int(participants.length, r.next() < 0.5 ? 5_000 : MAX_AMOUNT);
  return { order, participants, amount };
}

describe("Equal split: invariants over generated cases", () => {
  it("shares add up to the amount, differ by at most one kopeck and are never below 0.01 (BR-02, BR-03)", () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const r = rng(seed);
      const { order, participants, amount } = randomEqual(r);
      const outcome = splitExpense(amount, { mode: "EQUAL", participantIds: participants }, order);
      if (!outcome.ok) throw new Error(`seed ${seed}: unexpected ${outcome.code}`);
      const amounts = outcome.shares.map((s) => s.amountKopecks);
      expect(amounts.reduce((a, b) => a + b, 0), `seed ${seed}`).toBe(amount);
      expect(Math.max(...amounts) - Math.min(...amounts), `seed ${seed}`).toBeLessThanOrEqual(1);
      expect(Math.min(...amounts), `seed ${seed}`).toBeGreaterThanOrEqual(1);
      expect(amounts.every(Number.isInteger), `seed ${seed}`).toBe(true);
    }
  });

  it("the earlier members of the ledger never get less than the later ones (BR-05)", () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const r = rng(seed);
      const { order, participants, amount } = randomEqual(r);
      const outcome = splitExpense(amount, { mode: "EQUAL", participantIds: participants }, order);
      if (!outcome.ok) throw new Error(`seed ${seed}`);
      const amounts = outcome.shares.map((s) => s.amountKopecks);
      expect(outcome.shares.map((s) => s.memberId), `seed ${seed}`).toEqual(
        order.filter((id) => participants.includes(id)),
      );
      expect([...amounts].sort((a, b) => b - a), `seed ${seed}`).toEqual(amounts);
    }
  });

  it("the order in which participants were selected does not change the result", () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const r = rng(seed);
      const { order, participants, amount } = randomEqual(r);
      const a = splitExpense(amount, { mode: "EQUAL", participantIds: participants }, order);
      const b = splitExpense(amount, { mode: "EQUAL", participantIds: r.shuffle(participants) }, order);
      expect(b, `seed ${seed}`).toEqual(a);
    }
  });

  it("an amount below one kopeck per participant is refused, never rounded to a 0.00 share (BR-03)", () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const r = rng(seed);
      const order = ids(r.int(2, 20));
      const amount = r.int(1, order.length - 1);
      const outcome = splitExpense(amount, { mode: "EQUAL", participantIds: order }, order);
      expect(outcome, `seed ${seed}`).toEqual({
        ok: false,
        code: "AMOUNT_TOO_SMALL",
        params: { participantCount: order.length },
      });
    }
  });
});

describe("Percentage split: invariants over generated cases", () => {
  // Random percentages that add up to exactly 100.00 (10 000 bp), each at least 0.01.
  function randomPercentages(r: ReturnType<typeof rng>, count: number): number[] {
    const cuts = new Set<number>();
    while (cuts.size < count - 1) cuts.add(r.int(1, 9_999));
    const sorted = [0, ...[...cuts].sort((a, b) => a - b), 10_000];
    return sorted.slice(1).map((cut, i) => cut - sorted[i]);
  }

  it("whenever it is accepted the shares add up exactly to the amount; otherwise it is AMOUNT_TOO_SMALL", () => {
    let accepted = 0;
    for (let seed = 1; seed <= CASES; seed++) {
      const r = rng(seed);
      const order = ids(r.int(2, 8));
      const percents = randomPercentages(r, order.length);
      const amount = r.int(order.length, r.next() < 0.5 ? 2_000 : MAX_AMOUNT);
      const split: SplitInput = {
        mode: "PERCENTAGES",
        shares: order.map((memberId, i) => ({ memberId, percentBp: percents[i] })),
      };
      const outcome = splitExpense(amount, split, order);
      if (outcome.ok) {
        accepted++;
        expect(outcome.shares.reduce((s, x) => s + x.amountKopecks, 0), `seed ${seed}`).toBe(amount);
        expect(Math.min(...outcome.shares.map((s) => s.amountKopecks)), `seed ${seed}`).toBeGreaterThanOrEqual(1);
      } else {
        expect(outcome.code, `seed ${seed}`).toBe("AMOUNT_TOO_SMALL");
      }
    }
    expect(accepted).toBeGreaterThan(CASES / 4); // the generator really exercises the success path
  });

  it("a share never differs from its exact value by one kopeck or more (rounding down + leftovers)", () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const r = rng(seed);
      const order = ids(r.int(2, 8));
      const percents = randomPercentages(r, order.length);
      const amount = r.int(1_000, MAX_AMOUNT);
      const outcome = splitExpense(
        amount,
        { mode: "PERCENTAGES", shares: order.map((memberId, i) => ({ memberId, percentBp: percents[i] })) },
        order,
      );
      if (!outcome.ok) continue;
      outcome.shares.forEach((share, i) => {
        const exact = (amount * percents[i]) / 10_000;
        expect(Math.abs(share.amountKopecks - exact), `seed ${seed}`).toBeLessThan(order.length);
      });
    }
  });

  it("percentages that do not add up to 100 are refused with the exact difference (BR-08)", () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const r = rng(seed);
      const order = ids(r.int(2, 6));
      const percents = randomPercentages(r, order.length);
      const drift = r.int(1, 50);
      const bent = [...percents];
      bent[0] += r.next() < 0.5 ? drift : -drift;
      if (bent[0] < 1) continue;
      const outcome = splitExpense(
        50_000,
        { mode: "PERCENTAGES", shares: order.map((memberId, i) => ({ memberId, percentBp: bent[i] })) },
        order,
      );
      expect(outcome, `seed ${seed}`).toEqual({
        ok: false,
        code: "PERCENT_SUM_MISMATCH",
        params: { differenceBp: Math.abs(bent.reduce((a, b) => a + b, 0) - 10_000) },
      });
    }
  });
});

describe("Balances and transfers: invariants over generated ledgers", () => {
  function randomLedger(r: ReturnType<typeof rng>) {
    const order = ids(r.int(2, 12));
    const expenses: SettlementExpense[] = Array.from({ length: r.int(0, 12) }, (_, n) => {
      const participants = r.shuffle(order).slice(0, r.int(1, order.length));
      const amount = r.int(participants.length, 500_000);
      const outcome = splitExpense(amount, { mode: "EQUAL", participantIds: participants }, order);
      if (!outcome.ok) throw new Error("generator produced an invalid expense");
      return {
        title: `expense ${n}`,
        amountKopecks: amount,
        payerId: order[r.int(0, order.length - 1)],
        shares: outcome.shares.map((s) => ({ memberId: s.memberId, amountKopecks: s.amountKopecks })),
      };
    });
    return { order, expenses };
  }

  it("balances always add up to zero (BR-04)", () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const { order, expenses } = randomLedger(rng(seed));
      const sum = computeBalances(order, expenses).reduce((s, b) => s + b.balanceKopecks, 0);
      expect(sum, `seed ${seed}`).toBe(0);
    }
  });

  it("the proposed transfers bring every balance to exactly zero (BR-23)", () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const { order, expenses } = randomLedger(rng(seed));
      const balances = computeBalances(order, expenses);
      const left = new Map(balances.map((b) => [b.memberId, b.balanceKopecks]));
      for (const t of proposeTransfers(balances)) {
        left.set(t.fromMemberId, (left.get(t.fromMemberId) ?? 0) + t.amountKopecks);
        left.set(t.toMemberId, (left.get(t.toMemberId) ?? 0) - t.amountKopecks);
      }
      expect([...left.values()].every((v) => v === 0), `seed ${seed}`).toBe(true);
    }
  });

  it("there are at most (members with a non-zero balance − 1) transfers, all positive, none to oneself, no pair twice (BR-24)", () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const { order, expenses } = randomLedger(rng(seed));
      const balances = computeBalances(order, expenses);
      const transfers = proposeTransfers(balances);
      const nonZero = balances.filter((b) => b.balanceKopecks !== 0).length;
      expect(transfers.length, `seed ${seed}`).toBeLessThanOrEqual(Math.max(0, nonZero - 1));
      expect(transfers.every((t) => t.amountKopecks >= 1 && Number.isInteger(t.amountKopecks)), `seed ${seed}`).toBe(true);
      expect(transfers.every((t) => t.fromMemberId !== t.toMemberId), `seed ${seed}`).toBe(true);
      const pairs = transfers.map((t) => `${t.fromMemberId}>${t.toMemberId}`);
      expect(new Set(pairs).size, `seed ${seed}`).toBe(pairs.length);
    }
  });

  it("only debtors pay and only creditors receive (BR-25)", () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const { order, expenses } = randomLedger(rng(seed));
      const balances = computeBalances(order, expenses);
      const balanceOf = new Map(balances.map((b) => [b.memberId, b.balanceKopecks]));
      for (const t of proposeTransfers(balances)) {
        expect(balanceOf.get(t.fromMemberId)!, `seed ${seed}`).toBeLessThan(0);
        expect(balanceOf.get(t.toMemberId)!, `seed ${seed}`).toBeGreaterThan(0);
      }
    }
  });

  it("the same expenses entered in any order give identical balances and transfers (BR-23)", () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const r = rng(seed);
      const { order, expenses } = randomLedger(r);
      const shuffled = r.shuffle(expenses);
      const a = computeBalances(order, expenses);
      const b = computeBalances(order, shuffled);
      expect(b, `seed ${seed}`).toEqual(a);
      expect(proposeTransfers(b), `seed ${seed}`).toEqual(proposeTransfers(a));
    }
  });

  it("a ledger without expenses has no transfers", () => {
    expect(proposeTransfers(computeBalances(ids(5), []))).toEqual([]);
  });
});

describe("Money text: round trips over generated amounts (BR-01)", () => {
  it("formatKopecks → parseAmount returns the same number of kopecks", () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const kopecks = rng(seed).int(1, MAX_AMOUNT);
      expect(parseAmount(formatKopecks(kopecks)), `seed ${seed}`).toEqual({ ok: true, value: kopecks });
    }
  });

  it("a comma, a third decimal digit and stray text never parse as an amount", () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const r = rng(seed);
      const text = formatKopecks(r.int(1, MAX_AMOUNT));
      expect(parseAmount(text.replace(".", ",")).ok, `${text} with a comma`).toBe(false);
      expect(parseAmount(`${text}${r.int(0, 9)}`).ok, `${text} with a third decimal`).toBe(false);
      expect(parseAmount(`${text}x`).ok, `${text}x`).toBe(false);
    }
  });

  it("formatBp → parsePercent round-trips every valid percentage", () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const bp = rng(seed).int(1, 10_000);
      expect(parsePercent(formatBp(bp)), `seed ${seed}`).toEqual({ ok: true, value: bp });
    }
  });
});
