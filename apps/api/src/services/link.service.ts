import { memberBreakdown } from "@babki/shared";
import type { MemberPage } from "@babki/shared";
import type { ServiceContext } from "../context";
import * as members from "../data/members";
import { AppError } from "../errors";
import { loadSettlement } from "./settlement.service";

// Tokens are 22 base64url characters (ADR-0005); anything else cannot be a link.
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{22}$/;

const linkNotFound = () => new AppError("LINK_NOT_FOUND", "Link not found.");

// EP-18 (US-009, US-030, US-050): only what belongs to the owner of the token (BR-40).
// An unknown token says nothing about any ledger or member (BR-41).
export async function getMemberPage(ctx: ServiceContext, token: string): Promise<MemberPage> {
  if (!TOKEN_FORMAT.test(token)) throw linkNotFound();
  const me = await members.findMemberByLinkToken(ctx.prisma, token);
  if (!me) throw linkNotFound();

  const settlement = await loadSettlement(ctx.prisma, me.ledger);
  const byId = new Map(settlement.members.map((member) => [member.id, member]));
  const nameOf = (id: string) => byId.get(id)?.name ?? "";

  return {
    ledger: { name: me.ledger.name, state: settlement.ledgerState, fullySettled: settlement.fullySettled },
    member: { name: me.name },
    youPay: settlement.transfers
      .filter((transfer) => transfer.fromMemberId === me.id)
      .map((transfer) => ({
        toMemberId: transfer.toMemberId,
        toName: nameOf(transfer.toMemberId),
        amountKopecks: transfer.amountKopecks,
        state: transfer.state,
        reportedVia: transfer.reportedVia,
        // The payer sees the receiver's details to copy them (BR-43).
        paymentDetails: byId.get(transfer.toMemberId)?.paymentDetails ?? null,
      })),
    youReceive: settlement.transfers
      .filter((transfer) => transfer.toMemberId === me.id)
      .map((transfer) => ({
        fromMemberId: transfer.fromMemberId,
        fromName: nameOf(transfer.fromMemberId),
        amountKopecks: transfer.amountKopecks,
        state: transfer.state,
        reportedVia: transfer.reportedVia,
      })),
    breakdown: memberBreakdown(me.id, settlement.expenses),
  };
}
