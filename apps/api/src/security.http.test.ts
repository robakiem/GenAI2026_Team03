import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  errorResponseSchema,
  expensesListSchema,
  ledgerWithMembersSchema,
  LIMITS,
  memberPageSchema,
} from "@babki/shared";
import { createApp } from "./app";
import { createTestDb, type TestDb } from "./test/db";

// Security and robustness over HTTP: tenant isolation, sessions, hostile input, error hygiene.
// Rules: CD-09, CD-10, BR-39 … BR-43, NFR-03, NFR-04, contracts 3.2.
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

async function coordinator(email: string, names: string[] = ["Max", "Iryna"]) {
  const agent = request.agent(app);
  await agent.post("/api/auth/signup").send({ email, password: "password1" });
  const created = await agent.post("/api/ledgers").send({ name: "Trip", coordinatorName: "Olia" });
  const ledgerId = ledgerWithMembersSchema.parse(created.body).ledger.id;
  for (const name of names) await agent.post(`/api/ledgers/${ledgerId}/members`).send({ name });
  const { members } = ledgerWithMembersSchema.parse((await agent.get(`/api/ledgers/${ledgerId}`)).body);
  return { agent, ledgerId, members };
}

const equal = (payerId: string, participantIds: string[]) => ({
  title: "Lunch",
  amountKopecks: 30_000,
  payerId,
  split: { mode: "EQUAL", participantIds },
});

describe("Tenant isolation: another Coordinator never reaches my ledger (CD-10, NFR-04)", () => {
  it("every ledger endpoint answers 404 for a foreign ledger and changes nothing", async () => {
    const mine = await coordinator("tenant-a@example.com");
    const [olia, max] = mine.members;
    const expense = await mine.agent.post(`/api/ledgers/${mine.ledgerId}/expenses`).send(equal(olia.id, [olia.id, max.id]));
    const expenseId = (expense.body as { expense: { id: string } }).expense.id;

    const intruder = await coordinator("tenant-b@example.com");
    const base = `/api/ledgers/${mine.ledgerId}`;
    const attempts = [
      await intruder.agent.get(base),
      await intruder.agent.post(`${base}/members`).send({ name: "Spy" }),
      await intruder.agent.put(`${base}/members/${max.id}/payment-details`).send({ paymentDetails: "evil" }),
      await intruder.agent.get(`${base}/expenses`),
      await intruder.agent.post(`${base}/expenses`).send(equal(olia.id, [olia.id])),
      await intruder.agent.put(`${base}/expenses/${expenseId}`).send(equal(olia.id, [olia.id])),
      await intruder.agent.get(`${base}/settlement`),
    ];
    for (const res of attempts) {
      expect(res.status).toBe(404);
      expect(errorOf(res).code).toBe("LEDGER_NOT_FOUND");
    }

    // The owner still sees exactly what was there before.
    const after = ledgerWithMembersSchema.parse((await mine.agent.get(base)).body);
    expect(after.members.map((m) => m.name)).toEqual(["Olia", "Max", "Iryna"]);
    expect(after.members.find((m) => m.id === max.id)?.paymentDetails).toBeNull();
    const list = expensesListSchema.parse((await mine.agent.get(`${base}/expenses`)).body);
    expect(list.expenses).toHaveLength(1);
    expect(list.expenses[0].title).toBe("Lunch");
  });

  it("an expense or member id of another ledger cannot be used through my own ledger", async () => {
    const mine = await coordinator("tenant-c@example.com");
    const other = await coordinator("tenant-d@example.com");
    const foreignMember = other.members[1];
    const foreignExpense = await other.agent
      .post(`/api/ledgers/${other.ledgerId}/expenses`)
      .send(equal(other.members[0].id, [other.members[0].id]));
    const foreignExpenseId = (foreignExpense.body as { expense: { id: string } }).expense.id;

    // a foreign member as payer or participant is refused
    const asPayer = await mine.agent.post(`/api/ledgers/${mine.ledgerId}/expenses`).send(equal(foreignMember.id, [mine.members[0].id]));
    expect(asPayer.status).toBe(400);
    expect(errorOf(asPayer).code).toBe("MEMBER_NOT_IN_LEDGER");
    const asParticipant = await mine.agent
      .post(`/api/ledgers/${mine.ledgerId}/expenses`)
      .send(equal(mine.members[0].id, [mine.members[0].id, foreignMember.id]));
    expect(errorOf(asParticipant).code).toBe("MEMBER_NOT_IN_LEDGER");

    // editing a foreign expense through my ledger id is a 404, and the original is untouched
    const edit = await mine.agent
      .put(`/api/ledgers/${mine.ledgerId}/expenses/${foreignExpenseId}`)
      .send({ ...equal(mine.members[0].id, [mine.members[0].id]), title: "Hijacked" });
    expect(edit.status).toBe(404);
    expect(errorOf(edit).code).toBe("EXPENSE_NOT_FOUND");
    const untouched = expensesListSchema.parse((await other.agent.get(`/api/ledgers/${other.ledgerId}/expenses`)).body);
    expect(untouched.expenses.map((e) => e.title)).toEqual(["Lunch"]);

    // payment details of a foreign member cannot be set through my ledger
    const details = await mine.agent
      .put(`/api/ledgers/${mine.ledgerId}/members/${foreignMember.id}/payment-details`)
      .send({ paymentDetails: "evil" });
    expect(details.status).toBe(404);
    const foreign = ledgerWithMembersSchema.parse((await other.agent.get(`/api/ledgers/${other.ledgerId}`)).body);
    expect(foreign.members.find((m) => m.id === foreignMember.id)?.paymentDetails).toBeNull();
  });
});

