import express from "express";
import type { PrismaClient } from "./data/generated/client";
import { errorHandler, notFoundHandler } from "./errors";
import { makeRequireCoordinator } from "./middleware";
import { authRouter } from "./routes/auth.routes";
import { healthRouter } from "./routes/health.routes";
import { ledgerRouter } from "./routes/ledger.routes";

export interface AppDeps {
  pingDatabase: () => Promise<void>;
  prisma: PrismaClient;
}

export function createApp({ pingDatabase, prisma }: AppDeps) {
  const app = express();
  // Honour X-Forwarded-Proto behind a TLS-terminating proxy so req.secure is correct and the
  // session cookie gets its Secure attribute over HTTPS (ADR-0005). Locally there is no such
  // header, so req.secure stays false and the cookie still works over http://localhost.
  app.set("trust proxy", true);
  app.use(express.json());

  const ctx = { prisma };
  const requireCoordinator = makeRequireCoordinator(ctx);

  app.use("/api", healthRouter(pingDatabase));
  app.use("/api/auth", authRouter(ctx, requireCoordinator));
  app.use("/api/ledgers", ledgerRouter(ctx, requireCoordinator));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
