import { describe, expect, it, vi } from "vitest";

import { createDrillSettings } from "@/features/drills/drillSettings";
import { createCompleteBackupFilesFromStorage, restoreCompleteBackupFiles } from "@/features/settings/completeBackupStorage";
import {
  backupFromFile,
  completeBackupSetLimits,
  serializeCompleteBackupFile,
  validateCompleteBackupSet
} from "@/features/settings/completeBackupSet";
import { createLocalProgressExport } from "@/features/settings/localProgressExport";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";
import type { FullCaseDraftRecord } from "@/features/case-practice/practiceTypes";
import { clearPersonalData, previewPersonalDataClear } from "@/features/settings/personalDataClear";
import { replaceLocalProgressWithImport } from "@/features/settings/localProgressExport";

const timestamp = "2026-09-07T12:00:00.000Z";

describe("complete backup sets", () => {
  it("restores all 10,001 responses and their session snapshots in one atomic operation", async () => {
    const source = await historyStorage();
    await expect(createLocalProgressExport(source, timestamp)).rejects.toThrow("Use Complete Backup");
    const files = await createCompleteBackupFilesFromStorage(source, { exportedAt: timestamp });
    expect(files).toHaveLength(3);
    for (const file of files) {
      expect(backupFromFile(file).sections.progress.stores.responses.length).toBeLessThanOrEqual(5_000);
    }
    const payloads: unknown[] = files.map((file) => JSON.parse(serializeCompleteBackupFile(file)));
    expect((await validateCompleteBackupSet([...payloads].reverse())).status).toBe("valid");
    const target = new MemoryAppStorage();
    const mutate = vi.spyOn(target, "mutate");
    await restoreCompleteBackupFiles(target, [...payloads].reverse());
    expect(mutate).toHaveBeenCalledOnce();
    expect(await target.getSnapshot(["responses", "drill_sessions"])).toEqual(await source.getSnapshot(["responses", "drill_sessions"]));
  });

  it("rejects missing, duplicated, mixed, and corrupted parts without changing saved records", async () => {
    const files = await createCompleteBackupFilesFromStorage(await historyStorage(), { exportedAt: timestamp });
    const target = new MemoryAppStorage();
    await target.put("user_settings", { id: "default", settings: createDrillSettings(), updatedAt: timestamp });
    const before = await target.getSnapshot(["user_settings"]);
    const corrupt = structuredClone(files);
    backupFromFile(corrupt[1]).sections.progress.stores.responses[0].rawInput = "corrupted";
    for (const invalid of [[files[0]], [files[0], files[0], files[2]], [files[0], backupFromFile(files[1]), files[2]], corrupt]) {
      await expect(restoreCompleteBackupFiles(target, invalid)).rejects.toThrow();
      expect(await target.getSnapshot(["user_settings"])).toEqual(before);
      expect(await target.count("responses")).toBe(0);
    }
  });

  it("rolls back the whole restore if a later database write fails", async () => {
    const files = await createCompleteBackupFilesFromStorage(await historyStorage(), { exportedAt: timestamp });
    const target = new MemoryAppStorage(20);
    await target.put("user_settings", { id: "default", settings: createDrillSettings(), updatedAt: timestamp });
    await expect(restoreCompleteBackupFiles(target, files)).rejects.toThrow("Injected atomic mutation failure");
    expect(await target.get("user_settings", "default")).toBeDefined();
    expect(await target.count("responses")).toBe(0);
  });

  it("keeps single-file compatibility and bounds hostile multi-file selections", async () => {
    const files = await createCompleteBackupFilesFromStorage(new MemoryAppStorage(), { exportedAt: timestamp });
    expect(files).toHaveLength(1);
    expect(files[0].format).toBe("open-prep-complete-backup");
    expect((await validateCompleteBackupSet(files)).status).toBe("valid");
    expect((await validateCompleteBackupSet(Array.from({ length: completeBackupSetLimits.maxParts + 1 }, () => files[0]))).status).toBe("invalid");
    expect((await validateCompleteBackupSet(files, [completeBackupSetLimits.maxBytes + 1])).status).toBe("invalid");
  });

  it("treats full-case drafts as private in exports, restores, and personal clearing", async () => {
    const source = new MemoryAppStorage();
    const draft: FullCaseDraftRecord = {
      id: "full-case-draft:case-1", kind: "full_case_draft", simulationId: "case-1", contentKey: "a".repeat(64),
      startedAt: timestamp, updatedAt: timestamp, locale: "en", stage: 0,
      questions: [{ id: "question-1", text: "Private case notes" }], includeQuestionRanking: false,
      hypothesisId: "", branchIds: [], calculationInput: "", ideaIds: [], priorityIdeaIds: [], synthesis: {}
    };
    await source.put("practice_records", draft);
    const standard = await createLocalProgressExport(source, timestamp);
    const publicFiles = await createCompleteBackupFilesFromStorage(source, { exportedAt: timestamp });
    const privateFiles = await createCompleteBackupFilesFromStorage(source, { exportedAt: timestamp, selectedOptionalScopes: ["private_text"] });
    expect(standard.stores.practice_records).toEqual([]);
    expect(serializeCompleteBackupFile(publicFiles[0])).not.toContain("Private case notes");
    expect(serializeCompleteBackupFile(privateFiles[0])).toContain("Private case notes");
    await replaceLocalProgressWithImport(source, standard);
    expect(await source.get("practice_records", draft.id)).toEqual(draft);
    const target = new MemoryAppStorage();
    await restoreCompleteBackupFiles(target, privateFiles);
    expect(await target.get("practice_records", draft.id)).toEqual(draft);
    expect(await previewPersonalDataClear(target)).toMatchObject({ fullCaseDrafts: 1, totalItems: 1 });
    await clearPersonalData(target);
    expect(await target.count("practice_records")).toBe(0);
  });

  it("does not spend multipart capacity on notes excluded by the selected scope", async () => {
    const source = new MemoryAppStorage();
    for (let index = 0; index < 100; index += 1) {
      await source.put("market_sizing_attempts", {
        id: `market-${index}`, templateId: "template-1", startedAt: timestamp, note: "private".repeat(14_000)
      });
    }
    const files = await createCompleteBackupFilesFromStorage(source, { exportedAt: timestamp });
    expect(files).toHaveLength(1);
    expect(backupFromFile(files[0]).sections.progress.stores.market_sizing_attempts).toHaveLength(100);
    expect(serializeCompleteBackupFile(files[0])).not.toContain("privateprivate");
  });
});

async function historyStorage() {
  const storage = new MemoryAppStorage();
  await storage.put("drill_sessions", {
    id: "session-1",
    startedAt: timestamp,
    updatedAt: timestamp,
    activeQuestionStartedAt: timestamp,
    questionIds: ["question-1"],
    questions: [{
      id: "question-1", type: "numeric", category: "business_math", tags: ["revenue"], difficulty: "beginner",
      prompt: "What revenue, in millions, comes from two million units at $3 each?",
      answer: { value: 6, unit: "m", currency: true },
      explanation: { short: "Six million dollars.", steps: ["2 × 3 = 6 million dollars."] }
    }],
    responses: [],
    settings: createDrillSettings({ questionCount: 1 })
  });
  for (let index = 0; index < 10_001; index += 1) {
    await storage.put("responses", {
      id: `response-${index}`, sessionId: "session-1", questionId: "question-1", rawInput: "6",
      isCorrect: true, errorTypes: ["none"], timeTakenSeconds: 1, submittedAt: timestamp
    });
  }
  return storage;
}
