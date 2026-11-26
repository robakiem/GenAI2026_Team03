import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { uk } from "../i18n/uk";
import { apiError, expectNothingSent, carpathianMembers, fakeApi, iso, ledgerBody, member, renderAt } from "../test/render";
import { ExpenseFormPage } from "./ExpenseFormPage";
import { MemberPage } from "./MemberPage";
import { SettlementPage } from "./SettlementPage";
import { SignUpPage } from "./SignUpPage";

afterEach(() => vi.unstubAllGlobals());
const here = () => screen.getByTestId("location").textContent;

describe("Sign-up form (US-001, US-004)", () => {
  const mount = () => renderAt("/signup", "/signup", <SignUpPage />);

  it("an empty form shows Ukrainian messages at the fields and sends nothing", async () => {
    const api = fakeApi({});
    mount();
    await userEvent.click(screen.getByRole("button", { name: uk.auth.signUpButton }));
    expect(screen.getByLabelText(uk.auth.email)).toBeInvalid();
    expect(screen.getByLabelText(uk.auth.password)).toBeInvalid();
    expect(screen.getByText(uk.fieldErrors.invalidEmail)).toBeInTheDocument();
    expect(screen.getByText(uk.fieldErrors.tooShort(8))).toBeInTheDocument();
    await expectNothingSent(api);
  });

  it("a short password is refused at the field with the minimum from the shared limit", async () => {
    const api = fakeApi({});
    mount();
    await userEvent.type(screen.getByLabelText(uk.auth.email), "olia@example.com");
    await userEvent.type(screen.getByLabelText(uk.auth.password), "short");
    await userEvent.click(screen.getByRole("button", { name: uk.auth.signUpButton }));
    expect(screen.getAllByText(uk.fieldErrors.tooShort(8)).length).toBeGreaterThan(0);
    await expectNothingSent(api);
  });

  it("a bad e-mail is refused before sending", async () => {
    const api = fakeApi({});
    mount();
    await userEvent.type(screen.getByLabelText(uk.auth.email), "not-an-email");
    await userEvent.type(screen.getByLabelText(uk.auth.password), "password1");
    await userEvent.click(screen.getByRole("button", { name: uk.auth.signUpButton }));
    expect(screen.getByText(uk.fieldErrors.invalidEmail)).toBeInTheDocument();
    await expectNothingSent(api);
  });

  it("valid input is sent trimmed and lower-cased, then the user lands on the trips list", async () => {
    const api = fakeApi({ "POST /api/auth/signup": { status: 201, body: { account: { id: "a1", email: "olia@example.com" } } } });
    mount();
    await userEvent.type(screen.getByLabelText(uk.auth.email), "  Olia@Example.com ");
    await userEvent.type(screen.getByLabelText(uk.auth.password), "password1");
    await userEvent.click(screen.getByRole("button", { name: uk.auth.signUpButton }));
    await waitFor(() => expect(here()).toBe("/ledgers"));
    expect(api.sent("POST")[0].body).toEqual({ email: "olia@example.com", password: "password1" });
  });

  it("a server refusal is shown in Ukrainian; the developer's English text never reaches the screen", async () => {
    fakeApi({ "POST /api/auth/signup": apiError(409, "EMAIL_TAKEN") });
    mount();
    await userEvent.type(screen.getByLabelText(uk.auth.email), "olia@example.com");
    await userEvent.type(screen.getByLabelText(uk.auth.password), "password1");
    await userEvent.click(screen.getByRole("button", { name: uk.auth.signUpButton }));
    expect(await screen.findByRole("alert")).toHaveTextContent(uk.errors.EMAIL_TAKEN);
    expect(document.body).not.toHaveTextContent("Developer English message");
  });

  it("an unexpected 500 shows the generic text and nothing technical", async () => {
    fakeApi({ "POST /api/auth/signup": apiError(500, "INTERNAL_ERROR") });
    mount();
    await userEvent.type(screen.getByLabelText(uk.auth.email), "olia@example.com");
    await userEvent.type(screen.getByLabelText(uk.auth.password), "password1");
    await userEvent.click(screen.getByRole("button", { name: uk.auth.signUpButton }));
    expect(await screen.findByRole("alert")).toHaveTextContent(uk.errors.default);
    expect(document.body).not.toHaveTextContent(/INTERNAL_ERROR|Developer English|stack/);
  });
});

