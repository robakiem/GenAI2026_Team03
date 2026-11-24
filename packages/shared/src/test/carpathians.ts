import type { SettlementExpense } from "../settlement";

// The reference data of requirements 4.2 / contracts 1.10, in kopecks.
// Members in the order they were added to the ledger: Olia (Coordinator), Max, Iryna, Andrii.
export const OLIA = "mem_olia";
export const MAX = "mem_max";
export const IRYNA = "mem_iryna";
export const ANDRII = "mem_andrii";
export const MEMBER_ORDER = [OLIA, MAX, IRYNA, ANDRII] as const;

export const CARPATHIANS: SettlementExpense[] = [
  {
    title: "House rent",
    amountKopecks: 600000,
    payerId: OLIA,
    shares: [
      { memberId: OLIA, amountKopecks: 150000 },
      { memberId: MAX, amountKopecks: 150000 },
      { memberId: IRYNA, amountKopecks: 150000 },
      { memberId: ANDRII, amountKopecks: 150000 },
    ],
  },
  {
    title: "Groceries",
    amountKopecks: 185050,
    payerId: MAX,
    shares: [
      { memberId: OLIA, amountKopecks: 46263 },
      { memberId: MAX, amountKopecks: 46263 },
      { memberId: IRYNA, amountKopecks: 46262 },
      { memberId: ANDRII, amountKopecks: 46262 },
    ],
  },
  {
    title: "Taxi",
    amountKopecks: 42000,
    payerId: IRYNA,
    shares: [
      { memberId: OLIA, amountKopecks: 14000 },
      { memberId: IRYNA, amountKopecks: 14000 },
      { memberId: ANDRII, amountKopecks: 14000 },
    ],
  },
  {
    title: "Funicular",
    amountKopecks: 90000,
    payerId: ANDRII,
    shares: [
      { memberId: OLIA, amountKopecks: 25000 },
      { memberId: MAX, amountKopecks: 25000 },
      { memberId: IRYNA, amountKopecks: 25000 },
      { memberId: ANDRII, amountKopecks: 15000 },
    ],
  },
];
