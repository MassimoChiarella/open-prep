import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const policy = readFileSync(path.join(process.cwd(), "BROWSER_SUPPORT.md"), "utf8");

describe("browser support policy", () => {
  it("covers current stable branded browser families without a fixed version promise", () => {
    for (const browser of ["Google Chrome", "Microsoft Edge", "Mozilla Firefox", "Apple Safari"])
      expect(policy).toContain(browser);

    expect(policy).toMatch(/current stable/i);
    expect(policy).toMatch(/does\s+not promise indefinite support/i);
  });

  it("distinguishes Playwright engines from branded-browser evidence", () => {
    expect(policy).toContain("npm run e2e");
    expect(policy).toContain("npm run e2e:cross-browser");
    expect(policy).toContain("@browser-smoke");
    expect(policy).toMatch(/Playwright WebKit does not substitute for a real Safari check/i);
    expect(policy).toMatch(/Chromium remains the authoritative visual-baseline environment/i);
  });

  it("keeps branded browser, PWA, and release evidence checks manual", () => {
    expect(policy).toMatch(/bounded manual release check/i);
    expect(policy).toMatch(/installation surfaces are manual QA/i);
    expect(policy).toMatch(/Treat a missing device or branded-browser run as `Not run`/i);
    expect(policy).toContain("[release checklist](RELEASE_CHECKLIST.md)");
  });
});