describe("Member pages leak nothing beyond their owner's own data (BR-40, BR-41, NFR-03)", () => {
  it("the page of one member contains no other member's link token, balance or payment details", async () => {
    const trip = await coordinator("leak-a@example.com", ["Max", "Iryna"]);
    const [olia, max, iryna] = trip.members;
    await trip.agent.put(`/api/ledgers/${trip.ledgerId}/members/${iryna.id}/payment-details`).send({ paymentDetails: "IRYNA-SECRET-CARD" });
    await trip.agent
      .post(`/api/ledgers/${trip.ledgerId}/expenses`)
      .send({ title: "Dinner", amountKopecks: 90_000, payerId: olia.id, split: { mode: "EQUAL", participantIds: [olia.id, max.id, iryna.id] } });

    const res = await request(app).get(`/api/links/${max.linkToken}`);
    expect(res.status).toBe(200);
    const text = JSON.stringify(res.body);
    const page = memberPageSchema.parse(res.body);
    // Max owes Olia 300.00 and nothing else: Iryna's transfer is not on his page (BR-40)
    expect(page.youPay.map((t) => [t.toName, t.amountKopecks])).toEqual([["Olia", 30_000]]);
    expect(page.youReceive).toEqual([]);
    expect(page.breakdown.lines).toHaveLength(1);
    expect(text).not.toContain("Iryna");
    expect(text).not.toContain("IRYNA-SECRET-CARD");
    expect(text).not.toContain(iryna.linkToken);
    expect(text).not.toContain(olia.linkToken);
    expect(text).not.toContain("passwordHash");
    expect(text).not.toContain("leak-a@example.com");
  });

  it("unknown, truncated, empty-ish and hostile tokens all give the same neutral 404 without any trip name", async () => {
    const trip = await coordinator("leak-b@example.com");
    const token = trip.members[1].linkToken;
    const bodies = [];
    for (const bad of [token.slice(0, -1), `${token}x`, token.toUpperCase(), "%00", "..%2F..%2Fetc", "' OR '1'='1", "a".repeat(5000)]) {
      const res = await request(app).get(`/api/links/${encodeURIComponent(bad)}`);
      expect(res.status, bad.slice(0, 30)).toBe(404);
      expect(errorOf(res).code).toBe("LINK_NOT_FOUND");
      expect(JSON.stringify(res.body)).not.toContain("Trip");
      bodies.push(res.body);
    }
    for (const body of bodies) expect(body).toEqual(bodies[0]);
  });

  it("a member link cannot write: POST, PUT and DELETE under /api/links are not routes (BR-39)", async () => {
    const trip = await coordinator("leak-c@example.com");
    const token = trip.members[1].linkToken;
    for (const send of [
      request(app).post(`/api/links/${token}`).send({}),
      request(app).put(`/api/links/${token}`).send({}),
      request(app).delete(`/api/links/${token}`),
      request(app).post(`/api/links/${token}/expenses`).send(equal(trip.members[1].id, [trip.members[1].id])),
    ]) {
      const res = await send;
      expect(res.status).toBe(404);
    }
    const list = expensesListSchema.parse((await trip.agent.get(`/api/ledgers/${trip.ledgerId}/expenses`)).body);
    expect(list.expenses).toEqual([]);
  });
});

