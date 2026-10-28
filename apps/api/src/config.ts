import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultDatabaseFile = path.join(apiRoot, "prisma", "babki.db").replaceAll("\\", "/");

export const config = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? `file:${defaultDatabaseFile}`,
};
