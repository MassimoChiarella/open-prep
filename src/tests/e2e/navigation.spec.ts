import { expect, test, type Locator, type Page } from "@playwright/test";

import { benchmarkTests } from "../../data/questionBank/benchmarkTests";
import { brightCartFullCase } from "../../data/casePractice/fullCaseSimulations";
import type { Question } from "../../lib/domain";
import {
  appDatabaseName,
  appDatabaseVersion,
  type AppStoreName
} from "../../lib/storage/appStorageTypes";

test("core routes expose distinct document titles", async ({ page }) => {
  const routes = [
    ["/", "Dashboard"],
    ["/drills", "Drills"],
    ["/formulas", "Formula Library"],
    ["/progress", "Progress"],
    ["/benchmark", "Benchmark"],
    ["/market-sizing", "Market Sizing"],
    ["/exhibits", "Exhibit Practice"],
    ["/case-practice", "Case Practice"],
    ["/content-packs?view=discover", "Content Packs"],
    ["/settings", "Settings"],
    ["/content-packs/downloads", "Content Pack Downloads"],
    ["/missing-release-route", "Page Not Found"]
  ] as const;
  const titles: string[] = [];

  for (const [path, title] of routes) {
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} | Open Prep`);
    titles.push(await page.title());
  }

  expect(new Set(titles).size).toBe(routes.length);
});

test("new dashboard offers keyboard-reachable starting intents at 320px and in RTL", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 320 });
  await page.goto("/");

  const firstRun = page.getByTestId("first-run-choices");
  const choices = [
    ["Build my prep plan", "/case-practice/plan/"],
    ["Take a baseline", "/benchmark/"],
    ["Practice a specific skill", "/case-practice/"],
    ["Find or create a content pack", "/content-packs/?view=discover"]
  ] as const;
  const choiceLinks: Locator[] = [];

  await expect(firstRun.getByRole("heading", { name: "Choose how to start" })).toBeVisible();
  await expect(firstRun.locator("ul").getByRole("link")).toHaveCount(4);

  for (const [name, href] of choices) {
    const link = firstRun.getByRole("link", { name });
    await expect(link).toHaveAttribute("href", href);
    choiceLinks.push(link);
  }

  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  for (const link of choiceLinks) {
    await focusByTab(page, link);
  }
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/content-packs\/\?view=discover$/);

  await page.goto("/");
  await page.getByRole("combobox", { name: "Language" }).selectOption("ar");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByTestId("first-run-choices")).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test("routes expose their primary workflow action", { tag: "@browser-smoke" }, async ({ page }) => {
  const routes = [
    { action: "Start Practice", heading: "Dashboard", path: "/", role: "link" },
    { action: "Start Drill", heading: "Drill Selection", path: "/drills", role: "link" },
    {
      action: "Submit",
      heading: "Active Drill Session",
      path: "/drills/session?categories=arithmetic&tags=addition&count=1",
      role: "button"
    },
    { action: "Start Another Drill", heading: "Session Summary", path: "/drills/summary", role: "link" },
    { action: "Start Formula Drill", heading: "Formula Library", path: "/formulas", role: "link" },
    { action: "Start Baseline Drill", heading: "Progress Dashboard", path: "/progress", role: "link" },
    { action: "Begin Benchmark", heading: "Benchmark your performance", path: "/benchmark", role: "link" },
    {
      action: "Submit",
      heading: "Beginner Benchmark",
      path: "/benchmark/session?benchmark=beginner",
      role: "button"
    },
    { action: "Continue to Calculation", heading: "Guided Market Sizing", path: "/market-sizing", role: "button" },
    { action: "Submit Answer", heading: "Exhibit Drills", path: "/exhibits", role: "button" },
    { action: "Build Prep Plan", heading: "Case Practice", path: "/case-practice", role: "link" },
    {
      action: "Score Questions",
      heading: "Questioning practice",
      path: "/case-practice/questioning",
      role: "button"
    },
    {
      action: "Score Structure",
      heading: "Case structuring",
      path: "/case-practice/structuring",
      role: "button"
    },
    {
      action: "Score and Save",
      heading: "Structured Brainstorming",
      path: "/case-practice/brainstorming",
      role: "button"
    },
    {
      action: "Score Response",
      heading: "Synthesis and Recommendation",
      path: "/case-practice/synthesis",
      role: "button"
    },
    {
      action: "Check Answer",
      heading: "Concept Lessons",
      path: "/case-practice/lessons",
      role: "button"
    },
    {
      action: "Save Story",
      heading: "Fit and Behavioral Practice",
      path: "/case-practice/fit",
      role: "button"
    },
    {
      action: "Save Profile",
      heading: "Weekly Prep Plan",
      path: "/case-practice/plan",
      role: "button"
    },
    {
      action: "Continue to Structure",
      heading: "Full Case Simulation",
      path: "/case-practice/simulation",
      role: "button"
    },
    { action: "Open Drill Setup", heading: "Local App Settings", path: "/settings", role: "link" },
    { action: "Import", heading: "Content Packs", path: "/content-packs?view=discover", role: "link" },
    {
      action: "Back to Content Packs",
      heading: "Download authoring resources",
      path: "/content-packs/downloads",
      role: "link"
    },
    { action: "Back to Dashboard", heading: "Page not found", path: "/missing-smoke-route", role: "link" }
  ] as const;

  for (const route of routes) {
    await page.goto(route.path);
    await expect(page.locator("main"), route.path).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1, name: route.heading }), route.path).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary navigation" }), route.path).toBeVisible();
    expect(
      await page.locator("[id]").evaluateAll((elements) => {
        const ids = elements.map((element) => element.id);
        return ids.filter((id, index) => ids.indexOf(id) !== index);
      }),
      route.path
    ).toEqual([]);

    const action = route.role === "button"
      ? page.getByRole("button", { name: route.action })
      : page.getByRole("link", { name: route.action });

    await expect(action.first(), route.path).toBeVisible();
  }
});

test("mobile More opens Content Packs and preserves its active state", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  await navigation.getByText("More", { exact: true }).click();
  const contentPacks = navigation.getByRole("link", { name: "Content Packs" }).first();
  await expect(contentPacks).toBeVisible();
  await contentPacks.click();

  await expect(page).toHaveURL(/\/content-packs\/?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Content Packs" })).toBeVisible();
  await expect(page.getByLabel("More destinations: Content Packs")).toBeVisible();
});

test("bordered exercise group titles stay inside their cards", async ({ page }) => {
  const scenarios = [
    { groupName: "Revenue and assortment", path: "/case-practice/brainstorming" },
    { groupName: "Answer-first recommendation", path: "/case-practice/synthesis" }
  ] as const;

  for (const width of [320, 1280]) {
    await page.setViewportSize({ height: 900, width });

    for (const scenario of scenarios) {
      await page.goto(scenario.path);

      const group = page.getByRole("group", { name: scenario.groupName });
      const panel = group.locator("xpath=..");
      const [legendBox, panelBox] = await Promise.all([
        group.locator("legend").boundingBox(),
        panel.boundingBox()
      ]);

      if (legendBox === null || panelBox === null) {
        throw new Error(`Could not measure the ${scenario.groupName} exercise card.`);
      }

      expect(legendBox.x).toBeGreaterThanOrEqual(panelBox.x);
      expect(legendBox.y).toBeGreaterThanOrEqual(panelBox.y);
      expect(legendBox.x + legendBox.width).toBeLessThanOrEqual(panelBox.x + panelBox.width);
      expect(legendBox.y + legendBox.height).toBeLessThanOrEqual(panelBox.y + panelBox.height);
    }
  }
});

test("German benchmark cards stay inside a 320px viewport", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 320 });
  await page.goto("/benchmark");
  await page.getByRole("combobox", { name: "Language" }).selectOption("de");
  await expect(page.getByRole("heading", { name: "Leistung vergleichen" })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("active tasks replace destination navigation with a confirmed exit", async ({ page }) => {
  await page.goto("/drills/session?categories=arithmetic&tags=addition&count=1");

  await expect(page.getByRole("link", { name: "Exit to Drills" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  page.once("dialog", async (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: "Exit to Drills" }).click();
  await expect(page).toHaveURL(/\/drills\/session/);

  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("link", { name: "Exit to Drills" }).click();
  await expect(page).toHaveURL(/\/drills\/?$/);
});

test("mobile shell keeps content and task exits near the first viewport", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");

  const defaultHeader = await page.getByRole("banner").boundingBox();
  const dashboardHeading = await page.getByRole("heading", { level: 1, name: "Dashboard" }).boundingBox();

  expect(defaultHeader?.height).toBeLessThanOrEqual(140);
  expect(dashboardHeading?.y).toBeLessThanOrEqual(240);

  await page.goto("/drills/session?categories=arithmetic&tags=addition&count=1");

  const taskHeader = await page.getByRole("banner").boundingBox();

  expect(taskHeader?.height).toBeLessThanOrEqual(140);
  await expect(page.getByRole("link", { name: "Exit to Drills" })).toBeVisible();
});

test("keyboard entry exposes the skip link and moves focus to main content", { tag: "@browser-smoke" }, async ({ browserName, page }) => {
  await page.goto("/");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  if (browserName === "webkit") {
    await skipLink.focus();
  } else {
    await focusByTab(page, skipLink);
  }
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("named drill modes launch with their dedicated behavior", async ({ page }) => {
  await page.goto("/drills");
  await page.getByRole("link", { name: /Quick Fire/ }).click();
  await expect(page.getByRole("heading", { name: "Quick Fire" })).toBeVisible();
  await expect(page.getByTestId("active-session-progress")).toContainText("0 answered / 10 left");
  await expect(page.getByTestId("active-session-timer")).toContainText("Per-question timer");

  await page.goto("/drills");
  await page.getByRole("link", { name: /Accuracy Mode/ }).click();
  await expect(page.getByRole("heading", { name: "Accuracy Mode" })).toBeVisible();
  await expect(page.getByTestId("active-session-timer")).toContainText("Untimed");
  await expect(page.getByRole("button", { name: "Show hint" })).toBeVisible();
});

test("case drill controls launch the requested Interview Math format", async ({ page }) => {
  await page.goto("/drills");
  await page.getByLabel("Case-style mixed").check();
  await page.getByLabel("Arithmetic", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Expert", exact: true }).click();
  await page.getByTestId("drill-case-options").locator("summary").click();
  await page.getByLabel("Industry").selectOption("healthcare");
  await page.getByLabel("Calculation steps").selectOption("6");
  await page.getByLabel("Require equation setup").uncheck();
  await page.getByLabel("Require final interpretation").check();
  await page.getByRole("link", { name: "Start Selected Drill" }).click();

  await expect(page).toHaveURL(/caseIndustry=healthcare/);
  await expect(page).toHaveURL(/caseSteps=6/);
  await expect(page).toHaveURL(/requireEquation=0/);
  await expect(page).toHaveURL(/requireInterpretation=1/);
  await expect(page.getByRole("heading", { level: 1, name: "Interview Math" })).toBeVisible();
  await expect(page.getByText("1. Equation setup (optional)")).toBeVisible();
  await expect(page.getByText("3. Interpretation (required)")).toBeVisible();
  await expect(page.getByTestId("active-question-prompt")).toContainText("clinics");
});

test("formula library filters and opens a related drill", async ({ page }) => {
  await page.goto("/formulas");
  await page.getByLabel("Formula category").selectOption("growth_compounding");

  await expect(page.getByRole("heading", { name: "CAGR" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Revenue", exact: true })).toHaveCount(0);

  await page.getByLabel("Search formulas").fill("breakeven");
  await expect(page.getByTestId("formula-no-results")).toBeVisible();
  await page.getByRole("button", { name: "Reset Formula Filters" }).click();
  await page.getByLabel("Search formulas").fill("breakeven");
  await page.getByTestId("formula-card-breakeven_volume").getByRole("link", { name: "Start Related Drill" }).click();

  await expect(page.getByRole("heading", { name: "Active Drill Session" })).toBeVisible();
  await expect(page.getByText("Question 1 of 5")).toBeVisible();
});

test("exhibit drills render local data and persist an answer", { tag: "@browser-smoke" }, async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/exhibits");

  const tableRegion = page.getByRole("region", { name: /Scrollable exhibit table/ });
  const table = tableRegion.getByRole("table");
  await expect.poll(() => table.locator("tbody tr").count()).toBeGreaterThan(0);
  const rowCount = await table.locator("tbody tr").count();
  await expect(table.locator("thead th:not([scope='col'])")).toHaveCount(0);
  await expect(table.locator("tbody tr > th[scope='row']")).toHaveCount(rowCount);
  await tableRegion.focus();
  await expect(tableRegion).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => tableRegion.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  await expect(page.getByTestId("exhibit-table-cell-downtown_flagship-average_revenue")).toHaveText("$12.5M");
  await page.getByLabel("Answer", { exact: true }).fill("$48.4M");
  await page.getByRole("button", { name: "Submit Answer" }).click();
  await expect(page.getByText("Correct. Attempt saved on this device.")).toBeVisible();

  expect(await readStore(page, "exhibit_attempts")).toEqual([
    expect.objectContaining({
      exhibitId: "exhibit_retail_formats_001",
      isCorrect: true,
      questionId: "suburban_gross_profit",
      score: 100
    })
  ]);

  await page.getByTestId("exhibit-select").selectOption("exhibit_saas_segments_001");
  await expect(page.getByTestId("exhibit-chart-canvas-exhibit_saas_segments_001").locator("svg")).toBeVisible();
  await expect(page.getByTestId("exhibit-chart-legend")).toContainText("Recurring revenue");
});

test("market sizing scores and persists a complete draft", async ({ page }) => {
  await page.goto("/market-sizing");
  await fillCompleteMarketSizingDraft(page);

  await page.getByRole("button", { name: "Score Draft" }).click();
  await expect(page.getByText("Score 100/100 saved on this device.")).toBeVisible();
  await expect(page.getByTestId("market-sizing-score-summary")).toContainText("100% complete");

  expect(await readStore(page, "market_sizing_attempts")).toEqual([
    expect.objectContaining({
      calculatedValue: 2_628_000_000,
      score: 100,
      templateId: "market_coffee_city_001"
    })
  ]);
});

test("full case composes every case skill and saves one integrated result", async ({ page }) => {
  await page.goto("/case-practice/simulation");

  const questioning = brightCartFullCase.questioning;
  if (questioning === undefined) throw new Error("Missing full-case questioning prompt.");
  const questions = [
    "What success target must the expansion reach by next quarter?",
    "Which cities and customer segments are in scope?",
    "How do customer adoption and order volume differ by city?",
    "What are contribution and break-even economics in each market?",
    "Can courier capacity sustain reliable on-time delivery?"
  ];
  for (let index = questioning.minimumQuestions; index < questions.length; index += 1) {
    await page.getByRole("button", { name: "Add Question" }).click();
  }
  const questionInputs = page.getByPlaceholder("Type a question you would ask the interviewer");
  for (const [index, question] of questions.entries()) {
    await questionInputs.nth(index).fill(question);
  }
  await page.getByRole("button", { name: "Continue to Structure" }).click();

  const structure = brightCartFullCase.structure;
  const hypothesis = structure.hypotheses.find(
    (candidate) => candidate.id === structure.acceptedHypothesisId
  );

  if (hypothesis === undefined) throw new Error("Missing accepted full-case hypothesis.");
  await page.getByLabel(hypothesis.label).check();

  for (const modelBranch of structure.modelStructure) {
    const branch = structure.branchOptions.find((candidate) => candidate.id === modelBranch.branchId);
    if (branch === undefined) throw new Error(`Missing full-case branch: ${modelBranch.branchId}`);
    await page.getByLabel(branch.label, { exact: false }).check();
  }

  await page.getByRole("button", { name: "Continue to Exhibit and math" }).click();
  await page.getByLabel("Your answer (Currency)").fill("$120K");
  await page.getByRole("button", { name: "Continue to Brainstorm" }).click();

  const relevantIdeas = brightCartFullCase.brainstorming.themes.flatMap((theme) =>
    theme.ideas.filter((idea) => idea.relevant)
  );
  for (const idea of relevantIdeas) {
    await page.getByLabel(`Include ${idea.label}`, { exact: true }).check();
  }
  for (const ideaId of brightCartFullCase.brainstorming.priorityIdeaIds) {
    const idea = relevantIdeas.find((candidate) => candidate.id === ideaId);
    if (idea === undefined) throw new Error(`Missing full-case priority idea: ${ideaId}`);
    await page.getByLabel(`Prioritize ${idea.label}`, { exact: true }).check();
  }

  await page.getByRole("button", { name: "Continue to Synthesize" }).click();
  for (const [dimension, optionId] of Object.entries(brightCartFullCase.synthesis.correctResponse)) {
    const option = brightCartFullCase.synthesis.options[
      dimension as keyof typeof brightCartFullCase.synthesis.options
    ].find((candidate) => candidate.id === optionId);
    if (option === undefined) throw new Error(`Missing full-case synthesis option: ${optionId}`);
    await page.getByRole("radio", { name: option.label }).check();
  }

  await page.getByRole("button", { name: "Complete Case" }).click();
  await expect(page.getByTestId("full-case-total-score")).toHaveText("100 / 100");
  await expect(page.getByText("This full-case result is available to your local preparation roadmap.")).toBeVisible();
  expect(await readStore(page, "practice_records")).toEqual([
    expect.objectContaining({ itemId: brightCartFullCase.id, maxScore: 100, module: "full_case", score: 100 })
  ]);

  await page.goto("/");
  await page.reload();

  const coverage = page.getByTestId("whole-product-activity");
  const caseCoverage = coverage.getByText("Case practice", { exact: true }).locator("..");
  const recentActivity = page.getByTestId("whole-product-recent-activity");

  await expect(coverage).toBeVisible();
  await expect(page.getByTestId("first-run-choices")).toHaveCount(0);
  await expect(caseCoverage).toContainText("1");
  await expect(caseCoverage).toContainText("1 skill practiced");
  await expect(recentActivity.getByRole("link", { name: /Full case/ })).toHaveAttribute(
    "href",
    "/case-practice/simulation/"
  );
});

test("beginner benchmark completes and appears in local history", async ({ page }) => {
  const benchmark = benchmarkTests.find((item) => item.id === "beginner");

  if (benchmark === undefined) {
    throw new Error("Missing beginner benchmark.");
  }

  await page.goto("/benchmark/session?benchmark=beginner");

  for (const [index, question] of benchmark.questions.entries()) {
    await expect(page.getByText(`Question ${index + 1} of ${benchmark.questions.length}`)).toBeVisible();
    await page.getByLabel("Answer", { exact: true }).fill(formatQuestionAnswer(question));
    await page.getByRole("button", { name: "Submit" }).click();
  }

  await expect(page.getByText("Session saved on this device.")).toBeVisible();
  expect(await readStore(page, "benchmark_results")).toEqual([
    expect.objectContaining({
      benchmarkId: "beginner",
      score: expect.objectContaining({ correctCount: 20, incorrectCount: 0 })
    })
  ]);

  await page.goto("/benchmark");
  await expect(page.getByTestId("benchmark-history")).toContainText("1 saved");
});

test("a warmed drill loads and saves while offline", { tag: "@browser-smoke" }, async ({ browserName, page }) => {
  await page.goto("/");

  await expect.poll(
    () => page.evaluate(async () => (await navigator.serviceWorker.getRegistration("/")) !== undefined),
    { timeout: 10_000 }
  ).toBe(true);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();

  const drillPath = "/drills/session?categories=arithmetic&tags=addition&count=1";
  await page.goto(drillPath);
  const prompt = await page.getByTestId("active-question-prompt").textContent();
  const answer = solveAdditionPrompt(prompt ?? "");

  await page.context().setOffline(true);

  try {
    if (browserName === "webkit") {
      await expect(readCachedStatus(page, "/drills/session/")).resolves.toBe(200);
    } else {
      await page.reload();
    }
    await expect(page.getByTestId("offline-status-indicator")).toHaveText("Offline ready");
    await page.getByLabel("Answer", { exact: true }).fill(String(answer));
    await page.getByRole("button", { name: "Submit" }).click();
    await page.getByRole("button", { name: "View summary" }).click();
    await expect(page.getByText("Session saved on this device.")).toBeVisible();
    await expect(readStore(page, "drill_sessions")).resolves.toHaveLength(1);
  } finally {
    await page.context().setOffline(false);
  }
});

test("a selected locale remains available while offline", { tag: "@browser-smoke" }, async ({ browserName, page }) => {
  await page.goto("/");
  await expect.poll(
    () => page.evaluate(async () => (await navigator.serviceWorker.getRegistration("/")) !== undefined),
    { timeout: 10_000 }
  ).toBe(true);
  await page.evaluate(async () => navigator.serviceWorker.ready.then(() => undefined));

  await page.getByRole("combobox", { name: "Language" }).selectOption("es");
  await expect(page.getByRole("combobox", { name: "Idioma" })).toHaveValue("es");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Idioma" })).toHaveValue("es");

  await page.context().setOffline(true);
  try {
    if (browserName === "webkit") {
      await expect(readCachedStatus(page, "/")).resolves.toBe(200);
    } else {
      await page.reload();
    }
    await expect(page.getByRole("combobox", { name: "Idioma" })).toHaveValue("es");
    await expect(page.getByTestId("offline-status-indicator")).toHaveText("Listo sin conexión");
  } finally {
    await page.context().setOffline(false);
  }
});

function solveAdditionPrompt(prompt: string): number {
  const match = prompt.match(/^What is (?<left>\d+) \+ (?<right>\d+)\?$/);

  if (match?.groups === undefined) {
    throw new Error(`Unexpected generated prompt: ${prompt}`);
  }

  return Number(match.groups.left) + Number(match.groups.right);
}

async function focusByTab(page: Page, target: Locator): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }

  await expect(target).toBeFocused();
}

function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

function readCachedStatus(page: Page, pathname: string): Promise<number | undefined> {
  return page.evaluate(async (path) => {
    const cacheName = (await caches.keys()).find(
      (name) => name.startsWith("math-drill-offline-") && name.endsWith(":static")
    );
    if (cacheName === undefined) return undefined;
    return (await (await caches.open(cacheName)).match(path))?.status;
  }, pathname);
}

async function fillCompleteMarketSizingDraft(page: Page): Promise<void> {
  await page.getByLabel("Population").fill("3000000");
  await page.getByLabel("Percent who buy prepared coffee").fill("60%");
  await page.getByLabel("Purchased cups per drinker per day").fill("1");
  await page.getByLabel("Purchase days per year").fill("365");
  await page.getByLabel("Average price per cup").fill("$4");
  await page.getByLabel("Sense-check completed").check();
  await page.getByRole("button", { name: "Continue to Calculation" }).click();
  await expect(page.getByTestId("market-sizing-calculation")).not.toContainText("$2,628,000,000");
  await page.getByRole("button", { name: "Continue to Final Answer" }).click();
  await page.getByLabel("Final answer (Currency)").fill("$2.628B");
  await expect(page.getByTestId("market-sizing-final-answer-status")).toHaveCount(0);
  await page.getByRole("button", { name: "Submit Answer" }).click();
  await expect(page.getByTestId("market-sizing-review-result")).toContainText(
    "$2,628,000,000"
  );
  await expect(page.getByTestId("market-sizing-review-result")).toContainText(
    "Final answer matches the calculated result."
  );
  await page.getByLabel("Interpretation").selectOption("plausible");
}

function formatQuestionAnswer(question: Question): string {
  return String(question.answer.unit === "percentage" ? question.answer.value * 100 : question.answer.value);
}

async function readStore(page: Page, storeName: AppStoreName): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(({ databaseName, name, version }) => {
    return new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      const request = indexedDB.open(databaseName, version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(name, "readonly");
        const storeRequest = transaction.objectStore(name).getAll();

        storeRequest.onsuccess = () => resolve(storeRequest.result as Array<Record<string, unknown>>);
        storeRequest.onerror = () => reject(storeRequest.error);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      };
    });
  }, { databaseName: appDatabaseName, name: storeName, version: appDatabaseVersion });
}
