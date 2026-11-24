import { Route, Routes } from "react-router";
import { HomePage } from "./pages/HomePage";
import { LedgerNewPage } from "./pages/LedgerNewPage";
import { LedgerPage } from "./pages/LedgerPage";
import { LedgersPage } from "./pages/LedgersPage";
import { ExpenseFormPage } from "./pages/ExpenseFormPage";
import { MemberPage } from "./pages/MemberPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { SettlementPage } from "./pages/SettlementPage";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {/* Slice 1 — "Create a trip" */}
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/ledgers" element={<LedgersPage />} />
      <Route path="/ledgers/new" element={<LedgerNewPage />} />
      <Route path="/ledgers/:ledgerId" element={<LedgerPage />} />
      {/* Slice 2 — expenses, "who pays whom" and the friend's page */}
      <Route path="/ledgers/:ledgerId/expenses/new" element={<ExpenseFormPage />} />
      <Route path="/ledgers/:ledgerId/expenses/:expenseId/edit" element={<ExpenseFormPage />} />
      <Route path="/ledgers/:ledgerId/transfers" element={<SettlementPage />} />
      <Route path="/l/:token" element={<MemberPage />} />
      <Route path="*" element={<PlaceholderPage screen="linkNotFound" />} />
    </Routes>
  );
}
