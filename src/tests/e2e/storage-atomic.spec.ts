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

test("@browser-smoke native Fit stories reject stale edits, deletes and deleted-story resurrection", async ({ context, page }) => {
  await prepare(page);
  const second = await context.newPage();
  await prepare(second);
  const first = await page.evaluate(async () => {
    const api = window.storageTestApi;
    const storage = api.createIndexedDbAppStorage();
    try {
      const story = api.createFitStoryRecord({ title: "Launch", competency: "leadership", situation: "Delay", task: "Recover", action: "Original", result: "Delivered", reflection: "Align" }, "2026-10-17T12:00:00Z", "imported-story-no-prefix");
      await api.saveFitStory(storage, story);
      return (await api.loadFitStoryBank(storage))[0];
    } finally { storage.close(); }
  });
  const stale = await second.evaluate(async () => {
    const storage = window.storageTestApi.createIndexedDbAppStorage();
    try { return (await window.storageTestApi.loadFitStoryBank(storage))[0]; }
    finally { storage.close(); }
  });
  const saved = await page.evaluate(async ({ story, token }) => {
    const storage = window.storageTestApi.createIndexedDbAppStorage();
    try { return await window.storageTestApi.saveFitStory(storage, { ...story, action: "Newest" }, token); }
    finally { storage.close(); }
  }, first);
  const rejected = await second.evaluate(async ({ story, token }) => {
    const api = window.storageTestApi;
    const storage = api.createIndexedDbAppStorage();
    const reasons = [];
    try {
      for (const action of [() => api.saveFitStory(storage, story, token), () => api.deleteFitStory(storage, story.id, token)]) {
        try { await action(); reasons.push("unexpected success"); }
        catch (error) { reasons.push((error as { reason?: string }).reason); }
      }
      return { reasons, current: await storage.get("practice_records", story.id) };
    } finally { storage.close(); }
  }, stale);
  expect(rejected.reasons).toEqual(["practice", "practice"]);
  expect(rejected.current).toMatchObject({ action: "Newest" });
  await page.evaluate(async ({ id, token }) => {
    const storage = window.storageTestApi.createIndexedDbAppStorage();
    try { await window.storageTestApi.deleteFitStory(storage, id, token); }
    finally { storage.close(); }
  }, { id: first.story.id, token: saved });
  const outcome = await second.evaluate(async ({ story, token }) => {
    const api = window.storageTestApi;
    const storage = api.createIndexedDbAppStorage();
    try {
      let reason;
      try { await api.saveFitStory(storage, story, token); }
      catch (error) { reason = (error as { reason?: string }).reason; }
      return { reason, current: await storage.get("practice_records", story.id), generation: await storage.getGeneration() };
    } finally { storage.close(); }
  }, stale);
  expect(outcome).toEqual({ reason: "practice", current: undefined, generation: 0 });
});

