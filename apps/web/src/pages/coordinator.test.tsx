import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { HealthStatus } from "../components/HealthStatus";
import { ThemePicker } from "../components/ThemePicker";
import { uk } from "../i18n/uk";
import { apiError, expectNothingSent, fakeApi, iso, ledgerBody, member, renderAt } from "../test/render";
import { HomePage } from "./HomePage";
import { LedgerNewPage } from "./LedgerNewPage";
import { LedgerPage } from "./LedgerPage";
import { LedgersPage } from "./LedgersPage";
import { SignInPage } from "./SignInPage";

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
});
const here = () => screen.getByTestId("location").textContent;

const expenseRow = (id: string, title: string, amountKopecks: number, payerId = "olia") => ({
  id,
  title,
  amountKopecks,
  payerId,
  splitMode: "EQUAL",
  shares: [{ memberId: "olia", amountKopecks, percentBp: null }],
  createdAt: iso,
  updatedAt: iso,
});

describe("Sign-in form (US-002)", () => {
  const mount = () => renderAt("/signin", "/signin", <SignInPage />);

  it("sends the credentials and lands on the trips list", async () => {
    const api = fakeApi({ "POST /api/auth/signin": { status: 200, body: { account: { id: "a", email: "olia@example.com" } } } });
    mount();
    await userEvent.type(screen.getByLabelText(uk.auth.email), "Olia@Example.com");
    await userEvent.type(screen.getByLabelText(uk.auth.password), "password1");
    await userEvent.click(screen.getByRole("button", { name: uk.auth.signInButton }));
    await waitFor(() => expect(here()).toBe("/ledgers"));
    expect(api.sent("POST")[0].body).toEqual({ email: "olia@example.com", password: "password1" });
  });

  it("wrong credentials give one neutral Ukrainian message, not a hint about which field was wrong", async () => {
    fakeApi({ "POST /api/auth/signin": apiError(401, "INVALID_CREDENTIALS") });
    mount();
    await userEvent.type(screen.getByLabelText(uk.auth.email), "olia@example.com");
    await userEvent.type(screen.getByLabelText(uk.auth.password), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: uk.auth.signInButton }));
    expect(await screen.findByRole("alert")).toHaveTextContent(uk.errors.INVALID_CREDENTIALS);
    expect(here()).toBe("/signin");
  });

  it("empty fields are not sent", async () => {
    const api = fakeApi({});
    mount();
    await userEvent.click(screen.getByRole("button", { name: uk.auth.signInButton }));
    await expectNothingSent(api);
  });
});

describe("My trips (US-006)", () => {
  const mount = () => renderAt("/ledgers", "/ledgers", <LedgersPage />);
  const trip = (id: string, name: string, state = "ACTIVE") => ({ id, name, state, createdAt: iso, closedAt: null });

  it("lists the trips with their state and links to each", async () => {
    fakeApi({ "GET /api/ledgers": { status: 200, body: { ledgers: [trip("L1", "Carpathians"), trip("L2", "Sea", "CLOSED")] } } });
    mount();
    const link = await screen.findByRole("link", { name: /Carpathians/ });
    expect(link).toHaveAttribute("href", "/ledgers/L1");
    expect(screen.getByRole("link", { name: /Sea/ })).toHaveTextContent(uk.state.CLOSED);
  });

  it("an account without trips sees the friendly empty state", async () => {
    fakeApi({ "GET /api/ledgers": { status: 200, body: { ledgers: [] } } });
    mount();
    expect(await screen.findByText(uk.ledgers.empty)).toBeInTheDocument();
  });

  it("an expired session sends the user to sign-in (BR-21)", async () => {
    fakeApi({ "GET /api/ledgers": apiError(401, "UNAUTHENTICATED") });
    mount();
    await waitFor(() => expect(here()).toBe("/signin"));
  });

  it("a server failure is shown instead of an empty list", async () => {
    fakeApi({ "GET /api/ledgers": apiError(500, "INTERNAL_ERROR") });
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(uk.errors.default);
    expect(screen.queryByText(uk.ledgers.empty)).not.toBeInTheDocument();
  });

  it("signing out goes to sign-in", async () => {
    fakeApi({ "GET /api/ledgers": { status: 200, body: { ledgers: [] } }, "POST /api/auth/signout": { status: 204 } });
    mount();
    await userEvent.click(await screen.findByRole("button", { name: uk.auth.signOutButton }));
    await waitFor(() => expect(here()).toBe("/signin"));
  });

  it("'create a trip' opens the form", async () => {
    fakeApi({ "GET /api/ledgers": { status: 200, body: { ledgers: [] } } });
    mount();
    await userEvent.click(await screen.findByRole("button", { name: uk.ledgers.create }));
    await waitFor(() => expect(here()).toBe("/ledgers/new"));
  });
});

