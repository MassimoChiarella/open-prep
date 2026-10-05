import { describe, expect, it } from "vitest";

import playwrightConfig from "../../../playwright.config";

describe("Playwright server isolation", () => {
  it("uses its own port and server rather than an existing app instance", () => {
    expect(playwrightConfig.use?.baseURL).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);
    expect(playwrightConfig.use?.baseURL).not.toBe("http://127.0.0.1:3000");
    expect(process.env.PLAYWRIGHT_PORT).toBe(new URL(String(playwrightConfig.use?.baseURL)).port);
    expect(playwrightConfig.webServer).toMatchObject({
      reuseExistingServer: false
    });
  });
});
