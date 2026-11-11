import { deriveLedgerState } from "@babki/shared";
import type { Account as AccountDto, Ledger as LedgerDto, Member as MemberDto } from "@babki/shared";
import type { Account, Ledger, Member } from "../data/generated/client";

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