describe("Sessions (ADR-0005)", () => {
  it("a session id kept from before sign-out stops working afterwards", async () => {
    const signup = await request(app).post("/api/auth/signup").send({ email: "sess-a@example.com", password: "password1" });
    const cookie = signup.headers["set-cookie"]?.[0]?.split(";")[0] ?? "";
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).status).toBe(200);
    await request(app).post("/api/auth/signout").set("Cookie", cookie);
    const replay = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(replay.status).toBe(401);
    expect(errorOf(replay).code).toBe("UNAUTHENTICATED");
  });

  it("an expired session is refused and removed", async () => {
    const signup = await request(app).post("/api/auth/signup").send({ email: "sess-b@example.com", password: "password1" });
    const cookie = signup.headers["set-cookie"]?.[0]?.split(";")[0] ?? "";
    const id = decodeURIComponent(cookie.split("=")[1]);
    await db.prisma.session.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).status).toBe(401);
    expect(await db.prisma.session.findUnique({ where: { id } })).toBeNull();
  });

  it.each(["", "babki_session=", "babki_session=nonsense", "babki_session=%E0%A4%A", "other=1", "babki_session=a; babki_session=b"])(
    "a garbage cookie (%j) means 401, never a crash",
    async (cookie) => {
      const res = await request(app).get("/api/ledgers").set("Cookie", cookie);
      expect(res.status).toBe(401);
      expect(errorOf(res).code).toBe("UNAUTHENTICATED");
    },
  );

  it("each sign-in creates a new session id; signing out one device keeps the other signed in", async () => {
    await request(app).post("/api/auth/signup").send({ email: "sess-c@example.com", password: "password1" });
    const first = await request(app).post("/api/auth/signin").send({ email: "sess-c@example.com", password: "password1" });
    const second = await request(app).post("/api/auth/signin").send({ email: "sess-c@example.com", password: "password1" });
    const a = first.headers["set-cookie"]?.[0]?.split(";")[0] ?? "";
    const b = second.headers["set-cookie"]?.[0]?.split(";")[0] ?? "";
    expect(a).not.toBe(b);
    await request(app).post("/api/auth/signout").set("Cookie", a);
    expect((await request(app).get("/api/auth/me").set("Cookie", a)).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Cookie", b)).status).toBe(200);
  });

  it("the cookie is Secure behind an HTTPS proxy and plain on http (ADR-0005)", async () => {
    const plain = await request(app).post("/api/auth/signup").send({ email: "sess-d@example.com", password: "password1" });
    expect(plain.headers["set-cookie"]?.[0]).not.toContain("Secure");
    const behindProxy = await request(app)
      .post("/api/auth/signup")
      .set("X-Forwarded-Proto", "https")
      .send({ email: "sess-e@example.com", password: "password1" });
    expect(behindProxy.headers["set-cookie"]?.[0]).toContain("Secure");
  });

  it("an e-mail differing only by case is the same account (EMAIL_TAKEN, and sign-in works in any case)", async () => {
    expect((await request(app).post("/api/auth/signup").send({ email: "Case@Example.com", password: "password1" })).status).toBe(201);
    const dup = await request(app).post("/api/auth/signup").send({ email: "case@example.COM", password: "password1" });
    expect(dup.status).toBe(409);
    expect(errorOf(dup).code).toBe("EMAIL_TAKEN");
    expect((await request(app).post("/api/auth/signin").send({ email: "CASE@example.com", password: "password1" })).status).toBe(200);
  });

  it("a password longer than bcrypt's 72 bytes is still fully significant", async () => {
    const long = "p".repeat(80);
    await request(app).post("/api/auth/signup").send({ email: "sess-f@example.com", password: `${long}A` });
    const wrong = await request(app).post("/api/auth/signin").send({ email: "sess-f@example.com", password: `${long}B` });
    expect(wrong.status).toBe(401);
    const right = await request(app).post("/api/auth/signin").send({ email: "sess-f@example.com", password: `${long}A` });
    expect(right.status).toBe(200);
  });
});

