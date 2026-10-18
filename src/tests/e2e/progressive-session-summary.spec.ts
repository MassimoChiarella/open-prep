import { expect, test, type Page } from "@playwright/test";

import { createStoredDrillSession, createStoredUserResponses } from "@/features/drills/drillPersistence";
import { appDatabaseName } from "@/lib/storage/appStorageTypes";
import { completedSession } from "@/tests/fixtures/completedSession";

test("saved results are usable before lifetime enrichment, then receive personal bests and the exact benchmark repeat", { tag: "@browser-smoke" }, async ({ page }) => {
  const { session, questions, benchmarkId } = await prepareSummary(page);
  await page.goto(`/drills/summary/?id=${encodeURIComponent(session.id)}`);
  const loading = page.getByRole("status").filter({ hasText: "Loading personal-best history and repeat option..." });
  await expect(page.getByTestId("session-summary-score-panel")).toContainText(`${session.score!.totalScore} pts`);
  await expect(page.getByRole("heading", { name: "Question Review", exact: true })).toBeVisible();
  await expect(loading).toBeVisible();
  await expect(page.getByRole("button", { name: "Loading repeat option...", exact: true })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Repeat Drill", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Adjust Settings", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View Progress", exact: true })).toBeVisible();
  const solution = page.locator("details").filter({ has: page.locator("summary").filter({ hasText: "Worked solution" }) });
  await solution.locator("summary").click();
  await expect(solution).toHaveAttribute("open", "");
  await expect(solution.getByText(questions[0].explanation.short, { exact: true }).first()).toBeVisible();
  await releaseSummary(page);
  await expect(loading).toHaveCount(0);
  await expect(page.getByTestId("session-summary-new-bests")).toContainText("Best benchmark score");
  const repeat = page.getByRole("link", { name: "Repeat Benchmark", exact: true });
  await expect(repeat).toBeVisible();
  const url = new URL((await repeat.getAttribute("href"))!, page.url());
  expect(url.pathname).toBe("/benchmark/");
  expect(url.searchParams.get("benchmark")).toBe(benchmarkId);
  expect(url.searchParams.get("pack")).toBe("progressive-pack");
});

test("a silent native reset prevents a held final worker response from retaining old session results", { tag: "@browser-smoke" }, async ({ page }) => {
  const { session } = await prepareSummary(page);
  await page.goto(`/drills/summary/?id=${encodeURIComponent(session.id)}`);
  await expect(page.getByRole("heading", { name: "Session Results", exact: true })).toBeVisible();
  await page.waitForFunction(() => "releaseStoredSummary" in window);
  // Bypass notification transport to exercise the independent generation barrier.
  await page.evaluate((name) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(["_coordination", "drill_sessions"], "readwrite");
      const coordination = transaction.objectStore("_coordination");
      const lifecycle = coordination.get("lifecycle");
      lifecycle.onsuccess = () => coordination.put({ id: "lifecycle", generation: (lifecycle.result?.generation ?? 0) + 1 });
      transaction.objectStore("drill_sessions").clear();
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  }), appDatabaseName);
  await releaseSummary(page);
  await expect(page.getByRole("heading", { name: "Session summary could not load.", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Session Results", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Repeat Benchmark", exact: true })).toHaveCount(0);
});

async function prepareSummary(page: Page) {
  await page.addInitScript(() => {
    window.Worker = new Proxy(window.Worker, {
      construct(Target, args) {
        const worker: Worker = Reflect.construct(Target, args);
        if (args[1]?.name === "progress-summary") {
          let storedSession = false;
          let released = false;
          const post = worker.postMessage.bind(worker);
          worker.postMessage = (message: unknown) => {
            storedSession = typeof message === "object" && message !== null && "operation" in message && message.operation === "stored_session";
            post(message);
          };
          worker.addEventListener("message", (event: MessageEvent) => {
            if (!storedSession || released || event.data.status !== "loaded") return;
            event.stopImmediatePropagation();
            Object.assign(window, { releaseStoredSummary: () => {
              released = true;
              worker.dispatchEvent(new MessageEvent("message", { data: event.data }));
            } });
          });
        }
        return worker;
      }
    });
  });
  await page.goto("/settings/");
  await expect(page.getByText(/Built-in defaults initialize Drill Selection/)).toBeVisible();
  const completed = completedSession("progressive-native");
  const session = createStoredDrillSession(completed.session, completed.questions);
  const responses = createStoredUserResponses(completed.session, completed.questions);
  const benchmarkId = "question-pack:progressive-pack:version:1.0:benchmark:check";
  const result = {
    id: "progressive-benchmark-result", benchmarkId, completedAt: session.endedAt!,
    difficulty: session.settings.difficulty, score: session.score!, sessionId: session.id
  };
  await page.evaluate(({ name, session, responses, result }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(["drill_sessions", "responses", "benchmark_results"], "readwrite");
      transaction.objectStore("drill_sessions").put(session);
      for (const response of responses) transaction.objectStore("responses").put(response);
      transaction.objectStore("benchmark_results").put(result);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  }), { name: appDatabaseName, session, responses, result });
  return { ...completed, session, benchmarkId };
}

async function releaseSummary(page: Page) {
  await page.waitForFunction(() => "releaseStoredSummary" in window);
  await page.evaluate(() => {
    if (!("releaseStoredSummary" in window) || typeof window.releaseStoredSummary !== "function") throw new Error("Held session summary is unavailable.");
    window.releaseStoredSummary();
  });
}