describe("Create a trip (US-003)", () => {
  const mount = () => renderAt("/ledgers/new", "/ledgers/new", <LedgerNewPage />);

  it("blank names are refused at the fields and nothing is sent (US-004)", async () => {
    const api = fakeApi({});
    mount();
    await userEvent.type(screen.getByLabelText(uk.ledgerNew.nameLabel), "   ");
    await userEvent.click(screen.getByRole("button", { name: uk.ledgerNew.submit }));
    expect(screen.getAllByText(uk.fieldErrors.required)).toHaveLength(2);
    await expectNothingSent(api);
  });

  it("a name over the limit is refused with the limit in the message", async () => {
    const api = fakeApi({});
    mount();
    const name = screen.getByLabelText(uk.ledgerNew.nameLabel);
    name.removeAttribute("maxlength");
    await userEvent.type(name, "x".repeat(61));
    await userEvent.type(screen.getByLabelText(uk.ledgerNew.coordinatorLabel), "Olia");
    await userEvent.click(screen.getByRole("button", { name: uk.ledgerNew.submit }));
    expect(screen.getByText(uk.fieldErrors.tooLong(60))).toBeInTheDocument();
    await expectNothingSent(api);
  });

  it("sends trimmed names and opens the new trip", async () => {
    const api = fakeApi({ "POST /api/ledgers": { status: 201, body: ledgerBody() } });
    mount();
    await userEvent.type(screen.getByLabelText(uk.ledgerNew.nameLabel), "  Carpathians ");
    await userEvent.type(screen.getByLabelText(uk.ledgerNew.coordinatorLabel), " Olia ");
    await userEvent.click(screen.getByRole("button", { name: uk.ledgerNew.submit }));
    await waitFor(() => expect(here()).toBe("/ledgers/L1"));
    expect(api.sent("POST")[0].body).toEqual({ name: "Carpathians", coordinatorName: "Olia" });
  });
});

