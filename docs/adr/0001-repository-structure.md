# ADR-0001: Repository structure and architecture style

**Status:** Proposed

**Context.** Frontend and backend must share money rules and validation (BR-01…BR-09, BR-16, BR-19), otherwise the same check is written twice and drifts. A-02 (kopecks) and BR-23 (determinism) must be one implementation. One-command launch; 6 people working in parallel; Claude Code needs a predictable layout.

**Options**

| Criterion | A. Monorepo `web` + `api` + `shared` | B. Two repositories | C. One Next.js full-stack app |
|---|---|---|---|
| Shared types and rules | + one `shared` package | − copy or publish a package | + one codebase |
| Team knowledge | + plain React + Express | + | 0 Next.js server parts are new to most |
| Parallel work of 2 FE + 2 BE | + clear folders | + | 0 front and back in one tree |
| One-command launch | + one root script | − two clones, two starts | + |
| Predictability for Claude Code | + explicit boundaries | 0 | 0 mixed client/server code |

**Decision.** **A**: one repository with pnpm workspaces — `apps/web`, `apps/api`, `packages/shared`. Backend is a **layered modular monolith**: `routes → services → data`, business rules only in services and `shared`, never in routes or React components. Frontend: pages → feature components → API client. Root scripts `dev`, `test`, `typecheck` run all packages.
Main criterion: one implementation of money rules for UI and API. Would change if the frontend and backend teams had to deploy independently.

**Consequences.** Simpler: one clone, one install, shared Zod schemas and types, one PR touches both sides of a story. Harder: everyone needs pnpm; workspace configuration once at the start. Postponed: microservices — not needed for 20 members and 500 expenses (NFR-12). Accepted risk: a broken `shared` package breaks both apps; mitigated by `typecheck` in every run.

**Related.** All stories; BR-01…BR-09, BR-23; NFR-05, NFR-06.
