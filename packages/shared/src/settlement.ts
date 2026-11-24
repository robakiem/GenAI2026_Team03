// Balances and the proposed transfer list (BR-04, BR-23 … BR-27, ADR-0006). Pure functions:
// the same expenses give the same result whatever order they were entered in.

export interface SettlementExpense {
  title: string;
  amountKopecks: number;
  payerId: string;
  shares: { memberId: string; amountKopecks: number }[];
}

export interface Balance {
  memberId: string;
  balanceKopecks: number;
}

export interface ProposedTransfer {
  fromMemberId: string;
  toMemberId: string;
  amountKopecks: number;
}

export interface Breakdown {
  lines: { title: string; paidKopecks: number; shareKopecks: number }[];
  totalPaidKopecks: number;
  totalSharesKopecks: number;
  balanceKopecks: number;
}

// Balance = paid − shares, one entry per member in ledger order; the balances sum to 0.
export function computeBalances(memberOrder: readonly string[], expenses: readonly SettlementExpense[]): Balance[] {
  const balance = new Map(memberOrder.map((id) => [id, 0]));
  const change = (id: string, delta: number) => balance.set(id, (balance.get(id) ?? 0) + delta);
  for (const expense of expenses) {
    change(expense.payerId, expense.amountKopecks);
    for (const share of expense.shares) change(share.memberId, -share.amountKopecks);
  }
  return memberOrder.map((memberId) => ({ memberId, balanceKopecks: balance.get(memberId) ?? 0 }));
}

// Greedy matching: the largest debtor pays the largest creditor, ties by ledger order (A-16).
// Each step settles at least one side, so there are at most (non-zero members − 1) transfers
// and a pair never occurs twice. Input balances must be in ledger order.
export function proposeTransfers(balances: readonly Balance[]): ProposedTransfer[] {
  const people = balances.map((b, position) => ({ id: b.memberId, position, left: b.balanceKopecks }));
  const largest = (sign: 1 | -1) =>
    people
      .filter((p) => p.left * sign > 0)
      .reduce<(typeof people)[number] | undefined>(
        (best, p) => (!best || Math.abs(p.left) > Math.abs(best.left) ? p : best),
        undefined,
      );

  const transfers: (ProposedTransfer & { fromPosition: number; toPosition: number })[] = [];
  for (;;) {
    const debtor = largest(-1);
    const creditor = largest(1);
    if (!debtor || !creditor) break;
    const amount = Math.min(-debtor.left, creditor.left);
    debtor.left += amount;
    creditor.left -= amount;
    transfers.push({
      fromMemberId: debtor.id,
      toMemberId: creditor.id,
      amountKopecks: amount,
      fromPosition: debtor.position,
      toPosition: creditor.position,
    });
  }
  // Listed by the debtor's ledger position, then the receiver's (CD-17).
  transfers.sort((a, b) => a.fromPosition - b.fromPosition || a.toPosition - b.toPosition);
  return transfers.map(({ fromMemberId, toMemberId, amountKopecks }) => ({ fromMemberId, toMemberId, amountKopecks }));
}

// One member's own lines: every expense they paid or share, in the order given (US-030, BR-42).
export function memberBreakdown(memberId: string, expenses: readonly SettlementExpense[]): Breakdown {
  const lines = expenses
    .map((expense) => ({
      title: expense.title,
      paidKopecks: expense.payerId === memberId ? expense.amountKopecks : 0,
      shareKopecks: expense.shares.find((share) => share.memberId === memberId)?.amountKopecks ?? 0,
    }))
    .filter((line) => line.paidKopecks > 0 || line.shareKopecks > 0);
  const totalPaidKopecks = lines.reduce((sum, line) => sum + line.paidKopecks, 0);
  const totalSharesKopecks = lines.reduce((sum, line) => sum + line.shareKopecks, 0);
  return { lines, totalPaidKopecks, totalSharesKopecks, balanceKopecks: totalPaidKopecks - totalSharesKopecks };
}
