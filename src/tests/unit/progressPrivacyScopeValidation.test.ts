import { describe, expect, it } from "vitest";

import { calculateCompleteBackupChecksum, createCompleteBackup, validateCompleteBackupPayload } from "@/features/settings/completeBackup";
import { createLocalProgressExport, replaceLocalProgressWithImport, validateLocalProgressImportPayload } from "@/features/settings/localProgressExport";
import { completeBackupStoreNames } from "@/features/settings/localDataInventory";
import type { AppStorageSnapshot } from "@/lib/storage/appStorageTypes";
import progressExportV4 from "@/tests/fixtures/storage-history/progress-export-v4.json";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const timestamp = "2026-10-04T12:00:00.000Z";

describe("progress import privacy scope validation", () => {
  it.each(["top-level", "guided", "modern-top-level", "practice"] as const)("strictly rejects an explicitly private %s record marked as Standard progress", async (kind) => {
    const source = new MemoryAppStorage();
    const payload = await createLocalProgressExport(source, timestamp);
    if (kind === "practice") {
      payload.stores.practice_records.push({
        id: "prep-profile", kind: "prep_profile", experienceLevel: "beginner", targetFirms: [], weeklySessions: 5, updatedAt: timestamp
      });
    } else {
      payload.stores.market_sizing_attempts.push({
        id: "private-sizing", templateId: "removed-pack", startedAt: timestamp,
        ...(kind === "guided" ? { inputValues: { rationale: "123" }, noteInputIds: ["rationale"] } : {
          note: "Private review", ...(kind === "modern-top-level" ? { noteInputIds: [] } : {})
        })
      });
    }
    expect(validateLocalProgressImportPayload(payload, { strictPrivacyScope: true }).status).toBe("invalid");
    if (kind === "top-level" || kind === "practice") {
      const compatible = validateLocalProgressImportPayload(payload);
      expect(compatible.status).toBe("valid");
      if (compatible.status !== "valid") throw new Error(compatible.errors.join("\n"));
      expect(compatible.exportData.privacyScope).toBe("complete");
      expect(compatible.exportData.stores).toEqual(payload.stores);
      return;
    }
    const target = new MemoryAppStorage();
    await target.put("market_sizing_attempts", { id: "retained", templateId: "fixture", startedAt: timestamp, note: "Existing private text" });
    await expect(replaceLocalProgressWithImport(target, payload)).rejects.toThrow(/Standard progress must not contain/);
    expect(target.peekAll("market_sizing_attempts")).toEqual([
      { id: "retained", templateId: "fixture", startedAt: timestamp, note: "Existing private text" }
    ]);
  });

  it("recovers the authentic historical v4 private scope and all fields without mutating the source", async () => {
    const original = JSON.stringify(progressExportV4);
    const validation = validateLocalProgressImportPayload(progressExportV4);
    expect(validation.status).toBe("valid");
    if (validation.status !== "valid") throw new Error(validation.errors.join("\n"));
    expect(validation.exportData).toEqual({ ...progressExportV4, privacyScope: "complete" });
    expect(JSON.stringify(progressExportV4)).toBe(original);
    const target = new MemoryAppStorage();
    await replaceLocalProgressWithImport(target, validation.exportData);
    expect(await target.getAll("market_sizing_attempts")).toEqual(progressExportV4.stores.market_sizing_attempts);
    expect(await target.getAll("practice_records")).toEqual(progressExportV4.stores.practice_records);
    expect(validateLocalProgressImportPayload(progressExportV4, { strictPrivacyScope: true }).status).toBe("invalid");
  });

  it.each(["fit_story", "full_case_draft"] as const)("rejects a fabricated Standard %s even when legacy private fields are present", async (kind) => {
    const payload = await createLocalProgressExport(new MemoryAppStorage(), timestamp);
    payload.stores.practice_records.push(kind === "fit_story" ? {
      id: "fit-story", kind, competency: "leadership", title: "Private story", situation: "Private context", task: "", action: "", result: "", reflection: "", updatedAt: timestamp
    } : {
      id: "full-case-draft:example", simulationId: "example", kind, contentKey: "a".repeat(64), updatedAt: timestamp, startedAt: timestamp,
      locale: "en", stage: 0, questions: [], includeQuestionRanking: false, hypothesisId: "", branchIds: [], calculationInput: "", ideaIds: [], priorityIdeaIds: [], synthesis: {}
    });
    payload.stores.market_sizing_attempts.push({ id: "legacy-note", templateId: "example", startedAt: timestamp, note: "Legacy private note" });
    const validation = validateLocalProgressImportPayload(payload);
    expect(validation).toMatchObject({ status: "invalid", errors: expect.arrayContaining(["Standard progress must not contain private practice records."]) });
  });

  it("keeps Complete scope enforcement strict for a correctly checksummed historical-looking payload", async () => {
    const snapshot = Object.fromEntries(completeBackupStoreNames.map((name) => [name, []])) as unknown as AppStorageSnapshot<typeof completeBackupStoreNames>;
    const current = await createCompleteBackup(snapshot, { exportedAt: timestamp });
    const backup = { ...current, sections: { ...current.sections, progress: {
      ...current.sections.progress, stores: structuredClone(progressExportV4.stores)
    } } };
    const { checksum: _checksum, ...unsigned } = backup;
    backup.checksum.value = await calculateCompleteBackupChecksum(unsigned);
    const original = JSON.stringify(backup);
    expect(await validateCompleteBackupPayload(backup)).toMatchObject({ status: "invalid", errors: expect.arrayContaining([
      "Complete backup progress: Standard progress must not contain private practice records.",
      "Complete backup progress: Standard progress must not contain market-sizing notes."
    ]) });
    expect(JSON.stringify(backup)).toBe(original);
  });

  it("normalizes unclassified legacy Standard input text without mutating its original payload", async () => {
    const payload = await createLocalProgressExport(new MemoryAppStorage(), timestamp);
    payload.stores.market_sizing_attempts.push({
      id: "legacy", templateId: "missing-pack", startedAt: timestamp, score: 90,
      inputValues: { note: "123", number: "500000", confirmed: true }
    });
    const original = JSON.stringify(payload);
    const validation = validateLocalProgressImportPayload(payload);
    expect(validation.status).toBe("valid");
    if (validation.status !== "valid") throw new Error(validation.errors.join("\n"));
    expect(validation.exportData.stores.market_sizing_attempts[0].inputValues).toEqual({ confirmed: true });
    expect(JSON.stringify(payload)).toBe(original);
    const legacyComplete = { ...payload, schemaVersion: 3 } as Record<string, unknown>;
    delete legacyComplete.privacyScope;
    const completeValidation = validateLocalProgressImportPayload(legacyComplete);
    expect(completeValidation.status).toBe("valid");
    if (completeValidation.status !== "valid") throw new Error(completeValidation.errors.join("\n"));
    expect(completeValidation.exportData.privacyScope).toBe("complete");
    expect(completeValidation.exportData.stores.market_sizing_attempts[0].inputValues).toEqual(payload.stores.market_sizing_attempts[0].inputValues);
  });

  it("validates historical Standard Complete checksums against original unclassified text before normalization", async () => {
    const snapshot = Object.fromEntries(completeBackupStoreNames.map((name) => [name, []])) as unknown as AppStorageSnapshot<typeof completeBackupStoreNames>;
    const backup = await createCompleteBackup(snapshot, { exportedAt: timestamp });
    backup.sections.progress.stores.market_sizing_attempts.push({
      id: "legacy", templateId: "missing", startedAt: timestamp, inputValues: { rationale: "Private text", confirmed: true }
    });
    const { checksum: _checksum, ...unsigned } = backup;
    backup.checksum.value = await calculateCompleteBackupChecksum(unsigned);
    const original = JSON.stringify(backup);
    const validation = await validateCompleteBackupPayload(backup);
    expect(validation.status).toBe("valid");
    if (validation.status !== "valid") throw new Error(validation.errors.join("\n"));
    expect(validation.backup.sections.progress.stores.market_sizing_attempts[0].inputValues).toEqual({ confirmed: true });
    expect(JSON.stringify(backup)).toBe(original);
    const corrupted = structuredClone(backup);
    corrupted.sections.progress.stores.market_sizing_attempts[0].inputValues!.rationale = "Changed private text";
    expect((await validateCompleteBackupPayload(corrupted)).status).toBe("invalid");
  });
});