test("@browser-smoke native private drafts reject stale overwrite, deletion and delete/recreate ABA", async ({ context, page }) => {
  await prepare(page);
  const second = await context.newPage();
  await prepare(second);
  const fixture = await page.evaluate(async () => {
    const api = window.storageTestApi;
    const simulation = api.brightCartFullCase;
    const draft = {
      id: api.fullCaseDraftId(simulation.id), simulationId: simulation.id, kind: "full_case_draft" as const,
      contentKey: await api.fullCaseContentKey(simulation), updatedAt: "2026-10-04T00:00:00Z", startedAt: "2026-10-04T00:00:00Z",
      locale: "en", stage: 0, questions: [{ id: "question-1", text: "Original private text" }],
      includeQuestionRanking: false, hypothesisId: "", branchIds: [], calculationInput: "", ideaIds: [], priorityIdeaIds: [], synthesis: {}
    };
    const storage = api.createIndexedDbAppStorage();
    try {
      const absent = (await api.readFullCaseDraft(storage, simulation.id)).token;
      const shared = await api.writeFullCaseDraft(storage, simulation.id, absent, draft);
      return { draft, absent, shared };
    } finally { storage.close(); }
  });
  const captured = await second.evaluate(async ({ draft }) => {
    const storage = window.storageTestApi.createIndexedDbAppStorage();
    try { return await window.storageTestApi.readFullCaseDraft(storage, draft.simulationId); }
    finally { storage.close(); }
  }, fixture);
  expect(captured.token).toEqual(fixture.shared);
  const latest = await page.evaluate(async ({ draft, shared }) => {
    const storage = window.storageTestApi.createIndexedDbAppStorage();
    try { return await window.storageTestApi.writeFullCaseDraft(storage, draft.simulationId, shared, { ...draft, questions: [{ id: "question-1", text: "Newest private text" }] }); }
    finally { storage.close(); }
  }, fixture);
  const conflicts = await second.evaluate(async ({ draft, shared }) => {
    const storage = window.storageTestApi.createIndexedDbAppStorage();
    const reasons: unknown[] = [];
    try {
      for (const value of [draft, undefined]) {
        try { await window.storageTestApi.writeFullCaseDraft(storage, draft.simulationId, shared, value); reasons.push("unexpected success"); }
        catch (error) { reasons.push((error as { reason?: string }).reason); }
      }
      return { reasons, current: await window.storageTestApi.readFullCaseDraft(storage, draft.simulationId) };
    } finally { storage.close(); }
  }, fixture);
  expect(conflicts.reasons).toEqual(["practice", "practice"]);
  expect(conflicts.current.draft).toMatchObject({ questions: [{ id: "question-1", text: "Newest private text" }] });
  const deleted = await page.evaluate(async ({ draft, token }) => {
    const storage = window.storageTestApi.createIndexedDbAppStorage();
    try {
      const deleted = await window.storageTestApi.writeFullCaseDraft(storage, draft.simulationId, token);
      await storage.clear("drill_sessions");
      return deleted;
    } finally { storage.close(); }
  }, { draft: fixture.draft, token: latest });
  const outcome = await second.evaluate(async ({ draft, absent, shared }) => {
    const storage = window.storageTestApi.createIndexedDbAppStorage();
    const reasons: unknown[] = [];
    try {
      for (const token of [absent, shared]) {
        try { await window.storageTestApi.writeFullCaseDraft(storage, draft.simulationId, token, draft); reasons.push("unexpected success"); }
        catch (error) { reasons.push((error as { reason?: string }).reason); }
      }
      return { reasons, current: await window.storageTestApi.readFullCaseDraft(storage, draft.simulationId) };
    } finally { storage.close(); }
  }, fixture);
  expect(outcome.reasons).toEqual(["practice", "practice"]);
  expect(outcome.current).toEqual({ draft: undefined, token: deleted });
});

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
  const originalGeneration = await second.evaluate(async () => {
    const storage = window.storageTestApi.createIndexedDbAppStorage();
    const generation = await storage.getGeneration();
    storage.close();
    return generation;
  });
  expect(originalGeneration).toBe(0);
  // Closing every adapter must not let garbage collection forget the document generation.
  await second.requestGC();
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
  expect(outcome.blocked, JSON.stringify(outcome)).toBe("generation");
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

test("@browser-smoke generation checks and recovery reads need no writes under a quota fault", async ({ page }) => {
  await prepare(page);
  const outcome = await page.evaluate(async () => {
    const storage = window.storageTestApi.createIndexedDbAppStorage();
    const generation = await storage.getGeneration();
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = () => { throw new DOMException("Synthetic write quota fault", "QuotaExceededError"); };
    try {
      const records = await storage.atomic({ stores: [], reads: { drill_sessions: "all" }, expectedGeneration: generation }, (view) => ({ operations: [], result: view.getAll("drill_sessions").length }));
      let writeRejected = false;
      try { await storage.put("market_sizing_attempts", { id: "quota-write", templateId: "sizing", startedAt: new Date().toISOString() }); }
      catch { writeRejected = true; }
      return { records, writeRejected, generation: (await storage.getDrillSession("missing")).token.generation };
    } finally { IDBObjectStore.prototype.put = original; storage.close(); }
  });
  expect(outcome).toEqual({ records: 0, writeRejected: true, generation: 0 });
});

test("large native atomic snapshots and Recovery exceed the function argument limit safely", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Chromium capacity boundary; normal atomic coverage runs in every engine.");
  test.setTimeout(60_000);
  await prepare(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const outcome = await page.evaluate(async () => {
    const api = window.storageTestApi;
    const storage = api.createIndexedDbAppStorage();
    try {
      await storage.getGeneration();
      const created = api.createDrillSession({ seed: "large-atomic", settings: { questionCount: 1 } });
      const response = api.submitAnswer({ ...created, question: created.questions[0], rawInput: String(created.questions[0].answer.value), timeTakenSeconds: 1 }).response;
      const rows = 150_000;
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(api.appDatabaseName);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("responses", "readwrite");
          const store = tx.objectStore("responses");
          let index = 0;
          const enqueue = () => {
            let last: IDBRequest | undefined;
            const end = Math.min(index + 250, rows);
            for (; index < end; index++) last = store.put({ ...response, id: `capacity-${index}`, sessionId: created.session.id });
            if (index < rows && last !== undefined) last.onsuccess = enqueue;
          };
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
          enqueue();
        };
      });
      return {
        count: await storage.count("responses"),
        atomic: await storage.atomic({ stores: [], reads: { responses: "all" } }, (view) => ({ operations: [], result: view.getAll("responses").length })),
        incompatible: (await api.diagnoseLocalRecovery(storage)).length
      };
    } finally { storage.close(); }
  });
  expect(outcome).toEqual({ count: 150_000, atomic: 150_000, incompatible: 0 });
  expect(errors).toEqual([]);
});
