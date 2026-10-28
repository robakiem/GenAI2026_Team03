import express from "express";
import { errorHandler, notFoundHandler } from "./errors";
import { healthRouter } from "./routes/health.routes";

export interface AppDeps {
  pingDatabase: () => Promise<void>;
}

export function createApp({ pingDatabase }: AppDeps) {
  const app = express();
  app.use(express.json());
  app.use("/api", healthRouter(pingDatabase));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
