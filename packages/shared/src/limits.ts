// Single source of the input limits (technical-contracts.md section 2.1 "Limits").
// Imported by both the web forms and the API so a rule is never duplicated.
export const LIMITS = {
  ledgerName: { min: 1, max: 60 },
  memberName: { min: 1, max: 40 },
  expenseTitle: { min: 1, max: 60 },
  paymentDetails: { min: 0, max: 100 },
  amountKopecks: { min: 1, max: 99_999_999 },
  percentBp: { min: 1, max: 10_000 },
  clientRequestId: { min: 1, max: 64 },
  membersPerLedger: 20,
  email: { max: 254 },
  password: { min: 8, max: 128 },
} as const;
