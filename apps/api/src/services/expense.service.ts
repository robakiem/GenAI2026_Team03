import { splitExpense } from "@babki/shared";
import type { CreateExpenseBody, ExpenseBody, ExpenseResponse, ExpensesList } from "@babki/shared";
import type { ServiceContext } from "../context";
import * as expenses from "../data/expenses";
import * as members from "../data/members";
import * as transfers from "../data/transfers";
import type { Db } from "../data/types";
import { AppError } from "../errors";
import { findOwnLedger } from "./guards";
import { toExpenseDto } from "./mappers";

// EP-11 (US-016 … US-021). `created` is false when the same clientRequestId was already saved:
// the route then answers 200 with that expense instead of 201 (CD-11).
export async function addExpense(
  ctx: ServiceContext,
  input: { accountId: string; ledgerId: string; body: CreateExpenseBody },
): Promise<ExpenseResponse & { created: boolean }> {
  const { clientRequestId, ...body } = input.body;
  return ctx.prisma.$transaction(async (tx) => {
    const ledger = await findOwnLedger(tx, input.accountId, input.ledgerId);
    // A repeat is answered before the freeze and closed-ledger rules (contracts EP-11).
    if (clientRequestId) {
      const saved = await expenses.findExpenseByClientRequestId(tx, ledger.id, clientRequestId);
      if (saved) return { expense: toExpenseDto(saved), created: false };
    }
    await assertWritable(tx, ledger);
    const write = await prepareWrite(tx, ledger.id, body);
    const expense = await expenses.insertExpense(tx, ledger.id, { ...write, clientRequestId });
    return { expense: toExpenseDto(expense), created: true };
  });
}

// EP-12 (US-031): a full replacement of the same expense; a refused edit leaves it as it was.
export async function editExpense(
  ctx: ServiceContext,
  input: { accountId: string; ledgerId: string; expenseId: string; body: ExpenseBody },
): Promise<ExpenseResponse> {
  return ctx.prisma.$transaction(async (tx) => {
    const ledger = await findOwnLedger(tx, input.accountId, input.ledgerId);
    if (!(await expenses.findExpenseInLedger(tx, ledger.id, input.expenseId))) {
      throw new AppError("EXPENSE_NOT_FOUND", "Expense not found.");
    }
    await assertWritable(tx, ledger);
    const write = await prepareWrite(tx, ledger.id, input.body);
    return { expense: toExpenseDto(await expenses.replaceExpense(tx, input.expenseId, write)) };
  });
}

// EP-13: every expense, no pagination and no limit (US-021, NFR-12).
export async function listExpenses(ctx: ServiceContext, input: { accountId: string; ledgerId: string }): Promise<ExpensesList> {
  const ledger = await findOwnLedger(ctx.prisma, input.accountId, input.ledgerId);
  const rows = await expenses.listExpensesByLedger(ctx.prisma, ledger.id);
  return { expenses: rows.map(toExpenseDto) };
}

// Expenses are read-only once the ledger is closed (BR-44) or settlement has started (BR-36).
// Checked inside the writing transaction, so a concurrent first mark cannot slip in (ADR-0006).
async function assertWritable(db: Db, ledger: { id: string; closedAt: Date | null }): Promise<void> {
  if (ledger.closedAt) {
    throw new AppError("LEDGER_CLOSED", "The ledger is closed; expenses are read-only.");
  }
  if ((await transfers.ledgerIdsWithTransfers(db, [ledger.id])).has(ledger.id)) {
    throw new AppError("SETTLEMENT_STARTED", "Expenses cannot be added or edited after the first transfer was reported as paid.");
  }
}

// Payer and participants must belong to the ledger (BR-10, BR-11); the shares come from the
// shared split function, so the API and the form compute exactly the same thing.
async function prepareWrite(db: Db, ledgerId: string, body: ExpenseBody): Promise<expenses.ExpenseWrite> {
  const memberOrder = (await members.listMembersByLedger(db, ledgerId)).map((member) => member.id);
  const known = new Set(memberOrder);

  if (!known.has(body.payerId)) throw notInLedger("payerId");
  const participantIds = body.split.mode === "EQUAL" ? body.split.participantIds : body.split.shares.map((s) => s.memberId);
  const unknownIndex = participantIds.findIndex((id) => !known.has(id));
  if (unknownIndex !== -1) {
    throw notInLedger(
      body.split.mode === "EQUAL" ? `split.participantIds[${unknownIndex}]` : `split.shares[${unknownIndex}].memberId`,
    );
  }

  const outcome = splitExpense(body.amountKopecks, body.split, memberOrder);
  if (!outcome.ok) {
    throw new AppError(outcome.code, splitMessages[outcome.code], outcome.params);
  }
  return {
    title: body.title,
    amountKopecks: body.amountKopecks,
    payerId: body.payerId,
    splitMode: body.split.mode,
    shares: outcome.shares,
  };
}

const splitMessages = {
  AMOUNT_TOO_SMALL: "The amount is too small to give every participant at least one kopeck.",
  SHARES_SUM_MISMATCH: "The shares do not add up to the expense amount.",
  PERCENT_SUM_MISMATCH: "The percentages do not add up to 100.",
} as const;

// contracts 3.3: `details.field` names the field. The detail catalogue (3.1) has no code for
// "not a member", so the closest one, INVALID_TYPE, is used.
function notInLedger(field: string): AppError {
  return new AppError("MEMBER_NOT_IN_LEDGER", "The member is not in this ledger.", undefined, [
    { field, code: "INVALID_TYPE", message: "Expected a member of this ledger." },
  ]);
}
