import { Router } from "express";
import type { RequestHandler } from "express";
import { addMemberSchema, createLedgerSchema, paymentDetailsSchema } from "@babki/shared";
import type { ServiceContext } from "../context";
import { currentAccount } from "../middleware";
import * as ledgerService from "../services/ledger.service";
import * as memberService from "../services/member.service";
import { parseBody } from "../validation";
import { expenseRouter } from "./expense.routes";

// EP-06…EP-14: ledgers, members, expenses and the settlement overview. All routes require the Coordinator session.
export function ledgerRouter(ctx: ServiceContext, requireCoordinator: RequestHandler): Router {
  const router = Router();
  router.use(requireCoordinator);

  router.post("/", async (req, res) => {
    const account = currentAccount(res);
    const body = parseBody(createLedgerSchema, req.body);
    const result = await ledgerService.createLedger(ctx, { accountId: account.id, ...body });
    res.status(201).json(result);
  });

  router.get("/", async (_req, res) => {
    const account = currentAccount(res);
    res.json(await ledgerService.listLedgers(ctx, account.id));
  });

  router.get("/:ledgerId", async (req, res) => {
    const account = currentAccount(res);
    res.json(await ledgerService.getLedger(ctx, { accountId: account.id, ledgerId: req.params.ledgerId }));
  });

  router.post("/:ledgerId/members", async (req, res) => {
    const account = currentAccount(res);
    const body = parseBody(addMemberSchema, req.body);
    const result = await memberService.addMember(ctx, {
      accountId: account.id,
      ledgerId: req.params.ledgerId,
      name: body.name,
    });
    res.status(201).json(result);
  });

  router.put("/:ledgerId/members/:memberId/payment-details", async (req, res) => {
    const account = currentAccount(res);
    const body = parseBody(paymentDetailsSchema, req.body);
    res.json(
      await memberService.setPaymentDetails(ctx, {
        accountId: account.id,
        ledgerId: req.params.ledgerId,
        memberId: req.params.memberId,
        paymentDetails: body.paymentDetails,
      }),
    );
  });

  router.use("/:ledgerId", expenseRouter(ctx));

  return router;
}
