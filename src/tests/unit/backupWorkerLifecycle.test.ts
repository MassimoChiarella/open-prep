import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createFitStoryRecord } from "@/features/case-practice/fit/fitPractice";
import { localePreferenceStorageKey } from "@/features/i18n/i18n";
import { prepareCompleteRestore } from "@/features/settings/completeBackupRestorePreparation";
import { createCompleteBackupFromStorage } from "@/features/settings/completeBackupStorage";
import * as backupSet from "@/features/settings/completeBackupSet";
import { createLocalProgressExport, prepareStandardProgressExportFromStorage, serializeLocalProgressExport } from "@/features/settings/localProgressExport";
import { prepareStandardProgressExport } from "@/features/settings/standardProgressPreparation";
import { IncompatibleStoredRecordError } from "@/features/settings/recordDiagnostics";
import { createUserSettingsRecord } from "@/features/settings/settingsPersistence";
import { createDrillSettings } from "@/features/drills/drillSettings";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

vi.mock("@/lib/storage/indexedDbAppStorage", () => ({ createIndexedDbAppStorage: vi.fn() }));
const timestamp = "2026-10-04T12:00:00Z";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

describe("validated restore preparation", () => {
  it("validates once, restores the retained set atomically, and preserves unselected private text", async () => {
    const source = new MemoryAppStorage();
    await source.put("user_settings", createUserSettingsRecord(createDrillSettings({ questionCount: 6 }), timestamp));
    const backup = await createCompleteBackupFromStorage(source);
    const target = new MemoryAppStorage();
    const privateStory = createFitStoryRecord({ title: "Private story", competency: "leadership", situation: "Situation", task: "Task", action: "Action", result: "Result", reflection: "Reflection" }, timestamp);
    await target.put("practice_records", privateStory);
    const validate = vi.spyOn(backupSet, "validateCompleteBackupSet");
    const file = new File([JSON.stringify(backup)], "backup.json");
    const prepared = await prepareCompleteRestore([file], () => target, new AbortController().signal);
    expect(prepared.status).toBe("valid");
    if (prepared.status !== "valid") throw new Error("Expected a valid backup");
    expect(prepared.prepared.summary).toMatchObject({ fileBytes: file.size, progressRecordCount: 1 });
    const result = await prepared.prepared.restore();
    expect(validate).toHaveBeenCalledOnce();
    expect(result.savedSettings?.questionCount).toBe(6);
    expect(result.preferenceResult.status).toBe("not_selected");
    expect(await target.get("practice_records", privateStory.id)).toEqual(privateStory);
    expect((await target.get("user_settings", "default"))?.settings.questionCount).toBe(6);
  });

  it("rejects an obsolete preview at the atomic write boundary without restoring preferences", async () => {
    const source = new MemoryAppStorage();
    await source.put("user_settings", createUserSettingsRecord(createDrillSettings({ questionCount: 6 }), timestamp));
    const backup = await createCompleteBackupFromStorage(source, { selectedOptionalScopes: ["preferences"] });
    const target = new MemoryAppStorage();
    const current = createUserSettingsRecord(createDrillSettings({ questionCount: 3 }), timestamp);
    await target.put("user_settings", current);
    const prepared = await prepareCompleteRestore([new File([JSON.stringify(backup)], "backup.json")], () => target, new AbortController().signal);
    if (prepared.status !== "valid") throw new Error("Expected a valid backup");
    localStorage.setItem(localePreferenceStorageKey, "fr");
    await target.mutate([], { advanceGeneration: true });
    await expect(prepared.prepared.restore()).rejects.toMatchObject({ reason: "generation" });
    expect(await target.get("user_settings", "default")).toEqual(current);
    expect(localStorage.getItem(localePreferenceStorageKey)).toBe("fr");
    prepared.prepared.dispose();
  });

  it("rejects a checksum mismatch before creating an applicable preview", async () => {
    const backup = await createCompleteBackupFromStorage(new MemoryAppStorage());
    backup.exportedAt = "2026-10-05T00:00:00Z";
    const target = new MemoryAppStorage();
    const replace = vi.spyOn(target, "replaceSnapshot");
    const result = await prepareCompleteRestore([new File([JSON.stringify(backup)], "tampered.json")], () => target, new AbortController().signal);
    expect(result).toMatchObject({ status: "invalid", errors: expect.arrayContaining([expect.stringContaining("checksum")]) });
    expect(replace).not.toHaveBeenCalled();
  });

  it("cancels a delayed file read before returning a stale preview", async () => {
    const backup = await createCompleteBackupFromStorage(new MemoryAppStorage());
    let release!: (text: string) => void;
    const text = vi.fn(() => new Promise<string>((resolve) => { release = resolve; }));
    const file = { size: 1_000, text } as unknown as File;
    const controller = new AbortController();
    const pending = prepareCompleteRestore([file], () => new MemoryAppStorage(), controller.signal);
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(text).toHaveBeenCalledOnce());
    controller.abort();
    release(JSON.stringify(backup));
    await rejected;
  });

  it("reuses the Standard export's validated serialized bytes and excludes private text", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("market_sizing_attempts", { id: "sizing-1", templateId: "sizing", startedAt: timestamp, note: "Private note" });
    const prepared = await prepareStandardProgressExportFromStorage(storage, await storage.getGeneration());
    const text = await readBlob(prepared.blob);
    const expected = await createLocalProgressExport(storage, (JSON.parse(text) as { exportedAt: string }).exportedAt);
    expect(text).toBe(serializeLocalProgressExport(expected));
    expect(text).not.toContain("Private note");
    expect(prepared.fileName).toMatch(/^open-prep-progress-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

describe("backup worker lifecycle", () => {
  let storage: MemoryAppStorage;
  beforeEach(() => {
    storage = new MemoryAppStorage();
    vi.mocked(createIndexedDbAppStorage).mockReturnValue(storage);
    MockWorker.instances = [];
    vi.stubGlobal("Worker", MockWorker);
  });

  it("retains one worker from preview to apply and returns only compact metadata", async () => {
    const file = new File(["{}"], "backup.json");
    const pending = prepareCompleteRestore([file], createIndexedDbAppStorage, new AbortController().signal);
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const worker = MockWorker.instances[0];
    expect(worker.requests[0]).toEqual({ id: 0, operation: "restore_prepare", files: [file], expectedGeneration: 0 });
    worker.reply({ id: 0, result: { status: "valid", summary: emptySummary() } });
    const prepared = await pending;
    if (prepared.status !== "valid") throw new Error("Expected valid preview");
    expect(worker.terminate).not.toHaveBeenCalled();
    const apply = prepared.prepared.restore();
    expect(worker.requests[1]).toEqual({ id: 1, operation: "restore_apply" });
    worker.reply({ id: 1, result: { selectedScopes: ["progress"] } });
    await expect(apply).resolves.toMatchObject({ selectedScopes: ["progress"], preferenceResult: { status: "not_selected" } });
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("terminates a ready worker when its file selection is canceled", async () => {
    const controller = new AbortController();
    const pending = prepareCompleteRestore([new File(["{}"], "backup.json")], createIndexedDbAppStorage, controller.signal);
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const worker = MockWorker.instances[0];
    worker.reply({ id: 0, result: { status: "valid", summary: emptySummary() } });
    const result = await pending;
    if (result.status !== "valid") throw new Error("Expected valid preview");
    controller.abort();
    expect(worker.terminate).toHaveBeenCalledOnce();
    await expect(result.prepared.restore()).rejects.toMatchObject({ name: "AbortError" });
  });

  it("terminates an in-flight canceled worker and ignores late results", async () => {
    const controller = new AbortController();
    const pending = prepareCompleteRestore([new File(["{}"], "backup.json")], createIndexedDbAppStorage, controller.signal);
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    controller.abort();
    MockWorker.instances[0].reply({ id: 0, result: { status: "valid", summary: emptySummary() } });
    await rejected;
    expect(MockWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });

  it("fails closed when a worker fails and does not retry heavy validation on the UI thread", async () => {
    const snapshot = vi.spyOn(storage, "getSnapshot");
    const pending = prepareCompleteRestore([new File(["{}"], "backup.json")], createIndexedDbAppStorage, new AbortController().signal);
    const rejected = expect(pending).rejects.toThrow("Complete backup validation failed.");
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    MockWorker.instances[0].dispatchEvent(new Event("messageerror"));
    await rejected;
    expect(snapshot).not.toHaveBeenCalled();
    expect(MockWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });

  it("transports a Standard Blob and recovery errors without returning a progress tree", async () => {
    const pending = prepareStandardProgressExport(createIndexedDbAppStorage, new AbortController().signal);
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const worker = MockWorker.instances[0];
    expect(worker.requests[0]).toEqual({ id: 0, operation: "standard", expectedGeneration: 0 });
    const result = { blob: new Blob(["{}"]), fileName: "progress.json" };
    worker.reply({ id: 0, result });
    await expect(pending).resolves.toEqual(result);
    expect(worker.terminate).toHaveBeenCalledOnce();
    const incompatible = prepareStandardProgressExport(createIndexedDbAppStorage, new AbortController().signal);
    const rejected = expect(incompatible).rejects.toBeInstanceOf(IncompatibleStoredRecordError);
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(2));
    MockWorker.instances[1].reply({ id: 0, incompatibleRecords: true });
    await rejected;
  });
});

class MockWorker extends EventTarget {
  static instances: MockWorker[] = [];
  requests: unknown[] = [];
  terminate = vi.fn();
  constructor() { super(); MockWorker.instances.push(this); }
  postMessage(value: unknown) { this.requests.push(value); }
  reply(value: unknown) { this.dispatchEvent(new MessageEvent("message", { data: value })); }
}

function emptySummary() {
  return { fileBytes: 2, packCount: 0, preferencesIncluded: false, privateEntryCount: 0, progressRecordCount: 0, schemaVersion: 1 };
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}
