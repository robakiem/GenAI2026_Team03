# Babki: testing report (stage 6.3)

Date: 26 Nov 2026, branch `main` at `4461054`. The prompt used for the audit and bug hunt: [prompts/6.3_test_audit_and_bug_hunt.md](../prompts/6.3_test_audit_and_bug_hunt.md). How we test in general: [testing-strategy.md](testing-strategy.md).

**Summary.** After the fixes `pnpm check` is green: 160 automated tests (shared 64, api 90, web 6; there were 153 before this stage). The manual checklist was walked through completely at 360 px (20 steps). We found and fixed 3 bugs and 1 visual flaw. All of them were in `apps/web`, which had no tests before this stage.

## 1. What the automated tests cover

The test name repeats the Gherkin scenario name from [requirements.md](requirements.md). Levels: **U**: unit (`packages/shared`), **S**: service with a real SQLite (`apps/api/src/services`), **H**: HTTP through Supertest (`apps/api/src/*.http.test.ts`), **W**: unit in `apps/web` (new level).

| Story | Scenarios covered by automated tests | Levels |
|---|---|---|
| US-004 Create a ledger | Coordinator creates a trip ledger; A blank or too long name is refused (no ledger exists after the refusal); 1/60 character limits | S, H, U |
| US-005 Friends without accounts | A duplicate name is refused (case-insensitive); the 21st member; adding after the ledger is closed or settlement has started; another Coordinator's ledger → 404; every member gets an own link | S, H |
| Account, session (US-004, BR-21) | sign-up, duplicate e-mail, sign-in, the same answer for an unknown e-mail and a wrong password, expired session, sign-out, `HttpOnly; SameSite=Lax` cookie, 401 on every Coordinator route, data stays after sign-out and sign-in | S, H |
| US-016 Own expense | Coordinator records a purchase they paid for; An invalid amount is refused (`0`, `-1.00`, `1000000`, `1.234`, `1,50`, `abc` in the form parser; 5 values on the API); An expense without participants is refused | U, S, H |
| US-017 Friend's expense | A friend paid but does not share the expense; A payer who is not in the ledger is refused | U, S |
| US-018 Some friends share | Three of four friends share a taxi; A person outside the ledger cannot be a participant; the same participant twice → `DUPLICATE_ITEM` | U, S, H |
| US-019 Split equally | Leftover kopecks go to the earliest members (4 rows); An amount too small is refused (2 rows); exactly 0.01 each is accepted | U, S |
| US-020-a By amounts | The funicular is split by agreed amounts; Amounts that do not add up are refused with the difference (3 rows) | U, S |
| US-020-b By percentages | A cost is split 50 / 30 / 20; A leftover kopeck goes to the earlier member; Percentages that do not add up to 100 are refused (2 rows); a 0.00 share is refused | U, S |
| US-021 No limit | 500 expenses are recorded and the 501st works too (pure function only) | U |
| US-031 Correct an expense | The amount is corrected; The payer is corrected; Removing every participant is refused; another's or unknown expense → 404 | S, H |
| US-044 Who pays whom | Proposed transfers for the Carpathians trip; Debts that cancel out are netted; The same expenses in a different order give the same list; ≤ n−1 transfers; tie broken by order in the ledger | U, S |
| US-048 Recalculation | Correcting an amount updates the transfers at once; A refused edit does not change the list; **new:** a cached old list is dropped after a change (BR-26) | U, S, **W** |
| US-009 Page by a link | Max opens his link on a phone; Iryna sees only her own transfer; An unknown link shows a neutral message (3 rows in S, **2 rows in H, strengthened**) | S, H |
| US-030 My expenses | Max checks his amount; A receiver's balance equals what she should receive; no expenses yet | U, S |
| US-050 Payment details | Iryna copies Olia's details (stored exactly); Missing details cannot be copied; 101 characters are refused | S, H |
| BR-36, BR-44 Freezing | after the first "paid" mark and after closing, expenses cannot be added or changed; a repeat with the same `clientRequestId` after freezing answers 200 | S |
| UI (new level W) | the shared field class: the compact share field has one width (`w-24`), no `w-full` | W |

