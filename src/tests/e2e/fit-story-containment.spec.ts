import { expect, test, type Page } from "@playwright/test";

import { localePreferenceStorageKey } from "../../features/i18n/i18n";

const title = "W".repeat(80);
const result = "https://example.invalid/results/".padEnd(1_200, "R");

for (const locale of ["en", "de", "ar"]) {
  test(`long saved and edited Fit stories stay contained in ${locale}`, async ({ page }) => {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key: localePreferenceStorageKey,
      value: locale
    });
    await page.setViewportSize({ width: 375, height: 844 });
    await page.goto("/case-practice/fit/");
    await page.locator("#fit-story-title").fill(title);
    for (const field of ["situation", "task", "action", "reflection"]) {
      await page.locator(`#fit-story-${field}`).fill("Synthetic story text. Eine Geschichte. قصة تدريبية.");
    }
    await page.locator("#fit-story-result").fill(result);
    await page.locator("main form button[type=submit]").click();
    const savedTitle = page.getByRole("heading", { level: 4, name: title, exact: true });
    await expect(savedTitle).toBeVisible();
    await expect(page.getByText(result, { exact: true })).toBeVisible();

    for (const width of [320, 375, 390, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expectContained(page);
    }

    await savedTitle.locator("xpath=ancestor::li").getByRole("button").first().click();
    await expect(page.locator("#fit-story-title")).toHaveValue(title);
    await expect(page.locator("#fit-story-result")).toHaveValue(result);
    await page.setViewportSize({ width: 375, height: 844 });
    await expectContained(page);
    await page.locator("html").evaluate((element) => { element.style.fontSize = "200%"; });
    await expectContained(page);
  });
}

async function expectContained(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const panels = await page.locator("section[aria-labelledby='story-bank-heading'], #fit-rehearsal").evaluateAll((elements) =>
    elements.map((element) => {
      const { left, right, top, bottom } = element.getBoundingClientRect();
      return { left, right, top, bottom };
    })
  );
  expect(panels).toHaveLength(2);
  const [bank, rehearsal] = panels;
  const overlapWidth = Math.min(bank.right, rehearsal.right) - Math.max(bank.left, rehearsal.left);
  const overlapHeight = Math.min(bank.bottom, rehearsal.bottom) - Math.max(bank.top, rehearsal.top);
  expect(overlapWidth <= 1 || overlapHeight <= 1).toBe(true);
}
