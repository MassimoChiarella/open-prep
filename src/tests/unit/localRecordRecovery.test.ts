import { describe, expect, it, vi } from "vitest";
import historicalFixture from "@/tests/fixtures/storage-history/indexeddb-v9.json";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { submitAnswer } from "@/features/drills/answerSubmission";
import { completeDrillSession } from "@/features/drills/sessionCompletion";
import { createStoredDrillSession, createStoredUserResponses, createStoredMistakeNotebookRecords, createRetryScheduleRecord } from "@/features/drills/drillPersistence";
import { appStoreNames, progressStoreNames, type AppStoreName } from "@/lib/storage/appStorageTypes";
import { diagnoseLocalRecovery, prepareLocalRecovery, archiveLocalRecovery, applyLocalRecovery } from "@/features/settings/localRecordRecovery";
import { createLocalProgressExport, replaceLocalProgressWithImport } from "@/features/settings/localProgressExport";
import { createCompleteBackupFilesFromStorage, restoreCompleteBackupFiles } from "@/features/settings/completeBackupStorage";

describe("individual incompatible-record recovery", () => {
  it("diagnoses original values, archives them losslessly, and removes only one attempt's ownership closure", async () => {
    const { storage, session, responses, mistakes } = fixture();
    const before = await storage.getSnapshot(appStoreNames);
    const items = await diagnoseLocalRecovery(storage);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ storeName: "drill_sessions", recordId: session.id, action: "remove_record" });
    expect(items[0].issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "responses[0].rawInput", reason: expect.stringContaining("100001") }),
      expect.objectContaining({ path: "responses[0].normalizedValue", reason: "Number is not finite." })
    ]));
    const preview = await prepareLocalRecovery(storage, items[0]);
    expect(preview.counts).toEqual({ drill_sessions: 1, responses: 1, mistake_notebook: 1, retry_schedules: 1 });
    const archive = JSON.parse(archiveLocalRecovery(preview)) as { format: string; records: { storeName: string; value: unknown[] }[] };
    expect(archive.format).toBe("open-prep-record-recovery");
    expect(decode(archive.records.find((record) => record.storeName === "drill_sessions")!.value)).toEqual(session);
    // Preview and download have no data effects; declining confirmation leaves originals intact.
    expect(await storage.getSnapshot(appStoreNames)).toEqual(before);
    await expect(applyLocalRecovery(storage, preview)).resolves.toEqual({ removedRecords: 4, updatedRecords: 0 });
    const after = await storage.getSnapshot(appStoreNames);
    for (const name of appStoreNames) {
      const removed = new Set(preview.records.filter((record) => record.storeName === name).map((record) => record.recordId));
      expect(after[name]).toEqual(before[name].filter((record) => !removed.has(record.id)));
    }
    expect(await storage.get("responses", responses[0].id)).toBeUndefined();
    expect(await storage.get("mistake_notebook", mistakes[0].id)).toBeUndefined();
    const standard = await createLocalProgressExport(storage);
    const standardRestored = new MemoryAppStorage();
    await replaceLocalProgressWithImport(standardRestored, standard);
    expect(await standardRestored.getSnapshot(progressStoreNames)).toEqual(standard.stores);
    const complete = await createCompleteBackupFilesFromStorage(storage, { selectedOptionalScopes: ["private_text", "packs"] });
    const completeRestored = new MemoryAppStorage();
    await restoreCompleteBackupFiles(completeRestored, complete);
    expect(await completeRestored.getSnapshot(appStoreNames)).toEqual(JSON.parse(JSON.stringify(after)));
  });

  it("rejects a stale preview when a dependent review changed", async () => {
    const { storage, mistakes } = fixture();
    const preview = await prepareLocalRecovery(storage, (await diagnoseLocalRecovery(storage))[0]);
    storage.seedLegacy("mistake_notebook", { ...mistakes[0], retryCount: 1 });
    const before = await storage.getSnapshot(appStoreNames);
    await expect(applyLocalRecovery(storage, preview)).rejects.toMatchObject({ reason: "session" });
    expect(await storage.getSnapshot(appStoreNames)).toEqual(before);
  });

  it("rolls back all records and generation if any deletion fails", async () => {
    const { storage } = fixture(2);
    const preview = await prepareLocalRecovery(storage, (await diagnoseLocalRecovery(storage))[0]);
    const before = await storage.getSnapshot(appStoreNames);
    await expect(applyLocalRecovery(storage, preview)).rejects.toThrow("Injected atomic mutation failure");
    expect(await storage.getSnapshot(appStoreNames)).toEqual(before);
    expect(await storage.getGeneration()).toBe(preview.generation);
  });

  it("removes only an incompatible optional note while retaining the original attempt and score", async () => {
    const storage = new MemoryAppStorage();
    const attempt = { id: "note", templateId: "sizing", startedAt: "2026-09-01T00:00:00.000Z", score: 85, note: "x".repeat(100001) };
    storage.seedLegacy("market_sizing_attempts", attempt);
    const item = (await diagnoseLocalRecovery(storage))[0];
    expect(item.action).toBe("remove_note");
    const preview = await prepareLocalRecovery(storage, item);
    await expect(applyLocalRecovery(storage, preview)).resolves.toEqual({ removedRecords: 0, updatedRecords: 1 });
    const { note: _note, ...expected } = attempt;
    expect(await storage.get("market_sizing_attempts", "note")).toEqual(expected);
  });

  it("treats an invalid optional note type as a field-only repair", async () => {
    const storage = new MemoryAppStorage();
    storage.seedLegacy("market_sizing_attempts", { id: "note-type", templateId: "sizing", startedAt: "2026-09-01T00:00:00.000Z", score: 85, note: 42 } as never);
    const item = (await diagnoseLocalRecovery(storage))[0];
    expect(item).toMatchObject({ action: "remove_note", issues: [{ path: "note" }] });
    await applyLocalRecovery(storage, await prepareLocalRecovery(storage, item));
    expect(await storage.get("market_sizing_attempts", "note-type")).toMatchObject({ score: 85 });
    await expect(createCompleteBackupFilesFromStorage(storage, { selectedOptionalScopes: ["private_text"] })).resolves.toHaveLength(1);
  });

  it("removes only a corrupt array-valued note while preserving the attempt and score", async () => {
    const storage = new MemoryAppStorage();
    storage.seedLegacy("market_sizing_attempts", {
      id: "array-note", templateId: "sizing", startedAt: "2026-09-01T00:00:00.000Z", score: 85, note: [Infinity]
    } as never);
    const item = (await diagnoseLocalRecovery(storage))[0];
    expect(item).toMatchObject({ action: "remove_note", issues: [{ path: "note[0]" }] });
    await expect(applyLocalRecovery(storage, await prepareLocalRecovery(storage, item))).resolves.toEqual({ removedRecords: 0, updatedRecords: 1 });
    expect(await storage.get("market_sizing_attempts", "array-note")).toEqual({
      id: "array-note", templateId: "sizing", startedAt: "2026-09-01T00:00:00.000Z", score: 85
    });
    await expect(createCompleteBackupFilesFromStorage(storage, { selectedOptionalScopes: ["private_text"] })).resolves.toHaveLength(1);
  });

  it("reports raw corruption in both backup formats before JSON can replace Infinity", async () => {
    const { storage } = fixture();
    for (const exportData of [() => createLocalProgressExport(storage), () => createCompleteBackupFilesFromStorage(storage)]) {
      await expect(exportData()).rejects.toMatchObject({ name: "IncompatibleStoredRecordError", issues: expect.arrayContaining([
        expect.objectContaining({ path: "responses[0].normalizedValue", reason: "Number is not finite." })
      ]) });
    }
  });

  it("excludes damaged optional private fields and packs before checking selected backup contents", async () => {
    const storage = new MemoryAppStorage();
    storage.seedLegacy("market_sizing_attempts", { id: "optional-note", templateId: "sizing", startedAt: "2026-09-01T00:00:00.000Z", note: "x".repeat(100001) });
    storage.seedLegacy("practice_records", { id: "private", kind: "fit_story", title: "x".repeat(100001) } as never);
    storage.seedLegacy("question_packs", { id: "bad-pack", title: "x".repeat(100001) } as never);
    await expect(createLocalProgressExport(storage)).resolves.toMatchObject({ privacyScope: "standard" });
    await expect(createCompleteBackupFilesFromStorage(storage)).resolves.toHaveLength(1);
    for (const scope of ["packs", "private_text"] as const) {
      await expect(createCompleteBackupFilesFromStorage(storage, { selectedOptionalScopes: [scope] })).rejects.toMatchObject({ name: "IncompatibleStoredRecordError" });
    }
  });

  it("keeps capacity-only histories out of corruption recovery", async () => {
    const storage = new MemoryAppStorage();
    for (let index = 0; index < 10001; index += 1) storage.seedLegacy("practice_records", {
      id: `valid-${index}`, kind: "attempt", module: "fit", itemId: "interview", completedAt: "2026-09-01T00:00:00.000Z", score: 1, maxScore: 1
    });
    await expect(createLocalProgressExport(storage)).rejects.toThrow("Use Complete Backup");
    await expect(diagnoseLocalRecovery(storage)).resolves.toEqual([]);
  });

  it("recovers a schema-invalid session without assuming its question list is well-formed", async () => {
    const storage = new MemoryAppStorage();
    storage.seedLegacy("drill_sessions", { id: "invalid-session", questions: "invalid" } as never);
    const item = (await diagnoseLocalRecovery(storage))[0];
    await expect(createLocalProgressExport(storage)).rejects.toMatchObject({ name: "IncompatibleStoredRecordError" });
    await applyLocalRecovery(storage, await prepareLocalRecovery(storage, item));
    expect(await storage.count("drill_sessions")).toBe(0);
  });

  it("preserves ordinary shared objects but diagnoses sparse arrays before JSON replaces missing values", async () => {
    const storage = new MemoryAppStorage();
    const shared = { extra: "valid" };
    const attempt = { id: "shared", templateId: "sizing", startedAt: "2026-09-01T00:00:00.000Z", first: shared, second: shared };
    storage.seedLegacy("market_sizing_attempts", attempt);
    await expect(createLocalProgressExport(storage)).resolves.toBeDefined();
    const sparse = Array(1);
    storage.seedLegacy("market_sizing_attempts", { ...attempt, first: sparse } as never);
    const item = (await diagnoseLocalRecovery(storage))[0];
    expect(item.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: "first[0]", reason: expect.stringContaining("missing value") })]));
    await expect(createCompleteBackupFilesFromStorage(storage)).rejects.toMatchObject({ name: "IncompatibleStoredRecordError" });
  });

  it("refuses ambiguous ownership rather than deleting another attempt's records", async () => {
    const { storage, mistakes } = fixture();
    storage.seedLegacy("mistake_notebook", { ...mistakes[0], sourceSessionId: "another-source" });
    const items = await diagnoseLocalRecovery(storage);
    expect(items.some((item) => item.unavailableReason?.includes("ambiguous"))).toBe(true);
    const sessionItem = items.find((item) => item.storeName === "drill_sessions")!;
    await expect(prepareLocalRecovery(storage, sessionItem)).rejects.toThrow("ambiguous");
  });

  it("explains ambiguous but schema-valid dependents before offering their source attempt for recovery", async () => {
    const { storage, session, mistakes } = fixture();
    storage.seedLegacy("mistake_notebook", { ...mistakes[0], sourceSessionId: "another-source", rawInput: "wrong", normalizedValue: 1 });
    const before = await storage.getSnapshot(appStoreNames);
    const item = (await diagnoseLocalRecovery(storage)).find((candidate) => candidate.recordId === session.id)!;
    expect(item.unavailableReason).toContain("ambiguous ownership");
    await expect(prepareLocalRecovery(storage, item)).rejects.toThrow("ambiguous");
    expect(await storage.getSnapshot(appStoreNames)).toEqual(before);
  });

  it("retains independently saved retries when removing their original incompatible source", async () => {
    const { storage, session, mistakes } = fixture();
    const retry = {
      ...session, id: "independent-retry", responses: [], score: undefined,
      questions: session.questions?.map((question) => ({ ...question, metadata: { sourceType: "manual" as const, variables: { mistakeId: mistakes[0].id } } }))
    };
    storage.seedLegacy("drill_sessions", retry);
    const preview = await prepareLocalRecovery(storage, (await diagnoseLocalRecovery(storage)).find((item) => item.recordId === session.id)!);
    await applyLocalRecovery(storage, preview);
    expect(await storage.get("drill_sessions", retry.id)).toEqual(retry);
  });

  it("does not make network requests or delete anything when the optional archive cannot be prepared", async () => {
    const storage = new MemoryAppStorage();
    storage.seedLegacy("market_sizing_attempts", { id: "bad-note", templateId: "sizing", startedAt: "2026-09-01T00:00:00.000Z", note: "x".repeat(100001) });
    const fetch = vi.spyOn(globalThis, "fetch");
    const preview = await prepareLocalRecovery(storage, (await diagnoseLocalRecovery(storage))[0]);
    expect(() => archiveLocalRecovery({ ...preview, records: [{ storeName: "market_sizing_attempts", recordId: "bad-note", value: () => undefined }] })).toThrow("losslessly");
    expect(await storage.count("market_sizing_attempts")).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });
});

