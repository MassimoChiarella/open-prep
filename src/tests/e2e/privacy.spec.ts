import { expect, test } from "@playwright/test";

test("the privacy disclosure is reachable from local-data settings @browser-smoke", async ({ page }) => {
  await page.goto("/settings/");
  await page.getByTestId("settings-local-data").locator("summary").click();
  const disclosure = page.getByRole("link", { name: "Privacy and analytics (English)" });
  await disclosure.focus();
  await disclosure.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy and data" })).toBeVisible();
  await expect(page.getByRole("main")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "Vercel's analytics privacy documentation" })).toHaveAttribute(
    "href", "https://vercel.com/docs/analytics/privacy-policy"
  );
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByRole("link", { name: "Manage local data in Settings" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Local App Settings" })).toBeVisible();
});
