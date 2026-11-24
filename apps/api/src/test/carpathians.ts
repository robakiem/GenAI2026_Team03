import type { CreateExpenseBody } from "@babki/shared";
import type { ServiceContext } from "../context";
import * as authService from "../services/auth.service";
import * as expenseService from "../services/expense.service";
import * as ledgerService from "../services/ledger.service";
import * as memberService from "../services/member.service";

export interface Trip {
  accountId: string;
  ledgerId: string;
  olia: string;
  max: string;
  iryna: string;
  andrii: string;
  tokens: { olia: string; max: string; iryna: string; andrii: string };
}

// The "Carpathians" ledger of contracts 1.10 with its four members and no expenses yet.
export async function createTrip(ctx: ServiceContext, email = "olia@example.com"): Promise<Trip> {
  const { account } = await authService.signUp(ctx, { email, password: "password1" });
  const created = await ledgerService.createLedger(ctx, {
    accountId: account.id,
    name: "Carpathians",
    coordinatorName: "Olia",
  });
  const ledgerId = created.ledger.id;
  const olia = created.members[0];
  const add = (name: string) => memberService.addMember(ctx, { accountId: account.id, ledgerId, name });
  const max = (await add("Max")).member;
  const iryna = (await add("Iryna")).member;
  const andrii = (await add("Andrii")).member;
  return {
    accountId: account.id,
    ledgerId,
    olia: olia.id,
    max: max.id,
    iryna: iryna.id,
    andrii: andrii.id,
    tokens: { olia: olia.linkToken, max: max.linkToken, iryna: iryna.linkToken, andrii: andrii.linkToken },
  };
}

// The four example expenses of requirements 4.2, as request bodies.
export function carpathiansExpenses(trip: Trip): CreateExpenseBody[] {
  const all = [trip.olia, trip.max, trip.iryna, trip.andrii];
  return [
    { title: "House rent", amountKopecks: 600_000, payerId: trip.olia, split: { mode: "EQUAL", participantIds: all } },
    { title: "Groceries", amountKopecks: 185_050, payerId: trip.max, split: { mode: "EQUAL", participantIds: all } },
    {
      title: "Taxi",
      amountKopecks: 42_000,
      payerId: trip.iryna,
      split: { mode: "EQUAL", participantIds: [trip.olia, trip.iryna, trip.andrii] },
    },
    {
      title: "Funicular",
      amountKopecks: 90_000,
      payerId: trip.andrii,
      split: {
        mode: "AMOUNTS",
        shares: [
          { memberId: trip.olia, amountKopecks: 25_000 },
          { memberId: trip.max, amountKopecks: 25_000 },
          { memberId: trip.iryna, amountKopecks: 25_000 },
          { memberId: trip.andrii, amountKopecks: 15_000 },
        ],
      },
    },
  ];
}

export async function addCarpathiansExpenses(ctx: ServiceContext, trip: Trip): Promise<void> {
  for (const body of carpathiansExpenses(trip)) {
    await expenseService.addExpense(ctx, { accountId: trip.accountId, ledgerId: trip.ledgerId, body });
  }
}

// Settlement has started: simulate the first "reported paid" by saving one transfer row.
export async function startSettlement(ctx: ServiceContext, trip: Trip): Promise<void> {
  await ctx.prisma.transfer.create({
    data: {
      ledgerId: trip.ledgerId,
      fromMemberId: trip.max,
      toMemberId: trip.olia,
      amountKopecks: 36_213n,
      state: "REPORTED_PAID",
      reportedVia: "PAYER_LINK",
      reportedAt: new Date(),
    },
  });
}
