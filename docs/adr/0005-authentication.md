# ADR-0005: Authentication and access

**Status:** Proposed

**Context.** Team decision: the Coordinator signs in with email + password; friends never register and act through a personal link (BR-38). Links must be unguessable and must not expose internal IDs (NFR-01, A-01). MVP account scope: sign up, sign in, sign out; no email verification and no reset (G-03, A-08). The Coordinator stays signed in during a trip (A-09). Two kinds of actor, two kinds of permission check (BR-21, BR-33, BR-39).

**Options**

| Criterion | A. Server session + httpOnly cookie | B. JWT in localStorage | C. External auth service (free tier) |
|---|---|---|---|
| Security for a student team | + cookie not readable by scripts; sign-out really ends the session | − token readable by any injected script; sign-out cannot revoke | + |
| Effort | + one sessions table and a middleware | 0 | 0 account, keys, callback setup |
| Works offline / locally | + | + | − needs internet and an external account |
| 0 UAH, no external dependency | + | + | 0 free tier limits |

**Decision.** **A**.
- **Coordinator:** passwords hashed with **argon2id** (bcrypt acceptable if argon2 does not install on a Windows laptop); minimum 8 characters; email stored lower-cased and unique. On sign-in the API creates a session row with a random ID and sends it in an `httpOnly`, `SameSite=Lax` cookie; session lifetime 30 days, extended on use. Every Coordinator route checks the session and that the ledger belongs to that account (NFR-04).
- **Member links:** a random token of 128 bits (22 base64url characters) generated with a cryptographic generator, stored unique, never derived from IDs; URL `/l/<token>`. The token resolves to exactly one member and allows only: read own page, mark own outgoing transfer, confirm own incoming transfer (BR-33, BR-38…BR-40). Unknown token → 404 with a neutral body (BR-41).
Main criterion: the simplest scheme that is still safe for financial data. Would change if password reset became mandatory — then an email-sending service is needed.

**Consequences.** Simpler: no external services; two small middlewares (`requireCoordinator`, `requireMemberLink`). Harder: frontend and API must run on the same site so the cookie is sent (Vite dev proxy). Accepted risks: forgotten password = lost access to own ledgers (A-08); a forwarded link exposes one member's data with no revocation (A-13).

**Related.** US-004, US-005, US-007, US-009, US-054, US-058, US-063; BR-21, BR-33, BR-38…BR-41; NFR-01…NFR-04.