**Not covered by automated tests (on purpose, or not yet):**
- US-021 "No limit, price or counter is ever shown": this is text in the interface, checked manually (step 20 of the checklist).
- Copying to the clipboard, layout at 360 px, themes: manual, see §2.
- The order of errors in the expense form (bug 3): fixed, but there is no automated test, because a component test needs `@testing-library/react` and `jsdom`. Verified in the browser (see §3).
- "Paid", "confirmed", closing (EP-15…EP-17, EP-19, EP-20): not implemented yet.

## 2. Manual checklist (smoke checklist)

Window size 360×780 (Chrome), app started with `pnpm dev`. Walked through on 26 Nov 2026 after the fixes. Before the fixes steps 9 and 10 failed (see §3). For repeatability the steps were executed by a script in headless Chrome with a screenshot of each screen; the script lives outside the repository, because Playwright is not a project dependency (CLAUDE.md §6).

| # | Step | Expected result | Result |
|---|---|---|---|
| 1 | Open the home page `/` | "API: ok · DB: ok" is shown, no horizontal scroll | ✅ |
| 2 | `/signup`: e-mail `olia@example`, password `short` → "Зареєструватися" | "Перевірте адресу пошти." and "Щонайменше 8 символів.", no request goes to the server | ✅ |
| 3 | Sign up with valid data | The "Мої поїздки" page, "У вас ще немає поїздок." | ✅ |
| 4 | "Створити поїздку", a name made of spaces | "Заповніть це поле." | ✅ |
| 5 | Name "Карпати", own name "Оля" → "Створити" | The "Карпати" trip opened, status "Активна" | ✅ |
| 6 | Add Max, Iryna, Andrii; then "макс" | 4 members, each with a "Посилання" button; for "макс": "Учасник із таким іменем уже є в поїздці." | ✅ |
| 7 | Add the 4 Carpathians expenses (rent, groceries, taxi without Max, funicular by amounts 250/250/250/150) | 4 expenses, "Разом" 9170.50 ₴ | ✅ |
| 8 | New expense with the amount `1,50` | "Введіть суму у форматі 123.45." | ✅ |
| 9 | "Відсотками" mode: 33.33 / 33.33 / 33.33 | A name is visible next to every field; "різниця 0.01 п." | ✅ (before the fix the fields covered the names, bug 2) |
| 10 | Empty form → "Зберегти витрату" | Errors under the title **and** under the amount at once | ✅ (before the fix only under the amount, bug 3) |
| 11 | "Хто кому платить" | Max → Olia 362.13, Iryna → Olia 1932.62, Andrii → Olia 1352.62 | ✅ |
| 12 | "Реквізитів немає" next to Olia → enter a card → "Зберегти" | The details are visible in Olia's row | ✅ |
| 13 | "Посилання" next to Max, open it in an anonymous window | `/l/<token>` is in the clipboard; Max sees 362.13 to Olia and her details, does not see 1932.62 or 1352.62 | ✅ |
| 14 | "Скопіювати реквізити" on Max's page | Exactly the same text is in the clipboard | ✅ |
| 15 | Cut one character off the link | "Посилання не знайдено" with no "Карпати" and no names | ✅ |
| 16 | Change "Продукти" to 2000.00 → "Хто кому платить" | The new list at once (Max → Olia 250.00), the old one does not flash | ✅ (before the fix the old list was shown while loading, bug 1) |
| 17 | Add the member "Богдан" → "Хто кому платить" | Bohdan is in the balances | ✅ |
| 18 | A 36-character name and an expense of 999999.99 with a 60-character title | All screens without horizontal scroll | ✅ |
| 19 | "Вийти", open the trip by its address; sign in with a wrong, then a right password | Redirect to sign-in; "Невірна пошта або пароль."; the "Карпати" trip is still there | ✅ |
| 20 | The header of every screen; theme "Нічний сад" → reload | The flower does not cover the theme switch and "Вийти"; the theme stays; nowhere are there words about a limit or a price | ✅ (before the fix the flower lay on "Вийти", flaw 4) |

