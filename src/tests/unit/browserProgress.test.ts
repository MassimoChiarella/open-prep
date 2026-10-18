import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadBrowserProgressSummary, loadBrowserStoredSessionSummary } from "@/features/progress/browserProgress";
import { createProgressSummary, type ProgressSummary } from "@/features/progress/progressAggregation";
import { publishLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";
import { createSessionSummarySnapshot } from "@/features/drills/sessionSummary";
import { persistCompletedDrillSession } from "@/features/drills/drillPersistence";
import { completedSession } from "@/tests/fixtures/completedSession";

const { createStorage } = vi.hoisted(() => ({ createStorage: vi.fn() }));
vi.mock("@/lib/storage/indexedDbAppStorage", () => ({ createIndexedDbAppStorage: createStorage }));

class TestWorker {
  static instances: TestWorker[] = [];
  onmessage?: (event: MessageEvent) => void;
  onerror?: () => void;
  onmessageerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() { TestWorker.instances.push(this); }
  complete(summary: ProgressSummary, generation = 0) {
    this.onmessage?.({ data: { status: "loaded", generation, summary } } as MessageEvent);
  }
}

describe("background progress loading", () => {
  let storage: MemoryAppStorage;
  beforeEach(() => {
    storage = new MemoryAppStorage();
    createStorage.mockReturnValue(storage);
    TestWorker.instances = [];
    vi.stubGlobal("Worker", TestWorker);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("sends only summary options and releases the worker after success", async () => {
    const read = vi.spyOn(storage, "getSnapshot");
    const options = { now: "2026-09-22T12:00:00.000Z", timeZone: "America/Toronto" };
    const pending = loadBrowserProgressSummary(options);
    const worker = TestWorker.instances[0];
    expect(worker.postMessage).toHaveBeenCalledWith(options);
    const summary = createProgressSummary({ sessions: [], ...options });
    worker.complete(summary);
    await expect(pending).resolves.toEqual(summary);
    expect(worker.terminate).toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });

  it("terminates canceled work and ignores its late result", async () => {
    const abort = new AbortController();
    const pending = loadBrowserProgressSummary({}, abort.signal);
    const failure = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    const worker = TestWorker.instances[0];
    abort.abort();
    worker.complete(createProgressSummary({ sessions: [] }));
    await failure;
    expect(worker.terminate).toHaveBeenCalled();
  });

  it("does not start an already-canceled job", async () => {
    const abort = new AbortController();
    abort.abort();
    await expect(loadBrowserProgressSummary({}, abort.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(TestWorker.instances).toHaveLength(0);
  });

  it("rejects invalidated work even before its worker responds", async () => {
    const pending = loadBrowserProgressSummary();
    const failure = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    publishLocalDataInvalidation("all_data_cleared", { broadcastChannelFactory: null, fallbackStorage: null });
    await failure;
    expect(TestWorker.instances[0].terminate).toHaveBeenCalled();
  });

  it("rejects an obsolete generation even when invalidation transport is unavailable", async () => {
    const pending = loadBrowserProgressSummary();
    const failure = expect(pending).rejects.toThrow(/Local data changed/);
    await storage.clearAll();
    TestWorker.instances[0].complete(createProgressSummary({ sessions: [] }), 0);
    await failure;
  });

  it.each(["onerror", "onmessageerror"] as const)("releases failed workers on %s", async (handler) => {
    const pending = loadBrowserProgressSummary();
    const failure = expect(pending).rejects.toThrow("Local progress is unavailable.");
    TestWorker.instances[0][handler]?.();
    await failure;
    expect(TestWorker.instances[0].terminate).toHaveBeenCalled();
  });

  it("preserves availability in environments without workers", async () => {
    vi.stubGlobal("Worker", undefined);
    const read = vi.spyOn(storage, "getSnapshot");
    await expect(loadBrowserProgressSummary()).resolves.toMatchObject({ isEmpty: true });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("retains local progress when the browser blocks worker creation", async () => {
    vi.stubGlobal("Worker", class { constructor() { throw new Error("Worker disabled"); } });
    await expect(loadBrowserProgressSummary()).resolves.toMatchObject({ isEmpty: true });
  });

  it("loads saved-session display data through the same worker without cloning history into the page", async () => {
    const read = vi.spyOn(storage, "getPage");
    const all = vi.spyOn(storage, "getAll");
    const pending = loadBrowserStoredSessionSummary(createStorage, "selected-session");
    const worker = TestWorker.instances[0];
    expect(worker.postMessage).toHaveBeenCalledWith({ operation: "stored_session", sessionId: "selected-session" });
    const detail = { newBestLabels: ["Best benchmark score"], repeatHref: "/benchmark?benchmark=example" };
    worker.onmessage?.({ data: { status: "loaded", generation: 0, detail } } as MessageEvent);
    await expect(pending).resolves.toEqual(detail);
    expect(read).not.toHaveBeenCalled();
    expect(all).not.toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalled();
  });

  it("rejects a stale saved-session worker result after replacement without transport", async () => {
    const pending = loadBrowserStoredSessionSummary(createStorage, "selected-session");
    const failure = expect(pending).rejects.toThrow(/Local data changed/);
    await storage.clearAll();
    TestWorker.instances[0].onmessage?.({ data: { status: "loaded", generation: 0, detail: { newBestLabels: [] } } } as MessageEvent);
    await failure;
  });

  it("publishes a checked snapshot without settling or releasing the worker, and preserves message order", async () => {
    const completed = completedSession("streamed");
    const snapshot = createSessionSummarySnapshot(completed.session, completed.questions);
    let received!: () => void;
    const snapshotReceived = new Promise<void>((resolve) => { received = resolve; });
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const onSnapshot = vi.fn(async () => { received(); await blocked; });
    const pending = loadBrowserStoredSessionSummary(createStorage, snapshot.id, undefined, onSnapshot);
    let finished = false;
    void pending.then(() => { finished = true; });
    const worker = TestWorker.instances[0];
    worker.onmessage?.({ data: { status: "snapshot", generation: 0, snapshot } } as MessageEvent);
    worker.onmessage?.({ data: { status: "loaded", generation: 0, detail: { snapshot, newBestLabels: ["Best benchmark score"] } } } as MessageEvent);
    await snapshotReceived;
    expect(onSnapshot).toHaveBeenCalledWith(snapshot, 0);
    expect(finished).toBe(false);
    expect(worker.terminate).not.toHaveBeenCalled();
    release();
    await expect(pending).resolves.toMatchObject({ snapshot, newBestLabels: ["Best benchmark score"] });
    expect(worker.terminate).toHaveBeenCalled();
  });

  it("keeps callers without a snapshot listener pending until the complete detail arrives", async () => {
    const completed = completedSession("final-only-caller");
    const snapshot = createSessionSummarySnapshot(completed.session, completed.questions);
    const checked = vi.spyOn(storage, "atomic");
    const pending = loadBrowserStoredSessionSummary(createStorage, snapshot.id);
    let finished = false;
    void pending.then(() => { finished = true; });
    const worker = TestWorker.instances[0];
    worker.onmessage?.({ data: { status: "snapshot", generation: 0, snapshot } } as MessageEvent);
    await vi.waitFor(() => expect(checked).toHaveBeenCalledOnce());
    expect(finished).toBe(false);
    expect(worker.terminate).not.toHaveBeenCalled();
    const detail = { snapshot, newBestLabels: ["Best benchmark score"], repeatHref: "/benchmark?benchmark=example" };
    worker.onmessage?.({ data: { status: "loaded", generation: 0, detail } } as MessageEvent);
    await expect(pending).resolves.toEqual(detail);
  });

  it("does not publish a stale snapshot when generation messaging is unavailable", async () => {
    const onSnapshot = vi.fn();
    const pending = loadBrowserStoredSessionSummary(createStorage, "selected", undefined, onSnapshot);
    const failure = expect(pending).rejects.toThrow(/Local data changed/);
    await storage.clearAll();
    TestWorker.instances[0].onmessage?.({ data: { status: "snapshot", generation: 0, snapshot: {} } } as MessageEvent);
    await failure;
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it("preserves generation conflicts reported after the snapshot was delivered", async () => {
    const pending = loadBrowserStoredSessionSummary(createStorage, "selected");
    const failure = expect(pending).rejects.toMatchObject({ name: "AppStorageConflictError", reason: "generation" });
    TestWorker.instances[0].onmessage?.({ data: { status: "error", conflictReason: "generation" } } as MessageEvent);
    await failure;
  });

  it("invalidates a streaming worker and ignores all later snapshots", async () => {
    const completed = completedSession("invalidated-stream");
    const snapshot = createSessionSummarySnapshot(completed.session, completed.questions);
    let received!: () => void;
    const snapshotReceived = new Promise<void>((resolve) => { received = resolve; });
    const onSnapshot = vi.fn(received);
    const pending = loadBrowserStoredSessionSummary(createStorage, snapshot.id, undefined, onSnapshot);
    const failure = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    const worker = TestWorker.instances[0];
    worker.onmessage?.({ data: { status: "snapshot", generation: 0, snapshot } } as MessageEvent);
    await snapshotReceived;
    publishLocalDataInvalidation("all_data_cleared", { broadcastChannelFactory: null, fallbackStorage: null });
    worker.onmessage?.({ data: { status: "snapshot", generation: 0, snapshot } } as MessageEvent);
    await failure;
    expect(onSnapshot).toHaveBeenCalledOnce();
    expect(worker.terminate).toHaveBeenCalled();
  });

  it.each(["error", "onerror", "onmessageerror"] as const)("revalidates a partial generation when enrichment fails through %s", async (failureMode) => {
    const completed = completedSession("failed-stream");
    const snapshot = createSessionSummarySnapshot(completed.session, completed.questions);
    let received!: () => void;
    const snapshotReceived = new Promise<void>((resolve) => { received = resolve; });
    const pending = loadBrowserStoredSessionSummary(createStorage, snapshot.id, undefined, received);
    const failure = expect(pending).rejects.toMatchObject({ name: "AppStorageConflictError", reason: "generation" });
    const worker = TestWorker.instances[0];
    worker.onmessage?.({ data: { status: "snapshot", generation: 0, snapshot } } as MessageEvent);
    await snapshotReceived;
    await storage.clearAll();
    if (failureMode === "error") worker.onmessage?.({ data: { status: "error" } } as MessageEvent);
    else worker[failureMode]?.();
    await failure;
    expect(worker.terminate).toHaveBeenCalled();
  });

  it("distinguishes an unverified partial from an ordinary enrichment error", async () => {
    const completed = completedSession("unverified-stream");
    const snapshot = createSessionSummarySnapshot(completed.session, completed.questions);
    let received!: () => void;
    const snapshotReceived = new Promise<void>((resolve) => { received = resolve; });
    const pending = loadBrowserStoredSessionSummary(createStorage, snapshot.id, undefined, received);
    const failure = expect(pending).rejects.toMatchObject({ name: "UnverifiedStoredSessionSummaryError" });
    const worker = TestWorker.instances[0];
    worker.onmessage?.({ data: { status: "snapshot", generation: 0, snapshot } } as MessageEvent);
    await snapshotReceived;
    vi.spyOn(storage, "atomic").mockRejectedValueOnce(new Error("Verification unavailable"));
    worker.onmessage?.({ data: { status: "error" } } as MessageEvent);
    await failure;
  });

  it("cancels saved-session analysis and ignores a late worker response", async () => {
    const controller = new AbortController();
    const pending = loadBrowserStoredSessionSummary(createStorage, "selected-session", controller.signal);
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    TestWorker.instances[0].onmessage?.({ data: { status: "loaded", generation: 0, detail: { newBestLabels: ["Late"] } } } as MessageEvent);
    await rejected;
    expect(TestWorker.instances[0].terminate).toHaveBeenCalled();
  });

  it.each(["missing", "blocked"])("retains saved-session availability when workers are %s", async (mode) => {
    vi.stubGlobal("Worker", mode === "missing" ? undefined : class { constructor() { throw new Error("Worker disabled"); } });
    await expect(loadBrowserStoredSessionSummary(createStorage, "missing-session")).resolves.toEqual({ newBestLabels: [] });
  });

  it.each(["missing", "blocked"])("streams the same bounded snapshot through the %s-worker fallback", async (mode) => {
    vi.stubGlobal("Worker", mode === "missing" ? undefined : class { constructor() { throw new Error("Worker disabled"); } });
    const completed = completedSession(`fallback-${mode}`);
    await persistCompletedDrillSession({ ...completed, storage });
    let release!: () => void;
    const history = new Promise<[]>((resolve) => { release = () => resolve([]); });
    vi.spyOn(storage, "getAll").mockReturnValueOnce(history);
    let received!: () => void;
    const snapshotReceived = new Promise<void>((resolve) => { received = resolve; });
    const onSnapshot = vi.fn(received);
    const pending = loadBrowserStoredSessionSummary(createStorage, completed.session.id, undefined, onSnapshot);
    await snapshotReceived;
    expect(onSnapshot).toHaveBeenCalledWith(expect.objectContaining({ id: completed.session.id }), 0);
    release();
    await expect(pending).resolves.toMatchObject({ snapshot: { id: completed.session.id } });
  });

  it("does not publish a late fallback snapshot or start lifetime reads after invalidation", async () => {
    vi.stubGlobal("Worker", undefined);
    const completed = completedSession("invalidated-fallback");
    await persistCompletedDrillSession({ ...completed, storage });
    const get = storage.get.bind(storage);
    vi.spyOn(storage, "get").mockImplementation(async (store, id) => {
      const record = await get(store, id);
      publishLocalDataInvalidation("all_data_cleared", { broadcastChannelFactory: null, fallbackStorage: null });
      return record;
    });
    const all = vi.spyOn(storage, "getAll");
    const onSnapshot = vi.fn();
    await expect(loadBrowserStoredSessionSummary(createStorage, completed.session.id, undefined, onSnapshot)).rejects.toMatchObject({ name: "AbortError" });
    expect(onSnapshot).not.toHaveBeenCalled();
    expect(all).not.toHaveBeenCalled();
  });
});
