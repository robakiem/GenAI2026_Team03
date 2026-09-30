# Prompt — Value Proposition Canvas (Jobs, Pains, Gains)

```
ROLE
You are a product strategist and UX researcher. Build a Value Proposition Canvas (Strategyzer: Customer Profile = Jobs / Pains / Gains; Value Map = Products & Services / Pain Relievers / Gain Creators) for the product below. This is a continuation of a completed audience analysis — use its segments as the structure, do not redo segmentation from scratch.

PRODUCT CONTEXT
"Babki" is a web app for tracking and splitting shared expenses among multiple payers.
Core features:
- Shared "spaces" (trip / household) with invited members
- Adding an expense: amount, category, who paid, who it's split between (equal or unequal shares)
- Automatic balance calculation + debt simplification (minimum number of transfers)
- Marking debts as settled (note: Babki does NOT transfer money itself)
- AI layer: category spending insights; gentle automatic reminders to members with open debts
Market: Ukraine first.

SEGMENTS FROM AUDIENCE ANALYSIS (treat as starting hypotheses, not facts)
Build a separate Customer Profile + Value Map + Fit for EACH segment:
1. Friends on multi-day trips — several payers, several expenses, mutual debts at the end; episodic use. Best-confirmed scenario → MVP priority. Known: Splitwise experience (some satisfied with free tier; complaints about interface and simplified settlement choice). Switching requires group consent.
2. Roommates with separate budgets — monthly bill reconciliation via spreadsheets, collecting compensations. Retention hypothesis. Unknown: local (Ukrainian) acuteness; logging discipline may be a barrier; variable purchases create more work than a fixed rent share.
3. Couples and families — covers two money models; analyze them as one segment but keep them distinguished inside:
   a) Separate money with compensations — ongoing tracking and transfers, periodic (often monthly) settling in Splitwise. Retention hypothesis. Both partners must participate; disagreement about fairness may remain after automation.
   b) Shared fund or rough reciprocity — joint accounts, fixed payments, small differences ignored, alternating payments. Hypothesis: an exact debt ledger may be unwanted; overall budget tracking is a different job; possible need only for one-off large purchases or trips.
   Where jobs/pains/gains or fit differ between (a) and (b), state it explicitly — do not average them.
4. One-off dinners, gifts, events — single payer, one round of compensation. Hypothesis: bank payment requests (Privat24, monobank) already cover most of the job; a separate system may be overkill. Look for evidence of low or no need.
For segment 4 and sub-model 3b it is a valid outcome to conclude that fit is weak and Babki should not target them.

ROLES WITHIN SEGMENTS
Inside each segment, distinguish these roles and note where their jobs/pains/gains differ:
- Group Settlement Coordinator — keeps the ledger, often initiates the tool, compiles totals, tells others what they owe. Need: verifiable summary without manual re-compilation. Trigger: end of trip / end of monthly cycle. Barriers: incomplete data from others, not getting money back.
- Regular Mutual-Tracking Participant — adds expenses during the period, agreed shares, periodic settling. Need: keep money separate without a transfer after every purchase. Barriers: current tool may already satisfy; others may not log expenses.
- Mostly-Paying Participant (low confidence) — rarely adds expenses, checks the total and pays. Need: understand why they owe this amount with minimal actions. Barriers: registration, unclear share, no motivation to open the service.

COMPETITORS AND ALTERNATIVES (Ukrainian context is mandatory)
- monobank "Group Expenses" — group of bank clients, expenses from statement or manual, shares, reminders, real UAH transfers (covers tracking + split + actual repayment)
- Privat24 "Payment Request" (launched Jan 2026) — split one paid transaction, up to 30 people, 7 days to pay, reminders; no ongoing multi-payer netting
- Splitwise (free-tier limits, paywall seen as not worth it, no Ukrainian language), Tricount, Settle Up, Splid
- Spreadsheets, notes, messenger chats

KNOWN FACTS TO RESPECT
- Recording expenses, agreeing on shares, pre-funding, collecting money and actual repayment are SEPARATE jobs. Map pains/gains to the specific job.
- The need for AI insights, reminders and conflict reduction is UNCONFIRMED — treat these features as hypotheses and look for evidence for AND against.
- Multi-currency and cash are not established as key needs — do not build the value proposition around them unless new evidence appears.

RESEARCH SOURCES AND WINDOW
- Priority window: 28.09.2024–28.09.2026; mark older sources explicitly.
- Ukrainian sources first: r/Ukraine_UA, r/ukraine_dev, DOU, Ukrainian Telegram/Facebook communities, Google Play/App Store reviews in Ukrainian, monobank/Privat24 user reactions.
- Then international: Reddit (r/roommates, r/MiddleClassFinance, r/personalfinance, r/travel, r/Splitwise), 2–4★ reviews of Splitwise, Tricount, Settle Up, Splid.
- Verbatim quotes in original language with link and date. Several comments from one thread = one source, not independent evidence. Flag promotional/biased sources (e.g. developer self-promotion).

TASK — for EACH segment (1–4), with role differences inside:
A) CUSTOMER PROFILE
- Jobs: functional / social / emotional, tied to the stage (record → agree shares → compute → collect → repay). Rank by importance.
- Pains: including failed or tolerated workarounds and why current tools (esp. monobank, Privat24, Splitwise) fall short. Rank by severity.
- Gains: required / expected / desired / unexpected. Rank by relevance.
Each item: tag [Observation] / [Inference] / [Hypothesis], note which role it applies to, + 1–2 quotes if available.

B) VALUE MAP
- Products & Services relevant to this segment
- Pain Relievers: explicit link pain → feature → mechanism
- Gain Creators: explicit link gain → feature → mechanism

C) FIT
- Table: Job/Pain/Gain → role → Babki feature → how it addresses it → fit (strong / partial / none) → confidence (high / medium / low)
- Where monobank/Privat24/Splitwise already deliver the same value (no differentiation)
- Gaps: unaddressed pains/gains and what could close them
- One-sentence value proposition: "For [segment] who [job/pain], Babki [benefit], unlike [specific alternative]" — or explicit "no target" conclusion for weak-fit segments

CROSS-SEGMENT SECTION
- Fit ranking of the 4 segments (with 3a and 3b ranked separately); confirm or challenge the MVP priority (trips) and the retention hypothesis (roommates vs. couples with separate money, 3a)
- How the three roles interact in one group (does the Coordinator alone create value, or do all members need to be active?)
- Babki's real differentiation vs. monobank "Group Expenses" and Privat24 — honestly state if there is none for a segment
- Risks: AI reminders feeling intrusive, disputes over fairness remaining after automation, "settled" mark without actual money transfer
- Which features to validate first and neutral interview questions about PAST behavior (not "would you use…") to test the weakest links of the canvas

OUTPUT FORMAT
Structured markdown: one section with tables per segment, then cross-segment section, then sources list (link, publication date, geography if known). Use tags [Observation] / [Inference] / [Hypothesis] and confidence levels consistently, matching the logic of the audience analysis. Final report in English; quotes in original language.
```
