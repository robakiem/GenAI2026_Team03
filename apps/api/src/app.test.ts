import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorResponseSchema, healthResponseSchema } from "@babki/shared";
import { createApp } from "./app";

const databaseUp = createApp({ pingDatabase: async () => {} });
const databaseDown = createApp({
  pingDatabase: async () => {
    throw new Error("no such file");
  },
});

describe("GET /api/health", () => {
  it("returns 200 when the database answers", async () => {
    const res = await request(databaseUp).get("/api/health");
    expect(res.status).toBe(200);
    expect(healthResponseSchema.parse(res.body)).toEqual({ status: "ok", service: "babki-api", db: "ok" });
  });

  it("returns 503 DB_UNAVAILABLE in the error format when the database is unreachable", async () => {
    const res = await request(databaseDown).get("/api/health");
    expect(res.status).toBe(503);
    expect(errorResponseSchema.parse(res.body).error.code).toBe("DB_UNAVAILABLE");
    expect(JSON.stringify(res.body)).not.toContain("no such file");
  });
});

describe("error format", () => {
  it("answers an unknown route with 404 NOT_FOUND", async () => {
    const res = await request(databaseUp).get("/api/nothing-here");
    expect(res.status).toBe(404);
    expect(errorResponseSchema.parse(res.body).error.code).toBe("NOT_FOUND");
  });

  it("answers a malformed JSON body with 400 MALFORMED_JSON", async () => {
    const res = await request(databaseUp).post("/api/health").set("Content-Type", "application/json").send("{ not json");
    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(res.body).error.code).toBe("MALFORMED_JSON");
  });
});
