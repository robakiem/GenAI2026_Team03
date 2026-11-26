import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ZodType } from "zod";
import {
  accountResponseSchema,
  ERROR_CODES,
  ERROR_STATUS,
  type ErrorCode,
  errorResponseSchema,
  expenseResponseSchema,
  expensesListSchema,
  healthResponseSchema,
  ledgersListSchema,
  ledgerWithMembersSchema,
  memberCreatedSchema,
  memberPageSchema,
  settlementSchema,
} from "@babki/shared";
import { createApp } from "./app";
import { createTestDb, type TestDb } from "./test/db";
import { brokenPrisma } from "./test/faults";

// Contract tests: the API is held to docs/technical-contracts.md through the shared schemas.
// A response must (1) match its schema and (2) carry nothing the schema does not name, so a field
// added by accident (a hash, an id, a token of another member) fails here.
let db: TestDb;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  db = createTestDb();
  app = createApp({ prisma: db.prisma, pingDatabase: () => Promise.resolve() });
});
afterAll(async () => {
  await db.cleanup();
});

function exact<T>(schema: ZodType<T>, body: unknown): T {
  const parsed = schema.parse(body);
  expect(body, "the body has fields the contract does not name").toEqual(parsed);
  return parsed;
}

async function trip(email: string) {
  const agent = request.agent(app);
  await agent.post("/api/auth/signup").send({ email, password: "password1" });
  const created = ledgerWithMembersSchema.parse((await agent.post("/api/ledgers").send({ name: "Trip", coordinatorName: "Olia" })).body);
  const ledgerId = created.ledger.id;
  for (const name of ["Max", "Iryna"]) await agent.post(`/api/ledgers/${ledgerId}/members`).send({ name });
  const { members } = ledgerWithMembersSchema.parse((await agent.get(`/api/ledgers/${ledgerId}`)).body);
  const [olia, max, iryna] = members;
  const all = members.map((m) => m.id);
  const lunch = { title: "Lunch", amountKopecks: 30_000, payerId: olia.id, split: { mode: "EQUAL", participantIds: all } };
  return { agent, ledgerId, olia, max, iryna, all, lunch };
}

