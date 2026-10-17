import { describe, expect, it } from "vitest";
import { createCompleteBackupFromStorage, restoreCompleteBackup } from "@/features/settings/completeBackupStorage";
import { loadPracticeAttempts } from "@/features/case-practice/practiceRecords";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("Complete Backup timestamp normalization", () => {
  it("verifies original offset bytes before normalizing restored records and retained private events", async () => {
    const source = new MemoryAppStorage();
    const attempt = { id: "newer", kind: "attempt" as const, module: "structuring" as const, itemId: "case", completedAt: "2026-10-17T10:00:00-04:00", score: 3, maxScore: 4 };
    source.seedLegacy("practice_records", attempt);
    source.seedLegacy("practice_records", { ...attempt, id: "older", completedAt: "2026-10-17T13:00:00Z" });
    const backup = await createCompleteBackupFromStorage(source);
    const original = structuredClone(backup);
    const target = new MemoryAppStorage();
    target.seedLegacy("practice_records", { id: "prep-profile", kind: "prep_profile", updatedAt: "2026-10-17T10:00:00-04:00", experienceLevel: "intermediate", interviewDate: "2026-11-17", targetFirms: ["Local notes"], weeklySessions: 5 });
    await restoreCompleteBackup(target, backup);
    expect((await loadPracticeAttempts(target)).map(({ id, completedAt }) => ({ id, completedAt }))).toEqual([
      { id: "newer", completedAt: "2026-10-17T14:00:00.000Z" },
      { id: "older", completedAt: "2026-10-17T13:00:00.000Z" }
    ]);
    expect(await target.get("practice_records", "prep-profile")).toMatchObject({ updatedAt: "2026-10-17T14:00:00.000Z", interviewDate: "2026-11-17", targetFirms: ["Local notes"] });
    expect(backup).toEqual(original);
    const changed = backup.sections.progress.stores.practice_records.find((record) => record.kind === "attempt");
    if (changed === undefined) throw new Error("Expected an imported attempt.");
    changed.completedAt = "2026-10-17T14:00:00.000Z";
    const untouched = new MemoryAppStorage();
    await expect(restoreCompleteBackup(untouched, backup)).rejects.toThrow(/checksum/i);
    expect(await untouched.getAll("practice_records")).toEqual([]);
  });
});
