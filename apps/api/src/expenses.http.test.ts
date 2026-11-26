import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  errorResponseSchema,
  expenseResponseSchema,
  expensesListSchema,
  ledgerWithMembersSchema,
  memberCreatedSchema,
  memberPageSchema,
  settlementSchema,
} from "@babki/shared";
import { createApp } from "./app";
import { createTestDb, type TestDb } from "./test/db";

let db: TestDb;
let app: ReturnType<typeof createApp>;
const errorOf = (res: { body: unknown }) => errorResponseSchema.parse(res.body).error;

beforeAll(() => {
  db = createTestDb();
  app = createApp({ prisma: db.prisma, pingDatabase: () => Promise.resolve() });
});
afterAll(async () => {
  await db.cleanup();
});

// A signed-in Coordinator with the four Carpathians members.
async function setUp(email: string) {
  const olia = request.agent(app);
  await olia.post("/api/auth/signup").send({ email, password: "password1" });
  const created = await olia.post("/api/ledgers").send({ name: "Carpathians", coordinatorName: "Olia" });
  const ledgerId = ledgerWithMembersSchema.parse(created.body).ledger.id;
  for (const name of ["Max", "Iryna", "Andrii"]) {
    await olia.post(`/api/ledgers/${ledgerId}/members`).send({ name });
  }
  const { members } = ledgerWithMembersSchema.parse((await olia.get(`/api/ledgers/${ledgerId}`)).body);
  const [m1, m2, m3, m4] = members;
  return { olia, ledgerId, members: { olia: m1, max: m2, iryna: m3, andrii: m4 } };
}

