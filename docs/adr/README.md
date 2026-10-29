# Babki — Architecture Decision Records (ADR)

Built on [`docs/requirements-digest.md`](../requirements-digest.md) (rules BR-xx, assumptions A-xx, gaps G-xx). All ADRs are **Proposed**; the team switches them to Accepted after review.

**Constraints used for every rating:** 6 students (2 frontend, 2 backend + DB, 1 UI/UX, 1 AI/testing); everyone knows TypeScript, React, Node.js; backend developers also know Express, .NET, Python, Java; no DevOps experience; 7 weeks to the demo; 0 UAH; one-command local launch on macOS and Windows; most code written with Claude Code; money is involved, so correctness beats features.

**Demo assumption:** the demo runs locally. Free hosting is optional; ADR-0004 states what changes if it becomes required.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-repository-structure.md) | Monorepo (pnpm workspaces: `web`, `api`, `shared`), layered modular monolith | Proposed |
| [0002](0002-ui-stack.md) | Web SPA: React + Vite, React Router, TanStack Query, Tailwind CSS | Proposed |
| [0003](0003-backend-stack.md) | Node.js + Express 5 + TypeScript, Zod validation, REST/JSON, Vitest | Proposed |
| [0004](0004-data-storage.md) | Relational DB: SQLite via Prisma; money as integer kopecks | Proposed |
| [0005](0005-authentication.md) | Email + password with server-side sessions in an httpOnly cookie; random 128-bit link tokens | Proposed |
| [0006](0006-settlement-calculation.md) | Balances and transfers computed on read by a pure function; transfers saved once at the first "Reported paid"; guarded state updates in transactions, 409 on conflict | Proposed |

Ratings: **+** fits our constraints · **0** neutral · **−** works against them.
