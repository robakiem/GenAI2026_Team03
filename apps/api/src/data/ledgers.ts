import type { Db } from "./types";

export function insertLedger(db: Db, data: { name: string; coordinatorId: string }) {
  return db.ledger.create({ data });
}

export function listLedgersByCoordinator(db: Db, coordinatorId: string) {
  return db.ledger.findMany({ where: { coordinatorId }, orderBy: { createdAt: "asc" } });
}

export function findLedgerByIdAndCoordinator(db: Db, id: string, coordinatorId: string) {
  return db.ledger.findFirst({ where: { id, coordinatorId } });
}
