# Babki Value Proposition Canvas: Segment-by-Segment Fit Against monobank, Privat24 and Splitwise (Ukraine, 2024–2026)

Babki fits real needs, but only a few of them. Multi-day friend trips (Segment 1) are the strongest target and should stay the MVP priority. Housemates (2) and couples who keep their finances separate (3a) are plausible retention bets, but nothing yet confirms them in Ukraine. Babki should not target one-off events (4) or shared-fund couples (3b), because Privat24 "Payment Request" and monobank "Group Expenses" already do that job and actually move the money.

## TL;DR
- **Trips are the best fit, but only because of netting, mixed-bank groups and web access.** monobank "Group Expenses" already covers the whole flow (record → split → remind → repay), but only between monobank customers. Privat24 handles one transaction at a time. Splitwise's free tier is capped: several third-party pages quote its Help Center as saying "free users can add up to 4 expenses each day", with the counter resetting daily across all groups (we could not read Splitwise's own page). Babki's defensible wedge is therefore: netting across many payers in a mixed-bank group, no install, no daily cap, and a summary the Coordinator can share and others can check. The AI layer is not the wedge.
- **Retention is unproven.** International evidence shows housemates and couples do settle monthly with Splitwise-style ledgers. No independent Ukrainian user evidence for either was found in the 2024–2026 window. The main barriers ("others don't log", "nobody pays because they don't use the app") hit the Coordinator hardest. Treat Segments 2 and 3a as experiments; 3a is slightly ahead because it needs only two active people.
- **Do not build around AI insights or reminders yet.** Reminders already exist in both banks: monobank co-founder Oleh Horokhovskyi's launch post says users "can send a reminder once a day" (translated from Ukrainian), and Privat24 has automatic reminders. So reminders are table stakes, not a differentiator. Category insights have no demand evidence at all. The biggest unaddressed risk is marking a debt "settled" when no money has moved, a problem the banks don't have because they move the money.

## How to read this canvas

- **Tags:**
  - [Observation] = seen directly in a dated source.
  - [Inference] = reasoned from observations.
  - [Hypothesis] = carried over from the audience analysis or product plan, not yet evidenced.
  - Confidence levels: high / medium / low.
- **Roles** (as defined in the audience analysis):
  - Coord = Group settlement coordinator.
  - Part = Participant in regular shared-expense tracking.
  - Payer = Participant who primarily settles up (low-confidence role).
- **Language of quotes:** All quotes originally published in Ukrainian have been translated into English and are marked "(translated from Ukrainian)". Product names are given in English: monobank "Group Expenses", Privat24 "Payment Request".
- **Gap in Ukrainian evidence (important):** A dedicated search for independent Ukrainian-language user comments returned almost only news rewrites, SEO guides and press releases. It covered Threads, r/Ukraine_UA, DOU and store reviews, for monobank "Group Expenses", Privat24 "Payment Request" and Splitwise. What was not found:
  - independent Ukrainian complaints about the monobank-customers-only restriction, commissions, the 7-day window, or Splitwise lacking Ukrainian;
  - Ukrainian trip, housemate or couple stories involving these tools.

  Most of the pain evidence below is therefore international (Trustpilot, Google Play, comment threads on Substack and blogs). It must be re-checked in interviews.
- **Source quality flags:**
  - Many pages describing Splitwise's limits are published by competing apps (Splittyapp, Split Circle, HippoSplit, The Hisaab, Splital, Cino). These are marked [biased/competitor].
  - A Threads post praising monobank "Group Expenses" (17.10.2024) comes from a marketing account. It is marked [promotional].
  - Privat24 materials are bank press releases, marked [promotional].

## What already exists, stage by stage

