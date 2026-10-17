import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserLocalRecovery } from "@/features/settings/browserLocalRecovery";
import { diagnoseLocalRecovery, prepareLocalRecovery } from "@/features/settings/localRecordRecovery";
import { publishLocalDataInvalidation, subscribeToLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import { AppStorageConflictError } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

vi.mock("@/lib/storage/indexedDbAppStorage", () => ({ createIndexedDbAppStorage: vi.fn() }));

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("browser recovery session", () => {
  let storage: MemoryAppStorage;
  beforeEach(() => {
    storage = fixture();
    vi.mocked(createIndexedDbAppStorage).mockReturnValue(storage);
    MockWorker.instances = [];
    vi.stubGlobal("Worker", MockWorker);
  });

  it("retains one worker and transports only diagnosis, summary, archive Blob, and result counts", async () => {
    const item = (await diagnoseLocalRecovery(storage))[0];
    const { records: _records, fingerprint: _fingerprint, ...summary } = await prepareLocalRecovery(storage, item);
    const read = vi.spyOn(storage, "getSnapshot");
    const atomic = vi.spyOn(storage, "atomic");
    const recovery = await createBrowserLocalRecovery(createIndexedDbAppStorage, new AbortController().signal);
    const worker = MockWorker.instances[0];
    const diagnosis = recovery.diagnose();
    await vi.waitFor(() => expect(worker.requests).toHaveLength(1));
    expect(worker.requests[0]).toEqual({ id: 0, operation: "recovery_diagnose", expectedGeneration: 0 });
    worker.reply({ id: 0, result: [item] });
    await expect(diagnosis).resolves.toEqual([item]);
    const preparation = recovery.prepare(item);
    await vi.waitFor(() => expect(worker.requests).toHaveLength(2));
    worker.reply({ id: 1, result: summary });
    await expect(preparation).resolves.toEqual(summary);
    const archive = recovery.archive();
    await vi.waitFor(() => expect(worker.requests).toHaveLength(3));
    const blob = new Blob(["original records"]);
    worker.reply({ id: 2, result: blob });
    await expect(archive).resolves.toBe(blob);
    const changed = vi.fn();
    const unsubscribe = subscribeToLocalDataInvalidation(changed);
    try {
      const apply = recovery.apply();
      await vi.waitFor(() => expect(worker.requests).toHaveLength(4));
      expect(changed).not.toHaveBeenCalled();
      await storage.mutate([], { advanceGeneration: true });
      worker.reply({ id: 3, result: { removedRecords: 0, updatedRecords: 1 } });
      await expect(apply).resolves.toEqual({ removedRecords: 0, updatedRecords: 1 });
      expect(changed).toHaveBeenCalledOnce();
      expect(worker.terminate).toHaveBeenCalledOnce();
      expect(read).not.toHaveBeenCalled();
      expect(atomic.mock.calls.every(([options]) => options.reads === undefined && options.stores.length === 0)).toBe(true);
      expect(JSON.stringify(worker.requests)).not.toContain("PRIVATE ORIGINAL");
    } finally { unsubscribe(); recovery.dispose(); }
  });

  it("aborts in-flight work and ignores a late result", async () => {
    const controller = new AbortController();
    const recovery = await createBrowserLocalRecovery(createIndexedDbAppStorage, controller.signal);
    const pending = recovery.diagnose();
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    const worker = MockWorker.instances[0];
    await vi.waitFor(() => expect(worker.requests).toHaveLength(1));
    controller.abort();
    worker.reply({ id: 0, result: [] });
    await rejected;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("rejects a generation changed before a worker response can become a preview", async () => {
    const recovery = await createBrowserLocalRecovery(createIndexedDbAppStorage, new AbortController().signal);
    const pending = recovery.diagnose();
    const rejected = expect(pending).rejects.toMatchObject({ reason: "generation" });
    const worker = MockWorker.instances[0];
    await vi.waitFor(() => expect(worker.requests).toHaveLength(1));
    await storage.mutate([], { advanceGeneration: true });
    worker.reply({ id: 0, result: [] });
    await rejected;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("cancels ready sessions on replacement invalidation", async () => {
    const recovery = await createBrowserLocalRecovery(createIndexedDbAppStorage, new AbortController().signal);
    publishLocalDataInvalidation("progress_replaced");
    await expect(recovery.diagnose()).rejects.toMatchObject({ reason: "generation" });
    expect(MockWorker.instances[0].terminate).toHaveBeenCalledOnce();
    expect(MockWorker.instances[0].requests).toEqual([]);
  });

  it("does not publish stale success when another replacement follows the worker commit", async () => {
    const recovery = await createBrowserLocalRecovery(createIndexedDbAppStorage, new AbortController().signal);
    const changed = vi.fn();
    const unsubscribe = subscribeToLocalDataInvalidation(changed);
    try {
      const pending = recovery.apply();
      const rejected = expect(pending).rejects.toMatchObject({ reason: "generation" });
      const worker = MockWorker.instances[0];
      await vi.waitFor(() => expect(worker.requests).toHaveLength(1));
      await storage.mutate([], { advanceGeneration: true });
      await storage.mutate([], { advanceGeneration: true });
      worker.reply({ id: 0, result: { removedRecords: 0, updatedRecords: 1 } });
      await rejected;
      expect(changed).not.toHaveBeenCalled();
      expect(worker.terminate).toHaveBeenCalledOnce();
    } finally { unsubscribe(); recovery.dispose(); }
  });

  it("preserves structured storage conflicts across the worker boundary", async () => {
    const recovery = await createBrowserLocalRecovery(createIndexedDbAppStorage, new AbortController().signal);
    const pending = recovery.diagnose();
    const rejected = expect(pending).rejects.toBeInstanceOf(AppStorageConflictError);
    const worker = MockWorker.instances[0];
    await vi.waitFor(() => expect(worker.requests).toHaveLength(1));
    worker.reply({ id: 0, error: "Saved data changed", conflictReason: "session" });
    await rejected;
    await expect(pending).rejects.toMatchObject({ reason: "session" });
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("does not retry heavy diagnosis on the main thread after a worker failure", async () => {
    const atomic = vi.spyOn(storage, "atomic");
    const recovery = await createBrowserLocalRecovery(createIndexedDbAppStorage, new AbortController().signal);
    const pending = recovery.diagnose();
    const rejected = expect(pending).rejects.toThrow("Recovery could not be completed.");
    const worker = MockWorker.instances[0];
    await vi.waitFor(() => expect(worker.requests).toHaveLength(1));
    worker.dispatchEvent(new Event("messageerror"));
    await rejected;
    expect(atomic.mock.calls.every(([options]) => options.reads === undefined)).toBe(true);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it.each(["injected", "unavailable", "blocked"] as const)("keeps %s worker fallback diagnosis, original archive, and scoped removal available", async (mode) => {
    if (mode === "unavailable") vi.stubGlobal("Worker", undefined);
    if (mode === "blocked") vi.stubGlobal("Worker", class { constructor() { throw new Error("Blocked by policy"); } });
    const factory = mode === "injected" ? () => storage : createIndexedDbAppStorage;
    const recovery = await createBrowserLocalRecovery(factory, new AbortController().signal);
    const [item] = await recovery.diagnose();
    const preview = await recovery.prepare(item);
    expect(preview).not.toHaveProperty("records");
    expect(preview).not.toHaveProperty("fingerprint");
    const archive = await readBlob(await recovery.archive());
    expect(archive).toContain("PRIVATE ORIGINAL");
    expect(JSON.parse(archive)).toMatchObject({ format: "open-prep-record-recovery", target: { recordId: "bad" } });
    await expect(recovery.apply()).resolves.toEqual({ removedRecords: 0, updatedRecords: 1 });
    expect((await storage.get("market_sizing_attempts", "bad"))?.note).toBeUndefined();
    expect((await storage.get("market_sizing_attempts", "keep"))?.note).toBe("Unrelated private note");
    expect(MockWorker.instances).toHaveLength(0);
  });

  it("keeps fingerprint checks in fallback and leaves changed records intact", async () => {
    const recovery = await createBrowserLocalRecovery(() => storage, new AbortController().signal);
    const [item] = await recovery.diagnose();
    await recovery.prepare(item);
    const original = (await storage.get("market_sizing_attempts", "bad"))!;
    storage.seedLegacy("market_sizing_attempts", { ...original, score: 100 });
    await expect(recovery.apply()).rejects.toMatchObject({ reason: "session" });
    expect((await storage.get("market_sizing_attempts", "bad"))?.note).toBe(original.note);
  });
});

function fixture() {
  const storage = new MemoryAppStorage();
  const startedAt = "2026-10-17T12:00:00.000Z";
  storage.seedLegacy("market_sizing_attempts", { id: "bad", startedAt, templateId: "local", note: "PRIVATE ORIGINAL ".repeat(7000) });
  storage.seedLegacy("market_sizing_attempts", { id: "keep", startedAt, templateId: "local", note: "Unrelated private note" });
  return storage;
}

class MockWorker extends EventTarget {
  static instances: MockWorker[] = [];
  requests: unknown[] = [];
  terminate = vi.fn();
  constructor() { super(); MockWorker.instances.push(this); }
  postMessage(value: unknown) { this.requests.push(value); }
  reply(value: unknown) { this.dispatchEvent(new MessageEvent("message", { data: value })); }
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}
