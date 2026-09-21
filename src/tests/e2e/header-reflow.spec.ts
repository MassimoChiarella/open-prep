import { expect, test } from "@playwright/test";

import { locales } from "../../features/i18n/i18n";

for (const width of [320, 390, 844, 1280]) {
  for (const locale of locales) {
    test(`header controls fit at ${width}px in ${locale}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 800 });
      await page.goto("/settings/");
      if (width >= 844) await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
      const language = page.locator("header select");
      await language.selectOption(locale);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      const status = page.getByTestId("offline-status-indicator");
      await expect(status).toHaveAttribute("data-state", "online");
      for (const state of ["checking", "online", "offline-ready", "unreachable", "update-ready", "update-failed"]) {
        await page.evaluate((state) => window.dispatchEvent(new CustomEvent(
          "consulting-math-service-worker-status", { detail: state }
        )), state);
        await expect(status).toHaveAttribute("data-state", state);
        const bounds = await page.evaluate(() => {
          const select = document.querySelector("header select")!.getBoundingClientRect();
          const status = document.querySelector('[data-testid="offline-status-indicator"]')!.getBoundingClientRect();
          return {
            width: select.width,
            overlap: Math.max(0, Math.min(select.right, status.right) - Math.max(select.left, status.left)) *
              Math.max(0, Math.min(select.bottom, status.bottom) - Math.max(select.top, status.top)),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
          };
        });
        expect(bounds.overlap, state).toBe(0);
        expect(bounds.width, state).toBeGreaterThanOrEqual(120);
        expect(bounds.overflow, state).toBeLessThanOrEqual(1);
      }
      if (locale === "de" || locale === "ar") {
        await page.screenshot({ path: testInfo.outputPath(`${locale}-${width}.png`) });
      }
      await page.evaluate(() => window.addEventListener("consulting-math-service-worker-retry", () => {
        document.body.dataset.retryRequested = "true";
      }, { once: true }));
      await status.getByRole("button").focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("body")).toHaveAttribute("data-retry-requested", "true");
      await expect(status).toHaveAttribute("data-state", "online");
    });
  }
}
