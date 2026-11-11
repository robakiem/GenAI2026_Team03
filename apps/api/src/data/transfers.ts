import type { Db } from "./types";

// The ledgers, among the given ones, that already have saved transfers: settlement has started
// (contracts 1.9, CD-03). The single answer to "does this ledger have transfers?".
export async function ledgerIdsWithTransfers(db: Db, ledgerIds: string[]): Promise<Set<string>> {
  const rows = await db.transfer.findMany({
    where: { ledgerId: { in: ledgerIds } },
    select: { ledgerId: true },
    distinct: ["ledgerId"],
  });
  return new Set(rows.map((row) => row.ledgerId));
}
