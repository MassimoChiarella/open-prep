import { expect, test, type Page } from "@playwright/test";

const warning = "Leave this builder? Your unsaved changes will be lost.";

test("dirty content-pack work survives a declined browser Back navigation", async ({ page }) => {
  await page.goto("/content-packs/?view=create");
  await page.evaluate(() => {
    window.history.pushState({ draft: true }, "", "/content-packs/?view=create&draft=test");
  });
  await openDirtyBuilder(page, "Back-protected pack", false);

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toBe(warning);
    await dialog.dismiss();
  });
  await page.evaluate(() => window.history.back());

  await expect(page).toHaveURL(/\/content-packs\/?\?view=create&draft=test$/);
  await expect(page.getByLabel("Pack title").filter({ visible: true })).toHaveValue("Back-protected pack");
});

test("dirty content-pack work confirms browser Forward navigation", async ({ page }) => {
  await page.goto("/content-packs/?view=create");
  await page.evaluate(() => {
    window.history.pushState({ destination: true }, "", "/progress/");
    window.history.back();
  });
  await expect(page).toHaveURL(/\/content-packs\/?\?view=create$/);
  await openDirtyBuilder(page, "Forward-protected pack", false);

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toBe(warning);
    await dialog.accept();
  });
  await page.evaluate(() => window.history.forward());

  await expect(page).toHaveURL(/\/progress\/?$/);
});

test("an accepted ordinary in-app link prompts exactly once", async ({ page }) => {
  await openDirtyBuilder(page, "Single-prompt pack");
  const prompts: string[] = [];

  page.on("dialog", async (dialog) => {
    prompts.push(dialog.message());
    await dialog.accept();
  });
  await page
    .getByRole("navigation", { name: "Content Pack views" })
    .getByRole("link", { name: "Installed" })
    .click();

  await expect(page).toHaveURL(/\/content-packs\/?\?view=installed$/);
  expect(prompts).toEqual([warning]);
});

async function openDirtyBuilder(page: Page, title: string, navigate = true): Promise<void> {
  if (navigate) await page.goto("/content-packs/?view=create");
  await expect(page.getByRole("heading", { level: 2, name: "Create" })).toBeVisible();
  await page.getByTestId("question-pack-builder").locator("summary").first().click();
  await page.getByLabel("Pack title").filter({ visible: true }).fill(title);
}
