import type { SplitMode } from "./generated/client";
import type { Db } from "./types";

export interface ShareRow {
  memberId: string;
  amountKopecks: number;
  percentBp: number | null;
}

export interface ExpenseWrite {
  title: string;
  amountKopecks: number;
  payerId: string;
  splitMode: SplitMode;
  shares: ShareRow[];
}

const withShares = { shares: { select: { memberId: true, amountKopecks: true, percentBp: true } } } as const;

// Expenses of a ledger in creation order (CD-17), each with its shares.
export function listExpensesByLedger(db: Db, ledgerId: string) {
  return db.expense.findMany({
    where: { ledgerId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: withShares,
  });
}

export function findExpenseInLedger(db: Db, ledgerId: string, id: string) {
  return db.expense.findFirst({ where: { id, ledgerId }, include: withShares });
}

export function findExpenseByClientRequestId(db: Db, ledgerId: string, clientRequestId: string) {
  return db.expense.findUnique({
    where: { ledgerId_clientRequestId: { ledgerId, clientRequestId } },
    include: withShares,
  });
}

export function insertExpense(db: Db, ledgerId: string, data: ExpenseWrite & { clientRequestId?: string }) {
  const { shares, ...expense } = data;
  return db.expense.create({
    data: { ...expense, ledgerId, shares: { create: shares } },
    include: withShares,
  });
}

// A full replacement (CD-08): the old shares go, the new ones come, in the caller's transaction.
export async function replaceExpense(db: Db, id: string, data: ExpenseWrite) {
  const { shares, ...expense } = data;
  await db.share.deleteMany({ where: { expenseId: id } });
  return db.expense.update({
    where: { id },
    data: { ...expense, shares: { create: shares } },
    include: withShares,
  });
}