function fixture(failMutationAt?: number) {
  const storage = new MemoryAppStorage(failMutationAt);
  const historical = historicalFixture as { database: { stores: Record<AppStoreName, { records: unknown[] }> } };
  for (const storeName of appStoreNames) for (const record of historical.database.stores[storeName].records) storage.seedLegacy(storeName, record as never);
  const created = createDrillSession({ seed: "poisoned-history", startedAt: "2026-09-22T00:00:00.000Z", settings: { questionCount: 1 } });
  const answered = submitAnswer({ ...created, question: created.questions[0], rawInput: "wrong", timeTakenSeconds: 1 });
  const complete = completeDrillSession({ session: answered.session, questions: created.questions });
  const session = createStoredDrillSession(complete, created.questions);
  session.responses[0].rawInput = "x".repeat(100001);
  session.responses[0].normalizedValue = Infinity;
  const responses = createStoredUserResponses(session, created.questions);
  const mistakes = createStoredMistakeNotebookRecords(session, created.questions);
  storage.seedLegacy("drill_sessions", session);
  for (const response of responses) storage.seedLegacy("responses", response);
  for (const mistake of mistakes) {
    storage.seedLegacy("mistake_notebook", mistake);
    storage.seedLegacy("retry_schedules", createRetryScheduleRecord(mistake));
  }
  return { storage, session, responses, mistakes };
}

function decode(value: unknown[], references = new Map<number, unknown>()): unknown {
  const [tag, payload, entries] = value;
  if (tag === "undefined") return undefined;
  if (tag === "null") return null;
  if (tag === "number") return typeof payload === "number" ? payload : payload === "-0" ? -0 : Number(payload);
  if (tag === "string" || tag === "boolean") return payload;
  if (tag === "reference") return references.get(payload as number);
  if (tag === "array") {
    const result: unknown[] = [];
    references.set(payload as number, result);
    for (const item of entries as unknown[][]) result.push(decode(item, references));
    return result;
  }
  if (tag === "object") {
    const result: Record<string, unknown> = {};
    references.set(payload as number, result);
    for (const [key, item] of entries as [string, unknown[]][]) result[key] = decode(item, references);
    return result;
  }
  throw new Error(`Unexpected test archive tag: ${String(tag)}`);
}
