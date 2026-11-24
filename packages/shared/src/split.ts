// Splitting an expense into shares (BR-02 … BR-09, ADR-0006). Pure and deterministic:
// shares come back in ledger order, and leftover kopecks go one each by ledger order,
// never by the order the participants were selected in.

export type SplitInput =
  | { mode: "EQUAL"; participantIds: string[] }
  | { mode: "AMOUNTS"; shares: { memberId: string; amountKopecks: number }[] }
  | { mode: "PERCENTAGES"; shares: { memberId: string; percentBp: number }[] };

export interface SplitShare {
  memberId: string;
  amountKopecks: number;
  percentBp: number | null;
}

export type SplitOutcome =
  | { ok: true; shares: SplitShare[] }
  | { ok: false; code: "AMOUNT_TOO_SMALL"; params: { participantCount: number } }
  | { ok: false; code: "SHARES_SUM_MISMATCH"; params: { differenceKopecks: number } }
  | { ok: false; code: "PERCENT_SUM_MISMATCH"; params: { differenceBp: number } };

const FULL_PERCENT_BP = 10_000;

// memberOrder: the ids of the ledger's members by position.
export function splitExpense(amountKopecks: number, split: SplitInput, memberOrder: readonly string[]): SplitOutcome {
  const rank = (id: string) => {
    const index = memberOrder.indexOf(id);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  const byLedgerOrder = <T>(items: T[], idOf: (item: T) => string) =>
    [...items].sort((a, b) => rank(idOf(a)) - rank(idOf(b)));

  switch (split.mode) {
    case "EQUAL": {
      const ids = byLedgerOrder(split.participantIds, (id) => id);
      const base = Math.floor(amountKopecks / ids.length);
      if (base < 1) return tooSmall(ids.length);
      const leftover = amountKopecks - base * ids.length;
      return {
        ok: true,
        shares: ids.map((memberId, i) => ({ memberId, amountKopecks: base + (i < leftover ? 1 : 0), percentBp: null })),
      };
    }
    case "AMOUNTS": {
      const sum = split.shares.reduce((total, share) => total + share.amountKopecks, 0);
      if (sum !== amountKopecks) {
        return { ok: false, code: "SHARES_SUM_MISMATCH", params: { differenceKopecks: Math.abs(sum - amountKopecks) } };
      }
      return {
        ok: true,
        shares: byLedgerOrder(split.shares, (share) => share.memberId).map((share) => ({
          memberId: share.memberId,
          amountKopecks: share.amountKopecks,
          percentBp: null,
        })),
      };
    }
    case "PERCENTAGES": {
      const sumBp = split.shares.reduce((total, share) => total + share.percentBp, 0);
      if (sumBp !== FULL_PERCENT_BP) {
        return { ok: false, code: "PERCENT_SUM_MISMATCH", params: { differenceBp: Math.abs(sumBp - FULL_PERCENT_BP) } };
      }
      // Each share is rounded down; the kopecks left over go one each by ledger order (A-17).
      const ordered = byLedgerOrder(split.shares, (share) => share.memberId);
      const floors = ordered.map((share) => Math.floor((amountKopecks * share.percentBp) / FULL_PERCENT_BP));
      const leftover = amountKopecks - floors.reduce((total, value) => total + value, 0);
      const shares = ordered.map((share, i) => ({
        memberId: share.memberId,
        amountKopecks: floors[i] + (i < leftover ? 1 : 0),
        percentBp: share.percentBp,
      }));
      if (shares.some((share) => share.amountKopecks < 1)) return tooSmall(shares.length);
      return { ok: true, shares };
    }
  }
}

function tooSmall(participantCount: number): SplitOutcome {
  return { ok: false, code: "AMOUNT_TOO_SMALL", params: { participantCount } };
}
