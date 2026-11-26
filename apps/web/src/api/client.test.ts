import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, apiGet, apiPost, apiPut } from "./client";

// The browser fetch is the only thing replaced here (the network boundary); the client's own
// logic (error mapping, schema parsing, request shape) is the real code under test.
const reply = (status: number, body?: unknown) =>
  vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: () => (body === undefined ? Promise.reject(new SyntaxError("no body")) : Promise.resolve(body)),
  });

afterEach(() => vi.unstubAllGlobals());

const schema = z.object({ n: z.number() });

describe("request shape", () => {
  it("always sends the session cookie and, for a body, JSON with the right header", async () => {
    const fetchMock = reply(200, { n: 1 });
    vi.stubGlobal("fetch", fetchMock);
    await apiPost("/api/x", { a: 1 }, schema);
    expect(fetchMock).toHaveBeenCalledWith("/api/x", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: '{"a":1}',
    });
  });

  it("a GET sends no body and no content type", async () => {
    const fetchMock = reply(200, { n: 1 });
    vi.stubGlobal("fetch", fetchMock);
    await apiGet("/api/x", schema);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "GET", headers: undefined, body: undefined });
  });

  it("a PUT uses the PUT method", async () => {
    const fetchMock = reply(200, { n: 1 });
    vi.stubGlobal("fetch", fetchMock);
    await apiPut("/api/x", {}, schema);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "PUT" });
  });
});

describe("responses", () => {
  it("returns the body parsed by the given schema", async () => {
    vi.stubGlobal("fetch", reply(200, { n: 5 }));
    expect(await apiGet("/api/x", schema)).toEqual({ n: 5 });
  });

  it("a 204 gives undefined without reading a body", async () => {
    vi.stubGlobal("fetch", reply(204));
    expect(await apiPost("/api/auth/signout")).toBeUndefined();
  });

  it("a body that does not match the schema is rejected, not trusted", async () => {
    vi.stubGlobal("fetch", reply(200, { n: "five" }));
    await expect(apiGet("/api/x", schema)).rejects.toThrow();
  });

  it("an error in the API format becomes an ApiError with status, code, details and params", async () => {
    const error = {
      code: "SHARES_SUM_MISMATCH",
      message: "The shares do not add up.",
      params: { differenceKopecks: 100 },
      details: [{ field: "split", code: "OUT_OF_RANGE", message: "x" }],
    };
    vi.stubGlobal("fetch", reply(400, { error }));
    const caught = await apiPost("/api/x", {}, schema).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({ status: 400, code: "SHARES_SUM_MISMATCH", params: { differenceKopecks: 100 } });
    expect((caught as ApiError).details).toHaveLength(1);
  });

  it.each([
    ["an HTML error page from a proxy", 502, null],
    ["JSON that is not the error format", 500, { oops: true }],
    ["an unknown error code", 400, { error: { code: "NEW_CODE", message: "x" } }],
  ])("%s becomes an ApiError with no code", async (_name, status, body) => {
    vi.stubGlobal("fetch", body === null ? reply(status) : reply(status, body));
    const caught = await apiGet("/api/x", schema).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({ status, code: null });
  });

  it("a network failure surfaces as the original error, so the UI shows the generic text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiGet("/api/x", schema)).rejects.toThrow("Failed to fetch");
  });
});