describe("Error hygiene (contracts 3.2)", () => {
  it("no response ever carries the password hash or the session id in its body", async () => {
    const signup = await request(app).post("/api/auth/signup").send({ email: "hyg-a@example.com", password: "password1" });
    const cookie = signup.headers["set-cookie"]?.[0]?.split(";")[0] ?? "";
    const id = decodeURIComponent(cookie.split("=")[1]);
    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
    for (const res of [signup, me]) {
      const text = JSON.stringify(res.body);
      expect(text).not.toContain("passwordHash");
      expect(text).not.toContain("$2");
      expect(text).not.toContain(id);
      expect(Object.keys((res.body as { account: object }).account).sort()).toEqual(["email", "id"]);
    }
  });

  it("every error body has exactly the documented shape and no stack, SQL or file path", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/signup").send({ email: "hyg-b@example.com", password: "password1" });
    const responses = [
      await request(app).get("/api/nope"),
      await request(app).post("/api/auth/signin").set("Content-Type", "application/json").send("{bad"),
      await agent.get("/api/ledgers/missing"),
      await agent.post("/api/ledgers").send({}),
      await request(app).get("/api/links/missing"),
    ];
    for (const res of responses) {
      expect(res.status).toBeGreaterThanOrEqual(400);
      const parsed = errorResponseSchema.strict().safeParse(res.body);
      expect(parsed.success, JSON.stringify(res.body)).toBe(true);
      const text = JSON.stringify(res.body);
      expect(text).not.toMatch(/\bat .*\(.*:\d+:\d+\)/); // stack frame
      expect(text).not.toMatch(/prisma|select |insert |\/Users\/|node_modules/i);
    }
  });

  it("a request body above the size limit is a client error in the error format, not a 500", async () => {
    const res = await request(app)
      .post("/api/auth/signin")
      .send({ email: "a@example.com", password: "x".repeat(200_000) });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(errorResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it.each([
    ["a JSON array", "[1,2]"],
    ["JSON null", "null"],
    ["a bare string", '"text"'],
    ["a number", "42"],
  ])("a body that is %s is a 400 in the error format", async (_name, raw) => {
    const res = await request(app).post("/api/auth/signin").set("Content-Type", "application/json").send(raw);
    expect(res.status).toBe(400);
    errorResponseSchema.parse(res.body);
  });
});

describe("Hostile and unusual text is stored literally and never executed", () => {
  it("SQL, HTML and control characters in names and titles come back unchanged; nothing is dropped", async () => {
    const trip = await coordinator("text-a@example.com", []);
    const [olia] = trip.members;
    const nasty = ["'); DROP TABLE Expense;--", "<script>alert(1)</script>", "Ж‑ю‑я 🍕🏔️", "line\nbreak", "  spaced  "];
    for (const title of nasty) {
      const res = await trip.agent
        .post(`/api/ledgers/${trip.ledgerId}/expenses`)
        .send({ title, amountKopecks: 10_000, payerId: olia.id, split: { mode: "EQUAL", participantIds: [olia.id] } });
      expect(res.status, title).toBe(201);
    }
    const list = expensesListSchema.parse((await trip.agent.get(`/api/ledgers/${trip.ledgerId}/expenses`)).body);
    expect(list.expenses.map((e) => e.title)).toEqual(nasty.map((t) => t.trim()));
    expect((await trip.agent.get(`/api/ledgers/${trip.ledgerId}/settlement`)).status).toBe(200);
  });

  it("boundaries: a 60-character title and a 40-character name are accepted, one more is refused", async () => {
    const trip = await coordinator("text-b@example.com", []);
    const olia = trip.members[0];
    const post = (title: string) =>
      trip.agent
        .post(`/api/ledgers/${trip.ledgerId}/expenses`)
        .send({ title, amountKopecks: 100, payerId: olia.id, split: { mode: "EQUAL", participantIds: [olia.id] } });
    expect((await post("x".repeat(LIMITS.expenseTitle.max))).status).toBe(201);
    expect((await post("x".repeat(LIMITS.expenseTitle.max + 1))).status).toBe(400);
    const member = (name: string) => trip.agent.post(`/api/ledgers/${trip.ledgerId}/members`).send({ name });
    expect((await member("n".repeat(LIMITS.memberName.max))).status).toBe(201);
    expect((await member("n".repeat(LIMITS.memberName.max + 1))).status).toBe(400);
  });

  it("the 21st member is refused with MEMBER_LIMIT_REACHED and the limit in params (BR-20)", async () => {
    const trip = await coordinator("text-c@example.com", []);
    for (let i = 2; i <= LIMITS.membersPerLedger; i++) {
      const res = await trip.agent.post(`/api/ledgers/${trip.ledgerId}/members`).send({ name: `Friend ${i}` });
      expect(res.status).toBe(201);
    }
    const over = await trip.agent.post(`/api/ledgers/${trip.ledgerId}/members`).send({ name: "One too many" });
    expect(over.status).toBe(409);
    expect(errorOf(over)).toMatchObject({ code: "MEMBER_LIMIT_REACHED", params: { limit: LIMITS.membersPerLedger } });
    const { members } = ledgerWithMembersSchema.parse((await trip.agent.get(`/api/ledgers/${trip.ledgerId}`)).body);
    expect(members).toHaveLength(LIMITS.membersPerLedger);
  });

  it("member names that differ only by case, accents-free spelling or surrounding spaces count as the same name (BR-19)", async () => {
    const trip = await coordinator("text-d@example.com", ["Max"]);
    for (const name of ["MAX", " max ", "mAx"]) {
      const res = await trip.agent.post(`/api/ledgers/${trip.ledgerId}/members`).send({ name });
      expect(res.status, name).toBe(409);
      expect(errorOf(res).code).toBe("MEMBER_NAME_TAKEN");
    }
  });
});
