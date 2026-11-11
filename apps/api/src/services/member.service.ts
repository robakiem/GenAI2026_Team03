import { LIMITS, toMemberNameKey } from "@babki/shared";
import type { MemberCreated } from "@babki/shared";
import type { ServiceContext } from "../context";
import * as ledgers from "../data/ledgers";
import * as members from "../data/members";
import { uniqueViolationTarget } from "../data/prisma-error";
import * as transfers from "../data/transfers";
import { AppError } from "../errors";
import { toMemberDto } from "./mappers";
import { newLinkToken } from "./tokens";

// US-005: add a friend to a ledger. Name is unique per ledger ignoring case (BR-19);
// position is the next free slot, up to 20 (BR-20); every member gets its own link token.
export async function addMember(
  ctx: ServiceContext,
  input: { accountId: string; ledgerId: string; name: string },
): Promise<MemberCreated> {
  const nameKey = toMemberNameKey(input.name);
  const member = await ctx.prisma.$transaction(async (tx) => {
    // Every check runs in the same transaction as the insert, so a concurrent close or first
    // "reported paid" cannot slip in between (ADR-0006).
    const ledger = await ledgers.findLedgerByIdAndCoordinator(tx, input.ledgerId, input.accountId);
    if (!ledger) {
      throw new AppError("LEDGER_NOT_FOUND", "Ledger not found.");
    }
    if (ledger.closedAt) {
      throw new AppError("LEDGER_CLOSED", "The ledger is closed; members cannot be added.");
    }
    // Freeze: no member may be added once settlement has started (contracts 1.9, BR-36).
    if ((await transfers.ledgerIdsWithTransfers(tx, [input.ledgerId])).has(input.ledgerId)) {
      throw new AppError("SETTLEMENT_STARTED", "Members cannot be added after the first transfer was reported as paid.");
    }
    const count = await members.countMembersByLedger(tx, input.ledgerId);
    if (count >= LIMITS.membersPerLedger) {
      throw new AppError("MEMBER_LIMIT_REACHED", "The ledger already has the maximum number of members.", {
        limit: LIMITS.membersPerLedger,
      });
    }
    if (await members.findMemberByNameKey(tx, input.ledgerId, nameKey)) {
      throw new AppError("MEMBER_NAME_TAKEN", "A member with this name already exists in the ledger.");
    }
    try {
      return await members.insertMember(tx, {
        ledgerId: input.ledgerId,
        name: input.name,
        nameKey,
        position: count + 1,
        isCoordinator: false,
        linkToken: newLinkToken(),
      });
    } catch (error) {
      // Backstop for a concurrent insert of the same name; other unique violations (position,
      // token) are unexpected and must not masquerade as a name clash.
      const target = uniqueViolationTarget(error);
      if (target && target.some((column) => column.includes("nameKey"))) {
        throw new AppError("MEMBER_NAME_TAKEN", "A member with this name already exists in the ledger.");
      }
      throw error;
    }
  });
  return { member: toMemberDto(member) };
}
