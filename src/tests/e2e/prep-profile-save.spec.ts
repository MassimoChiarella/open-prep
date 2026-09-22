import { expect, test } from "@playwright/test";

test("profile editing remains locked until the pending save completes", async ({ page }) => {
  await page.addInitScript(() => {
    const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, "oncomplete")!;
    Object.defineProperty(IDBTransaction.prototype, "oncomplete", {
      ...descriptor,
      set(this: IDBTransaction, listener: ((event: Event) => void) | null) {
        descriptor.set!.call(this, listener === null ? null : (event: Event) => {
          if (this.mode === "readwrite" && this.objectStoreNames.contains("practice_records")) {
            (window as unknown as { releaseProfileSave: () => void }).releaseProfileSave = () => listener.call(this, event);
          } else {
            listener.call(this, event);
          }
        });
      }
    });
  });
  await page.goto("/case-practice/plan/");
  const firms = page.getByRole("textbox", { name: /^Target firms/ });
  await firms.fill("First firm");
  await page.getByRole("button", { name: "Save Profile", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saving...", exact: true })).toBeDisabled();
  await expect(firms).toBeDisabled();
  await expect(page.getByRole("combobox", { name: "Experience level" })).toBeDisabled();
  await expect(page.getByRole("spinbutton", { name: "Practice sessions per week" })).toBeDisabled();
  await expect(page.getByLabel("Interview date (optional)")).toBeDisabled();

  await firms.click({ force: true });
  await page.keyboard.type(" unwanted edit");
  await expect(firms).toHaveValue("First firm");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.matches("fieldset:disabled input, fieldset:disabled select, fieldset:disabled button"))).toBe(false);

  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { releaseProfileSave?: unknown }).releaseProfileSave)).toBe("function");
  await page.evaluate(() => (window as unknown as { releaseProfileSave: () => void }).releaseProfileSave());
  await expect(page.getByText("Your preparation profile and weekly target are saved.", { exact: true })).toBeVisible();
  await expect(firms).toBeEnabled();
  await expect(firms).toHaveValue("First firm");
});
