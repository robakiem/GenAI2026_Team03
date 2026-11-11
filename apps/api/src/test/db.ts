import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import { PrismaClient } from "../data/generated/client";

// Every migration in name (= timestamp) order: the same schema `pnpm db:migrate` builds.
const migrationsDir = fileURLToPath(new URL("../../prisma/migrations/", import.meta.url));
const migrations = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
  .map((name) => readFileSync(join(migrationsDir, name, "migration.sql"), "utf8"));

export interface TestDb {
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
}

// A fresh, file-backed SQLite database with the real schema applied, so tests exercise
// genuine persistence rather than an in-memory fake.
export function createTestDb(): TestDb {
  const file = join(tmpdir(), `babki-test-${randomUUID()}.db`);
  const raw = new Database(file);
  raw.pragma("foreign_keys = ON");
  for (const sql of migrations) raw.exec(sql);
  raw.close();

  const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${file}` }) });
  return {
    prisma,
    async cleanup() {
      await prisma.$disconnect();
      try {
        rmSync(file);
      } catch {
        // A locked temp file on Windows is harmless; the OS cleans tmp.
      }
    },
  };
}
