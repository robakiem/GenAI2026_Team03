# Prompt — Value Proposition Canvas (Jobs, Pains, Gains)

## Role

You are a product strategist and UX researcher. Build a **Value Proposition Canvas** (Strategyzer) for the product below:

- **Customer Profile:** Jobs / Pains / Gains
- **Value Map:** Products & Services / Pain Relievers / Gain Creators

This is a continuation of a completed audience analysis. Use its segments as the structure; do not redo segmentation from scratch.

## Product context

**Babki** is a web app for tracking and splitting shared expenses among multiple payers. Market: Ukraine first.

Core features:

- Shared "spaces" (trip / household) with invited members
- Adding an expense: amount, category, who paid, who it's split between (equal or unequal shares)
- Automatic balance calculation + debt simplification (minimum number of transfers)
- Marking debts as settled (**note:** Babki does NOT transfer money itself)
- AI layer: category spending insights; gentle automatic reminders to members with open debts

## Segments from the audience analysis

Treat these as starting hypotheses, not facts. Build a separate **Customer Profile + Value Map + Fit** for each segment.

1. **Friends on multi-day trips.** Several payers, several expenses, mutual debts at the end; episodic use.
   - Best-confirmed scenario → **MVP priority**.
   - Known: Splitwise experience (some users are satisfied with the free tier; complaints about the interface and the simplified settlement choice).
   - Switching requires group consent.
2. **Roommates with separate budgets.** Monthly bill reconciliation via spreadsheets, collecting compensations.
   - **Retention hypothesis.**
   - Unknown: how acute this is locally (Ukraine).
   - Logging discipline may be a barrier; variable purchases create more work than a fixed rent share.
3. **Couples and families.** Covers two money models. Analyze them as one segment but keep them distinguished inside:
   - **3a. Separate money with compensations.** Ongoing tracking and transfers, periodic (often monthly) settling in Splitwise. **Retention hypothesis.** Both partners must participate; disagreement about fairness may remain after automation.
   - **3b. Shared fund or rough reciprocity.** Joint accounts, fixed payments, small differences ignored, alternating payments. Hypothesis: an exact debt ledger may be unwanted; overall budget tracking is a different job; a need may exist only for one-off large purchases or trips.
   - Where jobs, pains, gains or fit differ between 3a and 3b, state it explicitly; do not average them.
4. **One-off dinners, gifts, events.** Single payer, one round of compensation.
   - Hypothesis: bank payment requests (Privat24, monobank) already cover most of the job; a separate system may be overkill.
   - Look for evidence of low or no need.

> For segment 4 and sub-model 3b, it is a valid outcome to conclude that fit is weak and Babki should not target them.

## Roles within segments

Inside each segment, distinguish these roles and note where their jobs, pains and gains differ:

| Role | Behavior | Need | Barriers |
|---|---|---|---|
| **Group Settlement Coordinator** | Keeps the ledger, often initiates the tool, compiles totals, tells others what they owe. Trigger: end of trip / end of monthly cycle | A verifiable summary without manual re-compilation | Incomplete data from others; not getting money back |
| **Regular Mutual-Tracking Participant** | Adds expenses during the period; agreed shares; periodic settling | Keep money separate without a transfer after every purchase | The current tool may already satisfy them; others may not log expenses |
| **Mostly-Paying Participant** (low confidence) | Rarely adds expenses; checks the total and pays | Understand why they owe this amount with minimal actions | Registration; unclear share; no motivation to open the service |

## Competitors and alternatives

The Ukrainian context is mandatory.

- **monobank "Group Expenses"**: a group of bank customers; expenses from the statement or added manually; shares; reminders; real UAH transfers. Covers tracking, splitting and actual repayment.
- **Privat24 "Payment Request"** (launched January 2026): splits one paid transaction; up to 30 people; 7 days to pay; reminders. No ongoing netting across multiple payers.
- **Splitwise** (free-tier limits, a paywall users see as not worth it, no Ukrainian language), **Tricount**, **Settle Up**, **Splid**.
- Spreadsheets, notes, messenger chats.

## Known facts to respect

- Recording expenses, agreeing on shares, pre-funding, collecting money and actual repayment are **separate jobs**. Map pains and gains to the specific job.
- The need for AI insights, reminders and conflict reduction is **unconfirmed**. Treat these features as hypotheses and look for evidence both for and against.
- Multi-currency and cash are **not established** as key needs. Do not build the value proposition around them unless new evidence appears.

## Research sources and window

- **Priority window:** 28.09.2024–28.09.2026. Mark older sources explicitly.
- **Ukrainian sources first:** r/Ukraine_UA, r/ukraine_dev, DOU, Ukrainian Telegram/Facebook communities, Google Play/App Store reviews in Ukrainian, user reactions to monobank/Privat24.
- **Then international:** Reddit (r/roommates, r/MiddleClassFinance, r/personalfinance, r/travel, r/Splitwise); 2–4★ reviews of Splitwise, Tricount, Settle Up, Splid.
- **Quote rules:**
  - Verbatim quotes in the original language, with link and date.
  - Several comments from one thread count as one source, not independent evidence.
  - Flag promotional or biased sources (e.g., developer self-promotion).

## Task

For **each segment (1–4)**, with role differences inside:

### A) Customer Profile

- **Jobs:** functional / social / emotional, tied to the stage (record → agree shares → compute → collect → repay). Rank by importance.
- **Pains:** include failed or tolerated workarounds and why current tools (especially monobank, Privat24, Splitwise) fall short. Rank by severity.
- **Gains:** required / expected / desired / unexpected. Rank by relevance.

Each item: a tag **[Observation] / [Inference] / [Hypothesis]**, the role it applies to, and 1–2 quotes if available.

### B) Value Map

- **Products & Services** relevant to this segment
- **Pain Relievers:** an explicit link pain → feature → mechanism
- **Gain Creators:** an explicit link gain → feature → mechanism

### C) Fit

- A table with these columns: Job/Pain/Gain → role → Babki feature → how it addresses it → fit (strong / partial / none) → confidence (high / medium / low).
- Where monobank, Privat24 or Splitwise already deliver the same value (no differentiation).
- **Gaps:** unaddressed pains and gains, and what could close them.
- **One-sentence value proposition:** *"For [segment] who [job/pain], Babki [benefit], unlike [specific alternative]"*, or an explicit "no target" conclusion for weak-fit segments.

## Cross-segment section

- Fit ranking of the 4 segments (3a and 3b ranked separately). Confirm or challenge the MVP priority (trips) and the retention hypothesis (roommates vs. couples with separate money, 3a).
- How the three roles interact in one group: does the Coordinator alone create value, or do all members need to be active?
- Babki's real differentiation vs. monobank "Group Expenses" and Privat24. State honestly if there is none for a segment.
- **Risks:** AI reminders feeling intrusive; disputes over fairness remaining after automation; a "settled" mark without an actual money transfer.
- Which features to validate first, plus neutral interview questions about **past behavior** (not "would you use…") to test the weakest links of the canvas.

## Output format

- Structured markdown: one section with tables per segment, then the cross-segment section, then a sources list (link, publication date, geography if known).
- Use the tags [Observation] / [Inference] / [Hypothesis] and confidence levels consistently, following the logic of the audience analysis.
- Final report in English; quotes in the original language.
