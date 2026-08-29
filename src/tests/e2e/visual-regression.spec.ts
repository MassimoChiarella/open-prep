import { expect, test, type Page } from "@playwright/test";

const releaseViewportRoutes = [
  { name: "dashboard", path: "/", readyText: "Start with a focused drill" },
  { name: "drills", path: "/drills", readyText: "Start fast" },
  { name: "benchmark", path: "/benchmark", readyText: "Benchmark your performance" },
  { name: "progress", path: "/progress", readyText: "No drill history yet." },
  { name: "market-sizing", path: "/market-sizing", readyText: "Guided Market Sizing" },
  { name: "exhibits", path: "/exhibits", readyText: "Exhibit Drills" },
  { name: "case-practice", path: "/case-practice", readyText: "Choose a focused skill" },
  { name: "formulas", path: "/formulas", readyText: "Formula Library" },
  { name: "settings", path: "/settings", readyText: "Local App Settings" }
];

const viewportCases = [
  { height: 844, label: "mobile", width: 390 },
  { height: 1024, label: "tablet", width: 768 },
  { height: 900, label: "desktop", width: 1280 }
] as const;

test.describe("release viewport visual baselines", () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalDatabase(page);
  });

  for (const viewport of viewportCases) {
    test(`${viewport.label} release routes match approved screenshots`, async ({ page }) => {
      await page.setViewportSize({ height: viewport.height, width: viewport.width });

      for (const route of releaseViewportRoutes) {
        await expectCoreRouteScreenshot(page, route, viewport.label);
      }
    });
  }

  test("long German labels and Arabic RTL fit the narrow shell", async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 320 });

    for (const localeCase of [
      { locale: "de", name: "drills-german-narrow", path: "/drills" },
      { locale: "ar", name: "market-sizing-arabic-narrow", path: "/market-sizing" }
    ] as const) {
      await page.goto("/");
      await page.evaluate(
        ({ locale }) => window.localStorage.setItem("consulting_math_locale_preference", locale),
        localeCase
      );
      await page.goto(localeCase.path);
      await installStableScreenshotStyles(page);
      await expect(page.locator("html")).toHaveAttribute("lang", localeCase.locale);
      await expect(page.locator("html")).toHaveAttribute("dir", localeCase.locale === "ar" ? "rtl" : "ltr");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
      ).toBe(true);
      await expect(page).toHaveScreenshot(`${localeCase.name}.png`, {
        animations: "disabled",
        fullPage: true,
        maxDiffPixelRatio: 0.01
      });
    }
  });

  test("dark theme release routes match approved desktop screenshots", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await page.goto("/");
    await page.evaluate(() => window.localStorage.setItem("consulting_math_theme_preference", "dark"));

    for (const route of releaseViewportRoutes) {
      await page.goto(route.path);
      await installStableScreenshotStyles(page);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(page.getByText(route.readyText).first()).toBeVisible();
      await expect(page).toHaveScreenshot(`${route.name}-dark-desktop.png`, {
        animations: "disabled",
        fullPage: true,
        maxDiffPixelRatio: 0.01
      });
    }
  });

  test("dark theme settings remain usable on mobile", async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto("/");
    await page.evaluate(() => window.localStorage.setItem("consulting_math_theme_preference", "dark"));
    await page.goto("/settings");
    await installStableScreenshotStyles(page);

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    ).toBe(true);
    await expect(page).toHaveScreenshot("settings-dark-mobile.png", {
      animations: "disabled",
      fullPage: true,
      maxDiffPixelRatio: 0.01
    });
  });
});

async function expectCoreRouteScreenshot(
  page: Page,
  route: { name: string; path: string; readyText: string },
  viewportLabel: "desktop" | "mobile" | "tablet"
): Promise<void> {
  await page.goto(route.path);
  await installStableScreenshotStyles(page);
  await expect(page.getByText(route.readyText).first()).toBeVisible();
  await expect(page).toHaveScreenshot(`${route.name}-${viewportLabel}.png`, {
    animations: "disabled",
    fullPage: true,
    maxDiffPixelRatio: 0.01
  });
}

async function installStableScreenshotStyles(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        caret-color: transparent !important;
        transition-duration: 0s !important;
      }
    `
  });
}

async function clearLocalDatabase(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("consulting_math_drill_tool");

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
}
