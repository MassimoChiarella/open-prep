import { readFile } from "node:fs/promises";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { localePreferenceStorageKey } from "@/features/i18n/i18n";

test("only the current reviewed draft can be exported or installed", { tag: "@browser-smoke" }, async ({ page }, testInfo) => {
  await page.goto("/content-packs/?view=create");
  const builder = page.getByTestId("question-pack-builder");
  await builder.locator("summary").first().click();
  await fillFields(builder, {
    "Pack title": "Current draft",
    "Question 1 prompt": "What is 20 plus 30?",
    "Question 1 answer value": "50",
    "Question 1 explanation summary": "Add the amounts.",
    "Question 1 explanation steps": "20 + 30 = 50."
  });
  await builder.getByRole("button", { name: "Preview Pack", exact: true }).click();
  const preview = page.getByTestId("question-pack-preview");
  await preview.getByRole("checkbox").check();
  await builder.getByLabel("Question 1 answer value", { exact: true }).fill("60");
  await expect(preview).toHaveCount(0);
  await builder.getByRole("button", { name: "Preview Pack", exact: true }).click();
  await expect(preview.getByRole("checkbox")).not.toBeChecked();
  await expect(preview.getByRole("button", { name: "Install Pack", exact: true })).toBeDisabled();
  const numeric = await downloadPreview(page, testInfo.outputPath("numeric.mathdrill.json"));
  expect(numeric.questions[0].answer.value).toBe(60);
  await preview.getByRole("checkbox").check();
  page.once("dialog", (dialog) => dialog.accept());
  await builder.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(preview).toHaveCount(0);
});

test("questioning exports match the current draft and expire on edit", { tag: "@browser-smoke" }, async ({ page }, testInfo) => {
  await page.goto("/content-packs/?view=create");
  const preview = page.getByTestId("question-pack-preview");
  const questioning = page.getByTestId("questioning-pack-builder");
  await questioning.locator("summary").first().click();
  await fillFields(questioning, {
    "Pack title": "Current questioning draft", "Case title": "Retail expansion", Industry: "Retail",
    Situation: "A retailer is considering a new store.", Objective: "Assess profitable growth."
  });
  await questioning.getByRole("button", { name: "Preview Pack", exact: true }).click();
  const questionPack = await downloadPreview(page, testInfo.outputPath("questioning.mathdrill.json"));
  expect(questionPack.schemaVersion).toBe(3);
  expect(questionPack.questioningPrompts[0].objective).toBe("Assess profitable growth.");
  await questioning.getByRole("textbox", { name: "Objective", exact: true }).fill("Assess retention.");
  await expect(preview).toHaveCount(0);
});

async function fillFields(builder: Locator, fields: Record<string, string>) {
  for (const [label, value] of Object.entries(fields)) await builder.getByLabel(label, { exact: true }).fill(value);
}

for (const width of [390, 1280]) {
  test(`destructive draft actions preserve cancelled work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/content-packs/?view=create");
    const builder = page.getByTestId("question-pack-builder");
    await builder.locator("summary").first().click();
    await builder.getByLabel("Pack title", { exact: true }).fill("Protected draft");
    await builder.getByLabel("Question 1 prompt", { exact: true }).fill("Keep this work.");
    await builder.getByRole("button", { name: "Duplicate Question 1", exact: true }).click();
    const remove = builder.getByRole("button", { name: "Remove Question 1", exact: true });
    await remove.focus();
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe("Remove Question 1? This cannot be undone.");
      await dialog.dismiss();
    });
    await page.keyboard.press("Enter");
    await expect(remove).toBeFocused();
    await expect(builder.getByTestId("builder-question")).toHaveCount(2);
    page.once("dialog", (dialog) => dialog.accept());
    await page.keyboard.press("Enter");
    await expect(builder.getByTestId("builder-question")).toHaveCount(1);
    await expect(builder.getByLabel("Question 1 prompt", { exact: true })).toBeFocused();
    const discard = builder.getByRole("button", { name: "Discard changes", exact: true });
    await discard.focus();
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.keyboard.press("Enter");
    await expect(discard).toBeFocused();
    await expect(builder.getByLabel("Pack title", { exact: true })).toHaveValue("Protected draft");
    page.once("dialog", (dialog) => dialog.accept());
    await page.keyboard.press("Enter");
    await expect(builder.getByLabel("Pack title", { exact: true })).toHaveValue("");
    await expect(builder.getByLabel("Pack title", { exact: true })).toBeFocused();
  });
}

for (const locale of ["en", "ar"] as const) {
  for (const { fontSize, width } of [
    { fontSize: "100%", width: 320 },
    { fontSize: "100%", width: 390 },
    { fontSize: "200%", width: 768 }
  ]) {
    test(`authoring hints stay inside the ${width}px viewport at ${fontSize} text in ${locale}`, async ({ page }) => {
      await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [localePreferenceStorageKey, locale]);
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/content-packs/?view=create");
      await page.addStyleTag({ content: `html { font-size: ${fontSize} !important; }` });
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");

      const guide = page.getByTestId("content-pack-creation-guide");
      const hints = guide.locator('button[aria-expanded="false"]');
      await expect(hints).toHaveCount(5);

      for (let index = 0; index < 5; index += 1) {
        await hints.nth(index).click();
        const tooltip = page.getByRole("tooltip");
        await expect(tooltip).toBeVisible();
        const box = await tooltip.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        await page.keyboard.press("Escape");
        await expect(tooltip).toHaveCount(0);
      }
    });
  }
}

async function downloadPreview(page: Page, path: string) {
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .mathdrill.json", exact: true }).click();
  await (await downloaded).saveAs(path);
  return JSON.parse(await readFile(path, "utf8"));
}
