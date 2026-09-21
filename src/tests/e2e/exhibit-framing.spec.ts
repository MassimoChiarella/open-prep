import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { exhibitDatasets } from "../../data/exhibits/exhibitDatasets";

const fitIds = ["exhibit_insurance_claims_001", "exhibit_regional_productivity_003"];

test("a dense imported scatterplot retains all rows after being hidden and resized", async ({ page }) => {
  const original = exhibitDatasets.find((dataset) => dataset.id === "exhibit_regional_productivity_003")!;
  const dataset = {
    ...original,
    questions: [original.questions[0]],
    rows: [...original.rows, ...Array.from({ length: 496 }, (_, index) => ({
      id: `synthetic-${index}`,
      cells: {
        region: `Synthetic region ${index} `.padEnd(95, "x"),
        monthly_visits: 1_000 + index * 300,
        conversion_rate: (index % 99 + 1) / 100
      }
    }))]
  };
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/content-packs/?view=import");
  await page.getByLabel("Choose a question pack").setInputFiles({
    name: "dense.mathdrill.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      format: "math-drill-question-pack", schemaVersion: 2, kind: "exhibit",
      id: "dense-scatter", title: "Dense scatter verification", packVersion: "1.0", datasets: [dataset]
    }))
  });
  await page.getByTestId("question-pack-review-confirmation").check();
  await page.getByRole("button", { name: "Install Pack", exact: true }).click();
  await expect(page.getByText("Question pack installed on this device.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Installed", exact: true }).click();
  await page.getByTestId("question-pack-dense-scatter").getByRole("link", { name: "Open Exhibits" }).click();
  const canvas = page.locator('[data-testid^="exhibit-chart-canvas-"]');
  await expect(canvas.locator(".recharts-scatter-symbol path")).toHaveCount(500);
  await expect(page.getByTestId("exhibit-chart-values").locator("dt")).toHaveCount(500);
  await canvas.evaluate((element) => { element.style.display = "none"; });
  await page.setViewportSize({ width: 768, height: 800 });
  await canvas.evaluate((element) => { element.style.display = ""; });
  await expect(canvas.locator(".recharts-scatter-symbol path")).toHaveCount(500);
  await expect.poll(() => canvas.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

for (const width of [320, 390, 768, 1280]) {
  for (const id of fitIds) {
    test(`${id} opens with every mark visible at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/exhibits/");
      await page.getByTestId("exhibit-select").selectOption(id);
      const chart = page.getByTestId(`exhibit-chart-canvas-${id}`);
      const marks = chart.locator(id.includes("claims") ? ".recharts-pie-sector path" : ".recharts-scatter-symbol path");
      await expect(marks).toHaveCount(exhibitDatasets.find((dataset) => dataset.id === id)!.rows.length);
      for (const size of [width, width === 320 ? 768 : 320, width]) {
        await page.setViewportSize({ width: size, height: 800 });
        await expect.poll(() => chart.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
        await expect.poll(() => marks.evaluateAll((elements) => elements.filter((element) => {
          const mark = element.getBoundingClientRect();
          const viewport = element.closest('[data-testid^="exhibit-chart-canvas-"]')!.parentElement!.getBoundingClientRect();
          return mark.width <= 0 || mark.height <= 0 || mark.left < viewport.left - 1 || mark.right > viewport.right + 1;
        }).length)).toBe(0);
      }
      await expect(page.getByText("Scroll chart sideways to inspect axis labels.")).toHaveCount(0);
      await expect(page.getByTestId("exhibit-chart-values")).toBeVisible();
      await chart.scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`${id}-${width}.png`) });
      await chart.locator("svg").first().focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Tab");
      await expect(chart.locator("svg").first()).not.toBeFocused();
    });
  }
}

for (const id of [
  "exhibit_saas_segments_001", "exhibit_delivery_costs_001", "exhibit_insurance_claims_001",
  "exhibit_consumer_profit_bridge_003", "exhibit_regional_productivity_003",
  "exhibit_meal_kit_mix_003", "exhibit_input_cost_index_003"
]) {
  test(`${id} retains accessible evidence under display preferences`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
    await page.goto("/exhibits/");
    await page.getByTestId("exhibit-select").selectOption(id);
    const chart = page.getByTestId(`exhibit-chart-${id}`);
    await expect(chart.locator("svg").first()).toBeVisible();
    const results = await new AxeBuilder({ page }).include(`[data-testid="exhibit-chart-${id}"]`)
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations).toEqual([]);
    await page.locator("header select").selectOption("ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.emulateMedia({ forcedColors: "active" });
    const values = chart.getByTestId("exhibit-chart-values");
    await values.focus();
    await expect(values).toBeFocused();
    await expect(values.locator("dt")).toHaveCount(exhibitDatasets.find((dataset) => dataset.id === id)!.rows.length);
    await chart.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`${id}-forced-rtl.png`) });
  });
}