describe("Expense form (US-016 … US-020-b)", () => {
  const route = "/ledgers/L1/expenses/new";
  const path = "/ledgers/:ledgerId/expenses/new";
  const base = { "GET /api/ledgers/L1": { status: 200, body: ledgerBody() }, "GET /api/ledgers/L1/expenses": { status: 200, body: { expenses: [] } } };
  const mount = () => renderAt(route, path, <ExpenseFormPage />);
  const amount = () => screen.findByLabelText(uk.expenseForm.amountLabel);
  const submit = () => userEvent.click(screen.getByRole("button", { name: uk.expenseForm.submitNew }));
  // the participant checkbox of a member (the payer radio carries the same name)
  const box = (name: string) => screen.getByRole("checkbox", { name });
  const ready = async () => {
    await amount();
  };
  const mode = (name: string) => userEvent.click(screen.getByLabelText(name));

  it("an equal split shows each person's share live, with the extra kopecks to the earlier members (BR-05)", async () => {
    fakeApi(base);
    mount();
    await userEvent.type(await amount(), "1850.50");
    const list = screen.getByRole("list");
    const shares = within(list).getAllByText(/₴/).map((n) => n.textContent?.replace(/\s/g, " "));
    expect(shares).toEqual(["462.63 ₴", "462.63 ₴", "462.62 ₴", "462.62 ₴"]);
  });

  it("unticking a participant recalculates the shares among the rest", async () => {
    fakeApi(base);
    mount();
    await userEvent.type(await amount(), "100");
    await userEvent.click(box("Andrii"));
    const shares = within(screen.getByRole("list")).getAllByText(/₴/).map((n) => n.textContent);
    expect(shares).toHaveLength(3);
    expect(shares.map((s) => s?.replace(/\s/g, " "))).toEqual(["33.34 ₴", "33.33 ₴", "33.33 ₴"]);
  });

  it.each(["abc", "1,50", "0", "-5", "1000000", "1.234"])("the amount %j is refused with a message and nothing is sent", async (text) => {
    const api = fakeApi(base);
    mount();
    await userEvent.type(await amount(), text);
    await userEvent.type(screen.getByLabelText(uk.expenseForm.titleLabel), "Lunch");
    await submit();
    expect(screen.getByLabelText(uk.expenseForm.amountLabel)).toBeInvalid();
    await expectNothingSent(api, "POST");
  });

  it("an empty amount says 'fill in' rather than 'invalid'", async () => {
    const api = fakeApi(base);
    mount();
    await amount();
    await submit();
    expect(screen.getByText(uk.fieldErrors.required)).toBeInTheDocument();
    await expectNothingSent(api, "POST");
  });

  it("with nobody selected the form asks for a participant and sends nothing", async () => {
    const api = fakeApi(base);
    mount();
    await userEvent.type(await amount(), "100");
    for (const name of ["Olia", "Max", "Iryna", "Andrii"]) await userEvent.click(box(name));
    await submit();
    expect(screen.getByText(uk.expenseForm.noParticipants)).toBeInTheDocument();
    await expectNothingSent(api, "POST");
  });

  it("fixed amounts that do not add up show the difference and are not sent (BR-07)", async () => {
    const api = fakeApi(base);
    mount();
    await ready();
    await userEvent.type(screen.getByLabelText(uk.expenseForm.titleLabel), "Dinner");
    await userEvent.type(await amount(), "1000");
    await mode(uk.splitMode.AMOUNTS);
    for (const [name, value] of [["Olia", "400"], ["Max", "300"], ["Iryna", "200"], ["Andrii", "99.99"]]) {
      await userEvent.type(screen.getByLabelText(uk.expenseForm.shareAmountLabel(name)), value);
    }
    expect(screen.getByText(uk.expenseForm.amountsLeft)).toBeInTheDocument();
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(uk.errors.SHARES_SUM_MISMATCH("0.01"));
    await expectNothingSent(api, "POST");
  });

  it("percentages that do not reach 100 show the difference and are not sent (BR-08)", async () => {
    const api = fakeApi(base);
    mount();
    await ready();
    await userEvent.type(screen.getByLabelText(uk.expenseForm.titleLabel), "Dinner");
    await userEvent.type(await amount(), "1000");
    await mode(uk.splitMode.PERCENTAGES);
    for (const [name, value] of [["Olia", "33.33"], ["Max", "33.33"], ["Iryna", "33.33"], ["Andrii", "0"]]) {
      await userEvent.type(screen.getByLabelText(uk.expenseForm.sharePercentLabel(name)), value);
    }
    await submit();
    await expectNothingSent(api, "POST");
  });

  it("a valid equal split is sent as integers: kopecks, the payer, the participants in ledger order and one idempotency key", async () => {
    const created = { expense: { id: "E1", title: "Groceries", amountKopecks: 185_050, payerId: "max", splitMode: "EQUAL", shares: [], createdAt: iso, updatedAt: iso } };
    const api = fakeApi({ ...base, "POST /api/ledgers/L1/expenses": { status: 201, body: created } });
    mount();
    await ready();
    await userEvent.type(screen.getByLabelText(uk.expenseForm.titleLabel), "Groceries");
    await userEvent.type(await amount(), "1850.50");
    await userEvent.click(screen.getByRole("radio", { name: "Max" }));
    await submit();
    await waitFor(() => expect(here()).toBe("/ledgers/L1"));
    const body = api.sent("POST")[0].body as Record<string, unknown>;
    expect(body).toMatchObject({
      title: "Groceries",
      amountKopecks: 185_050,
      payerId: "max",
      split: { mode: "EQUAL", participantIds: ["olia", "max", "iryna", "andrii"] },
    });
    expect(body.clientRequestId).toEqual(expect.any(String));
    expect(Number.isInteger(body.amountKopecks)).toBe(true);
  });

  it("a server-side refusal is shown in Ukrainian and the form stays for a retry", async () => {
    fakeApi({ ...base, "POST /api/ledgers/L1/expenses": apiError(409, "SETTLEMENT_STARTED") });
    mount();
    await ready();
    await userEvent.type(screen.getByLabelText(uk.expenseForm.titleLabel), "Late");
    await userEvent.type(await amount(), "100");
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(uk.errors.SETTLEMENT_STARTED);
    expect(here()).toBe("/ledgers/L1/expenses/new");
    expect(screen.getByRole("button", { name: uk.expenseForm.submitNew })).toBeEnabled();
  });

  it("a closed ledger shows the read-only note instead of the form (BR-44)", async () => {
    fakeApi({ ...base, "GET /api/ledgers/L1": { status: 200, body: ledgerBody("CLOSED") } });
    mount();
    expect(await screen.findByText(uk.ledger.readOnly.CLOSED)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: uk.expenseForm.submitNew })).not.toBeInTheDocument();
  });

  it("a signed-out visitor is sent to sign-in (BR-21)", async () => {
    fakeApi({ "GET /api/ledgers/L1": apiError(401, "UNAUTHENTICATED"), "GET /api/ledgers/L1/expenses": apiError(401, "UNAUTHENTICATED") });
    mount();
    await waitFor(() => expect(here()).toBe("/signin"));
  });
});

