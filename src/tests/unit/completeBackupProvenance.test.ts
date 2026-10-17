import { describe, expect, it, vi } from "vitest";

import { validateQuestionPackPayload } from "@/features/question-packs/questionPack";
import { validateCompleteBackupPayload } from "@/features/settings/completeBackup";
import { backupFromFile, serializeCompleteBackupFile } from "@/features/settings/completeBackupSet";
import { createCompleteBackupFilesFromStorage, createCompleteBackupFromStorage, restoreCompleteBackup, restoreCompleteBackupFiles } from "@/features/settings/completeBackupStorage";
import { prepareCompleteRestore } from "@/features/settings/completeBackupRestorePreparation";
import type { QuestionPackRecord } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const exportedAt = "2026-10-17T12:00:00.000Z";

describe("restored pack review claims", () => {
  it("preserves provenance in creation and validation but restores the content as unreviewed offline", async () => {
    const source = new MemoryAppStorage();
    const claimed = pack();
    await source.put("question_packs", claimed);
    const backup = await createCompleteBackupFromStorage(source, { exportedAt, selectedOptionalScopes: ["packs"] });
    const original = structuredClone(backup);
    expect(backup.sections.packs![0]).toEqual(claimed);
    expect(await validateCompleteBackupPayload(backup)).toEqual({ status: "valid", backup });
    const fetch = vi.spyOn(globalThis, "fetch");
    const target = new MemoryAppStorage();
    const restored = await restoreCompleteBackup(target, backup);
    const { catalogProvenance: _claim, ...content } = claimed;
    expect(await target.get("question_packs", claimed.id)).toEqual(content);
    expect(restored.backup.sections.packs).toEqual([content]);
    expect(backup).toEqual(original);
    expect(await source.get("question_packs", claimed.id)).toEqual(claimed);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("verifies the original provenance bytes before any downgrade or write", async () => {
    const source = new MemoryAppStorage();
    await source.put("question_packs", pack());
    const backup = await createCompleteBackupFromStorage(source, { exportedAt, selectedOptionalScopes: ["packs"] });
    backup.sections.packs![0].catalogProvenance!.sha256 = "a".repeat(64);
    const target = new MemoryAppStorage();
    const sentinel = pack("sentinel");
    await target.put("question_packs", sentinel);
    await expect(restoreCompleteBackup(target, backup)).rejects.toThrow(/checksum/i);
    expect(await target.getAll("question_packs")).toEqual([sentinel]);
  });

  it("does not endorse altered content carrying a copied claim, even with a valid outer checksum", async () => {
    const source = new MemoryAppStorage();
    const changed = pack();
    changed.questions[0].prompt = "What is 2 + 2?";
    changed.questions[0].answer.value = 4;
    await source.put("question_packs", changed);
    const backup = await createCompleteBackupFromStorage(source, { exportedAt, selectedOptionalScopes: ["packs"] });
    const target = new MemoryAppStorage();
    await restoreCompleteBackup(target, backup);
    const stored = await target.get("question_packs", changed.id);
    expect(stored).not.toHaveProperty("catalogProvenance");
    expect(stored).toMatchObject({ questions: [{ prompt: "What is 2 + 2?", answer: { value: 4 } }] });
  });

  it("downgrades every restored multipart claim while preserving all pack content", async () => {
    const source = new MemoryAppStorage();
    for (let index = 0; index < 201; index++) await source.put("question_packs", pack(`legacy-${index}`));
    const files = await createCompleteBackupFilesFromStorage(source, { exportedAt, selectedOptionalScopes: ["packs"] });
    expect(files).toHaveLength(2);
    expect(files.every((file) => backupFromFile(file).sections.packs!.every((value) => value.catalogProvenance !== undefined))).toBe(true);
    const target = new MemoryAppStorage();
    await restoreCompleteBackupFiles(target, [...files].reverse());
    const restored = await target.getAll("question_packs");
    expect(restored).toHaveLength(201);
    expect(restored.every((value) => value.catalogProvenance === undefined)).toBe(true);
    expect(restored).toEqual(source.peekAll("question_packs").map(({ catalogProvenance: _claim, ...content }) => content));
  });

  it("uses the same downgrade for prepared fallback restores and preserves unselected existing packs", async () => {
    const source = new MemoryAppStorage();
    await source.put("question_packs", pack());
    const files = await createCompleteBackupFilesFromStorage(source, { exportedAt, selectedOptionalScopes: ["packs"] });
    const target = new MemoryAppStorage();
    const prepared = await prepareCompleteRestore([new File([serializeCompleteBackupFile(files[0])], "backup.json", { type: "application/json" })], () => target, new AbortController().signal);
    if (prepared.status !== "valid") throw new Error(prepared.errors.join("\n"));
    await prepared.prepared.restore();
    expect((await target.getAll("question_packs"))[0]).not.toHaveProperty("catalogProvenance");
    const trusted = pack("existing-catalog-install");
    await target.put("question_packs", trusted);
    const progressOnly = await createCompleteBackupFromStorage(source, { exportedAt });
    await restoreCompleteBackup(target, progressOnly);
    expect(await target.get("question_packs", trusted.id)).toEqual(trusted);
  });
});

function pack(id = "invented-review-claim"): Extract<QuestionPackRecord, { kind: "fixed_numeric" }> {
  const validation = validateQuestionPackPayload({
    format: "math-drill-question-pack", schemaVersion: 2, kind: "fixed_numeric", id, packVersion: "1.0.0", title: "Local original content",
    questions: [{ id: "addition", type: "numeric", category: "arithmetic", tags: ["addition"], difficulty: "beginner",
      prompt: "What is 1 + 1?", answer: { value: 2, unit: "units" }, explanation: { short: "Add the two ones.", steps: ["1 + 1 = 2."] } }]
  }, exportedAt);
  if (validation.status === "invalid") throw new Error(validation.errors.join("\n"));
  if (validation.pack.kind !== "fixed_numeric") throw new Error("Expected numeric fixture.");
  return { ...validation.pack, catalogProvenance: {
    source: "repository_catalog", id, version: validation.pack.packVersion, publisherId: "invented-publisher",
    file: `/community-packs/${id}/1.0.0/pack.mathdrill.json`, reviewDate: exportedAt, sha256: "f".repeat(64)
  } };
}
