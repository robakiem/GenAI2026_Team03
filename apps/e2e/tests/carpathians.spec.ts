import { expect, test, type Browser, type Page } from "@playwright/test";
import { uk } from "../../web/src/i18n/uk";

// The demo scenario of docs/testing-strategy.md as one automated run: Olia plans the Carpathians
// trip, the four expenses of requirements 4.2 go in through the real forms, and every friend then
// opens a personal link in a browser that has never signed in. All at 360 px, the phone width.
const stamp = Date.now();
const email = `olia-${stamp}@example.com`;
const password = "password1";
const flat = (text: string | null) => (text ?? "").replace(/\s+/g, " ");
const bodyText = async (page: Page) => flat(await page.locator("body").textContent());

async function noHorizontalScroll(page: Page, where: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${where}: horizontal scroll at ${page.viewportSize()?.width}px`).toBeLessThanOrEqual(0);
}

async function signIn(page: Page) {
  await page.goto("/signin");
  await page.getByLabel(uk.auth.email).fill(email);
  await page.getByLabel(uk.auth.password).fill(password);
  await page.getByRole("button", { name: uk.auth.signInButton }).click();
  await expect(page).toHaveURL(/\/ledgers$/);
}

async function anonymous(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: "uk-UA" });
  return context.newPage();
}

const memberRow = (page: Page, name: string) =>
  page
    .getByRole("listitem")
    .filter({ has: page.getByText(name, { exact: true }) })
    .filter({ has: page.getByRole("button", { name: uk.ledger.copyLink }) })
    .first();

async function addExpense(
  page: Page,
  input: { title: string; amount: string; payer: string; split?: Record<string, string>; only?: string[] },
) {
  await page.getByRole("link", { name: uk.ledger.addExpense }).click();
  await page.getByLabel(uk.expenseForm.titleLabel).fill(input.title);
  await page.getByLabel(uk.expenseForm.amountLabel).fill(input.amount);
  await page.getByRole("radio", { name: input.payer }).check({ force: true });
  if (input.only) {
    for (const name of ["Olia", "Max", "Iryna", "Andrii"]) {
      if (!input.only.includes(name)) await page.getByRole("checkbox", { name }).uncheck({ force: true });
    }
  }
  if (input.split) {
    await page.getByRole("radio", { name: uk.splitMode.AMOUNTS }).check({ force: true });
    for (const [name, value] of Object.entries(input.split)) {
      await page.getByLabel(uk.expenseForm.shareAmountLabel(name)).fill(value);
    }
  }
  await page.getByRole("button", { name: uk.expenseForm.submitNew }).click();
  await expect(page.getByText(input.title, { exact: true })).toBeVisible();
}

test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 360, height: 800 } });

const links: Record<string, string> = {};
let ledgerUrl = "";

test("Olia signs up, creates the trip, adds friends and the four expenses", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel(uk.auth.email).fill(email);
  await page.getByLabel(uk.auth.password).fill(password);
  await page.getByRole("button", { name: uk.auth.signUpButton }).click();
  await expect(page).toHaveURL(/\/ledgers$/);
  await noHorizontalScroll(page, "trips list");

  await page.getByRole("button", { name: uk.ledgers.create }).click();
  await page.getByLabel(uk.ledgerNew.nameLabel).fill("Carpathians");
  await page.getByLabel(uk.ledgerNew.coordinatorLabel).fill("Olia");
  await page.getByRole("button", { name: uk.ledgerNew.submit }).click();
  await expect(page.getByRole("heading", { name: "Carpathians" })).toBeVisible();
  ledgerUrl = page.url();

  for (const name of ["Max", "Iryna", "Andrii"]) {
    await page.getByLabel(uk.ledger.memberNameLabel).fill(name);
    await page.getByRole("button", { name: uk.ledger.addButton }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  await noHorizontalScroll(page, "trip overview");

  await addExpense(page, { title: "House rent", amount: "6000", payer: "Olia" });
  await addExpense(page, { title: "Groceries", amount: "1850.50", payer: "Max" });
  await addExpense(page, { title: "Taxi", amount: "420", payer: "Iryna", only: ["Olia", "Iryna", "Andrii"] });
  await addExpense(page, {
    title: "Funicular",
    amount: "900",
    payer: "Andrii",
    split: { Olia: "250", Max: "250", Iryna: "250", Andrii: "150" },
  });
  await noHorizontalScroll(page, "trip overview with expenses");
  expect(await bodyText(page)).toContain("9170.50 ₴"); // 6000 + 1850.50 + 420 + 900

  for (const name of ["Olia", "Max", "Iryna", "Andrii"]) {
    links[name] = (await memberRow(page, name).getByRole("button", { name: uk.ledger.copyLink }).getAttribute("title")) ?? "";
  }
  expect(Object.values(links).every((url) => /\/l\/[A-Za-z0-9_-]{22}$/.test(url))).toBe(true);
  expect(new Set(Object.values(links)).size).toBe(4);
});

test("«Who pays whom» shows the Carpathians result to the kopeck", async ({ page }) => {
  await signIn(page);
  await page.goto(ledgerUrl);
  await page.getByRole("link", { name: uk.ledger.toSettlement }).click();
  await expect(page.getByText(uk.settlement.proposedNote)).toBeVisible();
  const text = await bodyText(page);
  for (const amount of ["362.13 ₴", "1932.62 ₴", "1352.62 ₴"]) expect(text).toContain(amount);
  await noHorizontalScroll(page, "who pays whom");
});

test("Olia saves her payment details; Max sees them on his own page, in a browser that never signed in", async ({ page, browser }) => {
  await signIn(page);
  await page.goto(ledgerUrl);
  const oliaRow = memberRow(page, "Olia");
  await oliaRow.getByText(uk.paymentDetails.none).click();
  await oliaRow.getByLabel(uk.paymentDetails.label("Olia")).fill("Card 0000 0000 0000 0001");
  await oliaRow.getByRole("button", { name: uk.paymentDetails.save }).click();
  await expect(oliaRow.getByText("Card 0000 0000 0000 0001")).toBeVisible();

  const friend = await anonymous(browser);
  await friend.goto(links.Max);
  await expect(friend.getByText("Groceries")).toBeVisible();
  const text = await bodyText(friend);
  expect(text).toContain("362.13 ₴");
  expect(text).toContain("Card 0000 0000 0000 0001");
  // nothing of the other friends' transfers (BR-40) and none of their link tokens in the page
  expect(text).not.toContain("1932.62");
  expect(text).not.toContain("1352.62");
  const html = await friend.content();
  for (const other of ["Iryna", "Andrii", "Olia"]) expect(html).not.toContain(links[other].split("/l/")[1]);
  await expect(friend.locator("form, textarea, select")).toHaveCount(0);
  await noHorizontalScroll(friend, "friend page");
  await friend.context().close();
});

test("the receiver's page lists who pays her, per friend", async ({ browser }) => {
  const receiver = await anonymous(browser);
  await receiver.goto(links.Olia);
  await expect(receiver.getByText(uk.member.youReceiveTitle)).toBeVisible();
  const text = await bodyText(receiver);
  for (const amount of ["362.13 ₴", "1932.62 ₴", "1352.62 ₴"]) expect(text).toContain(amount);
  for (const name of ["Max", "Iryna", "Andrii"]) expect(text).toContain(name);
  await noHorizontalScroll(receiver, "receiver page");
  await receiver.context().close();
});

test("a link cut by one character shows a neutral page without the trip name", async ({ browser }) => {
  const friend = await anonymous(browser);
  await friend.goto(links.Max.slice(0, -1));
  await expect(friend.getByText(uk.member.notFoundText)).toBeVisible();
  const text = await bodyText(friend);
  expect(text).not.toContain("Carpathians");
  expect(text).not.toContain("Max");
  await noHorizontalScroll(friend, "link not found");
  await friend.context().close();
});

test("a visitor who is not signed in cannot open the Coordinator pages", async ({ browser }) => {
  const visitor = await anonymous(browser);
  const path = new URL(ledgerUrl).pathname;
  for (const target of ["/ledgers", path, `${path}/transfers`, `${path}/expenses/new`]) {
    await visitor.goto(target);
    await expect(visitor).toHaveURL(/\/signin$/);
  }
  await visitor.context().close();
});

test("wrong credentials and a duplicate e-mail are explained in Ukrainian, with nothing technical", async ({ browser }) => {
  const visitor = await anonymous(browser);
  await visitor.goto("/signin");
  await visitor.getByLabel(uk.auth.email).fill(email);
  await visitor.getByLabel(uk.auth.password).fill("wrong-password");
  await visitor.getByRole("button", { name: uk.auth.signInButton }).click();
  await expect(visitor.getByRole("alert")).toHaveText(uk.errors.INVALID_CREDENTIALS);

  await visitor.goto("/signup");
  await visitor.getByLabel(uk.auth.email).fill(email);
  await visitor.getByLabel(uk.auth.password).fill(password);
  await visitor.getByRole("button", { name: uk.auth.signUpButton }).click();
  await expect(visitor.getByRole("alert")).toHaveText(uk.errors.EMAIL_TAKEN);
  expect(await bodyText(visitor)).not.toMatch(/EMAIL_TAKEN|INVALID_CREDENTIALS|Error|stack/);
  await visitor.context().close();
});

test("an invalid amount is refused in the form and no expense is created", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ledgerUrl}/expenses/new`);
  await page.getByLabel(uk.expenseForm.titleLabel).fill("Broken");
  for (const bad of ["1,50", "abc", "0", "1000000"]) {
    await page.getByLabel(uk.expenseForm.amountLabel).fill(bad);
    await page.getByRole("button", { name: uk.expenseForm.submitNew }).click();
    await expect(page.getByLabel(uk.expenseForm.amountLabel)).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/expenses\/new$/);
  }
  await page.goto(ledgerUrl);
  await expect(page.getByText("Broken")).toHaveCount(0);
});

