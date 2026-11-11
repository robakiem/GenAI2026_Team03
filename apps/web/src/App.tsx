import { Route, Routes } from "react-router";
import { HomePage } from "./pages/HomePage";
import { LedgerNewPage } from "./pages/LedgerNewPage";
import { LedgerPage } from "./pages/LedgerPage";
import { LedgersPage } from "./pages/LedgersPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
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
      {/* Out of scope for this slice — still placeholders */}
      <Route path="/ledgers/:ledgerId/expenses/new" element={<PlaceholderPage screen="expenseNew" />} />
      <Route path="/ledgers/:ledgerId/expenses/:expenseId/edit" element={<PlaceholderPage screen="expenseEdit" />} />
      <Route path="/ledgers/:ledgerId/transfers" element={<PlaceholderPage screen="transfers" />} />
      <Route path="/l/:token" element={<PlaceholderPage screen="member" />} />
      <Route path="*" element={<PlaceholderPage screen="linkNotFound" />} />
    </Routes>
  );
}
