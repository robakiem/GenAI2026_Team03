import { computeBalances, deriveLedgerState, isFullySettled, proposeTransfers } from "@babki/shared";
import type { Settlement, SettlementExpense } from "@babki/shared";
import type { ServiceContext } from "../context";
import * as expenses from "../data/expenses";
import type { Ledger, Member } from "../data/generated/client";
import * as members from "../data/members";
import * as transfers from "../data/transfers";
import type { Db } from "../data/types";
import { findOwnLedger } from "./guards";
import { toProposedTransferDto, toSavedTransferDto } from "./mappers";

export interface LedgerSettlement extends Settlement {
  members: Member[];
  expenses: SettlementExpense[];
}

// Balances are always computed from the expenses (BR-26). Transfers are computed while none is
// saved; after the first "reported paid" the saved rows are read and never recalculated (A-06).
export async function loadSettlement(db: Db, ledger: Ledger): Promise<LedgerSettlement> {
  const [memberRows, expenseRows, saved] = await Promise.all([
    members.listMembersByLedger(db, ledger.id),
    expenses.listExpensesByLedger(db, ledger.id),
    transfers.listTransfersByLedger(db, ledger.id),
  ]);
  const position = new Map(memberRows.map((member) => [member.id, member.position]));
  const expenseData: SettlementExpense[] = expenseRows.map((expense) => ({
    title: expense.title,
    amountKopecks: expense.amountKopecks,
    payerId: expense.payerId,
    shares: expense.shares,
  }));
  const balances = computeBalances(
    memberRows.map((member) => member.id),
    expenseData,
  );

  const transferDtos =
    saved.length > 0
      ? [...saved]
          .sort(
            (a, b) =>
              (position.get(a.fromMemberId) ?? 0) - (position.get(b.fromMemberId) ?? 0) ||
              (position.get(a.toMemberId) ?? 0) - (position.get(b.toMemberId) ?? 0),
          )
          .map(toSavedTransferDto)
      : proposeTransfers(balances).map(toProposedTransferDto);

  return {
    source: saved.length > 0 ? "SAVED" : "PROPOSED",
    ledgerState: deriveLedgerState(ledger.closedAt, saved.length > 0),
    fullySettled: isFullySettled(
      ledger.closedAt,
      saved.map((transfer) => transfer.state),
    ),
    balances,
    transfers: transferDtos,
    members: memberRows,
    expenses: expenseData,
  };
}

// EP-14 (US-044, US-048).
export async function getSettlement(ctx: ServiceContext, input: { accountId: string; ledgerId: string }): Promise<Settlement> {
  const ledger = await findOwnLedger(ctx.prisma, input.accountId, input.ledgerId);
  const { source, ledgerState, fullySettled, balances, transfers: list } = await loadSettlement(ctx.prisma, ledger);
  return { source, ledgerState, fullySettled, balances, transfers: list };
}
