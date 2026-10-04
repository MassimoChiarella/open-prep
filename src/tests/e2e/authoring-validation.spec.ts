import { expect, test } from "@playwright/test";

test("all authoring ID patterns use native browser validation", { tag: "@browser-smoke" }, async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/content-packs/?view=create");
  const numeric = page.getByTestId("question-pack-builder");
  const questioning = page.getByTestId("questioning-pack-builder");
  await numeric.locator("summary").first().click();
  await numeric.getByText("Advanced pack details", { exact: true }).click();
  await questioning.locator("summary").first().click();
  for (const input of [numeric.getByLabel("Pack ID", { exact: true }), numeric.getByLabel("Question 1 ID", { exact: true }), questioning.getByLabel("Pack ID", { exact: true })]) {
    await input.fill("valid-id_22");
    expect(await input.evaluate((element: HTMLInputElement) => element.validity.patternMismatch)).toBe(false);
    for (const invalid of ["UPPERCASE", "has space", "bad/id", "-leading"]) {
      await input.fill(invalid);
      expect(await input.evaluate((element: HTMLInputElement) => element.validity.patternMismatch)).toBe(true);
    }
    await input.fill("valid-id_22");
  }
  expect(errors.filter((message) => /pattern|regular expression/i.test(message))).toEqual([]);
});

test("preview reveals the first invalid field across collapsed metadata and unmounted questions", { tag: "@browser-smoke" }, async ({ page }) => {
  await page.goto("/content-packs/?view=create");
  const builder = page.getByTestId("question-pack-builder");
  await builder.locator("summary").first().click();
  await builder.getByLabel("Pack title", { exact: true }).fill("Validation order");
  const advanced = builder.getByText("Advanced pack details", { exact: true });
  await advanced.click();
  const packId = builder.getByLabel("Pack ID", { exact: true });
  await packId.fill("Invalid ID");
  await advanced.click();
  await builder.getByRole("button", { name: "Add Question", exact: true }).click();
  await builder.getByTestId("builder-question").first().locator("summary").click();
  await builder.getByRole("button", { name: "Preview Pack", exact: true }).click();
  await expect(packId).toBeVisible();
  await expect(packId).toBeFocused();
  await packId.fill("valid-pack");
  await builder.getByRole("button", { name: "Preview Pack", exact: true }).focus();
  await page.keyboard.press("Enter");
  const prompt = builder.getByLabel("Question 1 prompt", { exact: true });
  await expect(prompt).toBeVisible();
  await expect(prompt).toBeFocused();
  await prompt.fill("What is 2 + 2?");
  await builder.getByLabel("Question 1 answer value", { exact: true }).fill("4");
  await builder.getByLabel("Question 1 explanation summary", { exact: true }).fill("Add the numbers.");
  await builder.getByLabel("Question 1 explanation steps", { exact: true }).fill("2 + 2 = 4.");
  await builder.getByLabel("Question 1 tolerance", { exact: true }).selectOption("range");
  await builder.getByLabel("Question 1 tolerance minimum", { exact: true }).fill("5");
  await builder.getByLabel("Question 1 tolerance maximum", { exact: true }).fill("4");
  await builder.getByTestId("builder-question").first().locator("summary").click();
  await builder.getByRole("button", { name: "Preview Pack", exact: true }).click();
  await expect(builder.getByLabel("Question 1 tolerance maximum", { exact: true })).toBeFocused();
  await expect(page.getByTestId("question-pack-preview")).toHaveCount(0);
});
