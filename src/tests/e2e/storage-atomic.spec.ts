import { resolve } from "node:path";
import { build } from "esbuild";
import { expect, test, type Page } from "@playwright/test";
import type * as StorageTestApi from "../fixtures/storageAtomicEntry";

declare global { interface Window { storageTestApi: typeof StorageTestApi } }

let bundle: string;
test.beforeAll(async () => {
  // Exercise the production adapter directly in real engines, without a test API in the app bundle.
  const result = await build({
    entryPoints: [resolve("src/tests/fixtures/storageAtomicEntry.ts")], bundle: true, write: false,
    format: "iife", globalName: "storageTestApi", platform: "browser", tsconfig: resolve("tsconfig.json")
  });
  bundle = result.outputFiles[0].text;
});

async function prepare(page: Page) {
  await page.route("**/storage-atomic-test", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Storage transaction test</title>" }));
  await page.goto("/storage-atomic-test");
  await page.addScriptTag({ content: bundle });
}

test("@browser-smoke rejects stale tabs and serializes completion in native IndexedDB", async ({ context, page }) => {
  await prepare(page);
  const second = await context.newPage();
  await prepare(second);
  const fixture = await page.evaluate(async () => {
    const api = window.storageTestApi;
    const created = api.createDrillSession({ seed: "atomic-browser", settings: { questionCount: 1 } });
    const storage = api.createIndexedDbAppStorage();
    const token = await api.persistInProgressDrillSession({ ...created, draftKey: "shared", storage });
    const answered = api.submitAnswer({ ...created, question: created.questions[0], rawInput: String(created.questions[0].answer.value), timeTakenSeconds: 1 });
    const complete = api.completeDrillSession({ session: answered.session, questions: created.questions });
    storage.close();
    return { created, complete, token };
  });
  await second.evaluate(async ({ created }) => {
    const storage = window.storageTestApi.createIndexedDbAppStorage();
    await storage.getDrillSession(created.session.id);
    storage.close();
  }, fixture);
  const completions = await Promise.all([page, second].map((tab) => tab.evaluate(async ({ created, complete, token }) => {
    const api = window.storageTestApi;
    const storage = api.createIndexedDbAppStorage();
    try { return await api.persistCompletedDrillSession({ session: complete, questions: created.questions, expectedToken: token, benchmarkId: "baseline_beginner", storage }); }
    finally { storage.close(); }
  }, fixture)));
  expect(completions[0]).toEqual(completions[1]);
  const stale = await second.evaluate(async ({ created, token }) => {
    const api = window.storageTestApi;
    const storage = api.createIndexedDbAppStorage();
    try {
      await api.persistInProgressDrillSession({ ...created, draftKey: "shared", expectedToken: token, storage });
      return "unexpected success";
    } catch (error) { return (error as { reason?: string }).reason; }
    finally { storage.close(); }
  }, fixture);
  expect(stale).toBe("session");
  const saved = await page.evaluate(async () => {
    const storage = window.storageTestApi.createIndexedDbAppStorage();
    const snapshot = await storage.getSnapshot(["drill_sessions", "responses", "benchmark_results"]);
    storage.close();
    return snapshot;
  });
  expect(saved.drill_sessions[0].score?.correctCount).toBe(1);
  expect(saved.responses).toHaveLength(1);
  expect(saved.benchmark_results).toHaveLength(1);
});

test("@browser-smoke a reset blocks fresh stale-page adapters without notifications and permits explicit recovery", async ({ context, page }) => {
  await prepare(page);
  const second = await context.newPage();
  await prepare(second);
  await second.evaluate(async () => { const storage = window.storageTestApi.createIndexedDbAppStorage(); await storage.getGeneration(); storage.close(); });
  await page.evaluate(async () => { const storage = window.storageTestApi.createIndexedDbAppStorage(); await storage.clearAll(); storage.close(); });
  const outcome = await second.evaluate(async () => {
    const api = window.storageTestApi;
    const storage = api.createIndexedDbAppStorage();
    const created = api.createDrillSession({ seed: "explicit-fork", settings: { questionCount: 1 } });
    let blocked: string | undefined;
    try { await api.persistInProgressDrillSession({ ...created, draftKey: "old-work", storage }); }
    catch (error) { blocked = (error as { reason?: string }).reason; }
    const freshToken = (await storage.getDrillSession(created.session.id)).token;
    const savedToken = await api.persistInProgressDrillSession({ ...created, draftKey: "explicit-fork", expectedToken: freshToken, storage });
    const defaultGeneration = await storage.getGeneration();
    storage.close();
    return { blocked, defaultGeneration, savedToken };
  });
  expect(outcome.blocked).toBe("generation");
  expect(outcome.defaultGeneration).toBe(0);
  expect(outcome.savedToken).toEqual({ generation: 1, revision: 1, exists: true });
});

test("@browser-smoke native atomic callback failures roll back writes and generation", async ({ page }) => {
  await prepare(page);
  const outcome = await page.evaluate(async () => {
    const storage = window.storageTestApi.createIndexedDbAppStorage();
    let rejected = false;
    try {
      await storage.atomic({ stores: ["market_sizing_attempts"], advanceGeneration: true }, () => ({
        operations: [
          { storeName: "market_sizing_attempts", type: "put", value: { id: "must-roll-back", templateId: "template", startedAt: new Date().toISOString() } },
          // A later undeclared store must abort the already-enqueued first put.
          { storeName: "responses", type: "clear" }
        ], result: undefined
      }));
    } catch { rejected = true; }
    const rows = await storage.getAll("market_sizing_attempts");
    const token = (await storage.getDrillSession("missing")).token;
    storage.close();
    return { rejected, rows, token };
  });
  expect(outcome).toEqual({ rejected: true, rows: [], token: { generation: 0, revision: 0, exists: false } });
});