describe("Success responses match the contract exactly", () => {
  it("EP-02 … EP-05: account endpoints", async () => {
    const up = await request(app).post("/api/auth/signup").send({ email: "contract-a@example.com", password: "password1" });
    expect(up.status).toBe(201);
    exact(accountResponseSchema, up.body);
    const cookie = up.headers["set-cookie"]?.[0]?.split(";")[0] ?? "";
    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(200);
    exact(accountResponseSchema, me.body);
    const inn = await request(app).post("/api/auth/signin").send({ email: "contract-a@example.com", password: "password1" });
    expect(inn.status).toBe(200);
    exact(accountResponseSchema, inn.body);
    const out = await request(app).post("/api/auth/signout").set("Cookie", cookie);
    expect(out.status).toBe(204);
    expect(out.text).toBe("");
  });

  it("EP-06 … EP-10: ledgers, members and payment details", async () => {
    const t = await trip("contract-b@example.com");
    exact(ledgersListSchema, (await t.agent.get("/api/ledgers")).body);
    const one = await t.agent.get(`/api/ledgers/${t.ledgerId}`);
    expect(one.status).toBe(200);
    const parsed = exact(ledgerWithMembersSchema, one.body);
    expect(parsed.members.map((m) => m.position)).toEqual([1, 2, 3]);
    expect(parsed.members[0].isCoordinator).toBe(true);
    expect(parsed.ledger.state).toBe("ACTIVE");
    const added = await t.agent.post(`/api/ledgers/${t.ledgerId}/members`).send({ name: "Andrii" });
    expect(added.status).toBe(201);
    exact(memberCreatedSchema, added.body);
    const details = await t.agent.put(`/api/ledgers/${t.ledgerId}/members/${t.max.id}/payment-details`).send({ paymentDetails: "Card 1" });
    expect(details.status).toBe(200);
    exact(memberCreatedSchema, details.body);
  });

  it("EP-11 … EP-14: expenses and settlement", async () => {
    const t = await trip("contract-c@example.com");
    const created = await t.agent.post(`/api/ledgers/${t.ledgerId}/expenses`).send({ ...t.lunch, clientRequestId: "k1" });
    expect(created.status).toBe(201);
    const { expense } = exact(expenseResponseSchema, created.body);
    expect(expense.shares.map((s) => s.amountKopecks)).toEqual([10_000, 10_000, 10_000]);
    expect(expense.shares.every((s) => s.percentBp === null)).toBe(true);

    const repeat = await t.agent.post(`/api/ledgers/${t.ledgerId}/expenses`).send({ ...t.lunch, clientRequestId: "k1" });
    expect(repeat.status).toBe(200);
    expect(exact(expenseResponseSchema, repeat.body).expense.id).toBe(expense.id);

    const edited = await t.agent.put(`/api/ledgers/${t.ledgerId}/expenses/${expense.id}`).send({ ...t.lunch, title: "Dinner" });
    expect(edited.status).toBe(200);
    expect(exact(expenseResponseSchema, edited.body).expense.id).toBe(expense.id);

    exact(expensesListSchema, (await t.agent.get(`/api/ledgers/${t.ledgerId}/expenses`)).body);
    const settlement = exact(settlementSchema, (await t.agent.get(`/api/ledgers/${t.ledgerId}/settlement`)).body);
    expect(settlement).toMatchObject({ source: "PROPOSED", ledgerState: "ACTIVE", fullySettled: false });
    expect(settlement.transfers.every((tr) => tr.id === null && tr.state === "OPEN")).toBe(true);
    expect(settlement.balances.reduce((s, b) => s + b.balanceKopecks, 0)).toBe(0);
  });

  it("EP-18: the member page, before and after settlement started", async () => {
    const t = await trip("contract-d@example.com");
    await t.agent.post(`/api/ledgers/${t.ledgerId}/expenses`).send(t.lunch);
    const before = await request(app).get(`/api/links/${t.max.linkToken}`);
    expect(before.status).toBe(200);
    const page = exact(memberPageSchema, before.body);
    expect(page.youPay).toHaveLength(1);
    expect(page.youReceive).toEqual([]);

    await db.prisma.transfer.create({
      data: { ledgerId: t.ledgerId, fromMemberId: t.max.id, toMemberId: t.olia.id, amountKopecks: 10_000n, state: "REPORTED_PAID", reportedVia: "PAYER_LINK", reportedAt: new Date() },
    });
    const after = exact(memberPageSchema, (await request(app).get(`/api/links/${t.max.linkToken}`)).body);
    expect(after.youPay[0]).toMatchObject({ state: "REPORTED_PAID", reportedVia: "PAYER_LINK" });
    const receiver = exact(memberPageSchema, (await request(app).get(`/api/links/${t.olia.linkToken}`)).body);
    expect(receiver.youReceive[0]).toMatchObject({ fromName: "Max", amountKopecks: 10_000, state: "REPORTED_PAID" });
    const settlement = exact(settlementSchema, (await t.agent.get(`/api/ledgers/${t.ledgerId}/settlement`)).body);
    expect(settlement).toMatchObject({ source: "SAVED", ledgerState: "SETTLING", fullySettled: false });
    expect(settlement.transfers[0].id).toEqual(expect.any(String));
    expect(typeof settlement.transfers[0].amountKopecks).toBe("number"); // BigInt never reaches JSON (CD-14)
  });

  it("EP-01: health", async () => {
    const res = await request(app).get("/api/health");
    exact(healthResponseSchema, res.body);
  });

  it("timestamps are ISO 8601 UTC and ids are opaque non-empty strings (contracts 2)", async () => {
    const t = await trip("contract-e@example.com");
    const { expense } = expenseResponseSchema.parse((await t.agent.post(`/api/ledgers/${t.ledgerId}/expenses`).send(t.lunch)).body);
    for (const stamp of [expense.createdAt, expense.updatedAt]) {
      expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
    expect([expense.id, t.ledgerId, t.max.id].every((id) => id.length > 0)).toBe(true);
  });
});

describe("Every error code answers with the status of the catalogue (contracts 3.3)", () => {
  type Trigger = () => Promise<request.Response>;
  const triggers: Partial<Record<ErrorCode, Trigger>> = {};
  const reachable = (code: ErrorCode, trigger: Trigger) => {
    triggers[code] = trigger;
  };

  reachable("VALIDATION_ERROR", async () => request(app).post("/api/auth/signup").send({ email: "bad", password: "x" }));
  reachable("MALFORMED_JSON", async () => request(app).post("/api/auth/signin").set("Content-Type", "application/json").send("{"));
  reachable("UNAUTHENTICATED", async () => request(app).get("/api/ledgers"));
  reachable("INVALID_CREDENTIALS", async () => request(app).post("/api/auth/signin").send({ email: "no@one.co", password: "password1" }));
  reachable("NOT_FOUND", async () => request(app).get("/api/unknown"));
  reachable("LINK_NOT_FOUND", async () => request(app).get("/api/links/AAAAAAAAAAAAAAAAAAAAAA"));
  reachable("EMAIL_TAKEN", async () => {
    await request(app).post("/api/auth/signup").send({ email: "taken@example.com", password: "password1" });
    return request(app).post("/api/auth/signup").send({ email: "taken@example.com", password: "password1" });
  });
  reachable("LEDGER_NOT_FOUND", async () => (await trip("e-ledger@example.com")).agent.get("/api/ledgers/nope"));
  reachable("EXPENSE_NOT_FOUND", async () => {
    const t = await trip("e-expense@example.com");
    return t.agent.put(`/api/ledgers/${t.ledgerId}/expenses/nope`).send(t.lunch);
  });
  reachable("MEMBER_NOT_FOUND", async () => {
    const t = await trip("e-member@example.com");
    return t.agent.put(`/api/ledgers/${t.ledgerId}/members/nope/payment-details`).send({ paymentDetails: "x" });
  });
  reachable("MEMBER_NAME_TAKEN", async () => {
    const t = await trip("e-name@example.com");
    return t.agent.post(`/api/ledgers/${t.ledgerId}/members`).send({ name: "MAX" });
  });
  reachable("MEMBER_LIMIT_REACHED", async () => {
    const t = await trip("e-limit@example.com");
    for (let i = 4; i <= 20; i++) await t.agent.post(`/api/ledgers/${t.ledgerId}/members`).send({ name: `F${i}` });
    return t.agent.post(`/api/ledgers/${t.ledgerId}/members`).send({ name: "Extra" });
  });
  reachable("MEMBER_NOT_IN_LEDGER", async () => {
    const t = await trip("e-notin@example.com");
    return t.agent.post(`/api/ledgers/${t.ledgerId}/expenses`).send({ ...t.lunch, payerId: "stranger" });
  });
  reachable("AMOUNT_TOO_SMALL", async () => {
    const t = await trip("e-small@example.com");
    return t.agent.post(`/api/ledgers/${t.ledgerId}/expenses`).send({ ...t.lunch, amountKopecks: 2 });
  });
  reachable("SHARES_SUM_MISMATCH", async () => {
    const t = await trip("e-shares@example.com");
    const split = { mode: "AMOUNTS", shares: [{ memberId: t.olia.id, amountKopecks: 100 }] };
    return t.agent.post(`/api/ledgers/${t.ledgerId}/expenses`).send({ ...t.lunch, split });
  });
  reachable("PERCENT_SUM_MISMATCH", async () => {
    const t = await trip("e-percent@example.com");
    const split = { mode: "PERCENTAGES", shares: [{ memberId: t.olia.id, percentBp: 5_000 }] };
    return t.agent.post(`/api/ledgers/${t.ledgerId}/expenses`).send({ ...t.lunch, split });
  });
  reachable("SETTLEMENT_STARTED", async () => {
    const t = await trip("e-started@example.com");
    await db.prisma.transfer.create({ data: { ledgerId: t.ledgerId, fromMemberId: t.max.id, toMemberId: t.olia.id, amountKopecks: 1n } });
    return t.agent.post(`/api/ledgers/${t.ledgerId}/expenses`).send(t.lunch);
  });
  reachable("LEDGER_CLOSED", async () => {
    const t = await trip("e-closed@example.com");
    await db.prisma.ledger.update({ where: { id: t.ledgerId }, data: { closedAt: new Date() } });
    return t.agent.post(`/api/ledgers/${t.ledgerId}/expenses`).send(t.lunch);
  });
  reachable("DB_UNAVAILABLE", async () =>
    request(createApp({ prisma: db.prisma, pingDatabase: () => Promise.reject(new Error("down")) })).get("/api/health"),
  );
  reachable("INTERNAL_ERROR", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const broken = brokenPrisma(db.prisma, () => new Error("x"));
    return request(createApp({ prisma: broken, pingDatabase: () => Promise.resolve() }))
      .get("/api/auth/me")
      .set("Cookie", "babki_session=anything");
  });

  // Codes of the transfer-marking endpoints (EP-15 … EP-20) are in the catalogue but cannot be
  // reached yet; when those endpoints are built, add their triggers and shrink this list.
  const notYetReachable: ErrorCode[] = ["NOT_THE_PAYER", "NOT_THE_RECEIVER", "INVALID_STATE", "STALE_TRANSFER"];

  it("every code in the catalogue is either triggered below or explicitly listed as not yet reachable", () => {
    const covered = Object.keys(triggers) as ErrorCode[];
    expect([...covered, ...notYetReachable].sort()).toEqual([...ERROR_CODES].sort());
  });

  it.each(Object.keys(ERROR_STATUS) as ErrorCode[])("%s", async (code) => {
    const trigger = triggers[code];
    if (!trigger) {
      expect(notYetReachable).toContain(code);
      return;
    }
    const res = await trigger();
    vi.restoreAllMocks();
    expect(res.status).toBe(ERROR_STATUS[code]);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(exact(errorResponseSchema, res.body).error.code).toBe(code);
  });
});