test("after editing an expense the settlement and the friends' pages change at once (BR-26)", async ({ page, browser }) => {
  await signIn(page);
  await page.goto(ledgerUrl);
  await page.getByRole("link", { name: `${uk.ledger.edit}: Taxi` }).click();
  await page.getByLabel(uk.expenseForm.amountLabel).fill("450");
  await page.getByRole("button", { name: uk.expenseForm.submitEdit }).click();
  await expect(page).toHaveURL(ledgerUrl);
  expect(await bodyText(page)).toContain("9200.50 ₴");
  await page.getByRole("link", { name: uk.ledger.toSettlement }).click();
  await expect(page.getByText(uk.settlement.proposedNote)).toBeVisible();
  const settlement = await bodyText(page);
  // Taxi is shared by Olia, Iryna and Andrii: their amounts move by 10.00 each way, Max's does not
  for (const amount of ["362.13 ₴", "1912.62 ₴", "1362.62 ₴"]) expect(settlement).toContain(amount);
  expect(settlement).not.toContain("1932.62 ₴");
  expect(settlement).not.toContain("1352.62 ₴");

  const iryna = await anonymous(browser);
  await iryna.goto(links.Iryna);
  await expect(iryna.getByText("Groceries")).toBeVisible();
  expect(await bodyText(iryna)).toContain("1912.62 ₴");
  expect(await bodyText(iryna)).not.toContain("1932.62 ₴");
  await iryna.context().close();
});
