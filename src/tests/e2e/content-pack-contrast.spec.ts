import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  for (const view of ["create", "import", "installed", "discover", "resources", "downloads"]) {
    test(`${view} content packs have accessible contrast in ${theme}`, async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: theme === "light" ? 390 : 1280, height: 800 });
      await page.goto("/settings/");
      await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption(theme);
      await page.goto(view === "downloads" ? "/content-packs/downloads/" : `/content-packs/?view=${view}`);
      await expect(page.getByRole("heading", { level: 1, name: view === "downloads" ? "Download authoring resources" : "Content Packs" })).toBeVisible();
      for (const expanded of [false, true]) {
        await page.locator("main details").evaluateAll((elements, expanded) => {
          elements.forEach((element) => { (element as HTMLDetailsElement).open = expanded; });
        }, expanded);
        const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
        expect(results.violations, `${theme}, ${view}, expanded=${expanded}`).toEqual([]);
      }
      if (view === "create") {
        await page.getByTestId("content-pack-starter-library").locator("code").first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: testInfo.outputPath(`create-${theme}.png`) });
      }
    });
  }
}