describe("Trip overview (US-005, US-007, US-021, US-050)", () => {
  const route = "/ledgers/L1";
  const path = "/ledgers/:ledgerId";
  const load = (over: Record<string, unknown> = {}, expenses: object[] = []) =>
    fakeApi({
      "GET /api/ledgers/L1": { status: 200, body: ledgerBody() },
      "GET /api/ledgers/L1/expenses": { status: 200, body: { expenses } },
      ...over,
    });

  it("shows members with a Coordinator badge and every expense with its total (US-021)", async () => {
    load({}, [expenseRow("E1", "House rent", 600_000), expenseRow("E2", "Taxi", 42_000, "iryna")]);
    renderAt(route, path, <LedgerPage />);
    expect(await screen.findByText("House rent")).toBeInTheDocument();
    expect(screen.getByText(uk.ledger.coordinatorBadge)).toBeInTheDocument();
    const body = document.body.textContent?.replace(/\s/g, " ") ?? "";
    expect(body).toContain("6420.00 ₴");
    expect(screen.getByRole("link", { name: `${uk.ledger.edit}: Taxi` })).toHaveAttribute("href", "/ledgers/L1/expenses/E2/edit");
  });

  it("a trip without expenses invites to add the first one", async () => {
    load();
    renderAt(route, path, <LedgerPage />);
    expect(await screen.findByText(uk.ledger.noExpenses)).toBeInTheDocument();
  });

  it("adds a friend, clears the field and refreshes the list", async () => {
    let added = false;
    const api = fakeApi({
      "GET /api/ledgers/L1": () => ({
        status: 200,
        body: added ? { ...ledgerBody(), members: [...ledgerBody().members, member("taras", "Taras", 5)] } : ledgerBody(),
      }),
      "GET /api/ledgers/L1/expenses": { status: 200, body: { expenses: [] } },
      "POST /api/ledgers/L1/members": () => {
        added = true;
        return { status: 201, body: { member: member("taras", "Taras", 5) } };
      },
    });
    renderAt(route, path, <LedgerPage />);
    await userEvent.type(await screen.findByLabelText(uk.ledger.memberNameLabel), "  Taras ");
    await userEvent.click(screen.getByRole("button", { name: uk.ledger.addButton }));
    expect(await screen.findByText("Taras")).toBeInTheDocument();
    expect(screen.getByLabelText(uk.ledger.memberNameLabel)).toHaveValue("");
    expect(api.sent("POST")[0].body).toEqual({ name: "Taras" });
  });

  it("a duplicate name is explained in Ukrainian and the typed name stays for correction", async () => {
    load({ "POST /api/ledgers/L1/members": apiError(409, "MEMBER_NAME_TAKEN") });
    renderAt(route, path, <LedgerPage />);
    await userEvent.type(await screen.findByLabelText(uk.ledger.memberNameLabel), "Max");
    await userEvent.click(screen.getByRole("button", { name: uk.ledger.addButton }));
    expect(await screen.findByRole("alert")).toHaveTextContent(uk.errors.MEMBER_NAME_TAKEN);
    expect(screen.getByLabelText(uk.ledger.memberNameLabel)).toHaveValue("Max");
  });

  it("a blank member name is refused before sending", async () => {
    const api = load();
    renderAt(route, path, <LedgerPage />);
    await userEvent.type(await screen.findByLabelText(uk.ledger.memberNameLabel), "   ");
    await userEvent.click(screen.getByRole("button", { name: uk.ledger.addButton }));
    expect(screen.getByText(uk.fieldErrors.required)).toBeInTheDocument();
    await expectNothingSent(api, "POST");
  });

  it("the member limit message carries the server's limit", async () => {
    load({ "POST /api/ledgers/L1/members": apiError(409, "MEMBER_LIMIT_REACHED", { params: { limit: 20 } }) });
    renderAt(route, path, <LedgerPage />);
    await userEvent.type(await screen.findByLabelText(uk.ledger.memberNameLabel), "One more");
    await userEvent.click(screen.getByRole("button", { name: uk.ledger.addButton }));
    expect(await screen.findByRole("alert")).toHaveTextContent(uk.errors.MEMBER_LIMIT_REACHED(20));
  });

  it("copies a member's personal link, which is built from the token and the page origin (US-007)", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    load();
    renderAt(route, path, <LedgerPage />);
    const row = (await screen.findByText("Max")).closest("li") as HTMLElement;
    await userEvent.click(within(row).getByRole("button", { name: uk.ledger.copyLink }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/l/max-token`);
    expect(await within(row).findByText(uk.ledger.copied)).toBeInTheDocument();
  });

  it("a copy that the browser refuses does not crash the page", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }, configurable: true });
    load();
    renderAt(route, path, <LedgerPage />);
    const row = (await screen.findByText("Max")).closest("li") as HTMLElement;
    await userEvent.click(within(row).getByRole("button", { name: uk.ledger.copyLink }));
    expect(within(row).getByRole("button", { name: uk.ledger.copyLink })).toBeInTheDocument();
  });

  it("saves a member's payment details and closes the editor (US-050)", async () => {
    const api = load({
      "PUT /api/ledgers/L1/members/olia/payment-details": { status: 200, body: { member: member("olia", "Olia", 1, { paymentDetails: "Card 1" }) } },
    });
    renderAt(route, path, <LedgerPage />);
    const row = (await screen.findByText("Olia")).closest("li") as HTMLElement;
    await userEvent.click(within(row).getByText(uk.paymentDetails.none));
    await userEvent.type(within(row).getByLabelText(uk.paymentDetails.label("Olia")), "Card 1");
    await userEvent.click(within(row).getByRole("button", { name: uk.paymentDetails.save }));
    await waitFor(() => expect(within(row).queryByLabelText(uk.paymentDetails.label("Olia"))).not.toBeInTheDocument());
    expect(api.sent("PUT")[0].body).toEqual({ paymentDetails: "Card 1" });
  });

  it("empty details are sent as null; cancel closes without sending", async () => {
    const api = load({
      "PUT /api/ledgers/L1/members/olia/payment-details": { status: 200, body: { member: member("olia", "Olia", 1) } },
    });
    renderAt(route, path, <LedgerPage />);
    const row = (await screen.findByText("Olia")).closest("li") as HTMLElement;
    await userEvent.click(within(row).getByText(uk.paymentDetails.none));
    await userEvent.click(within(row).getByRole("button", { name: uk.paymentDetails.cancel }));
    await expectNothingSent(api, "PUT");
    await userEvent.click(within(row).getByText(uk.paymentDetails.none));
    await userEvent.click(within(row).getByRole("button", { name: uk.paymentDetails.save }));
    await waitFor(() => expect(api.sent("PUT")).toHaveLength(1));
    expect(api.sent("PUT")[0].body).toEqual({ paymentDetails: null });
  });

  it("details over 100 characters are refused with the limit", async () => {
    const api = load();
    renderAt(route, path, <LedgerPage />);
    const row = (await screen.findByText("Olia")).closest("li") as HTMLElement;
    await userEvent.click(within(row).getByText(uk.paymentDetails.none));
    const input = within(row).getByLabelText(uk.paymentDetails.label("Olia"));
    input.removeAttribute("maxlength");
    await userEvent.type(input, "x".repeat(101));
    await userEvent.click(within(row).getByRole("button", { name: uk.paymentDetails.save }));
    expect(within(row).getByText(uk.fieldErrors.tooLong(100))).toBeInTheDocument();
    await expectNothingSent(api, "PUT");
  });

  it("a settling or closed trip hides 'add expense' and the add-friend form, and says why (BR-36, BR-44)", async () => {
    for (const state of ["SETTLING", "CLOSED"] as const) {
      load({ "GET /api/ledgers/L1": { status: 200, body: ledgerBody(state) } }, [expenseRow("E1", "Rent", 100)]);
      const { unmount } = renderAt(route, path, <LedgerPage />);
      expect(await screen.findByText(uk.ledger.readOnly[state])).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: uk.ledger.addExpense })).not.toBeInTheDocument();
      expect(screen.queryByLabelText(uk.ledger.memberNameLabel)).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: new RegExp(uk.ledger.edit) })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: uk.ledger.toSettlement })).toBeInTheDocument();
      unmount();
    }
  });

  it("another coordinator's trip looks the same as a missing one (CD-10)", async () => {
    fakeApi({ "GET /api/ledgers/L1": apiError(404, "LEDGER_NOT_FOUND"), "GET /api/ledgers/L1/expenses": apiError(404, "LEDGER_NOT_FOUND") });
    renderAt(route, path, <LedgerPage />);
    expect(await screen.findByText(uk.ledger.notFound)).toBeInTheDocument();
  });

  it("a server failure is shown and an expired session redirects", async () => {
    fakeApi({ "GET /api/ledgers/L1": apiError(500, "INTERNAL_ERROR"), "GET /api/ledgers/L1/expenses": apiError(500, "INTERNAL_ERROR") });
    const first = renderAt(route, path, <LedgerPage />);
    expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent(uk.errors.default);
    first.unmount();
    fakeApi({ "GET /api/ledgers/L1": apiError(401, "UNAUTHENTICATED"), "GET /api/ledgers/L1/expenses": apiError(401, "UNAUTHENTICATED") });
    renderAt(route, path, <LedgerPage />);
    await waitFor(() => expect(here()).toBe("/signin"));
  });
});

describe("Shell pieces", () => {
  it("the health badge reflects API and database state, and never shows driver text", async () => {
    fakeApi({ "GET /api/health": { status: 200, body: { status: "ok", service: "babki-api", db: "ok" } } });
    const ok = renderAt("/", "/", <HealthStatus />);
    expect(await screen.findByText(uk.health.ok)).toBeInTheDocument();
    ok.unmount();
    fakeApi({ "GET /api/health": apiError(503, "DB_UNAVAILABLE") });
    const db = renderAt("/", "/", <HealthStatus />);
    expect(await screen.findByText(uk.health.dbUnavailable)).toBeInTheDocument();
    db.unmount();
    fakeApi({ "GET /api/health": { status: 502 } });
    renderAt("/", "/", <HealthStatus />);
    expect(await screen.findByText(uk.health.unreachable)).toBeInTheDocument();
  });

  it("the theme switcher sets data-theme, remembers the choice and returns to the default", async () => {
    renderAt("/", "/", <ThemePicker />);
    await userEvent.click(screen.getByRole("radio", { name: uk.theme.names.night }));
    expect(document.documentElement).toHaveAttribute("data-theme", "night");
    expect(localStorage.getItem("babki-theme")).toBe("night");
    expect(screen.getByRole("radio", { name: uk.theme.names.night })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: uk.theme.names.bloom }));
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });

  it("the theme still applies when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderAt("/", "/", <ThemePicker />);
    await userEvent.click(screen.getByRole("radio", { name: uk.theme.names.clay }));
    expect(document.documentElement).toHaveAttribute("data-theme", "clay");
    vi.restoreAllMocks();
  });

  it("the home page offers sign-up, sign-in and the demo navigation", async () => {
    fakeApi({ "GET /api/health": { status: 200, body: { status: "ok", service: "babki-api", db: "ok" } } });
    renderAt("/", "/", <HomePage />);
    expect(screen.getByRole("link", { name: uk.auth.signUpButton })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: uk.auth.signInButton })).toHaveAttribute("href", "/signin");
    expect(screen.getAllByRole("link").length).toBeGreaterThan(8);
    await screen.findByText(uk.health.ok);
  });
});

describe("Routing", () => {
  it.each([
    ["/", uk.app.heroTitle],
    ["/signup", uk.auth.signUpTitle],
    ["/signin", uk.auth.signInTitle],
    ["/definitely/not/a/page", uk.screens.linkNotFound],
  ])("%s renders its screen", async (route, text) => {
    fakeApi({
      "GET /api/health": { status: 200, body: { status: "ok", service: "babki-api", db: "ok" } },
    });
    renderAt(route, "*", <App />);
    expect(await screen.findByRole("heading", { name: new RegExp(text) })).toBeInTheDocument();
  });

  it("a friend's link opens the friend's page without any sign-in request", async () => {
    const api = fakeApi({ "GET /api/links/tok": apiError(404, "LINK_NOT_FOUND") });
    renderAt("/l/tok", "*", <App />);
    expect(await screen.findByText(uk.member.notFoundText)).toBeInTheDocument();
    expect(api.calls.map((c) => c.path)).toEqual(["/api/links/tok"]);
  });
});
