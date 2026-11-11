import type { Db } from "./types";

export function insertAccount(db: Db, data: { email: string; passwordHash: string }) {
  return db.account.create({ data });
}

export function findAccountByEmail(db: Db, email: string) {
  return db.account.findUnique({ where: { email } });
}

export function findAccountById(db: Db, id: string) {
  return db.account.findUnique({ where: { id } });
}
