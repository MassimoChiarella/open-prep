import { expect, test, type Locator } from "@playwright/test";

for (const layout of [
  { locale: "en", theme: "light", width: 1280 },
  { locale: "ar", theme: "dark", width: 320 }
] as const) {
  test(`@browser-smoke arrow icons preserve controls in ${layout.theme} ${layout.locale}`, async ({ page }) => {
    await page.setViewportSize({ height: 900, width: layout.width });
    await page.addInitScript(({ locale, theme }) => {
      localStorage.setItem("consulting_math_locale_preference", locale);
      localStorage.setItem("consulting_math_theme_preference", theme);
    }, layout);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", layout.locale);
    await expect(page.locator("html")).toHaveAttribute("data-theme", layout.theme);

    const startArrows = page.getByTestId("first-run-choice-arrow");
    await expect(startArrows).toHaveCount(4);
    await expectVectors(startArrows.locator("svg"), 4);
    for (const arrow of await startArrows.all()) {
      const bounds = await arrow.boundingBox();
      expect(bounds).toMatchObject({ height: 28, width: 28 });
      await expect(arrow).toHaveCSS("transform", layout.locale === "ar" ? "matrix(-1, 0, 0, -1, 0, 0)" : "none");
    }

    await page.goto("/drills");
    const presetArrows = page.getByTestId("quick-drill-presets").locator("svg");
    await expectVectors(presetArrows, 6);
    for (const arrow of await presetArrows.all()) {
      await expect(arrow).toHaveClass(/w-\[1ch\]/);
      await expect(arrow.locator("..")).toHaveCSS("transform", layout.locale === "ar" ? "matrix(-1, 0, 0, -1, 0, 0)" : "none");
    }

    await page.goto("/case-practice");
    const moduleArrows = page.getByRole("article").getByRole("link").locator("svg");
    await expectVectors(moduleArrows, 8);
    for (const arrow of await moduleArrows.all()) {
      await expect(arrow.locator("..")).toHaveCSS("transform", layout.locale === "ar" ? "matrix(-1, 0, 0, -1, 0, 0)" : "none");
    }

    await page.goto("/case-practice/plan");
    await expect(page.locator("#weekly-roadmap-heading")).toBeVisible();
    const roadmapArrows = page.locator("section[aria-labelledby='weekly-roadmap-heading'] > ol a svg");
    expect(await roadmapArrows.count()).toBeGreaterThan(0);
    await expectVectors(roadmapArrows, await roadmapArrows.count());
    for (const arrow of await roadmapArrows.all()) {
      await expect(arrow.locator("..")).toHaveCSS("transform", layout.locale === "ar" ? "matrix(-1, 0, 0, -1, 0, 0)" : "none");
    }

    await page.goto("/content-packs/downloads");
    const back = page.locator("main > a").first();
    await expect(back).toHaveAttribute("href", "/content-packs/?view=resources");
    await expectVectors(back.locator("svg"), 1);
    await expect(back.locator("svg path")).toHaveAttribute("d", "M14 8H2m5-5L2 8l5 5");

    await page.goto("/case-practice/questioning");
    await page.getByRole("main").getByRole("checkbox").check();
    const moveButtons = page.getByRole("button").filter({ has: page.locator("svg") });
    const count = await moveButtons.count();
    expect(count).toBeGreaterThanOrEqual(4);
    await expectVectors(moveButtons.locator("svg"), count);
    await expect(moveButtons.first()).toBeDisabled();
    await expect(moveButtons.last()).toBeDisabled();
    for (const button of await moveButtons.all()) {
      await expect(button).toHaveAttribute("aria-label", /.+/);
      expect(await button.boundingBox()).toMatchObject({ height: 44, width: 44 });
      await expect(button.locator("svg")).toHaveAttribute("width", "0.5em");
    }
    await expect(moveButtons.first().locator("path")).toHaveAttribute("d", "M4 14V2M1 5l3-3 3 3");
    await expect(moveButtons.nth(1).locator("path")).toHaveAttribute("d", "M4 2v12m-3-3 3 3 3-3");
    const questions = page.getByRole("textbox");
    await questions.first().fill("Synthetic question for checking the move control.");
    await moveButtons.nth(1).click();
    await expect(questions.nth(1)).toHaveValue("Synthetic question for checking the move control.");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

async function expectVectors(arrows: Locator, count: number) {
  await expect(arrows).toHaveCount(count);
  for (const arrow of await arrows.all()) {
    await expect(arrow).toBeVisible();
    await expect(arrow).toHaveAttribute("aria-hidden", "true");
    await expect(arrow).toHaveAttribute("focusable", "false");
    await expect(arrow).toHaveAttribute("stroke", "currentColor");
    await expect(arrow).toHaveAttribute("stroke-width", "2");
    await expect(arrow).toHaveAttribute("height", "1em");
  }
}
