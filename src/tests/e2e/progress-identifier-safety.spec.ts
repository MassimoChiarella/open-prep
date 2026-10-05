import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { appDatabaseName } from "../../lib/storage/appStorageTypes";
import progressFixture from "../fixtures/storage-history/progress-export-v4.json";

test("historical malformed session IDs retain native history and open usable individual recovery", { tag: "@browser-smoke" }, async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Built-in defaults initialize Drill Selection/)).toBeVisible();
  const malformed = { ...structuredClone(progressFixture.stores.drill_sessions[0]), id: "\ud800", endedAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z" };
  const valid = { ...structuredClone(progressFixture.stores.drill_sessions[0]), id: "valid-session-🚀" };
  const results = [malformed, valid].map((session, index) => ({ ...structuredClone(progressFixture.stores.benchmark_results[0]), id: `result-${index}`, sessionId: session.id }));
  // Today's persistence guard rejects these identifiers. Raw writes model an
  // existing browser record and only run after the app has initialized its DB.
  await page.evaluate(({ name, sessions, results }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      sessions[0].id = results[0].sessionId = String.fromCharCode(0xd800);
      const transaction = database.transaction(["drill_sessions", "benchmark_results"], "readwrite");
      for (const session of sessions) transaction.objectStore("drill_sessions").put(session);
      for (const result of results) transaction.objectStore("benchmark_results").put(result);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  }), { name: appDatabaseName, sessions: [malformed, valid], results });

  for (const route of ["/", "/progress"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const history = page.getByTestId("recent-sessions-table");
    await expect(history.locator("tbody tr")).toHaveCount(2);
    await expect(history.getByRole("link", { name: "View Summary", exact: true })).toHaveAttribute("href", `/drills/summary?id=${encodeURIComponent(valid.id)}`);
    await expect(history.getByRole("link", { name: "Review recovery", exact: true })).toHaveAttribute("href", "/settings#record-recovery");
  }
  await page.goto("/benchmark", { waitUntil: "domcontentloaded" });
  await page.getByTestId("benchmark-history-disclosure").locator(":scope > summary").click();
  const benchmarkHistory = page.getByTestId("benchmark-history-results-table");
  await expect(benchmarkHistory.locator("tbody tr")).toHaveCount(2);
  await expect(benchmarkHistory.getByRole("link", { name: "Review", exact: true })).toHaveAttribute("href", `/drills/summary?id=${encodeURIComponent(valid.id)}`);
  await benchmarkHistory.getByRole("link", { name: "Review recovery", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/?#record-recovery$/);
  await expect(page.getByTestId("settings-local-data")).toHaveAttribute("open", "");
  await expect(page.locator("#record-recovery")).toHaveAttribute("open", "");
  await page.getByRole("button", { name: "Check local records", exact: true }).click();
  await expect(page.locator("#record-recovery")).toContainText("Record has invalid or missing fields.");
  await page.getByRole("button", { name: "Review recovery", exact: true }).click();
  await expect(page.locator("#record-recovery")).toContainText("drill_sessions: 1");
  await expect(page.locator("#record-recovery")).toContainText("benchmark_results: 1");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download original-data archive", exact: true }).click();
  const archive = JSON.parse(await readFile((await (await downloaded).path())!, "utf8")) as { records: Array<{ storeName: string; recordId: string }> };
  expect(archive.records).toHaveLength(2);
  expect(archive.records.find((record) => record.storeName === "drill_sessions")?.recordId).toBe(malformed.id);
  expect(archive.records.some((record) => record.recordId === valid.id)).toBe(false);
  expect(errors).toEqual([]);
});
