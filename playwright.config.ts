import { defineConfig, devices } from "@playwright/test";

// Portable browser smoke covers web and service-worker journeys; OS-level PWA install prompts remain manual QA.
const backupPortabilityTest = /cross-browser-backup\.spec\.ts/u;

export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: true,
  workers: process.platform === "win32" ? 1 : 2,
  timeout: process.env.CI ? 60_000 : 30_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node scripts/serve-web-build.mjs",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
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
