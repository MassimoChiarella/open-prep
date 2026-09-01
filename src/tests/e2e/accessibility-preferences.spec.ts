import { expect, test, type Page } from "@playwright/test";

const reflowRoutes = [
  ["/", "Dashboard"],
  ["/drills", "Drill Selection"],
  ["/case-practice/fit", "Fit and Behavioral Practice"],
  ["/content-packs?view=discover", "Content Packs"],
  ["/settings", "Local App Settings"]
] as const;

test.describe("accessibility geometry and user preferences", () => {
  for (const [path, heading] of reflowRoutes) {
    test(`${path} reflows at 320 CSS pixels`, async ({ page }) => {
      await page.setViewportSize({ height: 568, width: 320 });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();

      await expectNoDocumentOverflow(page);
      await expectPrimaryControlsInViewport(page);
    });
  }

  test("enlarged text and WCAG text spacing preserve the drill workflow", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 640 });
    await page.goto("/drills");
    await page.addStyleTag({ content: `
      html { font-size: 200% !important; }
      * { letter-spacing: 0.12em !important; line-height: 1.5 !important; word-spacing: 0.16em !important; }
      p { margin-bottom: 2em !important; }
    ` });

    await expect(page.getByRole("heading", { level: 1, name: "Drill Selection" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start Selected Drill" })).toBeVisible();
    await expectNoDocumentOverflow(page);
    await expectPrimaryControlsInViewport(page);
  });

  test("forced colors and reduced motion retain focus and exhibit meaning", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.goto("/exhibits");
    await page.getByTestId("exhibit-select").selectOption("exhibit_saas_segments_001");

    const submit = page.getByRole("button", { name: "Submit Answer" });
    await submit.focus();
    await expect(submit).toBeFocused();
    expect(await submit.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
    await expect(page.getByText("Colors show plotted series.")).toBeVisible();
    await expect(page.locator("details").filter({ hasText: "Dataset details" })).toBeAttached();
    await expect.poll(() => page.evaluate(() => document.getAnimations().filter(
      ({ playState }) => playState === "running"
    ).length)).toBe(0);
  });

  test("German dark mode and Arabic RTL remain usable without horizontal overflow", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("combobox", { name: "Theme" }).selectOption("dark");
    await page.getByRole("combobox", { name: "Language" }).selectOption("de");
    await page.setViewportSize({ height: 568, width: 320 });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expectNoDocumentOverflow(page);

    await page.getByRole("combobox", { name: "Sprache" }).selectOption("ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expectNoDocumentOverflow(page);
    await expectPrimaryControlsInViewport(page);
  });

  test("form controls meet the WCAG 2.2 minimum target size", async ({ page }) => {
    await page.goto("/drills");
    const undersized = await page.locator("main button, main input, main select, main textarea").evaluateAll((elements) =>
      elements
        .filter((element) => {
          const target = element.matches("input[type='checkbox'], input[type='radio']")
            ? element.closest("label") ?? element
            : element;
          const box = target.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.display !== "none" && style.visibility !== "hidden" && (box.width < 24 || box.height < 24);
        })
        .map((element) => {
          const target = element.matches("input[type='checkbox'], input[type='radio']")
            ? element.closest("label") ?? element
            : element;
          return {
            height: target.getBoundingClientRect().height,
            name: element.getAttribute("aria-label") ?? target.textContent?.trim() ?? element.tagName,
            width: target.getBoundingClientRect().width
          };
        })
    );

    expect(undersized).toEqual([]);
  });
});

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => Math.max(
    document.body.scrollWidth,
    document.documentElement.scrollWidth
  ) - window.innerWidth)).toBeLessThanOrEqual(1);
}

async function expectPrimaryControlsInViewport(page: Page): Promise<void> {
  const outsideViewport = await page.locator("main button, main input, main select, main textarea").evaluateAll((elements) =>
    elements
      .filter((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && (
          box.left < -1 || box.right > window.innerWidth + 1
        );
      })
      .map((element) => element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName)
  );

  expect(outsideViewport).toEqual([]);
}
