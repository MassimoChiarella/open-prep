import { defineConfig, devices } from "@playwright/test";

// Portable browser smoke covers web and service-worker journeys; OS-level PWA install prompts remain manual QA.
const backupPortabilityTest = /cross-browser-backup\.spec\.ts/u;
const requestedPort = process.env.PLAYWRIGHT_PORT;
const port = requestedPort === undefined ? 30_000 + (process.pid % 20_000) : Number(requestedPort);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PLAYWRIGHT_PORT must be an integer from 1 through 65535.");
}

process.env.PLAYWRIGHT_PORT = String(port);

const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: true,
  workers: process.platform === "win32" ? 1 : 2,
  timeout: process.env.CI ? 60_000 : 30_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: {
    command: `"${process.execPath}" scripts/serve-web-build.mjs`,
    env: { PORT: String(port) },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120000
  },
  projects: [
    {
      name: "chromium",
      testIgnore: backupPortabilityTest,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      grep: /@browser-smoke/,
      name: "firefox-smoke",
      testIgnore: backupPortabilityTest,
      use: { ...devices["Desktop Firefox"] }
    },
    {
      grep: /@browser-smoke/,
      name: "webkit-smoke",
      testIgnore: backupPortabilityTest,
      use: { ...devices["Desktop Safari"] }
    },
    {
      name: "backup-portability",
      testMatch: backupPortabilityTest,
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