| Stage / job | monobank "Group Expenses" (launched 17.10.2024) | Privat24 "Payment Request" (launched 21.01.2026) | Splitwise free | Tricount / Settle Up / Splid | Chat + spreadsheet |
|---|---|---|---|---|---|
| Record expenses | From the monobank statement or manually as an "external expense"; any member can add [Observation] | Only an existing card transaction, within 30 days [Observation] | Manual. Help Center, as quoted by third parties: "free users can add up to 4 expenses each day", counted across all groups; some users report 3; 10-sec cooldown [Observation, competitor-sourced + Trustpilot] | Manual, no cap; Tricount links a bunq card | Manual |
| Agree shares | Equal by default, or amounts per person [Observation] | Amount per person [Observation] | Equal/unequal (some competitor pages claim unequal is Pro-only; unverified) | Equal or weighted shares (Settle Up "variable shares") | Free-form |
| Compute / net | Bank T&C: a payment goes first to the member who paid most, then is spread equally. This works as netting [Observation] | None: one transaction, no netting across several payers [Observation] | Simplify debts | Simplify debts | Manual |
| Collect / remind | Reminder once a day. Co-founder Horokhovskyi's launch post: "you can send a reminder from monobank once a day to everyone who hasn't paid you back yet" (translated from Ukrainian) [Observation] | Bank page: "There is an automatic reminder" (translated from Ukrainian). TehnoFan (22.01.2026), not the bank: "The recipient of the request has 7 days to confirm it" (translated from Ukrainian) [Observation] | Reminders | Settle Up nudges automatically [Observation, described by the developer] | Awkward manual asks |
| Actual repayment | Real UAH transfer inside monobank; commission per tariffs [Observation] | Real payment; requests to other banks are possible [Observation] | Record only (Venmo/PayPal in the US only) | Record only | Card number in chat |
| Who can join | **Only monobank customers** [Observation] | Anyone in your phone contacts; up to 30 people [Observation] | Account required | Link or no account (Tricount, Settle Up) | Anyone |

Key implication [Inference, high]: every Ukrainian bank tool bundles the repayment job, and Babki explicitly does not repay. Babki can only win on the stages before repayment (record, agree, compute) and on groups the banks can't serve: mixed-bank groups, and periods with many payers and many expenses.

---

## Segment 1 — Friends on multi-day trips (MVP priority)

### A) Customer Profile

**Jobs (ranked)**

| # | Job (stage) | Type | Role | Tag / confidence | Evidence |
|---|---|---|---|---|---|
| 1 | Get one correct "who pays whom" result at the end of the trip (compute) | Functional | Coord (primary), all | [Observation], high | Settle Up Google Play review (EN, undated in listing): "I prefer on group trips to just have a single person manage the expenses. This app does that so well." |
| 2 | Record many expenses paid by different people during the trip, while memory is fresh (record) | Functional | Coord, Part | [Observation], medium | UNIAN rewrite, 16.09.2026: "it is much easier to add expenses as they come up than to try to reconstruct the picture from a whole week's receipts on the way home" (translated from Ukrainian; media advice, not a user) |
| 3 | Get the money back without chasing people (collect → repay) | Functional / emotional | Coord | [Observation], medium | Substack comment (EN, date not shown): "I add up expenses and all, but nobody pays it😂 because they don't usually use the app." |
| 4 | Split unequally when not everyone joined every activity (agree shares) | Functional | Coord, Part | [Observation], medium | UNIAN rewrite 16.09.2026: shares by "who used the service or placed the order" (translated from Ukrainian); Trustpilot 1★, 27.08.2026 (India): "No options to choose selective people in a group for split" |
| 5 | Not be "the accountant"; keep the trip fun (social) | Social / emotional | All | [Observation], medium (older source) | Guardian (Imogen West-Knights, 19.06.2022, UK, older than the window): such apps can "turn people into those true enemies of all that is fun and joyful in the world: accountants." |
| 6 | See my own balance with minimal effort (compute) | Functional | Payer | [Hypothesis], low | Settle Up review: "love the ability to just make a link for people to view things, and see how much to pay" |

**Pains (ranked by severity)**

| # | Pain | Role | Tag / confidence | Why current tools fall short / evidence |
|---|---|---|---|---|
| 1 | Splitwise's free daily cap breaks exactly the trip use case | Coord, Part | [Observation], high | Trustpilot 1★ 27.08.2026: "Can't add more than 2 expenses a day. What if I paid like 6-7 bills a day?"; HippoSplit [competitor]: "Travelers are hit hardest, because a trip is precisely when you add many expenses in one day." |
| 2 | Others don't log expenses or don't open the app, so the Coord re-compiles everything by hand | Coord | [Observation], medium | Substack comment above; Substack girls'-trips thread: the organizer "just has to say make sure splitwise is caught up by X date & then we can start paying!" |
| 3 | A monobank group only works if everyone banks with monobank | Coord | Restriction: [Observation], high; that it hurts: [Inference], medium | kosht.media: "a group can only be created with contacts who have monobank" (translated from Ukrainian). No independent user complaint found. |
| 4 | Privat24 handles one transaction at a time, with no netting across many payers | Coord | [Observation], high | Privat24 flow: pick one transaction → "Split payment" → amount per person; 30-day window, 7 days to pay. |
| 5 | Getting money back is awkward and slow | Coord | [Observation], medium | Steven app store description (Sweden) [promotional]: "Forgetting to pay someone is pretty awkward, but having to remind someone is often worse." |
| 6 | The paywall seems not worth it; switching apps needs the whole group to agree | All | Paywall: [Observation], medium; group consent: [Hypothesis] | Trustpilot 2★ (Nov 2023, older): "New limit makes it unusable." Splitwise scores 2.0/5 on Trustpilot across 72 reviews, 64% of them 1★. |
| 7 | Alternative apps lose data or sync badly | All | [Observation], medium | Tricount Google Play review (bunq reply 05.01.2026): "for the past 6 months, the sync of the expenses just doesn't work properly." |
| 8 | Confusing interface; unclear how to "settle" | Part, Payer | [Observation], low-medium | Settle Up App Store review: "it's also not intuitive how to 'settle up'." |

