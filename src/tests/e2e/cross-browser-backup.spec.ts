import { chromium, expect, firefox, test, webkit, type Browser, type Page } from "@playwright/test";

import { localePreferenceStorageKey } from "@/features/i18n/i18n";
import { themePreferenceStorageKey } from "@/features/theme/theme";
import { timingAccommodationPreferenceKey } from "@/features/timing/timingAccommodationPreference";

const expectedPreferences = ["fr", "dark", "double_time"] as const;
const preferenceKeys = [
  localePreferenceStorageKey,
  themePreferenceStorageKey,
  timingAccommodationPreferenceKey
] as const;

test("complete backup transfers preferences from Chromium to Firefox and WebKit", { tag: "@browser-smoke" }, async ({ baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "backup-portability", "Runs once in the dedicated portability project.");
  if (baseURL === undefined) throw new Error("The backup-portability project requires a baseURL.");

  const backup = await createChromiumBackup(baseURL);

  for (const [engineName, launch] of [
    ["Firefox", () => firefox.launch()],
    ["WebKit", () => webkit.launch()]
  ] as const) {
    await test.step(`restore the Chromium backup in ${engineName}`, async () => {
      const browser = await launch();
      try {
        await restoreAndVerify(browser, baseURL, backup);
      } finally {
        await browser.close();
      }
    });
  }
});

async function createChromiumBackup(baseURL: string): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    try {
      const page = await context.newPage();
      const unexpectedRequests = monitorUnexpectedRequests(page, baseURL);

      await page.goto(new URL("/benchmark/", baseURL).href);
      await page.getByRole("combobox", { name: "Timing choice" }).selectOption("double_time");
      await page.getByRole("checkbox", {
        name: "Remember this timing choice on this device"
      }).check();
      await page.getByRole("link", { name: "Begin Benchmark" }).click();
      await expect(page).toHaveURL(/timingAccommodation=double_time/u);

      await page.goto(new URL("/settings/", baseURL).href);
      await page.getByTestId("settings-local-data").locator("summary").click();
      await page.locator('select:has(option[value="dark"])').selectOption("dark");
      await page.locator('select:has(option[value="fr"])').selectOption("fr");
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");

      const backupSection = page.locator('section[aria-labelledby="complete-backup-heading"]');
      await backupSection.locator('input[type="checkbox"]').nth(2).check();
      await backupSection.locator("button").first().click();

      const preview = page.getByTestId("complete-backup-export-preview");
      await expect(preview).toBeVisible();
      await preview.locator('input[type="checkbox"]').check();
      const downloadPromise = page.waitForEvent("download");
      await preview.locator("button").click();
      const download = await downloadPromise;
      const stream = await download.createReadStream();
      if (stream === null) throw new Error("Unable to read the complete backup download.");

      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

      expect(unexpectedRequests).toEqual([]);
      return Buffer.concat(chunks);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

async function restoreAndVerify(browser: Browser, baseURL: string, backup: Buffer): Promise<void> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const unexpectedRequests = monitorUnexpectedRequests(page, baseURL);

    await page.goto(new URL("/settings/", baseURL).href);
    await page.getByTestId("settings-local-data").locator("summary").click();

    const restoreSection = page.locator('section[aria-labelledby="restore-complete-backup-heading"]');
    await restoreSection.locator('input[type="file"]').setInputFiles({
      buffer: backup,
      mimeType: "application/json",
      name: "synthetic-complete-backup.json"
    });
    const preview = page.getByTestId("complete-backup-restore-preview");
    await expect(preview).toBeVisible();
    await preview.locator('input[type="checkbox"]').check();
    await preview.locator("button").click();

    await expect.poll(() => page.evaluate(
      (keys) => keys.map((key) => window.localStorage.getItem(key)),
      preferenceKeys
    )).toEqual(expectedPreferences);

    await page.reload();
    await expect(page.locator('select:has(option[value="fr"])')).toHaveValue("fr");
    await expect(page.locator('select:has(option[value="dark"])')).toHaveValue("dark");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.goto(new URL("/drills/", baseURL).href);
    await expect(page.locator('select:has(option[value="double_time"])')).toHaveValue("double_time");
    expect(unexpectedRequests).toEqual([]);
  } finally {
    await context.close();
  }
}

function monitorUnexpectedRequests(page: Page, baseURL: string): string[] {
  const expectedOrigin = new URL(baseURL).origin;
  const unexpectedRequests: string[] = [];

  page.on("request", (request) => {
    const method = request.method();
    if (new URL(request.url()).origin !== expectedOrigin || (method !== "GET" && method !== "HEAD")) {
      unexpectedRequests.push(`${method} ${request.url()}`);
    }
  });

  return unexpectedRequests;
}
