# ADR-0003: Backend stack

**Status:** Proposed

**Context.** The API enforces every permission and state rule (BR-29…BR-36, BR-39); validation must match the frontend exactly (BR-13); single error format; tests must reproduce Gherkin scenarios. Backend developers know Express, .NET, Python and Java; everyone knows TypeScript.

**Options**

| Criterion | A. Node + Express 5 | B. Node + NestJS (or Fastify) | C. .NET (ASP.NET Core) |
|---|---|---|---|
| Shared types/validation with `web` | + same Zod schemas | + | − rewrite rules in C#, keep in sync manually |
| Team knowledge | + both backend devs know Express | 0 NestJS concepts new to most | 0 backend only; frontend devs cannot help |
| Effort in 7 weeks | + minimal framework | 0 more structure to learn | 0 |
| Strong typing and correctness | 0 TS types + Zod at runtime | + | + |
| Fit with one-command launch | + | + | 0 second runtime to install |

**Decision.** **A**: Node.js 24 LTS + Express 5 + TypeScript (run with `tsx` in development). Validation by **Zod** schemas from `packages/shared`, used both in forms and in API middleware. REST over JSON. One error shape for every failure:
`{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "field": "...", "message": "..." }] } }` with status codes 400 validation, 401 not signed in, 403 not allowed (e.g. a link acting for another member, BR-33), 404 unknown link (neutral body, BR-41), 409 state conflict (freeze, ADR-0006). Tests: **Vitest** for services and `shared`, **Supertest** for HTTP; test names carry the Gherkin scenario name.
Main criterion: one language and one set of validation rules from form to database. Would change to .NET if the team decided to keep the frontend and backend codebases fully separate.

**Consequences.** Simpler: frontend developers can read and fix backend code; Claude Code works in one language. Harder: Express gives little structure, so the layering from ADR-0001 must be kept by convention and review. Postponed: OpenAPI generation, rate limiting (only relevant once hosted).

**Related.** All stories; BR-13, BR-29…BR-39, BR-41; NFR-02, NFR-07.
