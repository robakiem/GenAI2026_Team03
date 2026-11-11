import type { PrismaClient } from "./data/generated/client";

// Everything a service needs to reach the database. Injected through createApp so tests
// can run against a throwaway SQLite database (see src/test/db.ts).
export interface ServiceContext {
  prisma: PrismaClient;
}
