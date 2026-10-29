# CLAUDE.md — Babki

Instructions for AI coding assistants (Claude Code) working in this repository. Read this file fully before changing anything.

## 1. Project

**Babki** is a mobile-first web app that helps a group of friends split shared expenses of a multi-day trip. A **Coordinator** (email + password account) keeps the trip **ledger**: members, expenses, shares. Babki computes balances and a **proposed** list of transfers. Friends never register: each member opens a personal link `/l/:token`, sees only their own amounts, marks their own payment as "reported paid" and confirms payments they received.

Hard product boundary: Babki **does not move money and does not verify bank payments**. "Confirmed" only means the receiver said so.

Interface language: Ukrainian. Code, comments, commit messages and developer-facing error messages: English.

## 2. Commands

Prerequisites: Node.js 24 (`.nvmrc`), pnpm (`corepack enable` if missing). Run everything from the repository root.

| Command | What it does |
|---|---|
| `pnpm install` | installs all workspaces; `postinstall` of `apps/api` runs `prisma generate` |
| `pnpm dev` | applies migrations, then starts API (http://localhost:3001) and web (http://localhost:5173) in parallel |
| `pnpm test` | Vitest in every package (API: Vitest + Supertest) |
| `pnpm typecheck` | `tsc --noEmit` in every package |
| `pnpm build` | production build of the web app |
| `pnpm db:migrate` | applies pending migrations (`prisma migrate deploy`) to `apps/api/prisma/babki.db` |
| `pnpm --filter @babki/api <script>` | runs a script in one package (`@babki/api`, `@babki/web`, `@babki/shared`) |

Health check: `GET http://localhost:3001/api/health` (also through the web proxy at http://localhost:5173/api/health).

Before saying a task is done, run `pnpm typecheck` and `pnpm test`; for UI changes also `pnpm build`. Report failures, never hide them.

## 3. Structure

pnpm monorepo, layered modular monolith (ADR-0001).

```
apps/
  web/                    React 19 + Vite + TypeScript, React Router, TanStack Query, Tailwind (ADR-0002)
    src/pages/            one component per screen (routes are listed in src/screens.ts)
    src/components/       feature components used by pages
    src/api/              API client (client.ts) and one module per resource; responses parsed with shared Zod schemas
    src/i18n/uk.ts        ALL user-visible texts, keyed by message identifiers
  api/                    Node 24 + Express 5 + TypeScript, run with tsx (ADR-0003)
    src/routes/           HTTP only: parse request, call a service, send the response
    src/services/         business rules (BR-xx), permission and state checks, transactions
    src/data/             the only layer that talks to the database (Prisma client in db.ts)
    src/errors.ts         AppError, 404 handler and the final error handler
    src/app.ts            createApp(deps): app wiring, used by index.ts and by tests
    prisma/schema.prisma  copy of section 1 of the contracts
    prisma/migrations/    SQL migrations (CHECK constraints are written by hand)
packages/
  shared/                 Zod schemas, types, error codes, limits and pure calculation functions used by web AND api
docs/                     technical documentation (see section 4)
  requirements.md         MVP requirements: user stories, Gherkin acceptance criteria
  requirements-digest.md  entities, life cycles, business rules, assumptions
  adr/                    architecture decisions, one file per ADR
  technical-contracts.md  data schema, API, error format
prompts/                  the prompts used to produce the documents and the code
```

Dependency direction: `routes → services → data`; `web` and `api` both depend on `shared`; `shared` depends on nothing in the repo.

## 4. Sources of truth

All technical documents live in `docs/`. Before writing code for a story, read the relevant parts:

| Question | Document |
|---|---|
| What must the feature do? Which scenarios? | `docs/requirements.md` (stories US-xxx, Gherkin) |
| Business rules, forbidden actions, assumptions | `docs/requirements-digest.md` (BR-xx, NFR-xx, G-xx, A-xx) |
| Stack and architecture decisions | `docs/adr/` (ADR-0001 … ADR-0006, index in `docs/adr/README.md`) |
| Tables, fields, endpoints, request/response bodies, error codes | `docs/technical-contracts.md` (schema §1, endpoints EP-01 … EP-20 §2, error format §3, decisions CD-xx §4) |

If the code and the contracts disagree, the contracts win; report the mismatch.

## 5. Code rules

**Money and numbers**
- Money is always an integer number of kopecks in fields named `…Kopecks` (362.13 UAH = `36213`). Percentages are integer hundredths in fields named `…Bp` (50 % = `5000`).
- Converting text input to kopecks (`parseAmount`, `parsePercent`) and formatting kopecks to "362.13" happen only in `packages/shared` / the UI. The API accepts and returns integers only.
- `Transfer.amountKopecks` is a `BigInt` in Prisma (CD-14): convert it to `number` in `apps/api/src/data`, before it reaches services or JSON.
- Share splitting and the transfer calculation are pure, deterministic functions in `packages/shared` (ADR-0006): leftover kopecks and ties go by members' ledger `position`, never by input order.

**Validation and errors**
- Limits and Zod schemas are defined once in `packages/shared` (contracts §2.1 "Limits") and used by both the forms and the API.
- Every failure uses the single error format `{ error: { code, message, details?, params? } }` (contracts §3). Throw `AppError` with a code from `ERROR_STATUS` in `packages/shared/src/errors.ts`; the HTTP status comes from that map.
- `error.message` is a short English developer text; the UI shows a Ukrainian text mapped from `error.code` in `i18n/uk.ts`.
- A refused request changes nothing: every multi-row write (expense + shares, first "reported paid") runs in one Prisma transaction.
- State changes of transfers are conditional updates (`… WHERE state = 'OPEN'`): a repeat answers 200 with `changed: false`, a forbidden transition answers 409 `INVALID_STATE` (ADR-0006).

**API**
- Paths, methods, bodies and status codes exactly as in contracts §2.2. Fields in camelCase, enum values in UPPER_SNAKE_CASE, IDs are opaque strings, timestamps ISO 8601 UTC.
- Coordinator routes live under `/api/ledgers/…` and check the session and that the ledger belongs to the account; another Coordinator's ledger gives 404 `LEDGER_NOT_FOUND`, not 403 (CD-10).
- Member-link routes live under `/api/links/:token/…` and ignore the cookie. An unknown token gives 404 `LINK_NOT_FOUND` with no ledger or member name (BR-41).

**Web**
- Server data goes through TanStack Query; every mutation invalidates the ledger's balances and transfers so a stale list is never shown (BR-26).
- No hard-coded user-visible strings in components: add them to `src/i18n/uk.ts`.
- Mobile first: every page must work at 360 px width without horizontal scroll.

**Tests**
- Pure functions in `shared` and services: Vitest. HTTP: Supertest against `createApp(...)` with injected dependencies.
- Test names repeat the Gherkin scenario name from `docs/requirements.md`. Use the "Carpathians" data (contracts §1.10) as the reference example.

**General**
- Keep changes minimal and inside the story you work on. No commented-out code, no TODO lists in code; comments only where the reason is not obvious.
- Pin exact dependency versions; shared tool versions go to the `catalog` in `pnpm-workspace.yaml`.
- Scripts must work on macOS and Windows: no Unix-only shell syntax in `package.json`.

## 6. Prohibitions

Never do the following. If a task seems to require it, stop and ask.

- **Do not invent** entities, fields, tables, endpoints, error codes or UI texts with meaning. Check the contracts in `docs/technical-contracts.md` and the rules in `docs/requirements-digest.md` first; if something is missing there, report it instead of guessing.
- Do not change `prisma/schema.prisma` unless the contracts are changed too. Every schema change comes with a new migration in `prisma/migrations/`; never edit an applied migration. After generating one, read its SQL: if Prisma redefined a table, put the hand-written CHECK constraints back.
- Do not use floating-point numbers, decimals or strings for money in storage, API or calculations.
- Do not put business rules in routes, React components or the database layer; they belong to services and `packages/shared`.
- Do not duplicate a validation or calculation in `web` and `api`: import it from `shared`.
- Do not expose internal IDs in member links or derive tokens from IDs; tokens are random 128-bit values (ADR-0005).
- Do not let a member link change expenses, members or payment details, close a ledger, or act on another member's transfer (BR-33, BR-39). Do not show other members' balances, shares or details on a member page (BR-40).
- Do not allow adding or editing expenses after the first "reported paid" or after closing (BR-36, BR-44); do not move a transfer state backwards (BR-31).
- Do not write texts that say a payment was "verified", "received" (for a payer's report) or "paid via Babki" (BR-47), or that mention a limit of expenses, a price or an upgrade (BR-15).
- Do not show "fully settled" unless the ledger is closed, has transfers and all of them are confirmed (BR-46).
- Do not add features outside the MVP: AI analytics, reminders, payments or bank connections, deleting or renaming expenses and members, recurring bills, imports (requirements "Out of Scope", G-05).
- Do not add a dependency, framework or service without asking the team first.
- Do not put stack traces, SQL, file paths or library messages into an error response (contracts §3.2).
- Do not commit `.env`, `*.db` or `apps/api/src/data/generated/`.
- Do not edit `docs/` or `prompts/` unless the task explicitly asks for it; a change of the contracts is a team decision.
- Do not commit or push unless the user asks.

## 7. Way of working

1. For any change beyond a few lines: read the story and its contracts, then present a short plan (files to touch, endpoints, tests) and wait for approval.
2. Implement in layer order: `shared` → `data` → `services` → `routes` → `web`, with tests next to the code.
3. Run `pnpm typecheck` and `pnpm test` (and `pnpm build` for the web) before reporting.
4. In the report, list the changed files, the rules (BR-xx / EP-xx) covered, and anything not verified.
