import { readFile } from "node:fs/promises";

import { expect, test, type Locator, type Page } from "@playwright/test";

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

async function downloadPreview(page: Page, path: string) {
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .mathdrill.json", exact: true }).click();
  await (await downloaded).saveAs(path);
  return JSON.parse(await readFile(path, "utf8"));
}
