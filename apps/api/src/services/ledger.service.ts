import { toMemberNameKey } from "@babki/shared";
import type { LedgersList, LedgerWithMembers } from "@babki/shared";
import type { ServiceContext } from "../context";
import * as ledgers from "../data/ledgers";
import * as members from "../data/members";
import * as transfers from "../data/transfers";
import { AppError } from "../errors";
import { toLedgerDto, toMemberDto } from "./mappers";
import { newLinkToken } from "./tokens";

// US-004: create a named ledger and its Coordinator member (position 1) in one transaction (A-05).
export async function createLedger(
  ctx: ServiceContext,
  input: { accountId: string; name: string; coordinatorName: string },
): Promise<LedgerWithMembers> {
  const created = await ctx.prisma.$transaction(async (tx) => {
    const ledger = await ledgers.insertLedger(tx, { name: input.name, coordinatorId: input.accountId });
    const coordinator = await members.insertMember(tx, {
      ledgerId: ledger.id,
      name: input.coordinatorName,
      nameKey: toMemberNameKey(input.coordinatorName),
      position: 1,
      isCoordinator: true,
      linkToken: newLinkToken(),
    });
    return { ledger, coordinator };
  });
  return { ledger: toLedgerDto(created.ledger, false), members: [toMemberDto(created.coordinator)] };
}

// EP-07: the Coordinator's own trips only.
export async function listLedgers(ctx: ServiceContext, accountId: string): Promise<LedgersList> {
  const rows = await ledgers.listLedgersByCoordinator(ctx.prisma, accountId);
  const withTransfers = await transfers.ledgerIdsWithTransfers(
    ctx.prisma,
    rows.map((row) => row.id),
  );
  return { ledgers: rows.map((row) => toLedgerDto(row, withTransfers.has(row.id))) };
}

// EP-08: a single ledger with its members (including their link tokens, for US-007).
// Another Coordinator's ledger reads as not found (CD-10, NFR-04).
export async function getLedger(
  ctx: ServiceContext,
  input: { accountId: string; ledgerId: string },
): Promise<LedgerWithMembers> {
  const ledger = await ledgers.findLedgerByIdAndCoordinator(ctx.prisma, input.ledgerId, input.accountId);
  if (!ledger) {
    throw new AppError("LEDGER_NOT_FOUND", "Ledger not found.");
  }
  const [memberRows, withTransfers] = await Promise.all([
    members.listMembersByLedger(ctx.prisma, input.ledgerId),
    transfers.ledgerIdsWithTransfers(ctx.prisma, [input.ledgerId]),
  ]);
  return { ledger: toLedgerDto(ledger, withTransfers.has(ledger.id)), members: memberRows.map(toMemberDto) };
}
