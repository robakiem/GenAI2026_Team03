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

// Extends only a session that still exists and has not expired; count 0 means it is gone
// (for example signed out by a parallel request), which must not throw.
export function extendSession(db: Db, id: string, now: Date, expiresAt: Date) {
  return db.session.updateMany({ where: { id, expiresAt: { gt: now } }, data: { expiresAt } });
}