**Gains (ranked by relevance)**

| # | Gain | Level | Role | Tag / confidence |
|---|---|---|---|---|
| 1 | No limit on the number of expenses, free | Required | Coord, Part | [Observation], high (G2 Tricount review 08.01.2025: "Another apps have to pay when add more than 4 amounts.") |
| 2 | Members can see their balance without registering | Expected | Payer | [Observation], medium (Settle Up review: "make a link for people to view") |
| 3 | Fewest possible transfers at the end | Expected | Coord | [Inference], high (standard in all competitors; monobank's T&C include netting) |
| 4 | Works for a mixed-bank group (monobank + Privat + others) | Desired | Coord | [Inference], medium |
| 5 | Ukrainian-language interface | Desired | All | [Hypothesis], low. Not unique: Splital is already localized for Ukrainian in the Ukrainian App Store |
| 6 | Trip spending by category ("we spent 40% on food") | Unexpected | Coord | [Hypothesis], low; no demand evidence found |

**How the roles differ [Inference, medium]:**
- The Coordinator carries almost all the pain: limits, re-compiling totals, chasing people.
- Participants care about how fast they can enter an expense.
- Payers want only a link and an amount. Any registration is a barrier for them, while monobank and Privat24 requests reach them with no install at all.

### B) Value Map

- **Products & Services:**
  - Trip space with invites.
  - Expense entry: amount, category, payer, and an equal or unequal split among some or all members.
  - Automatic balances and debt simplification.
  - "Settled" mark.
  - AI category insights.
  - Automatic reminders.
- **Pain relievers:**
  - Daily cap (P1) → free, unlimited expense entry → removes the reason groups drop Splitwise mid-trip.
  - Coord re-compiling (P2) → shared space where any member adds expenses, plus a live balance → the Coord no longer rebuilds totals from chat and receipts.
  - monobank-only groups (P3) → a web space that doesn't depend on the bank → the whole group can join whatever bank they use.
  - No netting in Privat24 (P4) → debt simplification across all payers → one short list of transfers instead of many single-transaction requests.
  - Chasing (P5) → automatic gentle reminders → removes the Coord's awkward ask (the mechanism exists; the effect is unproven).
- **Gain creators:**
  - Free and unlimited (G1) → no paywall on basic entry → matches Tricount and Settle Up.
  - Viewing without registering (G2) → only possible if Babki offers read-only share links, which are not in the feature list today (a gap).
  - Fewest transfers (G3) → simplification algorithm → matches all competitors.
  - Category view (G6) → AI insights → a novelty, not a reason to switch.

### C) Fit

| Job/Pain/Gain | Role | Babki feature | How it addresses it | Fit | Confidence |
|---|---|---|---|---|---|
| J1 correct end result | Coord | Balances + simplification | Computes the shortest list of transfers across all payers | Strong | High |
| J2 record many expenses | Coord, Part | Expense entry, no cap | Anyone logs during the trip | Strong (if entry is fast on mobile web) | Medium |
| J3 get money back | Coord | Reminders + settled mark | Nudges people, but no money moves | Partial | Medium |
| J4 unequal / partial-group splits | Part | Unequal shares, choosing who shares the expense | Pick the participants for each expense | Strong | Medium |
| J5 not be the accountant | All | Shared entry, reminders sent by the system | The tool asks for the money instead of a friend | Partial | Low |
| J6 see my share | Payer | Balance view | Requires login today | Partial → Strong with a share link | Low |
| P1 daily cap | Coord, Part | Unlimited entry | Removes it directly | Strong | High |
| P3 monobank-only | Coord | Space that works with any bank | Removes it directly | Strong | Medium |
| P4 no netting in Privat24 | Coord | Simplification | Solves it directly | Strong | High |
| P7 sync reliability | All | Web app with data kept on the server | Depends on build quality | Partial | Low |
| G5 Ukrainian interface | All | Ukrainian UI | Nice to have; Splital already has it | Partial | Low |
| G6 category insight | Coord | AI insights | Nobody asked for it | None-to-partial | Low |

**Where alternatives already deliver the same value (no differentiation):**
- If the whole group uses monobank, "Group Expenses" does everything in one app: recording, unequal splits, netting, daily reminders and real repayment. Babki is strictly weaker there [Inference, high].
- Tricount, Settle Up and Splid already offer free, uncapped ledgers with several payers, and people can join without an account [Observation, medium].
- Both monobank and Privat24 already send reminders [Observation, high].

**Gaps and how to close them:**
- Payers without an account → add a read-only share link or guest entry (the Settle Up pattern users praise).
- "Settled" without money → add one-tap copy of the IBAN or card number, a deep link to a monobank/Privat24 transfer, and let the person who gets the money confirm receipt.
- Pre-funding / a common kitty (a separate job) → not covered. Consider a "pool" payer if interviews confirm the need.
- Importing from Splitwise → lowers the cost of switching for groups that already have history there.

**Value proposition:** For groups of Ukrainian friends on multi-day trips, where several people pay and not everyone banks with monobank, Babki turns a week of scattered payments into one short "who pays whom" list that everyone can check, with unlimited free entries. Splitwise caps its free tier, monobank "Group Expenses" is for monobank customers only, and Privat24 handles one transaction at a time.

---

## Segment 2 — Housemates with separate budgets (retention hypothesis)

### A) Customer Profile

**Jobs (ranked)**

| # | Job (stage) | Type | Role | Tag / confidence | Evidence |
|---|---|---|---|---|---|
| 1 | Monthly reconciliation of rent, utilities and shared purchases (compute) | Functional | Coord | [Observation], medium (international) | r/Frugal via Rentlane blog [biased/vendor]: "Every expense on Splitwise, been doing it for the past 10 months. Works out pretty fairly." |
| 2 | Log variable purchases (groceries, household supplies) without friction (record) | Functional | Part | [Hypothesis], medium | Audience analysis: variable purchases create more work than a fixed share of rent |
| 3 | Handle recurring fixed bills automatically (record) | Functional | Coord | [Inference], medium | Splitwise lists recurring bills as a core feature |
| 4 | Collect reimbursement from whoever owes (collect) | Functional / emotional | Coord | [Observation], medium (vendor-sourced) | Rentlane [vendor]: "Splitwise answers who owes whom. It doesn't tell you which roommate is three days late again." |
| 5 | Keep the flat peaceful, with no money arguments (social) | Social | All | [Observation, promotional] | Splitwise store listing quoting Business Insider: "I never fight with roommates over bills because of this genius expense-splitting app" |

**Pains (ranked)**

| # | Pain | Role | Tag / confidence | Evidence / why tools fall short |
|---|---|---|---|---|
| 1 | Logging a month at once hits Splitwise's daily cap | Coord | [Observation], high | Trustpilot 2★ (Nov 2023, older): "as I have a habit of doing expense-overview once a wee..."; review quoted on a competitor page: "In order to optimize time I add expenses once per month… There is a new limit of 4 expenses per day" |
| 2 | Consistent data entry: others forget or refuse to log | Coord | [Hypothesis], medium | Audience analysis; Substack "nobody pays it… they don't usually use the app" (trip context) |
| 3 | Chasing late payers | Coord | [Observation, vendor], low-medium | Rentlane |
| 4 | Spreadsheets need formulas and manual "settled" marks | Coord | [Observation, vendor], low | Google Sheets template vendor: "mark expenses as settled when everyone pays" |
| 5 | A monobank group needs every housemate to be a monobank customer; Privat24 has no running ledger | Coord | [Inference], medium | Bank feature descriptions |
| 6 | Problem severity in Ukraine is unknown | — | [Hypothesis], low | No Ukrainian housemate evidence found |

**Gains (ranked)**

| # | Gain | Level | Role | Tag |
|---|---|---|---|---|
| 1 | A balance that is always up to date | Required | Coord, Part | [Inference], medium |
| 2 | Entering many expenses at once, without limits | Required | Coord | [Observation], medium |
| 3 | Recurring bills added automatically | Expected | Coord | [Inference], medium |
| 4 | Rules for splitting utilities (per person / per room) | Desired | Coord | [Observation, vendor], low (the Splitnow guide lists 5 methods) |
| 5 | Monthly spending by category for the flat | Unexpected | Coord | [Hypothesis], low |

**How the roles differ [Inference, medium]:**
- The Coordinator is often the one on the lease who pays utilities and does the reconciliation.
- Participants mostly add groceries.
- A Payer-type housemate pays a fixed share and never opens the app; a monthly bank request is enough for them.

### B) Value Map
- **Products & Services:** Household space; expense entry with unequal shares; balances and simplification; settled mark; monthly AI category insights; reminders at the end of the cycle.
- **Pain relievers:**
  - Logging a month at once (P1) → no cap → monthly entry sessions work.
  - Chasing (P3) → reminders at the end of the cycle → the Coord has to ask less.
  - Spreadsheet formulas (P4) → automatic balances → nobody maintains formulas.
  - Mixed banks (P5) → a space that works with any bank.
- **Gain creators:**
  - Always-current balance (G1) → live balance view.
  - Category view (G5) → AI insights (untested).
  - **Missing:** recurring expenses (G3) and split rules or templates (G4).

### C) Fit

| Job/Pain/Gain | Role | Babki feature | How | Fit | Confidence |
|---|---|---|---|---|---|
| J1 monthly reconciliation | Coord | Balances + simplification | Automatic totals | Strong | Medium |
| J2 log variable purchases | Part | Expense entry | Manual only | Partial (the data-entry barrier is not addressed) | Low |
| J3 recurring bills | Coord | — | Not in the feature set | None | Medium |
| J4 collect | Coord | Reminders, settled mark | No money moves | Partial | Low |
| P1 daily cap | Coord | Unlimited entry | Removes it directly | Strong | Medium |
| P2 consistent data entry | Coord | Reminders to log? | Not designed for this | None | Low |
| G5 category view | Coord | AI insights | Need not tested | Partial | Low |

**No differentiation:**
- Splitwise already covers the ledger for users who stay under the cap or pay for Pro; Tricount and Settle Up cover it free and uncapped. Spreadsheets are "good enough" when shares are fixed [Inference, medium].
- If rent is a fixed share and only utilities vary, a monthly Privat24 or monobank request does the job without any ledger [Inference, medium].

**Gaps:**
- Recurring expenses.
- Split templates (per room / per person).
- Nudges aimed at logging, not paying (e.g., "someone hasn't logged anything in 2 weeks").
- Closing and archiving a month.

**Value proposition (conditional):** For Ukrainian housemates who settle shared variable purchases monthly and are tired of spreadsheet formulas or Splitwise's daily cap, Babki keeps a live, uncapped household balance and gives a one-click month-end transfer list, unlike a spreadsheet or Splitwise free. **This holds only if Ukrainian flat-shares turn out to have enough variable purchases (not just fixed rent) to justify a ledger.**

---

## Segment 3 — Couples and families (two financial arrangements kept separate)

### 3a) Couples who keep their finances separate and reimburse each other

**Jobs**

| # | Job (stage) | Type | Role | Tag / confidence | Evidence |
|---|---|---|---|---|---|
| 1 | Keep finances separate without a transfer after every purchase (record → compute) | Functional | Part (both partners) | [Observation], medium (UK) | Substack thread (Michelle Lelman, UK): "We split most expenses between us using Splitwise, but have a joint account for bills." |
| 2 | One settlement per period, often monthly (compute → repay) | Functional | Coord partner | [Observation], medium | Same thread: "All of our bills are paid from my boyfriend's account and then I just transfer my part every month." |
| 3 | Feel that it's fair, including splits in proportion to income | Emotional | Both | [Observation], medium | Yahoo/menlifestylehub (2026): "Is a 50/50 split actually fair when the incomes are nowhere near equal?" |
| 4 | Not feel "transactional" in the relationship | Social / emotional | Both | [Observation], medium | Substack: "He responded 'I can buy my girlfriend a drink, Michelle'"; Guardian 2022 (older): the app "works better when used by couples rather than friend groups" |

**Pains:**
1. Both partners must log, or one of them becomes the de facto bookkeeper [Hypothesis, medium].
2. Disagreements about fairness survive automation: the tool applies a split rule, it doesn't choose one [Observation, medium: the 50/50-vs-income debate].
3. The Splitwise cap blocks entering a month at once [Observation, medium].
4. A "pedantic" ledger feels like keeping score [Observation, medium: Lelman writes "the key is that we aren't pedantic with it"].

**Gains:**
- Required: a running two-person balance; unequal or percentage splits.
- Expected: settling once a month.
- Desired: a split rule proportional to income.
- Unexpected: a joint view of spending by category, which overlaps with budgeting [Hypothesis, low].

**Roles:** There are only two people, so Coord and Part merge into two Participants and the Payer role barely exists. That makes the "everyone must be active" barrier much smaller than on trips or in flats [Inference, medium].

### 3b) Couples/families with a shared fund or roughly reciprocal contributions

**Jobs:** Their main money job is overall household budgeting, which is personal finance, not splitting. They may occasionally need an exact split for a one-off major purchase or a trip [Hypothesis, medium].

Evidence against an exact ledger [Observation, medium]:
- Teamblind (US, undated): "When we were dating, used splitwise. Once we got married we fully combined all finances with no splitting at all."
- Same Substack thread: "My husband and I put all our income in one joint account and then pay all the bills from there."

**Pains:** An exact debt ledger contradicts how they handle money; they deliberately disregard small differences [Observation, medium].

**Gains:** Seeing the household budget, which bank analytics and budgeting apps already provide; Babki doesn't [Inference, medium].

### B) Value Map (3a vs 3b)

- **3a:**
  - A two-person space with unequal or percentage shares, a running balance, and monthly simplification into one transfer.
  - AI category insights may satisfy curiosity about "where does our shared money go" [Hypothesis].
  - Nothing today relieves the "keeping score" feeling; that would need a "gift, don't track" option or a rounding tolerance.
- **3b:** Only a temporary space for a trip or a major purchase, which is really Segment 1 behavior. Babki does not do budgeting.

### C) Fit

| Job/Pain/Gain | Sub-model | Role | Babki feature | How | Fit | Confidence |
|---|---|---|---|---|---|---|
| Keep finances separate, settle monthly | 3a | Both | Space + balances | Running ledger, one monthly transfer | Strong | Medium |
| Fairness proportional to income | 3a | Both | Unequal shares | Set by hand per expense; no default ratio | Partial | Medium |
| Fairness disputes | 3a | Both | — | A tool can't settle values | None | Medium |
| Not feel transactional | 3a | Both | — | No "treat/gift" mode | None | Low |
| Entering a month at once | 3a | Both | Unlimited entry | Solves it directly | Strong | Medium |
| Household budgeting | 3b | Both | AI insights (partial) | Not a budgeting tool | None | Medium |
| One-off major purchase or trip | 3b | Both | Space | Works, but a bank split works too | Partial | Medium |

**No differentiation:**
- For a couple who both bank with monobank, "Group Expenses" already handles an ongoing two-person group with real transfers.
- Low-volume couples stay under Splitwise's cap. Splittyapp [competitor]: "You're logging a few expenses per month with the same 2-3 people. The free tier's 4-a-day limit is irrelevant" [Observation, medium].

**Gaps (3a):**
- A default split ratio per space (e.g., 60/40).
- "Treat" expenses kept out of the balance.
- A rounding tolerance.
- Closing a month.

**Value propositions:**
- **3a:** For couples who keep their finances separate but share costs, Babki keeps a quiet two-person balance using their own split ratio and settles it with one monthly transfer, unlike Splitwise free (capped when entering a month at once) or a transfer after every purchase. **Medium-confidence target, pending validation in Ukraine.**
- **3b: No target.** An exact debt ledger conflicts with how they manage money; their real job is budgeting, and Privat24 or monobank requests cover their occasional one-off splits.

---

## Segment 4 — One-off dinners, gifts, and events

### A) Customer Profile
- **Jobs:** One payer gets reimbursed once (collect → repay) [Observation, high]. This is exactly the scenario both banks market:
  - Privat24's press release (21.01.2026) targets "jointly paying a café bill, a taxi ride or buying a gift" (translated from Ukrainian). It quotes PrivatBank board member Dmytro Musiienko (retail): "Together with Visa, we are not just making digital financial services more convenient… but also systematically lowering the barriers to financial interaction between people" (translated from Ukrainian; np.pl.ua, 21.01.2026).
  - Privat24's promo with the "Sens" bookstores (lb.ua, 16.09.2026) [promotional] says "Payment Request" is "designed for situations where the experience is shared, but the bill has somehow ended up with one person" (translated from Ukrainian).
- **Pains:**
  - Copying card numbers into chats [Observation, high; both banks frame the problem this way].
  - Forgetting to repay [Observation].
  - Unwanted requests from strangers in monobank: mc.today (20.11.2025) reported a customer who accidentally confirmed a 191 UAH split from someone she didn't know. Horokhovskyi said the team would look at improving the feature, and refunded her [Observation, medium].
  - Privat24's 7-day window [Observation].
- **Gains:** No setup, the money actually arrives, and the request reaches people who don't use any new app [Inference, high].
- **Roles:** The Coord is the person who paid; everyone else is a Payer. There are no Participants.

### B) Value Map
With Babki, the payer has to create a space, invite people and add one expense, and the money still moves outside Babki. Compared with the bank tools, Babki adds steps and moves no money, so it relieves nothing here.

### C) Fit

| Job/Pain/Gain | Role | Babki feature | How | Fit | Confidence |
|---|---|---|---|---|---|
| Get reimbursed once | Coord | Expense + settled mark | No way to move money | None | High |
| Avoid card numbers in chat | Coord | — | Babki does not transfer money | None | High |
| Reminders | Coord | Reminders | Banks already do this | None (duplicate) | High |
| Pooling money for a gift in advance | Coord | — | Not supported; monobank "jars" cover collecting | None | Medium |

**Value proposition: No target.** Privat24 "Payment Request" and monobank splitting already do the whole one-off job, with real money movement and push notifications. Babki should only pick up these users as a by-product of an existing trip or household space.

---

## Cross-segment analysis

### Fit ranking

| Rank | Segment | Fit | Confidence | Rationale |
|---|---|---|---|---|
| 1 | 1 — Trips | Strong | Medium-high | Several payers, many expenses per day and mixed banks: exactly where Splitwise free, Privat24 and monobank-only groups each fail |
| 2 | 3a — Couples with separate finances | Strong on the ledger, partial on emotions | Medium-low | Only two active people needed; a recurring monthly cycle. But software can't solve fairness or the "keeping score" feeling |
| 3 | 2 — Housemates | Partial | Low | The recurring cycle is attractive, but data-entry consistency and fixed-rent cases reduce the need; no Ukrainian evidence |
| 4 | 3b — Shared-fund couples/families | None (except an occasional trip) | Medium | Their financial arrangement rejects an exact ledger |
| 5 | 4 — One-off events | None | High | Banks cover it completely |

**MVP priority (trips): confirmed** [Inference, medium-high]. Caveat: trips are occasional, so they bring users in rather than keep them.

**Retention hypothesis: challenge the housemates-first assumption.** 3a is a better first retention bet than 2 [Inference, medium], for three reasons:
- it needs two active users instead of three to five;
- the Coordinator's biggest barrier ("others don't log") shrinks;
- the international evidence of couples settling monthly with Splitwise is more direct.

Housemates stay second until there is evidence that Ukrainian flat-shares have enough variable shared purchases.

### How the three roles interact in one group
- **The Coordinator alone creates some value.** Settle Up users explicitly prefer "a single person manage the expenses" and share a view link. But this only works if Payers can see their amount without registering [Observation, medium].
- **Full value needs Participants to log during the period.** Otherwise the Coord falls back to re-compiling by hand, the "nobody pays because they don't use the app" failure [Observation, medium].
- **Payers are the bottleneck for adoption.** They have no reason to register, and bank push requests reach them for free. Design implication: Babki must first work in a "Coordinator-only + read-only links" mode, with logging by Participants as an upgrade [Inference, medium].

### Real differentiation vs monobank and Privat24 (honest)

| Segment | vs monobank "Group Expenses" | vs Privat24 "Payment Request" |
|---|---|---|
| 1 Trips | **Yes** for mixed-bank groups; **none** for all-monobank groups | **Yes** (netting across several payers, many expenses) |
| 2 Housemates | Yes for mixed-bank flats; weak otherwise | Yes (running ledger) |
| 3a Couples | Weak (monobank covers an ongoing two-person group) unless the partners use different banks | Yes (running ledger) |
| 3b Couples/families | None | None |
| 4 One-off | None; the banks are better (real money) | None; the banks are better (real money) |

Babki's only structural advantages [Observation, medium]:
- groups that don't depend on one bank;
- web access with no install;
- netting across several payers and many expenses;
- unlimited free entry;
- a Ukrainian interface (planned).

The Ukrainian interface is not unique: Splital is localized, and independent Ukrainian Splitwise clones are appearing, e.g., a "Shared Expenses" web app with a Ukrainian UI on GitHub (September 2026).

### Risks
1. **"Settled" without money.** Someone can click the mark when no money has moved, which creates a new dispute. The banks close this loop by moving the money themselves.
   - Mitigation: two-sided confirmation (the debtor marks it paid, the person owed confirms), plus deep links and IBAN copy [Inference, high].
2. **Intrusive AI reminders.** monobank limits reminders to once a day, which signals how much people tolerate. Babki's reminders come from an app the Payer never chose, so they may read as spam. The evidence that people want reminders comes mostly from app marketing (Steven, Settle Up) [Observation, promotional].
   - Mitigation: send reminders in the Coordinator's name, let people opt in to a frequency, and stop once a debt is settled [Hypothesis].
3. **Fairness disputes remain.** Tools apply rules; they don't settle values (50/50 vs income; "I can buy my girlfriend a drink"). A Telegraph headline, "I used Splitwise on a girls' holiday – it almost destroyed my friendship group", shows a ledger can amplify conflict [Observation, medium].
4. **Incumbents respond.** monobank already nets debts and could open groups to non-customers; Privat24 could add groups with many transactions [Inference, medium].
5. **Unwanted requests and trust.** The monobank stranger-request incident (Nov 2025) shows invitations need explicit consent; Babki's space invites must be explicit [Observation, medium].

### What to validate first
1. **How many Ukrainian trip groups mix banks.** If most are all-monobank, Segment 1's differentiation collapses.
2. **Coordinator-only mode.** Can one person log everything and get paid back through a read-only link?
3. **How often variable purchases happen** in Ukrainian flat-shares and among couples with separate finances.
4. **Reminder tolerance.** Who should send the reminder, and how often, before it feels intrusive?
5. **AI category insights.** Lowest priority; test only after 1–3.

### Neutral interview questions (past behavior only)
- "Tell me about the last trip with friends where several people paid for things. Who paid for what, and how did you find out at the end who owed whom?"
- "Which banks did the people on that trip use? Did anyone try monobank Group Expenses or a Privat24 Payment Request? What happened?"
- "Who wrote the expenses down during that trip? Was anything forgotten? How did you notice?"
- "After the trip, how long did it take until everyone had paid? What did you do when someone hadn't?"
- "The last time you had to remind someone about money, how did you phrase it, and how did it feel?"
- (Housemates) "Walk me through last month: which shared costs were fixed and which varied? How did you calculate each person's part?"
- (Couples) "In the last month, what shared purchases did each of you make? How did you decide who pays what? Was there a moment one of you felt it wasn't fair?"
- (Couples) "When did you last decide not to split something between you? Why?"
- (One-off) "The last time you paid for a group dinner or gift, how did you get the money back? What, if anything, went wrong?"
- "Have you ever stopped using a splitting app or spreadsheet? What was the last thing that happened before you stopped?"

## Caveats
- **Thin Ukrainian evidence.** No independent Ukrainian user voices about monobank/Privat24 splitting or Splitwise were found. The Ukrainian items here are news rewrites, bank press releases and one incident report, so every claim about problem severity in Ukraine remains [Hypothesis].
- **Translated quotes.** Quotes from Ukrainian-language sources are the author's English translations, not the original wording; check the original source before citing any of them verbatim elsewhere.
- **Splitwise's cap.** Third-party pages quote the Splitwise Help Center article "What is Splitwise Pro?" as saying "free users can add up to 4 expenses each day", counted across all groups and resetting daily. Splittyapp accessed it in Aug 2026; NomadCrew says it checked it on 28 Sep 2026. Figures of 3/day (Are We Even, Tripplanhelper) conflict with the help center, according to Splittyapp. We did not read Splitwise's own page, so the figure is still second-hand.
- **Older sources.** The Guardian (2022), the Telegraph (undated) and several Trustpilot reviews (2023) predate the priority window and are marked as older.
- **Privat24 and other banks.** Minfin (21.01.2026) reports that PrivatBank launched "Payment Request" "in partnership with Visa" (translated from Ukrainian). The bank's page states that "the service also works with other banks", lists "up to 30 participants" and a split window of "within 30 calendar days" (all translated from Ukrainian). Any rule on which cards are eligible was not visible on that page, so reports that it is Visa-only remain unconfirmed.
- **Multi-currency and cash** were not treated as core needs, and nothing found changes that.
