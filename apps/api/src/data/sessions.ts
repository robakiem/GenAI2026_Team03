import type { Db } from "./types";

export function insertSession(db: Db, data: { id: string; accountId: string; expiresAt: Date }) {
  return db.session.create({ data });
}

export function findSessionWithAccount(db: Db, id: string) {
  return db.session.findUnique({ where: { id }, include: { account: true } });
}

export function deleteSessionById(db: Db, id: string) {
  return db.session.deleteMany({ where: { id } });
}

export function updateSessionExpiry(db: Db, id: string, expiresAt: Date) {
  return db.session.update({ where: { id }, data: { expiresAt } });
}
