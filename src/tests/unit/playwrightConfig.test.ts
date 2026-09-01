import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import playwrightConfig from "../../../playwright.config";

describe("Playwright project selection", () => {
  it("defines one full project, two tagged engine smokes, and one backup transfer project", () => {
    const projects = playwrightConfig.projects ?? [];

    expect(projects.map(({ name }) => name)).toEqual([
      "chromium",
      "firefox-smoke",
      "webkit-smoke",
      "backup-portability"
    ]);
    expect(projects[0]?.grep).toBeUndefined();
    expect(projects[1]?.grep).toEqual(/@browser-smoke/);
    expect(projects[2]?.grep).toEqual(/@browser-smoke/);
    expect(projects[3]?.testMatch).toEqual(/cross-browser-backup\.spec\.ts/u);
    expect(projects.slice(0, 3).every(({ testIgnore }) =>
      String(testIgnore).includes("cross-browser-backup")
    )).toBe(true);
    expect(playwrightConfig.retries).toBe(0);
    expect(playwrightConfig.use).toMatchObject({
      screenshot: "only-on-failure",
      trace: "retain-on-failure"
    });
  });

  it("keeps the full and cross-browser commands intentionally separate", () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8")
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts.e2e).toBe("playwright test --project=chromium");
    expect(packageJson.scripts["e2e:cross-browser"]).toBe(
      "playwright test --grep @browser-smoke --project=chromium --project=firefox-smoke --project=webkit-smoke --project=backup-portability"
    );
  });
});
