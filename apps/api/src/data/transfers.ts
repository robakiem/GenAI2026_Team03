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

// Saved transfers of a ledger. The BigInt amount (CD-14) becomes a plain number here, before it
// reaches a service; it is always below 2^53 (500 × 99 999 999 kopecks).
export async function listTransfersByLedger(db: Db, ledgerId: string) {
  const rows = await db.transfer.findMany({ where: { ledgerId } });
  return rows.map((row) => ({ ...row, amountKopecks: Number(row.amountKopecks) }));
}

export type SavedTransfer = Awaited<ReturnType<typeof listTransfersByLedger>>[number];
