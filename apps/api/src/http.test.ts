import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ledgerWithMembersSchema, ledgersListSchema } from "@babki/shared";
import { createApp } from "./app";
import { createTestDb, type TestDb } from "./test/db";

let db: TestDb;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  db = createTestDb();
  app = createApp({ prisma: db.prisma, pingDatabase: async () => {} });
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
    expect(signup.body.account.email).toBe("olia@example.com");
    expect(signup.headers["set-cookie"]?.[0]).toContain("babki_session=");

    // EP-05 me
    expect((await olia.get("/api/auth/me")).body.account.email).toBe("olia@example.com");

    // EP-06 create the ledger
    const created = await olia.post("/api/ledgers").send({ name: "Carpathians", coordinatorName: "Olia" });
    expect(created.status).toBe(201);
    const ledgerId = created.body.ledger.id as string;

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
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("hides another Coordinator's ledger as 404", async () => {
    const olia = request.agent(app);
    await olia.post("/api/auth/signup").send({ email: "olia2@example.com", password: "password1" });
    const ledgerId = (await olia.post("/api/ledgers").send({ name: "Trip", coordinatorName: "Olia" })).body.ledger.id;

    const max = request.agent(app);
    await max.post("/api/auth/signup").send({ email: "max2@example.com", password: "password1" });
    const res = await max.get(`/api/ledgers/${ledgerId}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("LEDGER_NOT_FOUND");
  });

  it("refuses a blank ledger name and a duplicate member name", async () => {
    const olia = request.agent(app);
    await olia.post("/api/auth/signup").send({ email: "olia3@example.com", password: "password1" });
    const blank = await olia.post("/api/ledgers").send({ name: "   ", coordinatorName: "Olia" });
    expect(blank.status).toBe(400);
    expect(blank.body.error.code).toBe("VALIDATION_ERROR");

    const ledgerId = (await olia.post("/api/ledgers").send({ name: "Trip", coordinatorName: "Olia" })).body.ledger.id;
    await olia.post(`/api/ledgers/${ledgerId}/members`).send({ name: "Max" });
    const dup = await olia.post(`/api/ledgers/${ledgerId}/members`).send({ name: "max" });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("MEMBER_NAME_TAKEN");
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
