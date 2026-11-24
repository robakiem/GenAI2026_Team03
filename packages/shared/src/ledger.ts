import type { LedgerState } from "./schemas";

// Ledger state is derived, never stored (contracts 1.8, CD-03):
// CLOSED if the trip is closed, else SETTLING once a transfer exists, else ACTIVE.
export function deriveLedgerState(closedAt: Date | string | null, hasTransfers: boolean): LedgerState {
  if (closedAt) return "CLOSED";
  if (hasTransfers) return "SETTLING";
  return "ACTIVE";
}

// BR-46: "fully settled" only for a closed ledger that has transfers, all of them confirmed.
export function isFullySettled(closedAt: Date | string | null, transferStates: readonly string[]): boolean {
  return Boolean(closedAt) && transferStates.length > 0 && transferStates.every((state) => state === "CONFIRMED");
}
