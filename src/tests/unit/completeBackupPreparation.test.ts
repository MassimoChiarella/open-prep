import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prepareCompleteBackup } from "@/features/settings/completeBackupPreparation";
import {
  createCompleteBackupFilesFromStorage,
  prepareCompleteBackupFilesFromStorage,
  restoreCompleteBackupFiles,
  type PreparedCompleteBackup
} from "@/features/settings/completeBackupStorage";
import { serializeCompleteBackupFile, validateCompleteBackupSet } from "@/features/settings/completeBackupSet";
import { localePreferenceStorageKey } from "@/features/i18n/i18n";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import { appStoreNames } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

vi.mock("@/lib/storage/indexedDbAppStorage", () => ({ createIndexedDbAppStorage: vi.fn() }));

const exportedAt = "2026-09-22T12:00:00.000Z";

describe("prepared complete backup bytes", () => {
  it("reuses exact single-file bytes, scopes, filename, and summary without changing stored data", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("market_sizing_attempts", {
      id: "market-1", templateId: "template-1", startedAt: exportedAt, note: "  Private note عربي  "
    });
    const snapshot = vi.spyOn(storage, "getSnapshot");
    const options = { exportedAt, selectedOptionalScopes: ["private_text"] as const };
    const prepared = await prepareCompleteBackupFilesFromStorage(storage, options);
    expect(snapshot).toHaveBeenCalledOnce();
    const expected = await createCompleteBackupFilesFromStorage(storage, options);
    const text = await readBlob(prepared.files[0].blob);
    expect(text).toBe(serializeCompleteBackupFile(expected[0]));
    expect(prepared.files[0].fileName).toBe("open-prep-complete-backup-2026-09-22.json");
    expect(prepared.summary).toMatchObject({ fileBytes: prepared.files[0].blob.size, progressRecordCount: 1, privateEntryCount: 1 });
    expect(text).toContain("  Private note عربي  ");
    expect(await storage.count("market_sizing_attempts")).toBe(1);
  });

  it("prepares multipart downloads that validate and restore every response", async () => {
    const storage = new MemoryAppStorage();
    for (let index = 0; index < 5_001; index += 1) {
      await storage.put("responses", {
        id: `response-${index}`, sessionId: "session-1", questionId: "question-1", rawInput: "4",
        isCorrect: true, errorTypes: ["none"], submittedAt: exportedAt, timeTakenSeconds: 1
      });
    }
    const prepared = await prepareCompleteBackupFilesFromStorage(storage, { exportedAt });
    expect(prepared.files).toHaveLength(2);
    const payloads: unknown[] = await Promise.all(prepared.files.map(async ({ blob }) => JSON.parse(await readBlob(blob))));
    const sizes = prepared.files.map(({ blob }) => blob.size);
    expect((await validateCompleteBackupSet(payloads, sizes)).status).toBe("valid");
    expect(prepared.summary).toMatchObject({ fileBytes: sizes.reduce((a, b) => a + b), progressRecordCount: 5_001 });
    const target = new MemoryAppStorage();
    await restoreCompleteBackupFiles(target, payloads, { sourceSizes: sizes });
    expect(await target.getAll("responses")).toEqual(await storage.getAll("responses"));
  });

  it("cancels before reading or after a pending snapshot without preparing stale output", async () => {
    const storage = new MemoryAppStorage();
    const controller = new AbortController();
    controller.abort();
    const original = storage.getSnapshot.bind(storage);
    const snapshot = vi.spyOn(storage, "getSnapshot");
    await expect(prepareCompleteBackupFilesFromStorage(storage, {}, undefined, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(snapshot).not.toHaveBeenCalled();
    const next = new AbortController();
    snapshot.mockImplementation(async (stores) => { const value = await original(stores); next.abort(); return value; });
    await expect(prepareCompleteBackupFilesFromStorage(storage, {}, undefined, next.signal)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects a snapshot prepared across a destructive data generation change", async () => {
    const storage = new MemoryAppStorage();
    const original = storage.getSnapshot.bind(storage);
    vi.spyOn(storage, "getSnapshot").mockImplementation(async (stores) => {
      const snapshot = await original(stores);
      await storage.mutate([], { advanceGeneration: true });
      return snapshot;
    });
    await expect(prepareCompleteBackupFilesFromStorage(storage, { exportedAt })).rejects.toMatchObject({ reason: "generation" });
  });
});

describe("complete backup worker lifecycle", () => {
  let storage: MemoryAppStorage;
  beforeEach(() => {
    storage = new MemoryAppStorage();
    vi.mocked(createIndexedDbAppStorage).mockReturnValue(storage);
    MockWorker.instances = [];
    vi.stubGlobal("Worker", MockWorker);
    localStorage.clear();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); });

  it("sends only scopes, generation, and allowlisted preferences and accepts prepared blobs", async () => {
    localStorage.setItem(localePreferenceStorageKey, "fr");
    localStorage.setItem("unrelated-private-value", "do not send");
    const pending = prepareCompleteBackup(createIndexedDbAppStorage, ["preferences"], new AbortController().signal);
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const worker = MockWorker.instances[0];
    expect(worker.request).toMatchObject({ expectedGeneration: 0, options: { selectedOptionalScopes: ["preferences"], preferences: { [localePreferenceStorageKey]: "fr" } } });
    expect(JSON.stringify(worker.request)).not.toContain("unrelated-private-value");
    const prepared = emptyPrepared();
    worker.dispatchEvent(new MessageEvent("message", { data: { prepared } }));
    await expect(pending).resolves.toBe(prepared);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("terminates canceled work and ignores late results", async () => {
    const controller = new AbortController();
    const pending = prepareCompleteBackup(createIndexedDbAppStorage, [], controller.signal);
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    controller.abort();
    await rejected;
    const worker = MockWorker.instances[0];
    expect(worker.terminate).toHaveBeenCalledOnce();
    worker.dispatchEvent(new MessageEvent("message", { data: { prepared: emptyPrepared() } }));
  });

  it("reports worker failure and permits a fresh retry", async () => {
    const pending = prepareCompleteBackup(createIndexedDbAppStorage, [], new AbortController().signal);
    const rejected = expect(pending).rejects.toThrow("Complete backup creation failed.");
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    MockWorker.instances[0].dispatchEvent(new Event("error"));
    await rejected;
    expect(MockWorker.instances[0].terminate).toHaveBeenCalledOnce();
    const retry = prepareCompleteBackup(createIndexedDbAppStorage, [], new AbortController().signal);
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(2));
    MockWorker.instances[1].dispatchEvent(new MessageEvent("message", { data: { prepared: emptyPrepared() } }));
    await expect(retry).resolves.toMatchObject({ files: [] });
  });

  it("rejects a worker result when generation changes just before delivery", async () => {
    const pending = prepareCompleteBackup(createIndexedDbAppStorage, [], new AbortController().signal);
    const rejected = expect(pending).rejects.toMatchObject({ reason: "generation" });
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    await storage.mutate([], { advanceGeneration: true });
    MockWorker.instances[0].dispatchEvent(new MessageEvent("message", { data: { prepared: emptyPrepared() } }));
    await rejected;
    expect(MockWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });

  it("uses the shared yielding path when Workers are unavailable", async () => {
    vi.stubGlobal("Worker", undefined);
    const prepared = await prepareCompleteBackup(createIndexedDbAppStorage, [], new AbortController().signal);
    expect(prepared.files).toHaveLength(1);
    expect(prepared.summary.progressRecordCount).toBe(0);
  });

  it("reports incompatible legacy records with localized recovery guidance", async () => {
    await storage.put("responses", {
      id: "response-1", sessionId: "session-1", questionId: "question-1", rawInput: "4",
      isCorrect: true, errorTypes: ["none"], submittedAt: exportedAt, timeTakenSeconds: 1
    });
    const snapshot = await storage.getSnapshot(appStoreNames);
    snapshot.responses[0].rawInput = "x".repeat(100_001);
    vi.spyOn(storage, "getSnapshot").mockResolvedValue(snapshot);
    await expect(prepareCompleteBackup(() => storage, [], new AbortController().signal)).rejects.toThrow(
      "Saved data is incompatible with backups. Review individual records in recovery."
    );
  });
});

class MockWorker extends EventTarget {
  static instances: MockWorker[] = [];
  request?: unknown;
  terminate = vi.fn();
  constructor() { super(); MockWorker.instances.push(this); }
  postMessage(request: unknown) { this.request = request; }
}

function emptyPrepared(): PreparedCompleteBackup {
  return { files: [], summary: { fileBytes: 0, packCount: 0, preferencesIncluded: false, privateEntryCount: 0, progressRecordCount: 0, schemaVersion: 1 } };
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}
