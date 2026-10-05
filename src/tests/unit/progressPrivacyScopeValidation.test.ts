import { describe, expect, it } from "vitest";

import { calculateCompleteBackupChecksum, createCompleteBackup, validateCompleteBackupPayload } from "@/features/settings/completeBackup";
import { createLocalProgressExport, replaceLocalProgressWithImport, validateLocalProgressImportPayload } from "@/features/settings/localProgressExport";
import { completeBackupStoreNames } from "@/features/settings/localDataInventory";
import type { AppStorageSnapshot } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const timestamp = "2026-10-04T12:00:00.000Z";

describe("progress import privacy scope validation", () => {
  it.each(["top-level", "guided", "practice"] as const)("rejects an explicitly private %s record marked as Standard progress without changing saved data", async (kind) => {
    const source = new MemoryAppStorage();
    const payload = await createLocalProgressExport(source, timestamp);
    if (kind === "practice") {
      payload.stores.practice_records.push({
        id: "prep-profile", kind: "prep_profile", experienceLevel: "beginner", targetFirms: [], weeklySessions: 5, updatedAt: timestamp
      });
    } else {
      payload.stores.market_sizing_attempts.push({
        id: "private-sizing", templateId: "removed-pack", startedAt: timestamp,
        ...(kind === "top-level" ? { note: "Private review" } : { inputValues: { rationale: "123" }, noteInputIds: ["rationale"] })
      });
    }
    expect(validateLocalProgressImportPayload(payload).status).toBe("invalid");
    const target = new MemoryAppStorage();
    await target.put("market_sizing_attempts", { id: "retained", templateId: "fixture", startedAt: timestamp, note: "Existing private text" });
    await expect(replaceLocalProgressWithImport(target, payload)).rejects.toThrow(/Standard progress must not contain/);
    expect(target.peekAll("market_sizing_attempts")).toEqual([
      { id: "retained", templateId: "fixture", startedAt: timestamp, note: "Existing private text" }
    ]);
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