describe("Editing an expense (US-031)", () => {
  const expense = {
    id: "E1",
    title: "Taxi",
    amountKopecks: 42_000,
    payerId: "iryna",
    splitMode: "EQUAL",
    shares: [
      { memberId: "olia", amountKopecks: 14_000, percentBp: null },
      { memberId: "iryna", amountKopecks: 14_000, percentBp: null },
      { memberId: "andrii", amountKopecks: 14_000, percentBp: null },
    ],
    createdAt: iso,
    updatedAt: iso,
  };
  const handlers = {
    "GET /api/ledgers/L1": { status: 200, body: ledgerBody() },
    "GET /api/ledgers/L1/expenses": { status: 200, body: { expenses: [expense] } },
  };
  const route = "/ledgers/L1/expenses/E1/edit";
  const path = "/ledgers/:ledgerId/expenses/:expenseId/edit";

  it("opens with the saved values and sends a full replacement to the same expense", async () => {
    const api = fakeApi({ ...handlers, "PUT /api/ledgers/L1/expenses/E1": { status: 200, body: { expense } } });
    renderAt(route, path, <ExpenseFormPage />);
    expect(await screen.findByDisplayValue("Taxi")).toBeInTheDocument();
    expect(screen.getByLabelText(uk.expenseForm.amountLabel)).toHaveValue("420.00");
    expect(screen.getByRole("checkbox", { name: "Max" })).not.toBeChecked();
    await userEvent.clear(screen.getByLabelText(uk.expenseForm.amountLabel));
    await userEvent.type(screen.getByLabelText(uk.expenseForm.amountLabel), "450");
    await userEvent.click(screen.getByRole("button", { name: uk.expenseForm.submitEdit }));
    await waitFor(() => expect(here()).toBe("/ledgers/L1"));
    const put = api.sent("PUT")[0];
    expect(put.path).toBe("/api/ledgers/L1/expenses/E1");
    expect(put.body).toMatchObject({ amountKopecks: 45_000, payerId: "iryna", split: { mode: "EQUAL", participantIds: ["olia", "iryna", "andrii"] } });
    expect(put.body).not.toHaveProperty("clientRequestId");
  });

  it("an unknown expense id says so instead of showing an empty form", async () => {
    fakeApi(handlers);
    renderAt("/ledgers/L1/expenses/nope/edit", path, <ExpenseFormPage />);
    expect(await screen.findByText(uk.expenseForm.notFound)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: uk.expenseForm.submitEdit })).not.toBeInTheDocument();
  });
});

