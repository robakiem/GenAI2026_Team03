import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { config } from "../config";
import { PrismaClient } from "./generated/client";

export const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: config.databaseUrl }),
});

export async function pingDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
