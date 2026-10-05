import { describe, expect, it } from "vitest";
import { createCompleteBackupFilesFromStorage, restoreCompleteBackupFiles } from "@/features/settings/completeBackupStorage";
import { calculateCompleteBackupChecksum, validateCompleteBackupPayload } from "@/features/settings/completeBackup";
import { createLocalProgressExport } from "@/features/settings/localProgressExport";
import { diagnoseLocalRecovery, prepareLocalRecovery, archiveLocalRecovery } from "@/features/settings/localRecordRecovery";
import { assertPersistableRecord } from "@/lib/validation/inputLimits";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const timestamp = "2026-10-04T12:00:00.000Z";

describe("restorable record byte contracts", () => {
  it("roundtrips an intact 17 MiB escaped guided-note record through Complete", async () => {
    const storage = new MemoryAppStorage();
    const inputValues = Object.fromEntries(Array.from({ length: 29 }, (_, index) => [`note-${index}`, "\u0001".repeat(100_000)]));
    const record = { id: "large-sizing", templateId: "large", startedAt: timestamp, score: 100, inputValues, noteInputIds: Object.keys(inputValues) };
    await storage.put("market_sizing_attempts", record);
    await expect(createLocalProgressExport(storage, timestamp, "complete")).rejects.toThrow("Complete Backup");
    const files = await createCompleteBackupFilesFromStorage(storage, { exportedAt: timestamp, selectedOptionalScopes: ["private_text"] });
    const target = new MemoryAppStorage();
    await restoreCompleteBackupFiles(target, JSON.parse(JSON.stringify(files)));
    expect(await target.get("market_sizing_attempts", record.id)).toEqual(record);
    const publicExport = await createLocalProgressExport(storage, timestamp);
    expect(publicExport.stores.market_sizing_attempts[0].inputValues).toEqual({});
  }, 30_000);

  it("rejects aggregate escaped bytes before a write and offers lossless recovery for older oversized records", async () => {
    const inputValues = Object.fromEntries(Array.from({ length: 60 }, (_, index) => [`note-${index}`, "\u0001".repeat(100_000)]));
    const record = { id: "oversized", templateId: "legacy", startedAt: timestamp, inputValues, noteInputIds: Object.keys(inputValues) };
    expect(() => assertPersistableRecord(record)).toThrow("32 MiB");
    const storage = new MemoryAppStorage();
    await expect(storage.put("market_sizing_attempts", record)).rejects.toThrow("32 MiB");
    expect(await storage.get("market_sizing_attempts", record.id)).toBeUndefined();
    // Simulate a native historical record written before the byte guard.
    storage.seedLegacy("market_sizing_attempts", record);
    const issues = await diagnoseLocalRecovery(storage);
    expect(issues).toHaveLength(1);
    expect(issues[0].issues[0].reason).toContain("32 MiB");
    const preview = await prepareLocalRecovery(storage, issues[0]);
    const archive = JSON.parse(archiveLocalRecovery(preview));
    expect(archive.target.recordId).toBe(record.id);
    expect(archive.records).toHaveLength(1);
    expect(await storage.get("market_sizing_attempts", record.id)).toEqual(record);
  }, 30_000);

  it("accepts authenticated historical non-private Complete files with unclassified text", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("market_sizing_attempts", { id: "legacy", templateId: "missing", startedAt: timestamp, score: 80, inputValues: { note: "Private legacy text", confirmed: true } });
    const [file] = await createCompleteBackupFilesFromStorage(storage, { exportedAt: timestamp, selectedOptionalScopes: ["private_text"] });
    if (file.format !== "open-prep-complete-backup") throw new Error("Unexpected multipart fixture");
    file.selectedScopes = ["progress"];
    file.sections.progress.privacyScope = "standard";
    const { checksum: _checksum, ...unsigned } = file;
    file.checksum.value = await calculateCompleteBackupChecksum(unsigned);
    const validation = await validateCompleteBackupPayload(file);
    expect(validation.status).toBe("valid");
    if (validation.status !== "valid") throw new Error(validation.errors.join("\n"));
    expect(validation.backup.sections.progress.stores.market_sizing_attempts[0].inputValues).toEqual({ confirmed: true });
    // Validation must not alter the original authenticated input before checksum verification.
    expect(file.sections.progress.stores.market_sizing_attempts[0].inputValues?.note).toBe("Private legacy text");
  });
});
