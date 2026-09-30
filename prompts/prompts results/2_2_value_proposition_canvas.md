# Babki — Value Proposition Canvas

**Babki** is a web app for tracking and splitting shared expenses among multiple payers.
**Features:** shared spaces, expense entry with equal or unequal shares, automatic balances, debt simplification, a "settled" mark, AI insights and reminders.

**Roles inside every segment:**
- **Coordinator**: keeps the ledger.
- **Participant**: adds expenses.
- **Payer**: checks the amount and pays.

---

## Summary

| Rank | Segment | Fit | Verdict |
|---|---|---|---|
| 1 | Friends on multi-day trips | Strong | **MVP target** |
| 2 | Couples with separate finances (3a) | Strong on the ledger, partial on emotions | **Retention bet #1** |
| 3 | Housemates with separate budgets | Partial | Retention bet #2 |
| 4 | Couples/families with a shared fund (3b) | None | Not a target |
| 5 | One-off dinners, gifts, events | None | Not a target |

**Babki's real differentiation:**
- mixed-bank groups;
- web access with no install;
- netting across many payers;
- no daily limit on entries.

**Not a differentiator:**
- AI reminders: both banks already send them.
- AI insights: no demand evidence.

---

## 1. Friends on multi-day trips — MVP

| Jobs | Pains | Gains |
|---|---|---|
| Get one correct "who pays whom" at the end | Splitwise free caps entries per day | Unlimited free entries |
| Log many expenses by different payers | Others don't log, so the Coordinator re-compiles by hand | See my share without registering |
| Get money back without chasing | monobank groups work for monobank customers only | Fewest transfers |
| Split unequally by activity | Privat24 handles one transaction, with no netting | Works across different banks |
| Not be "the accountant" | Reminding friends about money is awkward | |

**Pain relievers:**
- Unlimited entry.
- A space that works with any bank.
- Debt simplification.
- Automatic reminders.

**Gain creators:**
- Live shared balance.
- Shortest transfer list.
- Read-only share link (**gap**: not built yet).

**Value proposition:** For friends on multi-day trips, where not everyone banks with monobank, Babki turns a week of scattered payments into one short, checkable "who pays whom" list. Unlike Splitwise free, monobank and Privat24, it has no entry cap and works across any bank.

## 2. Housemates with separate budgets

| Jobs | Pains | Gains |
|---|---|---|
| Monthly reconciliation of rent, bills and groceries | Logging a month at once hits Splitwise's cap | Always up-to-date balance |
| Log variable purchases easily | Housemates forget to log | Recurring bills added automatically |
| Collect reimbursements | Chasing late payers | Split rules (per person / per room) |
| Keep peace in the flat | Spreadsheet formulas and manual marks | |

**Pain relievers:**
- No cap.
- Automatic balances.
- End-of-cycle reminders.

**Gain creators:**
- Live balance.
- Category insights.
- **Gaps:** recurring expenses, split templates, reminders to log.

**Value proposition (conditional):** For housemates who settle variable purchases monthly, Babki keeps a live, uncapped balance with a one-click month-end transfer list. This holds only if flats have enough variable costs, not just fixed rent.

## 3a. Couples who keep finances separate

| Jobs | Pains | Gains |
|---|---|---|
| Keep money separate without a transfer after every purchase | Both partners must log | Running two-person balance |
| Settle once a month | Fairness disputes remain (50/50 vs income) | Split proportional to income |
| Feel it's fair | A ledger feels like "keeping score" | One monthly transfer |
| Not feel transactional | | |

**Pain relievers:**
- No cap.
- Unequal shares.
- Monthly simplification.

**Gain creators:**
- Quiet two-person ledger.
- **Gaps:** a default split ratio, a "treat, don't track" option, rounding tolerance.

**Value proposition:** For couples with separate finances, Babki keeps a quiet two-person balance on their own split ratio and settles it with one monthly transfer.

## 3b. Couples/families with a shared fund — not a target

- **Job:** household budgeting, not splitting.
- **Pain:** an exact debt ledger contradicts how they manage money.
- **Fit:** only for an occasional trip or major purchase, which is really Segment 1.

## 4. One-off dinners, gifts, events — not a target

- **Job:** one payer gets reimbursed once.
- **Already solved:** Privat24 "Payment Request" and monobank splitting, with real money transfers.
- **Babki:** adds steps and moves no money.

---

## Key risks
1. **"Settled" without real payment.** Needs two-sided confirmation and a link to a bank transfer.
2. **Reminders feel intrusive.** Send them in the Coordinator's name and make the frequency opt-in.
3. **Fairness disputes.** Software applies rules; it doesn't resolve values.
4. **Payers won't register.** A read-only share link is essential.

## Validate first
1. How many trip groups mix banks.
2. Whether a Coordinator-only mode plus share links works.
3. How often variable costs occur among housemates and couples.
4. Reminder tolerance.
5. AI insights, last.
