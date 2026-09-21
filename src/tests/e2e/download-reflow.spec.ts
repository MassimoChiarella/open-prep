import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

for (const width of [320, 390, 640, 768, 1280]) {
  for (const preference of ["large", "spacing", "combined"]) {
    test(`downloads stay contained at ${width}px with ${preference} text`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width === 768 ? 360 : 800 });
      await page.goto("/content-packs/downloads/");
      await page.getByTestId("optional-external-tools").locator("summary").click();
      await page.addStyleTag({ content: `
        ${preference !== "spacing" ? "html { font-size: 200% !important; }" : ""}
        ${preference !== "large" ? "* { letter-spacing: .12em !important; line-height: 1.5 !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" : ""}
      ` });
      for (const locale of ["en", "de", "ar"] as const) {
        await page.locator("header select").selectOption(locale);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("article a[download]").first()).toHaveText(
          { en: "Download", de: "Herunterladen", ar: "تنزيل" }[locale]
        );
        const outside = await page.locator("article a[download]").evaluateAll((links) => links.filter((link) => {
          const rect = link.getBoundingClientRect();
          const parent = link.closest("article")!.getBoundingClientRect();
          return rect.left < parent.left || rect.right > parent.right ||
            link.scrollWidth > link.clientWidth + 1 || rect.left < 0 || rect.right > innerWidth;
        }).map((link) => link.getAttribute("aria-label")));
        expect(outside, locale).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), locale).toBeLessThanOrEqual(1);
      }
      if (width === 640 && preference === "combined") {
        await page.locator("article a[download]").first().focus();
        await expect(page.locator("article a[download]").first()).toBeFocused();
        await page.screenshot({ path: testInfo.outputPath("downloads-large-rtl.png") });
      }
    });
  }
}

test("all downloadable resources resolve and a native starter download imports", async ({ page, request }, testInfo) => {
  await page.goto("/content-packs/downloads/");
  await page.getByTestId("optional-external-tools").locator("summary").click();
  const links = page.locator("article a[download]");
  const hrefs = await links.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")!));
  expect(new Set(hrefs).size).toBe(30);
  for (const href of hrefs) {
    expect(href.startsWith("/")).toBe(true);
    const response = await request.get(href);
    expect(response.ok(), href).toBe(true);
    expect((await response.body()).length, href).toBeGreaterThan(0);
  }
  const downloaded = page.waitForEvent("download");
  await page.locator('article a[href="/question-pack-example.mathdrill.json"]').click();
  const path = testInfo.outputPath("starter.mathdrill.json");
  await (await downloaded).saveAs(path);
  expect(JSON.parse(await readFile(path, "utf8")).format).toBe("math-drill-question-pack");
  await page.goto("/content-packs/?view=import");
  await page.getByLabel("Choose a question pack").setInputFiles(path);
  await expect(page.getByTestId("question-pack-preview")).toContainText("Example Retail Practice");
});
