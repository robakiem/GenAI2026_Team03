import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ERROR_STATUS, errorResponseSchema, ledgerWithMembersSchema } from "@babki/shared";
import { createApp } from "./app";
import { brokenPrisma, intercept, overrideInTransaction } from "./test/faults";
import { addCarpathiansExpenses, createTrip, type Trip } from "./test/carpathians";
import { createTestDb, type TestDb } from "./test/db";
import * as expenseService from "./services/expense.service";

// One place turns every failure into a response (errors.ts). Nothing from inside the server --
// stack, SQL, file path, library message -- may reach the client (contracts 3.2).
const srcDir = fileURLToPath(new URL(".", import.meta.url));
const production = (dir = srcDir): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "generated" || name === "test") return [];
    if (statSync(path).isDirectory()) return production(path);
    return name.endsWith(".ts") && !name.endsWith(".test.ts") ? [path] : [];
  });
const read = (path: string) => readFileSync(path, "utf8");
const rel = (path: string) => relative(srcDir, path);

describe("The error handler is the single point of error responses (static)", () => {
  it("only errors.ts builds an error body or sets an error status", () => {
    const offenders = production()
      .filter((f) => rel(f) !== "errors.ts")
      .filter((f) => /\{\s*error\s*[:,}]|res\.status\(\s*(4|5)\d\d|res\.sendStatus|ERROR_STATUS/.test(read(f)));
    expect(offenders.map(rel)).toEqual([]);
  });

  it("routes and middleware never catch: a failure goes to the handler untouched", () => {
    const offenders = production()
      .filter((f) => /^(routes|middleware)/.test(rel(f)))
      .filter((f) => /\bcatch\s*[({]|\.catch\(/.test(read(f)));
    expect(offenders.map(rel)).toEqual([]);
  });

  it("routes never send a response by any means other than res.json / res.status(2xx).json / .end", () => {
    const offenders = production()
      .filter((f) => rel(f).startsWith("routes"))
      .filter((f) => /res\.(send|write|sendFile|redirect|render|download)\b/.test(read(f)));
    expect(offenders.map(rel)).toEqual([]);
  });

  it("nothing outside errors.ts reads err.stack, and nothing ever puts a caught error into a response", () => {
    const offenders = production().filter((f) => rel(f) !== "errors.ts" && /\.stack\b/.test(read(f)));
    expect(offenders.map(rel)).toEqual([]);
    const leaks = production().filter((f) => /\.(json|send)\(\s*(err|error|e)\b/.test(read(f)));
    expect(leaks.map(rel)).toEqual([]);
  });

  it("the handler is registered once, after every router, and the 404 handler just before it", () => {
    const app = read(join(srcDir, "app.ts"));
    expect(app.match(/app\.use\(errorHandler\)/g)).toHaveLength(1);
    expect(app.match(/app\.use\(notFoundHandler\)/g)).toHaveLength(1);
    const lastRouter = app.lastIndexOf("app.use(\"/api");
    expect(app.indexOf("notFoundHandler)")).toBeGreaterThan(lastRouter);
    expect(app.indexOf("app.use(errorHandler)")).toBeGreaterThan(app.indexOf("notFoundHandler)"));
  });

  it("every other service-level `catch` re-throws or converts to an AppError, never swallows", () => {
    for (const file of production().filter((f) => rel(f).startsWith("services"))) {
      const text = read(file);
      for (const match of text.matchAll(/catch\s*(?:\([^)]*\))?\s*\{([\s\S]*?)\n\s{2,4}\}/g)) {
        expect(match[1], `${rel(file)}: ${match[1].trim().slice(0, 60)}`).toMatch(/throw /);
      }
    }
  });
});

// ---- Behaviour: break the server from the inside and look at what the client sees ----------

const SECRET = "SELECT * FROM Account WHERE secret=1 at /Users/dev/babki/apps/api/prisma/babki.db";
let db: TestDb;
let trip: Trip;
let cookie: string;

beforeAll(async () => {
  db = createTestDb();
  trip = await createTrip({ prisma: db.prisma });
  await addCarpathiansExpenses({ prisma: db.prisma }, trip);
  const healthy = createApp({ prisma: db.prisma, pingDatabase: () => Promise.resolve() });
  const res = await request(healthy).post("/api/auth/signin").send({ email: "olia@example.com", password: "password1" });
  cookie = res.headers["set-cookie"]?.[0]?.split(";")[0] ?? "";
});
afterAll(async () => {
  await db.cleanup();
});
afterEach(() => vi.restoreAllMocks());

const broken = (failure: () => unknown) => brokenPrisma(db.prisma, failure);

const endpoints: [string, string, unknown?][] = [
  ["post", "/api/auth/signup", { email: "new@example.com", password: "password1" }],
  ["post", "/api/auth/signin", { email: "olia@example.com", password: "password1" }],
  ["get", "/api/auth/me"],
  ["get", "/api/ledgers"],
  ["post", "/api/ledgers", { name: "T", coordinatorName: "O" }],
  ["get", "/api/ledgers/L"],
  ["post", "/api/ledgers/L/members", { name: "Z" }],
  ["put", "/api/ledgers/L/members/M/payment-details", { paymentDetails: "x" }],
  ["get", "/api/ledgers/L/expenses"],
  ["post", "/api/ledgers/L/expenses", { title: "t", amountKopecks: 100, payerId: "M", split: { mode: "EQUAL", participantIds: ["M"] } }],
  ["put", "/api/ledgers/L/expenses/E", { title: "t", amountKopecks: 100, payerId: "M", split: { mode: "EQUAL", participantIds: ["M"] } }],
  ["get", "/api/ledgers/L/settlement"],
  ["get", "/api/links/AAAAAAAAAAAAAAAAAAAAAA"],
  ["get", "/api/health"],
];

describe("An unexpected failure inside the server (behaviour)", () => {
  const failures: [string, () => unknown][] = [
    ["an Error with SQL and a file path in its message", () => new Error(SECRET)],
    ["an Error carrying its own status and expose flags", () => Object.assign(new Error(SECRET), { status: 418, statusCode: 418, expose: true })],
    ["a thrown string", () => SECRET],
    ["a thrown null", () => null],
    ["a thrown object with a message", () => ({ message: SECRET, stack: SECRET })],
  ];

  it.each(failures)("%s becomes a generic 500 on every endpoint, with nothing internal in the body", async (_name, failure) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const app = createApp({
      prisma: broken(failure),
      // health uses its own probe; a failing one is DB_UNAVAILABLE, covered below
      pingDatabase: () => Promise.resolve(),
    });
    for (const [method, path, body] of endpoints.filter(([, p]) => p !== "/api/health")) {
      const agent = request(app) as unknown as Record<string, (p: string) => request.Test>;
      const res = await agent[method](path).set("Cookie", cookie).send(body as object);
      const label = `${method} ${path}`;
      // a guarded route without a valid session may legitimately stop earlier with 401
      expect([500, 401, 400], label).toContain(res.status);
      const parsed = errorResponseSchema.safeParse(res.body);
      expect(parsed.success, label).toBe(true);
      const text = JSON.stringify(res.body);
      expect(text, label).not.toContain("SELECT");
      expect(text, label).not.toContain("/Users/");
      expect(text, label).not.toContain("secret");
      expect(text, label).not.toMatch(/stack|\bat\s+\S+\s*\(/i);
      if (res.status === 500) {
        expect(parsed.success && parsed.data.error, label).toEqual({ code: "INTERNAL_ERROR", message: "Unexpected server error." });
      }
    }
  });

  it("the failure is logged on the server, so it is not lost", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const app = createApp({ prisma: broken(() => new Error(SECRET)), pingDatabase: () => Promise.resolve() });
    const res = await request(app).post("/api/auth/signin").send({ email: "olia@example.com", password: "password1" });
    expect(res.status).toBe(500);
    expect(log).toHaveBeenCalledTimes(1);
    expect(String((log.mock.calls[0][0] as Error).message)).toContain("SELECT");
  });

  it("the client-facing status always matches the status table, whatever the failure carried", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const app = createApp({
      prisma: broken(() => Object.assign(new Error("boom"), { status: 200, statusCode: 200 })),
      pingDatabase: () => Promise.resolve(),
    });
    const res = await request(app).post("/api/auth/signin").send({ email: "olia@example.com", password: "password1" });
    expect(res.status).toBe(ERROR_STATUS.INTERNAL_ERROR);
  });

  it("an unreachable database on the health probe is 503 DB_UNAVAILABLE without the driver's message", async () => {
    const app = createApp({ prisma: db.prisma, pingDatabase: () => Promise.reject(new Error(SECRET)) });
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain("SELECT");
    expect(errorResponseSchema.parse(res.body).error.code).toBe("DB_UNAVAILABLE");
  });

  it("a failure in the middle of a request does not kill the server: the next request works", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    let failing = true;
    const flaky = intercept(db.prisma, (prop) => {
      if (failing && prop === "ledger") throw new Error(SECRET);
      return undefined;
    });
    const app = createApp({ prisma: flaky, pingDatabase: () => Promise.resolve() });
    expect((await request(app).get("/api/ledgers").set("Cookie", cookie)).status).toBe(500);
    failing = false;
    const ok = await request(app).get("/api/ledgers").set("Cookie", cookie);
    expect(ok.status).toBe(200);
  });
});

describe("Response headers reveal nothing about the stack", () => {
  it("there is no X-Powered-By header on success or on error", async () => {
    const app = createApp({ prisma: db.prisma, pingDatabase: () => Promise.resolve() });
    for (const res of [await request(app).get("/api/health"), await request(app).get("/api/nothing")]) {
      expect(res.headers["x-powered-by"]).toBeUndefined();
    }
  });
});

describe("A failed write leaves no trace (atomicity)", () => {
  it("an edit that fails after the old shares were deleted rolls back to the original expense", async () => {
    const before = await db.prisma.expense.findFirstOrThrow({ where: { ledgerId: trip.ledgerId }, include: { shares: true } });
    const failing = overrideInTransaction(db.prisma, "expense", { update: () => Promise.reject(new Error(SECRET)) });

    await expect(
      expenseService.editExpense(
        { prisma: failing },
        {
          accountId: trip.accountId,
          ledgerId: trip.ledgerId,
          expenseId: before.id,
          body: { title: "Changed", amountKopecks: 5_000, payerId: trip.max, split: { mode: "EQUAL", participantIds: [trip.max] } },
        },
      ),
    ).rejects.toThrow(SECRET);

    const after = await db.prisma.expense.findUniqueOrThrow({ where: { id: before.id }, include: { shares: true } });
    expect(after.title).toBe(before.title);
    expect(after.amountKopecks).toBe(before.amountKopecks);
    expect(after.shares.map((s) => [s.memberId, s.amountKopecks]).sort()).toEqual(
      before.shares.map((s) => [s.memberId, s.amountKopecks]).sort(),
    );
  });

  it("a ledger is not created without its Coordinator member when the second insert fails", async () => {
    const count = await db.prisma.ledger.count();
    const failing = overrideInTransaction(db.prisma, "member", { create: () => Promise.reject(new Error(SECRET)) });
    const app = createApp({ prisma: failing, pingDatabase: () => Promise.resolve() });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await request(app).post("/api/ledgers").set("Cookie", cookie).send({ name: "Ghost", coordinatorName: "Olia" });
    expect(res.status).toBe(500);
    expect(await db.prisma.ledger.count()).toBe(count);
    expect(ledgerWithMembersSchema.safeParse(res.body).success).toBe(false);
  });
});
