import { describe, expect, it } from "vitest";

import { createCompleteBackupFromStorage, createCompleteBackupSummary, restoreCompleteBackup } from "@/features/settings/completeBackupStorage";
import { clearPersonalData, previewPersonalDataClear } from "@/features/settings/personalDataClear";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const timestamp = "2026-09-22T12:00:00.000Z";
const originalNote = "  Explain the household estimate.\n ";
const notes = [undefined, "", " \t\n ", originalNote];

describe("saved market-sizing note semantics", () => {
  it("counts only actual text before and after backup JSON and IndexedDB-style cloning", async () => {
    const source = await notesStorage();
    expect((await previewPersonalDataClear(source)).marketSizingNotes).toBe(1);
    const backup = await createCompleteBackupFromStorage(source, {
      exportedAt: timestamp,
      selectedOptionalScopes: ["private_text"]
    });
    expect(createCompleteBackupSummary(backup).privateEntryCount).toBe(1);
    const target = new MemoryAppStorage();
    await restoreCompleteBackup(target, JSON.parse(JSON.stringify(backup)));
    expect((await previewPersonalDataClear(target)).marketSizingNotes).toBe(1);
    expect((await target.get("market_sizing_attempts", "note-3"))?.note).toBe(originalNote);
    expect((await clearPersonalData(target)).marketSizingNotes).toBe(1);
    expect((await previewPersonalDataClear(target)).marketSizingNotes).toBe(0);
    for (const record of target.peekAll("market_sizing_attempts")) {
      expect(Object.hasOwn(record, "note")).toBe(false);
      expect(record.score).toBe(80);
    }
  });

  it("does not preserve nonexistent private notes when restoring public progress", async () => {
    const target = await notesStorage();
    const source = new MemoryAppStorage();
    await source.put("market_sizing_attempts", {
      id: "note-0", startedAt: timestamp, templateId: "replacement", score: 90
    });
    const backup = await createCompleteBackupFromStorage(source, { exportedAt: timestamp });
    expect(createCompleteBackupSummary(backup).privateEntryCount).toBe(0);

    await restoreCompleteBackup(target, backup);

    expect(target.peekAll("market_sizing_attempts")).toEqual([
      { id: "note-0", startedAt: timestamp, templateId: "replacement", score: 90 },
      { id: "note-3", startedAt: timestamp, templateId: "fixture", score: 80, note: originalNote }
    ]);
  });
});

async function notesStorage() {
  const storage = new MemoryAppStorage();
  for (const [index, note] of notes.entries()) {
    await storage.put("market_sizing_attempts", {
      id: `note-${index}`, startedAt: timestamp, templateId: "fixture", score: 80, note
    });
  }
  await storage.put("market_sizing_attempts", { id: "absent", startedAt: timestamp, templateId: "fixture", score: 80 });
  return storage;
}
