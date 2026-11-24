import { deriveLedgerState } from "@babki/shared";
import type {
  Account as AccountDto,
  Expense as ExpenseDto,
  Ledger as LedgerDto,
  Member as MemberDto,
  ProposedTransfer,
  Transfer as TransferDto,
} from "@babki/shared";
import type { Account, Expense, Ledger, Member, Share } from "../data/generated/client";
import type { SavedTransfer } from "../data/transfers";

type ExpenseRow = Expense & { shares: Pick<Share, "memberId" | "amountKopecks" | "percentBp">[] };

// Map database rows to the API objects of contracts 2.3.
export function toAccountDto(account: Pick<Account, "id" | "email">): AccountDto {
  return { id: account.id, email: account.email };
}

export function toLedgerDto(ledger: Ledger, hasTransfers: boolean): LedgerDto {
  return {
    id: ledger.id,
    name: ledger.name,
    state: deriveLedgerState(ledger.closedAt, hasTransfers),
    createdAt: ledger.createdAt.toISOString(),
    closedAt: ledger.closedAt ? ledger.closedAt.toISOString() : null,
  };
}

export function toMemberDto(member: Member): MemberDto {
  return {
    id: member.id,
    name: member.name,
    position: member.position,
    isCoordinator: member.isCoordinator,
    paymentDetails: member.paymentDetails ?? null,
    linkToken: member.linkToken,
  };
}

export function toExpenseDto(expense: ExpenseRow): ExpenseDto {
  return {
    id: expense.id,
    title: expense.title,
    amountKopecks: expense.amountKopecks,
    payerId: expense.payerId,
    splitMode: expense.splitMode,
    shares: expense.shares.map((share) => ({
      memberId: share.memberId,
      amountKopecks: share.amountKopecks,
      percentBp: share.percentBp ?? null,
    })),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

export function toSavedTransferDto(transfer: SavedTransfer): TransferDto {
  return {
    id: transfer.id,
    fromMemberId: transfer.fromMemberId,
    toMemberId: transfer.toMemberId,
    amountKopecks: transfer.amountKopecks,
    state: transfer.state,
    reportedVia: transfer.reportedVia ?? null,
    reportedAt: transfer.reportedAt ? transfer.reportedAt.toISOString() : null,
    confirmedVia: transfer.confirmedVia ?? null,
    confirmedAt: transfer.confirmedAt ? transfer.confirmedAt.toISOString() : null,
  };
}

// A transfer that is only proposed has no id and no marks yet (contracts 2.3).
export function toProposedTransferDto(transfer: ProposedTransfer): TransferDto {
  return {
    id: null,
    ...transfer,
    state: "OPEN",
    reportedVia: null,
    reportedAt: null,
    confirmedVia: null,
    confirmedAt: null,
  };
}
