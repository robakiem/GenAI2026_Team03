import type { LedgerState } from "./schemas";

// Ledger state is derived, never stored (contracts 1.8, CD-03):
// CLOSED if the trip is closed, else SETTLING once a transfer exists, else ACTIVE.
export function deriveLedgerState(closedAt: Date | string | null, hasTransfers: boolean): LedgerState {
  if (closedAt) return "CLOSED";
  if (hasTransfers) return "SETTLING";
  return "ACTIVE";
}
