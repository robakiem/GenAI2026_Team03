# data

The only place that talks to the database. `db.ts` holds the single Prisma client; `generated/` is created by `prisma generate` and is not committed.
The schema is `prisma/schema.prisma`, a copy of section 1 of `docs/technical-contracts.md`.
`Transfer.amountKopecks` is a `BigInt` (CD-14): Prisma returns a JavaScript `bigint`, so convert it to a number here, before it reaches services or JSON.