describe("Expenses, settlement and the member page over HTTP (EP-10, EP-11 … EP-14, EP-18)", () => {
  it("From four expenses to Max's personal page", async () => {
    const { olia, ledgerId, members } = await setUp("olia@example.com");
    const all = [members.andrii.id, members.olia.id, members.max.id, members.iryna.id];

    // EP-11: the Groceries example of contracts 2.6, with the idempotency key
    const groceries = {
      title: "Groceries",
      amountKopecks: 185_050,
      payerId: members.max.id,
      clientRequestId: "b3d1c7e2-5a0f-4c1e-9a55-0f6e2d7c1a10",
      split: { mode: "EQUAL", participantIds: all },
    };
    const first = await olia.post(`/api/ledgers/${ledgerId}/expenses`).send(groceries);
    expect(first.status).toBe(201);
    const saved = expenseResponseSchema.parse(first.body).expense;
    expect(saved.shares.map((s) => s.amountKopecks)).toEqual([46_263, 46_263, 46_262, 46_262]);

    // the same request again → 200 with the same expense, no duplicate
    const repeat = await olia.post(`/api/ledgers/${ledgerId}/expenses`).send(groceries);
    expect(repeat.status).toBe(200);
    expect(expenseResponseSchema.parse(repeat.body).expense.id).toBe(saved.id);

    const rest = [
      { title: "House rent", amountKopecks: 600_000, payerId: members.olia.id, split: { mode: "EQUAL", participantIds: all } },
      {
        title: "Taxi",
        amountKopecks: 42_000,
        payerId: members.iryna.id,
        split: { mode: "EQUAL", participantIds: [members.olia.id, members.iryna.id, members.andrii.id] },
      },
      {
        title: "Funicular",
        amountKopecks: 90_000,
        payerId: members.andrii.id,
        split: {
          mode: "AMOUNTS",
          shares: [
            { memberId: members.olia.id, amountKopecks: 25_000 },
            { memberId: members.max.id, amountKopecks: 25_000 },
            { memberId: members.iryna.id, amountKopecks: 25_000 },
            { memberId: members.andrii.id, amountKopecks: 15_000 },
          ],
        },
      },
    ];
    for (const body of rest) {
      expect((await olia.post(`/api/ledgers/${ledgerId}/expenses`).send(body)).status).toBe(201);
    }

    // EP-13
    const list = expensesListSchema.parse((await olia.get(`/api/ledgers/${ledgerId}/expenses`)).body);
    expect(list.expenses.map((e) => e.title)).toEqual(["Groceries", "House rent", "Taxi", "Funicular"]);

    // EP-14: the order of entry differs from requirements 4.2, the result is the same (BR-23)
    const settlement = settlementSchema.parse((await olia.get(`/api/ledgers/${ledgerId}/settlement`)).body);
    expect(settlement.source).toBe("PROPOSED");
    expect(settlement.transfers.map((t) => [t.fromMemberId, t.toMemberId, t.amountKopecks])).toEqual([
      [members.max.id, members.olia.id, 36_213],
      [members.iryna.id, members.olia.id, 193_262],
      [members.andrii.id, members.olia.id, 135_262],
    ]);

    // EP-10
    const details = await olia
      .put(`/api/ledgers/${ledgerId}/members/${members.olia.id}/payment-details`)
      .send({ paymentDetails: "Card 0000 0000 0000 0001, Olia K." });
    expect(details.status).toBe(200);
    expect(memberCreatedSchema.parse(details.body).member.paymentDetails).toBe("Card 0000 0000 0000 0001, Olia K.");

    // EP-18: no session needed
    const page = await request(app).get(`/api/links/${members.max.linkToken}`);
    expect(page.status).toBe(200);
    const parsed = memberPageSchema.parse(page.body);
    expect(parsed.member.name).toBe("Max");
    expect(parsed.youPay).toEqual([
      {
        toMemberId: members.olia.id,
        toName: "Olia",
        amountKopecks: 36_213,
        state: "OPEN",
        reportedVia: null,
        paymentDetails: "Card 0000 0000 0000 0001, Olia K.",
      },
    ]);
  });

  it.each([
    [0, "OUT_OF_RANGE"],
    [-100, "OUT_OF_RANGE"],
    [100_000_000, "OUT_OF_RANGE"],
    [150.5, "NOT_AN_INTEGER"],
    ["150", "INVALID_TYPE"],
  ])("An invalid amount is refused: %s", async (amountKopecks, detail) => {
    const { olia, ledgerId, members } = await setUp(`amount-${String(amountKopecks)}@example.com`);
    const res = await olia
      .post(`/api/ledgers/${ledgerId}/expenses`)
      .send({ title: "Lunch", amountKopecks, payerId: members.olia.id, split: { mode: "EQUAL", participantIds: [members.max.id] } });
    expect(res.status).toBe(400);
    const error = errorOf(res);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details).toContainEqual(expect.objectContaining({ field: "amountKopecks", code: detail }));
    expect(expensesListSchema.parse((await olia.get(`/api/ledgers/${ledgerId}/expenses`)).body).expenses).toEqual([]);
  });

  it("An expense without participants is refused", async () => {
    const { olia, ledgerId, members } = await setUp("empty@example.com");
    const res = await olia
      .post(`/api/ledgers/${ledgerId}/expenses`)
      .send({ title: "Lunch", amountKopecks: 10_000, payerId: members.olia.id, split: { mode: "EQUAL", participantIds: [] } });
    expect(res.status).toBe(400);
    expect(errorOf(res).details).toContainEqual(expect.objectContaining({ field: "split.participantIds", code: "TOO_FEW_ITEMS" }));
  });

  it("the same member twice in one split is refused", async () => {
    const { olia, ledgerId, members } = await setUp("twice@example.com");
    const res = await olia.post(`/api/ledgers/${ledgerId}/expenses`).send({
      title: "Lunch",
      amountKopecks: 10_000,
      payerId: members.olia.id,
      split: { mode: "EQUAL", participantIds: [members.max.id, members.max.id] },
    });
    expect(res.status).toBe(400);
    expect(errorOf(res).details).toContainEqual(expect.objectContaining({ code: "DUPLICATE_ITEM" }));
  });

  it("a blank or too long title is refused", async () => {
    const { olia, ledgerId, members } = await setUp("title@example.com");
    for (const title of ["   ", "x".repeat(61)]) {
      const res = await olia
        .post(`/api/ledgers/${ledgerId}/expenses`)
        .send({ title, amountKopecks: 100, payerId: members.olia.id, split: { mode: "EQUAL", participantIds: [members.olia.id] } });
      expect(res.status).toBe(400);
      expect(errorOf(res).details?.[0]?.field).toBe("title");
    }
  });

  it("Removing every participant is refused", async () => {
    const { olia, ledgerId, members } = await setUp("edit@example.com");
    const body = { title: "Lunch", amountKopecks: 10_000, payerId: members.olia.id, split: { mode: "EQUAL", participantIds: [members.max.id] } };
    const created = expenseResponseSchema.parse((await olia.post(`/api/ledgers/${ledgerId}/expenses`).send(body)).body).expense;
    const res = await olia
      .put(`/api/ledgers/${ledgerId}/expenses/${created.id}`)
      .send({ ...body, split: { mode: "EQUAL", participantIds: [] } });
    expect(res.status).toBe(400);
    const list = expensesListSchema.parse((await olia.get(`/api/ledgers/${ledgerId}/expenses`)).body).expenses;
    expect(list[0]?.shares).toEqual(created.shares);
  });

  it("payment details of 101 characters are refused, 100 are accepted, empty means none", async () => {
    const { olia, ledgerId, members } = await setUp("details@example.com");
    const url = `/api/ledgers/${ledgerId}/members/${members.max.id}/payment-details`;
    expect((await olia.put(url).send({ paymentDetails: "x".repeat(101) })).status).toBe(400);
    expect((await olia.put(url).send({ paymentDetails: "x".repeat(100) })).status).toBe(200);
    const cleared = await olia.put(url).send({ paymentDetails: "" });
    expect(memberCreatedSchema.parse(cleared.body).member.paymentDetails).toBeNull();
  });

  it("a member link has no access to Coordinator routes, and link routes ignore the cookie", async () => {
    const { olia, ledgerId, members } = await setUp("links@example.com");
    const anonymous = await request(app).get(`/api/ledgers/${ledgerId}/settlement`);
    expect(anonymous.status).toBe(401);
    // A signed-in Coordinator opening a member link still sees only that member's page.
    const page = memberPageSchema.parse((await olia.get(`/api/links/${members.iryna.linkToken}`)).body);
    expect(page.member.name).toBe("Iryna");
  });

  // The token must belong to a real ledger, or "no ledger name in the answer" proves nothing.
  it.each([
    ["a text that was never issued", () => "never-issued"],
    ["a valid link with its last character removed", (token: string) => token.slice(0, -1)],
  ])("An unknown link shows a neutral message: %s", async (name, broken) => {
    const { members } = await setUp(`${name.replaceAll(" ", "-")}@example.com`);
    const res = await request(app).get(`/api/links/${broken(members.max.linkToken)}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "LINK_NOT_FOUND", message: "Link not found." } });
  });
});
