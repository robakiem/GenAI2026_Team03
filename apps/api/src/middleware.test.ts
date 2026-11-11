import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorResponseSchema } from "@babki/shared";
import { errorHandler } from "./errors";
import { currentAccount } from "./middleware";

describe("currentAccount", () => {
  it("answers 401 when a route did not run requireCoordinator", async () => {
    const app = express();
    app.get("/unguarded", (_req, res) => {
      res.json({ account: currentAccount(res) });
    });
    app.use(errorHandler);

    const res = await request(app).get("/unguarded");
    expect(res.status).toBe(401);
    expect(errorResponseSchema.parse(res.body).error.code).toBe("UNAUTHENTICATED");
  });
});
