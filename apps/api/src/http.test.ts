import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accountResponseSchema, errorResponseSchema, ledgerWithMembersSchema, ledgersListSchema } from "@babki/shared";
import { createApp } from "./app";
import { createTestDb, type TestDb } from "./test/db";

let db: TestDb;
let app: ReturnType<typeof createApp>;

// Typed views of supertest bodies (which are `any`), parsed with the shared contract schemas.
const accountOf = (res: { body: unknown }) => accountResponseSchema.parse(res.body).account;
const ledgerOf = (res: { body: unknown }) => ledgerWithMembersSchema.parse(res.body).ledger;
const errorCodeOf = (res: { body: unknown }) => errorResponseSchema.parse(res.body).error.code;

beforeAll(() => {
  db = createTestDb();
  app = createApp({ prisma: db.prisma, pingDatabase: () => Promise.resolve() });
});
afterAll(async () => {
  await db.cleanup();
});

describe("Create-a-trip epic over HTTP (EP-02…EP-09)", () => {
  it("From an empty account to a trip with its members", async () => {
    const olia = request.agent(app);

    // EP-02 sign up (and be signed in at once)
    const signup = await olia.post("/api/auth/signup").send({ email: "olia@example.com", password: "password1" });
    expect(signup.status).toBe(201);
    expect(accountOf(signup).email).toBe("olia@example.com");
    expect(signup.headers["set-cookie"]?.[0]).toContain("babki_session=");

    // EP-05 me
    expect(accountOf(await olia.get("/api/auth/me")).email).toBe("olia@example.com");

    // EP-06 create the ledger
    const created = await olia.post("/api/ledgers").send({ name: "Carpathians", coordinatorName: "Olia" });
    expect(created.status).toBe(201);
    const ledgerId = ledgerOf(created).id;

    // EP-09 add the three friends
    for (const name of ["Max", "Iryna", "Andrii"]) {
      const res = await olia.post(`/api/ledgers/${ledgerId}/members`).send({ name });
      expect(res.status).toBe(201);
    }

    // EP-08 the ledger shows four members with four distinct links
    const detail = await olia.get(`/api/ledgers/${ledgerId}`);
    expect(detail.status).toBe(200);
    const parsed = ledgerWithMembersSchema.parse(detail.body);
    expect(parsed.members.map((m) => m.name)).toEqual(["Olia", "Max", "Iryna", "Andrii"]);
    expect(parsed.members.map((m) => m.position)).toEqual([1, 2, 3, 4]);
    expect(parsed.members[0]?.isCoordinator).toBe(true);
    expect(new Set(parsed.members.map((m) => m.linkToken)).size).toBe(4);

    // EP-07 the trip appears in the list
    expect(ledgersListSchema.parse((await olia.get("/api/ledgers")).body).ledgers).toHaveLength(1);
  });

  it("refuses an unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/ledgers");
    expect(res.status).toBe(401);
    expect(errorCodeOf(res)).toBe("UNAUTHENTICATED");
  });

  it("hides another Coordinator's ledger as 404", async () => {
    const olia = request.agent(app);
    await olia.post("/api/auth/signup").send({ email: "olia2@example.com", password: "password1" });
    const ledgerId = ledgerOf(await olia.post("/api/ledgers").send({ name: "Trip", coordinatorName: "Olia" })).id;

    const max = request.agent(app);
    await max.post("/api/auth/signup").send({ email: "max2@example.com", password: "password1" });
    const res = await max.get(`/api/ledgers/${ledgerId}`);
    expect(res.status).toBe(404);
    expect(errorCodeOf(res)).toBe("LEDGER_NOT_FOUND");
  });

  it("refuses a blank ledger name and a duplicate member name", async () => {
    const olia = request.agent(app);
    await olia.post("/api/auth/signup").send({ email: "olia3@example.com", password: "password1" });
    const blank = await olia.post("/api/ledgers").send({ name: "   ", coordinatorName: "Olia" });
    expect(blank.status).toBe(400);
    expect(errorCodeOf(blank)).toBe("VALIDATION_ERROR");

    const ledgerId = ledgerOf(await olia.post("/api/ledgers").send({ name: "Trip", coordinatorName: "Olia" })).id;
    await olia.post(`/api/ledgers/${ledgerId}/members`).send({ name: "Max" });
    const dup = await olia.post(`/api/ledgers/${ledgerId}/members`).send({ name: "max" });
    expect(dup.status).toBe(409);
    expect(errorCodeOf(dup)).toBe("MEMBER_NAME_TAKEN");
  });

  it("sets the session cookie HttpOnly, SameSite=Lax, Path=/ for 30 days", async () => {
    const res = await request(app).post("/api/auth/signup").send({ email: "olia5@example.com", password: "password1" });
    const cookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(cookie).toMatch(/^babki_session=[^;]+;/);
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    const expires = Date.parse(/Expires=([^;]+)/.exec(cookie)?.[1] ?? "");
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(expires - (Date.now() + thirtyDays))).toBeLessThan(60_000);
  });

  it("refuses every Coordinator endpoint without a session (401)", async () => {
    const anonymous = request(app);
    const responses = [
      await anonymous.get("/api/auth/me"),
      await anonymous.post("/api/ledgers").send({ name: "Trip", coordinatorName: "Olia" }),
      await anonymous.get("/api/ledgers"),
      await anonymous.get("/api/ledgers/some-ledger"),
      await anonymous.post("/api/ledgers/some-ledger/members").send({ name: "Max" }),
    ];
    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(errorCodeOf(res)).toBe("UNAUTHENTICATED");
    }
  });

  it("answers a wrong e-mail and a wrong password with the same body", async () => {
    await request(app).post("/api/auth/signup").send({ email: "olia6@example.com", password: "password1" });
    const wrongPassword = await request(app).post("/api/auth/signin").send({ email: "olia6@example.com", password: "nope12345" });
    const unknownEmail = await request(app).post("/api/auth/signin").send({ email: "ghost6@example.com", password: "password1" });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it("A blank or too long name is refused: no ledger is created", async () => {
    const olia = request.agent(app);
    await olia.post("/api/auth/signup").send({ email: "olia7@example.com", password: "password1" });
    for (const name of ["", "   ", "x".repeat(61)]) {
      const res = await olia.post("/api/ledgers").send({ name, coordinatorName: "Olia" });
      expect(res.status).toBe(400);
      expect(errorCodeOf(res)).toBe("VALIDATION_ERROR");
    }
    expect(ledgersListSchema.parse((await olia.get("/api/ledgers")).body).ledgers).toHaveLength(0);
  });

  it("keeps the trip after sign-out and sign-in (data persists)", async () => {
    const olia = request.agent(app);
    await olia.post("/api/auth/signup").send({ email: "olia4@example.com", password: "password1" });
    await olia.post("/api/ledgers").send({ name: "Persisted trip", coordinatorName: "Olia" });

    expect((await olia.post("/api/auth/signout")).status).toBe(204);
    expect((await olia.get("/api/auth/me")).status).toBe(401);

    await olia.post("/api/auth/signin").send({ email: "olia4@example.com", password: "password1" });
    const list = ledgersListSchema.parse((await olia.get("/api/ledgers")).body);
    expect(list.ledgers.some((l) => l.name === "Persisted trip")).toBe(true);
  });
});
