# ADR-0002: UI stack

**Status:** Proposed

**Context.** Friends open a link on a phone without installing anything (US-007, US-009, NFR-10); 360 px width; Ukrainian interface (NFR-11, G-15). The Coordinator works on a phone during the trip. The UI must never show stale transfers (BR-26, NFR-09).

**Options**

| Criterion | A. React SPA + Vite | B. Next.js | C. React Native (mobile app) |
|---|---|---|---|
| "No installation" for friends | + | + | − needs installation or a separate web build |
| Team knowledge | + | 0 SSR, server components | 0 new tooling, emulators |
| Effort in 7 weeks | + | 0 | − two platforms to test |
| Fits ADR-0001 (separate `api`) | + | 0 duplicates the server role | 0 |
| SEO / server rendering | 0 not needed: pages are private | + not needed | − |

**Decision.** **A**: web SPA — React 19 + TypeScript + Vite; React Router for pages (Coordinator pages behind sign-in, member page `/l/:token`); TanStack Query for server data, with every mutation invalidating balances and transfers so nothing stale is shown (BR-26); Tailwind CSS, mobile-first at 360 px; Ukrainian texts in one dictionary file keyed by the message identifiers from the Gherkin scenarios (A-15).
Main criterion: a friend opens a link in any mobile browser with no install. Would change if the product needed offline mode or push notifications (both out of scope).

**Consequences.** Simpler: one platform to test, the UI/UX designer's screens map to pages directly. Harder: client-side routing needs a fallback route on the dev server and on any host. Postponed: PWA/offline (US-023 out of scope), dark theme.

**Related.** US-009, US-030, US-044, US-048, US-050, US-060-a, US-060-b; BR-26, BR-40, BR-47; NFR-10, NFR-11.
