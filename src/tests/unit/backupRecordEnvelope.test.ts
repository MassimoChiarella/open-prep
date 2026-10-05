import { describe, expect, it } from "vitest";

import { createCompleteBackupFilesFromStorage, restoreCompleteBackupFiles } from "@/features/settings/completeBackupStorage";
import { serializeCompleteBackupFile } from "@/features/settings/completeBackupSet";
import { completeBackupLimits } from "@/features/settings/localDataInventory";
import { maxStoredRecordBytes } from "@/lib/validation/inputLimits";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("persisted record and Complete file envelope alignment", () => {
  it("fits and restores an intact record within 1 MiB of the padded 32 MiB record cap", async () => {
    const inputValues = Object.fromEntries(Array.from({ length: 55 }, (_, index) => [`note-${index}`, "\u0001".repeat(100_000)]));
    const record = {
      id: "near-record-cap", templateId: "historical", startedAt: "2026-10-04T12:00:00.000Z",
      inputValues, noteInputIds: Object.keys(inputValues), score: 100
    };
    const source = new MemoryAppStorage();
    await source.put("market_sizing_attempts", record);
    const files = await createCompleteBackupFilesFromStorage(source, { selectedOptionalScopes: ["private_text"] });
    expect(files).toHaveLength(1);
    const serialized = serializeCompleteBackupFile(files[0]);
    const bytes = new TextEncoder().encode(serialized).byteLength;
    expect(bytes).toBeGreaterThan(maxStoredRecordBytes - 1024 * 1024);
    expect(bytes).toBeLessThanOrEqual(completeBackupLimits.maxFileBytes);
    const restored = new MemoryAppStorage();
    await restoreCompleteBackupFiles(restored, [JSON.parse(serialized)], { sourceSizes: [bytes] });
    expect(await restored.get("market_sizing_attempts", record.id)).toEqual(record);
  }, 30_000);
});
