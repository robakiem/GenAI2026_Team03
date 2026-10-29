# ADR-0004: Data storage

**Status:** Proposed

**Context.** Data is strongly relational (Ledger → Members → Expenses → Shares; Transfers between Members) with invariants that must hold atomically: an expense and its shares saved together or not at all (BR-13, NFR-07), forward-only transfer states (BR-31). Exact money (NFR-06). Volume is small: 20 members, 500 expenses (NFR-12). One-command local launch, no DevOps, 0 UAH.

**Options**

| Criterion | A. SQLite + Prisma | B. PostgreSQL + Prisma | C. MongoDB |
|---|---|---|---|
| Relational data, transactions | + | + | 0 multi-document transactions are extra work |
| One-command local launch | + a file, nothing to install | − local install or Docker | − local install or a cloud account |
| Free demo hosting | − file is lost on most free hosts | + free managed tiers | + free tier |
| Team knowledge | + | + | 0 |
| Concurrency for our scale | + single writer serialises writes | + | 0 |

**Money.** Integer kopecks (`Int`) in every table and in all arithmetic; formatting to "362.13" only in the UI (A-02). Decimal types are rejected: they push rounding into the database and the language runtime and make BR-02 harder to prove.

**Decision.** **A**: SQLite through **Prisma** (schema, migrations, typed client); `pnpm db:migrate` creates the local database; a seed script loads the "Carpathians" example (requirements 4.2). Every amount is an integer number of kopecks. Constraints the schema can hold: unique member name per ledger (stored lower-cased, BR-19), unique link token, foreign keys. Rules the schema cannot hold (shares sum to the amount, ≤ 20 members, freeze, forward-only states) live in services inside transactions (ADR-0006).
Main criterion: zero setup for six laptops. Would change if the demo must run on a free host — then switch the Prisma provider to PostgreSQL on a free managed tier; the services do not change, migrations are regenerated once.

**Consequences.** Simpler: `git clone` → `pnpm install` → `pnpm db:migrate` → `pnpm dev`. Harder: SQLite and PostgreSQL differ in case-insensitive comparison and locking, so name uniqueness uses a stored lower-cased column instead of database collation. Accepted risk: the demo depends on one laptop's database file.

**Related.** US-004, US-005, US-016…US-021, US-031; BR-02, BR-13, BR-19, BR-20; NFR-06, NFR-07, NFR-12.