describe("Who pays whom (US-044, US-048)", () => {
  const settlement = {
    source: "PROPOSED",
    ledgerState: "ACTIVE",
    fullySettled: false,
    balances: [
      { memberId: "olia", balanceKopecks: 348_807 },
      { memberId: "max", balanceKopecks: -36_213 },
      { memberId: "iryna", balanceKopecks: -193_262 },
      { memberId: "andrii", balanceKopecks: -135_262 },
    ],
    transfers: ["max", "iryna", "andrii"].map((from, i) => ({
      id: null,
      fromMemberId: from,
      toMemberId: "olia",
      amountKopecks: [36_213, 193_262, 135_262][i],
      state: "OPEN",
      reportedVia: null,
      reportedAt: null,
      confirmedVia: null,
      confirmedAt: null,
    })),
  };
  const mount = (body: object) => {
    fakeApi({ "GET /api/ledgers/L1": { status: 200, body: ledgerBody() }, "GET /api/ledgers/L1/settlement": { status: 200, body } });
    return renderAt("/ledgers/L1/transfers", "/ledgers/:ledgerId/transfers", <SettlementPage />);
  };

  it("lists the Carpathians transfers to the kopeck and signed balances", async () => {
    mount(settlement);
    const text = async () => (await screen.findByText(uk.settlement.balancesTitle)).closest("div")?.parentElement?.textContent ?? "";
    expect(await text()).toBeTruthy();
    const body = document.body.textContent?.replace(/\s/g, " ") ?? "";
    for (const amount of ["362.13 ₴", "1932.62 ₴", "1352.62 ₴", "+3488.07 ₴", "−362.13 ₴"]) expect(body).toContain(amount);
    expect(screen.getByText(uk.settlement.proposedNote)).toBeInTheDocument();
  });

  it("an even ledger says no transfers are needed (BR-27)", async () => {
    mount({ ...settlement, balances: carpathianMembers.map((m) => ({ memberId: m.id, balanceKopecks: 0 })), transfers: [] });
    expect(await screen.findByText(uk.settlement.noTransfers)).toBeInTheDocument();
  });

  it("a saved list shows the state of each transfer", async () => {
    mount({ ...settlement, source: "SAVED", transfers: settlement.transfers.map((t, i) => ({ ...t, id: `T${i}`, state: i === 0 ? "REPORTED_PAID" : "OPEN" })) });
    expect(await screen.findByText(uk.transferState.REPORTED_PAID)).toBeInTheDocument();
    expect(screen.getAllByText(uk.transferState.OPEN)).toHaveLength(2);
  });

  it("a load failure is a Ukrainian message, not a blank page", async () => {
    fakeApi({ "GET /api/ledgers/L1": { status: 200, body: ledgerBody() }, "GET /api/ledgers/L1/settlement": apiError(500, "INTERNAL_ERROR") });
    renderAt("/ledgers/L1/transfers", "/ledgers/:ledgerId/transfers", <SettlementPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(uk.errors.default);
  });
});

describe("A friend's page (US-009, US-030, BR-39 … BR-41)", () => {
  const page = {
    ledger: { name: "Carpathians", state: "ACTIVE", fullySettled: false },
    member: { name: "Max" },
    youPay: [{ toMemberId: "olia", toName: "Olia", amountKopecks: 36_213, state: "OPEN", reportedVia: null, paymentDetails: "Card 0000 0000 0000 0001" }],
    youReceive: [],
    breakdown: {
      lines: [{ title: "Groceries", paidKopecks: 185_050, shareKopecks: 46_263 }],
      totalPaidKopecks: 185_050,
      totalSharesKopecks: 46_263,
      balanceKopecks: 138_787,
    },
  };
  const mount = (reply: object) => {
    fakeApi({ "GET /api/links/tok": reply as never });
    return renderAt("/l/tok", "/l/:token", <MemberPage />);
  };

  it("shows the greeting, the amount to pay, who to, and the breakdown", async () => {
    mount({ status: 200, body: page });
    expect(await screen.findByText("Max")).toBeInTheDocument();
    const body = document.body.textContent?.replace(/\s/g, " ") ?? "";
    expect(body).toContain("362.13 ₴");
    expect(body).toContain("Olia");
    expect(body).toContain("Card 0000 0000 0000 0001");
    expect(body).toContain("Groceries");
    expect(screen.getByText(uk.member.nothingToReceive)).toBeInTheDocument();
  });

  it("has nothing that changes data: no form, no input and no submit button", async () => {
    mount({ status: 200, body: page });
    await screen.findByText("Max");
    expect(document.querySelector("form, input, textarea, select")).toBeNull();
    expect(screen.queryAllByRole("button").every((b) => /Скопіювати|Тема|Копіювати|theme/i.test(b.textContent ?? b.getAttribute("aria-label") ?? ""))).toBe(true);
  });

  it("when the payer has no details of the receiver, it says to ask the Coordinator", async () => {
    mount({ status: 200, body: { ...page, youPay: [{ ...page.youPay[0], paymentDetails: null }] } });
    expect(await screen.findByText(uk.member.noDetails)).toBeInTheDocument();
  });

  it("a ledger with no expenses says so", async () => {
    mount({
      status: 200,
      body: { ...page, youPay: [], breakdown: { lines: [], totalPaidKopecks: 0, totalSharesKopecks: 0, balanceKopecks: 0 } },
    });
    expect(await screen.findByText(uk.member.noExpenses)).toBeInTheDocument();
    expect(screen.getByText(uk.member.nothingToPay)).toBeInTheDocument();
  });

  it("an unknown link gives a neutral message with no trip or member name (BR-41)", async () => {
    mount(apiError(404, "LINK_NOT_FOUND"));
    expect(await screen.findByText(uk.member.notFoundText)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/Carpathians|Max|Developer English/);
  });

  it("another failure is a generic Ukrainian message", async () => {
    mount(apiError(500, "INTERNAL_ERROR"));
    expect(await screen.findByRole("alert")).toHaveTextContent(uk.errors.default);
  });
});

describe("Test data sanity", () => {
  it("the four Carpathians members are in ledger order", () => {
    expect(carpathianMembers.map((m) => m.position)).toEqual([1, 2, 3, 4]);
    expect(member("x", "X", 1).isCoordinator).toBe(true);
  });
});
