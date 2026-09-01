import { expect, test, type Page } from "@playwright/test";

const releaseViewportRoutes = [
  { name: "dashboard", path: "/", readyHeading: "Dashboard" },
  { name: "drills", path: "/drills", readyHeading: "Drill Selection" },
  { name: "benchmark", path: "/benchmark", readyHeading: "Benchmark your performance" },
  { name: "progress", path: "/progress", readyHeading: "Progress Dashboard" },
  { name: "market-sizing", path: "/market-sizing", readyHeading: "Guided Market Sizing" },
  { name: "exhibits", path: "/exhibits", readyHeading: "Exhibit Drills" },
  { name: "case-practice", path: "/case-practice", readyHeading: "Case Practice" },
  { name: "formulas", path: "/formulas", readyHeading: "Formula Library" },
  { name: "settings", path: "/settings", readyHeading: "Local App Settings" }
];

const viewportCases = [
  { height: 844, label: "mobile", width: 390 },
  { height: 1024, label: "tablet", width: 768 },
  { height: 900, label: "desktop", width: 1280 }
] as const;

test.describe("release viewport visual baselines", () => {
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
      await expect(page.getByRole("heading", { level: 1, name: route.readyHeading })).toBeVisible();
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
  route: { name: string; path: string; readyHeading: string },
  viewportLabel: "desktop" | "mobile" | "tablet"
): Promise<void> {
  await page.goto(route.path);
  await installStableScreenshotStyles(page);
  await expect(page.getByRole("heading", { level: 1, name: route.readyHeading })).toBeVisible();
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