On every screen it was also checked that `scrollWidth` = 360 (no horizontal scroll) and that there are no JS errors in the console.

**What a person still has to check:** open a friend's link on a real phone over the network (the Clipboard API behaves differently on plain HTTP outside localhost) and look at the fonts without access to Google Fonts.

## 3. Bugs found and how we fixed them

For every bug there was first a red test (or a reproduction in the browser where a unit test is impossible), then the fix.

### Bug 1. After a change to an expense, "Хто кому платить" showed the old list (US-048, BR-26)

- **How to reproduce.** Open "Хто кому платить" (Max → Olia 50.00), go back, change an expense from 100.00 to 300.00, open "Хто кому платить" again. While the request is running, the old 50.00 is shown as the current amount. On localhost that is milliseconds, but on a phone with a slow network it is seconds. Delaying the response by 1.5 s in the browser showed this reliably.
- **Expected:** "The old list is never shown as the current one" (US-048).
- **Cause.** In TanStack Query `invalidateQueries` only marks an inactive query as stale. When the page mounts again it first shows the cached data and refreshes it in parallel. Besides that, adding a member did not refresh `settlement` at all, although the new member appears in the balances.
- **Fix.** A new function `refreshLedger` ([apps/web/src/api/refresh.ts](../apps/web/src/api/refresh.ts)): the cached inactive transfer list is removed, active queries are refetched, and the mutation stays pending until the fresh data has arrived. Every ledger mutation uses it: expense (new, edit), payment details, new member.
- **Test:** [refresh.test.ts](../apps/web/src/api/refresh.test.ts). On the old code (moved over unchanged) it failed with `expected { transfers: [...] } to be undefined`.

### Bug 2. At 360 px the "Сумами" / "Відсотками" fields covered the participants' names

- **How to reproduce.** New expense → "Відсотками". Next to each participant only the checkbox and the first letter in the avatar are visible, and the field takes the whole row. Who is "Olia" and who is "Oleh" is unclear. Width of the label with the name: 45 px.
- **Cause.** The field had both `w-24` and `w-full` (from `fieldInputClass`), and also `px-2.5` and `px-4`. In Tailwind it is not the order of classes in the string but the order in the generated CSS that wins, so `w-full` won.
- **Fix.** `fieldInputClass(error, size)` has two sizes, `full` and `compact`, and never combines two width classes ([TextField.tsx](../apps/web/src/components/ui/TextField.tsx)). After the fix the label is 158 px wide and the names are fully visible.
- **Test:** [TextField.test.ts](../apps/web/src/components/ui/TextField.test.ts). The compact field has exactly one width class (`w-24`) and one padding class per axis. On the old code 2 tests failed.

### Bug 3. The expense form showed errors "one at a time"

- **How to reproduce.** New expense, fill in nothing → "Зберегти витрату". The error is only under the amount; the "Що купили" field is not highlighted. The title error appears only after the amount is fixed, so the user has to press "Save" twice.
- **Cause.** `handleSubmit` returned as soon as the amount or the split was invalid and never reached the title check with the shared schema.
- **Fix.** The title is checked with the same schema from `shared` (`expenseBodySchema.pick({ title: true })`) before returning, so all errors are visible at once ([ExpenseFormPage.tsx](../apps/web/src/pages/ExpenseFormPage.tsx)).
- **Test.** There is no unit test: this is component behaviour, and `@testing-library/react` and `jsdom` are added by the team (CLAUDE.md §6). Verified in the browser before and after: `aria-invalid` was only on the amount, now it is on the title and the amount.

### Flaw 4. A decorative flower lay on the "Вийти" button and the theme switch

At widths of 360–1024 px a small flower in the header (`right-14 top-3`) covered "Вийти" or the theme switch. It did not prevent clicking (`pointer-events-none`), but it looked like a defect. Now the flower is shown only from the `xl` width (1280 px), where the row of buttons is narrower than the screen ([AppShell.tsx](../apps/web/src/components/AppShell.tsx)).
