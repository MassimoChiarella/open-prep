import { expect, test } from "@playwright/test";

test("@browser-smoke serves core routes under the deployment security policy", async ({ page }) => {
  const policyErrors: string[] = [];
  page.on("console", (message) => {
    if (/content security policy|refused to/iu.test(message.text())) policyErrors.push(message.text());
  });

  const response = await page.goto("/drills/");
  expect(response).not.toBeNull();
  const headers = response!.headers();

  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("script-src 'self' 'sha256-");
  expect(headers["content-security-policy"]).not.toContain("unsafe-eval");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  await expect(page.locator("main")).toBeVisible();
  expect(policyErrors).toEqual([]);
});
