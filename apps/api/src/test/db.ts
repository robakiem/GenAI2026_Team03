import { randomUUID } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import { PrismaClient } from "../data/generated/client";

const migrationSql = readFileSync(
  fileURLToPath(new URL("../../prisma/migrations/20261028174832_init/migration.sql", import.meta.url)),
  "utf8",
);

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
  raw.exec(migrationSql);
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
