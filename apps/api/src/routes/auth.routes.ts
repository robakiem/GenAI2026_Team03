import { Router } from "express";
import type { RequestHandler } from "express";
import { signInSchema, signUpSchema, type Account as AccountDto } from "@babki/shared";
import type { ServiceContext } from "../context";
import { clearSessionCookie, readSessionCookie, setSessionCookie } from "../cookies";
import * as authService from "../services/auth.service";
import { parseBody } from "../validation";

// EP-02…EP-05: the Coordinator account. Sign-up signs in at once (CD-15).
export function authRouter(ctx: ServiceContext, requireCoordinator: RequestHandler): Router {
  const router = Router();

  router.post("/signup", async (req, res) => {
    const body = parseBody(signUpSchema, req.body);
    const { account, session } = await authService.signUp(ctx, body);
    setSessionCookie(res, session.id, session.expiresAt, req.secure);
    res.status(201).json({ account });
  });

  router.post("/signin", async (req, res) => {
    const body = parseBody(signInSchema, req.body);
    const { account, session } = await authService.signIn(ctx, body);
    setSessionCookie(res, session.id, session.expiresAt, req.secure);
    res.json({ account });
  });

  router.post("/signout", async (req, res) => {
    await authService.signOut(ctx, readSessionCookie(req));
    clearSessionCookie(res, req.secure);
    res.status(204).end();
  });

  router.get("/me", requireCoordinator, (_req, res) => {
    res.json({ account: res.locals.account as AccountDto });
  });

  return router;
}
