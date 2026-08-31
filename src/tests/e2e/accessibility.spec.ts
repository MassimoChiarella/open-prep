import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const representativeRoutes: Array<{
  heading: string;
  name: string;
  path: string;
  ready: (page: Page) => Locator;
}> = [
  {
    heading: "Dashboard",
    name: "Dashboard empty state",
    path: "/",
    ready: (page) => page.getByTestId("first-run-quick-starts")
  },
  {
    heading: "Drill Selection",
    name: "Drill settings",
    path: "/drills",
    ready: (page) => page.getByRole("link", { name: "Start Selected Drill" })
  },
  {
    heading: "Active Drill Session",
    name: "Drill session",
    path: "/drills/session?categories=arithmetic&tags=addition&count=1&feedbackMode=instant",
    ready: (page) => page.getByLabel("Answer", { exact: true })
  },
  {
    heading: "Session Summary",
    name: "Drill summary empty state",
    path: "/drills/summary",
    ready: (page) => page.getByRole("link", { name: "Start Another Drill" })
  },
  {
    heading: "Progress Dashboard",
    name: "Progress empty state",
    path: "/progress",
    ready: (page) => page.getByRole("link", { name: "Start Baseline Drill" })
  },
  {
    heading: "Local App Settings",
    name: "Settings",
    path: "/settings",
    ready: (page) => page.locator("summary").filter({ hasText: "Content Packs" })
  },
  {
    heading: "Benchmark your performance",
    name: "Benchmark empty history",
    path: "/benchmark",
    ready: (page) => page.getByRole("link", { name: "Begin Benchmark" }).first()
  },
  {
    heading: "Exhibit Drills",
    name: "Exhibit practice",
    path: "/exhibits",
    ready: (page) => page.getByRole("button", { name: "Submit Answer" })
  },
  {
    heading: "Case Practice",
    name: "Cases",
    path: "/case-practice",
    ready: (page) => page.getByRole("link", { name: "Build Prep Plan" })
  },
  {
    heading: "Guided Market Sizing",
    name: "Market sizing",
    path: "/market-sizing",
    ready: (page) => page.getByRole("button", { name: "Continue to Calculation" })
  },
  {
    heading: "Download authoring resources",
    name: "Downloads",
    path: "/content-packs/downloads",
    ready: (page) => page.getByRole("link", { name: "Back to Settings" })
  },
  {
    heading: "Page not found",
    name: "Not found",
    path: "/missing-accessibility-route",
    ready: (page) => page.getByRole("link", { name: "Back to Dashboard" })
  }
];

test.describe("representative route accessibility", () => {
  for (const route of representativeRoutes) {
    test(`${route.name} has no serious or critical axe violations`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(route.path);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      await expect(route.ready(page)).toBeVisible();

      const results = await new AxeBuilder({ page })
        .options({ resultTypes: ["violations"] })
        .analyze();
      const diagnostics = results.violations
        .filter(({ impact }) => impact === "serious" || impact === "critical")
        .flatMap((violation) => violation.nodes.map((node) => ({
          help: violation.help,
          helpUrl: violation.helpUrl,
          impact: violation.impact,
          rule: violation.id,
          summary: node.failureSummary,
          target: JSON.stringify(node.target)
        })));

      expect(diagnostics, `${route.name} (${route.path}) accessibility violations`).toEqual([]);
    });
  }
});
