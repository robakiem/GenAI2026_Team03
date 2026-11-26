import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";

// A real browser against the real API and web app, on ports and a database of their own:
// a running `pnpm dev` and its data are never touched. The browser is the Chrome installed on the
// machine, so nothing is downloaded; set E2E_BROWSER=chromium to use Playwright's own build instead.
const API_PORT = 3101;
const WEB_PORT = 5273;
const databaseFile = join(tmpdir(), `babki-e2e-${process.pid}.db`).replaceAll("\\", "/");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    channel: process.env.E2E_BROWSER === "chromium" ? undefined : "chrome",
    trace: "retain-on-failure",
    locale: "uk-UA",
  },
  webServer: [
    {
      // migrate the throwaway database, then start the API on it
      command: "pnpm --filter @babki/api db:migrate && pnpm --filter @babki/api exec tsx src/index.ts",
      url: `http://localhost:${API_PORT}/api/health`,
      env: { PORT: String(API_PORT), DATABASE_URL: `file:${databaseFile}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter @babki/web exec vite",
      url: `http://localhost:${WEB_PORT}`,
      env: { WEB_PORT: String(WEB_PORT), API_PORT: String(API_PORT) },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
