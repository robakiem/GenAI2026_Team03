import type { RequestHandler } from "express";
import type { ServiceContext } from "./context";
import { readSessionCookie, setSessionCookie } from "./cookies";
import { AppError } from "./errors";
import * as authService from "./services/auth.service";

// Guards every Coordinator route: resolve the session cookie to an account or answer 401.
// On success the account is placed on res.locals and the session cookie is refreshed.
export function makeRequireCoordinator(ctx: ServiceContext): RequestHandler {
  return async (req, res, next) => {
    const sessionId = readSessionCookie(req);
    const auth = await authService.authenticate(ctx, sessionId);
    if (!auth) {
      next(new AppError("UNAUTHENTICATED", "Authentication is required."));
      return;
    }
    res.locals.account = auth.account;
    setSessionCookie(res, sessionId as string, auth.expiresAt, req.secure);
    next();
  };
}
