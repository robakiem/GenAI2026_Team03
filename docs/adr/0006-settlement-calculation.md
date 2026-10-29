# ADR-0006: Settlement calculation and consistency

**Status:** Proposed

**Context.** Balances and the transfer list are derived and must never be stale (BR-26, NFR-09); the list must be identical for the same expenses in any order (BR-23, NFR-05) and equal the "Carpathians" result. Transfers also carry state that must persist (G-01). After the first "Reported paid" expenses are frozen (BR-36); states only move forward (BR-31); repeated actions change nothing (BR-34). Coordinator and friends act from different devices at the same time (NFR-08).

**Options**

| Criterion | A. Compute on read + save transfers at first mark | B. Store balances and transfers, update on every change | C. Always compute, keep states in a separate table keyed by (from, to) |
|---|---|---|---|
| Never stale (BR-26) | + nothing to keep in sync | − every write must update derived data correctly | + |
| Determinism and testability | + one pure function | 0 depends on update order | + |
| Persistent states (G-01) | + saved once, frozen afterwards | + | 0 states may detach if amounts change |
| Effort | + | − | 0 |
| Performance at 500 expenses | + trivial | + | + |

**Decision.** **A**.
- **Calculation.** A pure function in `packages/shared`: input = members in ledger order + expenses with shares (kopecks), output = balances and the proposed transfer list. Algorithm: greedy matching of the largest debtor with the largest creditor; ties broken by ledger order of members (A-16, G-08). Share splitting (equal, amounts, percentages) is another pure function with the BR-05/BR-09 kopeck rules. Both run on every read while the ledger is Active.
- **First mark.** "Reported paid" on a ledger with no saved transfers runs in one transaction: compute the list → insert all transfers as Open → move the chosen one to Reported paid. From then on transfers are read from the database and never recalculated (A-06).
- **Guarded updates.** Every state change is a conditional update: `UPDATE transfer SET state = 'REPORTED_PAID' WHERE id = ? AND state = 'OPEN'`. Zero rows changed because it is already in the target state → 200, no change (BR-34). Zero rows because the transition is not allowed (e.g. confirm while Open) → 409 `INVALID_STATE`.
- **Freeze.** Adding or editing an expense checks, in the same transaction as the write, that no saved transfers exist and the ledger is not Closed; otherwise 409 `SETTLEMENT_STARTED` / `LEDGER_CLOSED` (BR-36, BR-44). With SQLite's single writer the edit and the first mark are serialised, so exactly one of them wins (NFR-08).
- **Tests.** The "Carpathians" data and every Gherkin example table become Vitest cases on the pure functions (names = scenario names); one test shuffles expense order and compares lists (BR-23); one test fires an edit and a mark in parallel and expects one 409.
Main criterion: correctness of money with the least code that can go wrong. Would change if edits after "paid" were allowed (G-07) — then option C with re-matching rules.

**Consequences.** Simpler: no derived data to keep in sync; the core logic is testable without a database or HTTP. Harder: the first mark is a special case and must be covered by tests. Accepted risk: a mistaken "Reported paid" freezes the ledger with no undo (G-07).

**Related.** US-019, US-020-a, US-020-b, US-031, US-044, US-048, US-054, US-058, US-060-a, US-060-b, US-063; BR-02…BR-09, BR-23…BR-37, BR-44, BR-46; NFR-05, NFR-06, NFR-08, NFR-09.
