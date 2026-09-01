import { expect, test } from "@playwright/test";

test("a user completes a deterministic three-question Exhibit Sprint", async ({ page }) => {
  await page.goto("/exhibits");
  await page.getByRole("link", { name: "Start Exhibit Sprint" }).click();

  await expect(page.getByRole("heading", { name: "Exhibit Sprint" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("3").check();
  await page.getByRole("combobox", { name: "Timing choice" }).selectOption("time_and_a_half");
  await page.getByRole("checkbox", { name: "Remember this timing choice on this device" }).check();
  await page.getByRole("button", { name: "Start Exhibit Sprint" }).click();
  await expect(page.getByRole("timer")).toContainText("remaining");
  await expect(page.getByTestId("exhibit-sprint-active-timing")).toContainText(
    "Time and a half. Your limit is 1m 30s; the standard limit is 1 min."
  );
  expect(await page.evaluate(() => localStorage.getItem("open_prep_timing_accommodation"))).toBe(
    "time_and_a_half"
  );

  await page.getByLabel("Answer", { exact: true }).fill("45.8%");
  await page.getByRole("button", { name: "Submit Answer" }).click();
  await expect(page.getByTestId("exhibit-sprint-feedback")).toContainText("Correct.");
  await page.getByRole("button", { name: "Next Question" }).click();

  await page.getByLabel("West").check();
  await page.getByRole("button", { name: "Submit Answer" }).click();
  await page.getByRole("button", { name: "Next Question" }).click();

  await page.getByLabel("Answer", { exact: true }).fill("110000");
  await page.getByRole("button", { name: "Submit Answer" }).click();
  await page.getByRole("button", { name: "View Summary" }).click();

  await expect(page.getByTestId("exhibit-sprint-summary")).toContainText("3 of 3 correct");
  await expect(page.getByTestId("exhibit-sprint-summary-timing")).toContainText(
    "Timing accommodation: Time and a half"
  );
});

for (const width of [320, 390]) {
  test(`a ${width}px sprint shows the prompt and timer before the exhibit`, async ({ page }) => {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/exhibits/sprint");
    await page.getByLabel("3").check();
    await page.getByRole("button", { name: "Start Exhibit Sprint" }).click();

    const prompt = await page.getByTestId("exhibit-sprint-prompt").boundingBox();
    const timer = await page.getByRole("timer").boundingBox();
    const exhibit = await page.getByTestId("exhibit-sprint-exhibit").boundingBox();

    expect(prompt).not.toBeNull();
    expect(timer).not.toBeNull();
    expect(exhibit).not.toBeNull();
    expect((prompt?.y ?? 0) + (prompt?.height ?? 0)).toBeLessThan(exhibit?.y ?? 0);
    expect((timer?.y ?? 0) + (timer?.height ?? 0)).toBeLessThanOrEqual(exhibit?.y ?? 0);
  });
}

test("a desktop sprint keeps the exhibit and response in two columns", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/exhibits/sprint");
  await page.getByLabel("3").check();
  await page.getByRole("button", { name: "Start Exhibit Sprint" }).click();

  const exhibit = await page.getByTestId("exhibit-sprint-exhibit").boundingBox();
  const response = await page.getByTestId("exhibit-sprint-response").boundingBox();

  expect(exhibit).not.toBeNull();
  expect(response).not.toBeNull();
  expect(Math.abs((exhibit?.y ?? 0) - (response?.y ?? 0))).toBeLessThan(2);
  expect(response?.x ?? 0).toBeGreaterThan((exhibit?.x ?? 0) + (exhibit?.width ?? 0));
});
