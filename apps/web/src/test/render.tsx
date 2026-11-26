import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { expect, vi } from "vitest";

// The only thing replaced in component tests is the network: `fetch` answers from a table of
// canned API responses, and every call is recorded so a test can say "nothing was sent".
export interface Call {
  method: string;
  path: string;
  body: unknown;
}
export type Reply = { status: number; body?: unknown };
export type Handlers = Record<string, Reply | ((call: Call) => Reply)>;

export function fakeApi(handlers: Handlers) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const call: Call = { method, path, body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined };
      calls.push(call);
      const handler = handlers[`${method} ${path}`];
      const reply = typeof handler === "function" ? handler(call) : (handler ?? { status: 404, body: { error: { code: "NOT_FOUND", message: "x" } } });
      return Promise.resolve({
        status: reply.status,
        ok: reply.status >= 200 && reply.status < 300,
        json: () => (reply.body === undefined ? Promise.reject(new SyntaxError("empty")) : Promise.resolve(reply.body)),
      });
    }),
  );
  return { calls, sent: (method: string) => calls.filter((c) => c.method === method) };
}

function Where() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

// Renders `ui` at `route` inside a fresh query cache (no retries, no shared state between tests).
export function renderAt(route: string, path: string, ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={null} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export const apiError = (status: number, code: string, extra: object = {}) => ({
  status,
  body: { error: { code, message: "Developer English message that must never be shown", ...extra } },
});

export const iso = "2026-10-28T10:00:00.000Z";
export const member = (id: string, name: string, position: number, over: object = {}) => ({
  id,
  name,
  position,
  isCoordinator: position === 1,
  paymentDetails: null,
  linkToken: `${id}-token`,
  ...over,
});
export const carpathianMembers = [member("olia", "Olia", 1), member("max", "Max", 2), member("iryna", "Iryna", 3), member("andrii", "Andrii", 4)];
export const ledgerBody = (state: "ACTIVE" | "SETTLING" | "CLOSED" = "ACTIVE") => ({
  ledger: { id: "L1", name: "Carpathians", state, createdAt: iso, closedAt: null },
  members: carpathianMembers,
});

// "Nothing was sent": a request starts a tick after the click, so look again after a short pause,
// otherwise a form that wrongly submits would still pass.
export async function expectNothingSent(api: { calls: Call[] }, method?: string) {
  await new Promise((resolve) => setTimeout(resolve, 60));
  expect(method ? api.calls.filter((call) => call.method === method) : api.calls).toEqual([]);
}
