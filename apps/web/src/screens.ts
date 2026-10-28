import type { ScreenKey } from "./i18n/uk";

// Placeholder names of the future screens; the UI/UX designer's screens replace them.
// `example` fills the route parameters for the links on the start page.
export const screens: { key: ScreenKey; path: string; example: string }[] = [
  { key: "signUp", path: "/signup", example: "/signup" },
  { key: "signIn", path: "/signin", example: "/signin" },
  { key: "ledgers", path: "/ledgers", example: "/ledgers" },
  { key: "ledgerNew", path: "/ledgers/new", example: "/ledgers/new" },
  { key: "ledger", path: "/ledgers/:ledgerId", example: "/ledgers/demo" },
  { key: "expenseNew", path: "/ledgers/:ledgerId/expenses/new", example: "/ledgers/demo/expenses/new" },
  { key: "expenseEdit", path: "/ledgers/:ledgerId/expenses/:expenseId/edit", example: "/ledgers/demo/expenses/demo/edit" },
  { key: "transfers", path: "/ledgers/:ledgerId/transfers", example: "/ledgers/demo/transfers" },
  { key: "member", path: "/l/:token", example: "/l/demo" },
];
