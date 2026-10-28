import type { HealthResponse } from "@babki/shared";
import { AppError } from "../errors";

export async function checkHealth(pingDatabase: () => Promise<void>): Promise<HealthResponse> {
  try {
    await pingDatabase();
  } catch {
    throw new AppError("DB_UNAVAILABLE", "The database is not reachable.");
  }
  return { status: "ok", service: "babki-api", db: "ok" };
}
