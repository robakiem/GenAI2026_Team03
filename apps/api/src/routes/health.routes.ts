import { Router } from "express";
import { checkHealth } from "../services/health.service";

export function healthRouter(pingDatabase: () => Promise<void>): Router {
  const router = Router();
  router.get("/health", async (_req, res) => {
    res.json(await checkHealth(pingDatabase));
  });
  return router;
}
