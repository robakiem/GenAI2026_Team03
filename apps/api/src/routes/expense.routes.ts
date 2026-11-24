import { Router } from "express";
import { createExpenseSchema, expenseBodySchema } from "@babki/shared";
import type { ServiceContext } from "../context";
import { currentAccount } from "../middleware";
import * as expenseService from "../services/expense.service";
import * as settlementService from "../services/settlement.service";
import { parseBody } from "../validation";

// EP-11…EP-14: expenses and the settlement overview of one ledger. Mounted under
// /api/ledgers/:ledgerId after the Coordinator guard.
export function expenseRouter(ctx: ServiceContext): Router {
  const router = Router({ mergeParams: true });

  router.post("/expenses", async (req, res) => {
    const account = currentAccount(res);
    const body = parseBody(createExpenseSchema, req.body);
    const { expense, created } = await expenseService.addExpense(ctx, {
      accountId: account.id,
      ledgerId: ledgerIdOf(req.params),
      body,
    });
    res.status(created ? 201 : 200).json({ expense });
  });

  router.put("/expenses/:expenseId", async (req, res) => {
    const account = currentAccount(res);
    const body = parseBody(expenseBodySchema, req.body);
    res.json(
      await expenseService.editExpense(ctx, {
        accountId: account.id,
        ledgerId: ledgerIdOf(req.params),
        expenseId: req.params.expenseId,
        body,
      }),
    );
  });

  router.get("/expenses", async (req, res) => {
    const account = currentAccount(res);
    res.json(await expenseService.listExpenses(ctx, { accountId: account.id, ledgerId: ledgerIdOf(req.params) }));
  });

  router.get("/settlement", async (req, res) => {
    const account = currentAccount(res);
    res.json(await settlementService.getSettlement(ctx, { accountId: account.id, ledgerId: ledgerIdOf(req.params) }));
  });

  return router;
}

function ledgerIdOf(params: Record<string, string | undefined>): string {
  return params.ledgerId ?? "";
}
