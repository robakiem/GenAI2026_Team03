import type { RequestHandler, Response } from "express";
import type { Account as AccountDto } from "@babki/shared";
import type { ServiceContext } from "./context";
import { readSessionCookie, setSessionCookie } from "./cookies";
import { AppError } from "./errors";
import * as authService from "./services/auth.service";

// The signed-in account of each response. A WeakMap keeps it typed (res.locals is `any`) and lets
// currentAccount answer 401 instead of crashing when a route forgot the guard.
const accounts = new WeakMap<Response, AccountDto>();

// Guards every Coordinator route: resolve the session cookie to an account or answer 401.
// On success the account is remembered for currentAccount and the session cookie is refreshed.
export function makeRequireCoordinator(ctx: ServiceContext): RequestHandler {
  return async (req, res, next) => {
    const auth = await authService.authenticate(ctx, readSessionCookie(req));
    if (!auth) {
      next(new AppError("UNAUTHENTICATED", "Authentication is required."));
      return;
    }
    accounts.set(res, auth.account);
    setSessionCookie(res, auth.sessionId, auth.expiresAt, req.secure);
    next();
  };
}

export function currentAccount(res: Response): AccountDto {
  const account = accounts.get(res);
  if (!account) {
    throw new AppError("UNAUTHENTICATED", "Authentication is required.");
  }
  return account;
}
