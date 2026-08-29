import { expect, test } from "@playwright/test";

test("theme follows the system and explicit choices persist without flashing back", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/settings");

  const root = page.locator("html");
  const themeSelect = page.getByRole("combobox", { name: "Theme" });

  await expect(themeSelect).toHaveValue("system");
  await expect(root).not.toHaveAttribute("data-theme");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("dark");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(20, 23, 21)");

  await themeSelect.selectOption("light");
  await expect(root).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(242, 242, 238)");

  await themeSelect.selectOption("dark");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await page.goto("/");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(root).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(20, 23, 21)");

  await page.goto("/settings");
  await page.getByRole("combobox", { name: "Theme" }).selectOption("system");
  await expect(root).not.toHaveAttribute("data-theme");

  await page.emulateMedia({ colorScheme: "light" });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(242, 242, 238)");
});
