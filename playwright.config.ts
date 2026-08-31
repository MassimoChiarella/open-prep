import { defineConfig, devices } from "@playwright/test";

// PowerShell opt-in: $env:PLAYWRIGHT_CROSS_BROWSER="1"; npm run e2e -- --project=firefox-smoke --project=webkit-smoke
// Portable browser smoke covers web and service-worker journeys; OS-level PWA install prompts remain manual QA.
const crossBrowserSmokeEnabled = process.env.PLAYWRIGHT_CROSS_BROWSER === "1";
const crossBrowserSmokeFiles = /(?:navigation|theme)\.spec\.ts/;

export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: true,
  workers: process.platform === "win32" ? 1 : 2,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
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
      use: { ...devices["Desktop Chrome"] }
    },
    ...(crossBrowserSmokeEnabled ? [
      {
        grep: /@browser-smoke/,
        name: "firefox-smoke",
        testMatch: crossBrowserSmokeFiles,
        use: { ...devices["Desktop Firefox"] }
      },
      {
        grep: /@browser-smoke/,
        name: "webkit-smoke",
        testMatch: crossBrowserSmokeFiles,
        use: { ...devices["Desktop Safari"] }
      }
    ] : [])
  ]
});
