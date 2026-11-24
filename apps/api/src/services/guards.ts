import type { Db } from "../data/types";
import * as ledgers from "../data/ledgers";
import { AppError } from "../errors";

// The ledger, if it belongs to this Coordinator. Another Coordinator's ledger reads as not found,
// the same as a missing one (CD-10, NFR-04).
export async function findOwnLedger(db: Db, accountId: string, ledgerId: string) {
  const ledger = await ledgers.findLedgerByIdAndCoordinator(db, ledgerId, accountId);
  if (!ledger) throw new AppError("LEDGER_NOT_FOUND", "Ledger not found.");
  return ledger;
}
