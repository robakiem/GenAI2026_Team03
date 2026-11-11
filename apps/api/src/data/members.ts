import type { Db } from "./types";

export function insertMember(
  db: Db,
  data: { ledgerId: string; name: string; nameKey: string; position: number; isCoordinator: boolean; linkToken: string },
) {
  return db.member.create({ data });
}

export function listMembersByLedger(db: Db, ledgerId: string) {
  return db.member.findMany({ where: { ledgerId }, orderBy: { position: "asc" } });
}

export function countMembersByLedger(db: Db, ledgerId: string) {
  return db.member.count({ where: { ledgerId } });
}

export function findMemberByNameKey(db: Db, ledgerId: string, nameKey: string) {
  return db.member.findUnique({ where: { ledgerId_nameKey: { ledgerId, nameKey } } });
}
