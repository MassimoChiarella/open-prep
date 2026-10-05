import { describe, expect, it } from "vitest";

import { createCompleteBackupFromStorage, createCompleteBackupSummary, restoreCompleteBackup } from "@/features/settings/completeBackupStorage";
import { clearPersonalData, previewPersonalDataClear } from "@/features/settings/personalDataClear";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";
import { createLocalProgressExport, replaceLocalProgressWithImport } from "@/features/settings/localProgressExport";
import { createCompleteBackupFilesFromStorage, restoreCompleteBackupFiles } from "@/features/settings/completeBackupStorage";
import { serializeCompleteBackupFile } from "@/features/settings/completeBackupSet";

const timestamp = "2026-09-22T12:00:00.000Z";
const originalNote = "  Explain the household estimate.\n ";
const notes = [undefined, "", " \t\n ", originalNote];

describe("saved market-sizing note semantics", () => {
  it("applies the private scope to guided notes after their pack has been removed", async () => {
    const source = new MemoryAppStorage();
    await source.put("market_sizing_attempts", {
      id: "guided", templateId: "removed-pack-template", startedAt: timestamp, score: 90,
      inputValues: { population: "500000", adoption_note: "Private assumption", confirmed: true },
      noteInputIds: ["adoption_note"]
    });
    expect((await previewPersonalDataClear(source)).marketSizingNotes).toBe(1);
    const standard = await createLocalProgressExport(source, timestamp);
    expect(standard.stores.market_sizing_attempts[0].inputValues).toEqual({ population: "500000", confirmed: true });
    const publicFiles = await createCompleteBackupFilesFromStorage(source, { exportedAt: timestamp });
    expect(publicFiles.map(serializeCompleteBackupFile).join("")).not.toContain("Private assumption");
    const privateFiles = await createCompleteBackupFilesFromStorage(source, { exportedAt: timestamp, selectedOptionalScopes: ["private_text"] });
    expect(privateFiles.map(serializeCompleteBackupFile).join("")).toContain("Private assumption");
    const target = new MemoryAppStorage();
    await restoreCompleteBackupFiles(target, JSON.parse(JSON.stringify(privateFiles)));
    await replaceLocalProgressWithImport(target, standard);
    expect((await target.get("market_sizing_attempts", "guided"))?.inputValues?.adoption_note).toBe("Private assumption");
    await restoreCompleteBackupFiles(target, publicFiles);
    expect((await target.get("market_sizing_attempts", "guided"))?.inputValues?.adoption_note).toBe("Private assumption");
    await clearPersonalData(target);
    expect((await target.get("market_sizing_attempts", "guided"))?.inputValues).toEqual({ population: "500000", confirmed: true });
    expect((await target.get("market_sizing_attempts", "guided"))?.score).toBe(90);
    expect((await previewPersonalDataClear(target)).marketSizingNotes).toBe(0);
  });

  it("fails closed for unclassified legacy text, even numeric-looking private notes", async () => {
    const source = new MemoryAppStorage();
    await source.put("market_sizing_attempts", {
      id: "legacy", templateId: "missing", startedAt: timestamp, score: 80,
      inputValues: { note: "123", assumption: "500000", confirmed: true }
    });
    const standard = await createLocalProgressExport(source, timestamp);
    expect(standard.stores.market_sizing_attempts[0].inputValues).toEqual({ confirmed: true });
    const privateBackup = await createCompleteBackupFromStorage(source, { exportedAt: timestamp, selectedOptionalScopes: ["private_text"] });
    expect(privateBackup.sections.progress.stores.market_sizing_attempts[0].inputValues?.note).toBe("123");
    await clearPersonalData(source);
    expect((await source.get("market_sizing_attempts", "legacy"))?.inputValues).toEqual({ confirmed: true });
    expect((await source.get("market_sizing_attempts", "legacy"))?.score).toBe(80);
  });

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
