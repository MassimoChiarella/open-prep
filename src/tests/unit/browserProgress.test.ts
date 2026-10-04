import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadBrowserProgressSummary } from "@/features/progress/browserProgress";
import { createProgressSummary, type ProgressSummary } from "@/features/progress/progressAggregation";
import { publishLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

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
});
