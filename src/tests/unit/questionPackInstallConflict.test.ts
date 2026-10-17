import { describe, expect, it, vi } from "vitest";

import { QuestionPackConflictError, saveQuestionPack, validateQuestionPackPayload } from "@/features/question-packs/questionPack";
import type { QuestionPackRecord } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("reviewed question-pack installation", () => {
  it("installs only while the reviewed absence still holds", async () => {
    const storage = new MemoryAppStorage();
    const candidate = pack("Candidate");
    await expect(saveQuestionPack(storage, candidate, { expectedCurrent: null })).resolves.toMatchObject({ replaced: false });
    await expect(saveQuestionPack(storage, pack("Other candidate"), { expectedCurrent: null })).rejects.toMatchObject({
      name: "QuestionPackConflictError", current: candidate
    });
    expect(await storage.get("question_packs", candidate.id)).toEqual(candidate);
  });

  it("rejects a reviewed record changed after the quota scan, before the atomic write", async () => {
    const storage = new MemoryAppStorage();
    const reviewed = pack("Reviewed");
    const newer = pack("Other tab", "2.0.0");
    await storage.put("question_packs", reviewed);
    const atomic = storage.atomic.bind(storage);
    vi.spyOn(storage, "atomic").mockImplementationOnce(async (options, decide) => {
      await storage.put("question_packs", newer);
      return atomic(options, decide);
    });
    await expect(saveQuestionPack(storage, pack("Candidate"), { expectedCurrent: reviewed })).rejects.toBeInstanceOf(QuestionPackConflictError);
    expect(await storage.get("question_packs", reviewed.id)).toEqual(newer);
  });

  it("does not recreate a reviewed pack that was deleted", async () => {
    const storage = new MemoryAppStorage();
    const reviewed = pack("Reviewed");
    await storage.put("question_packs", reviewed);
    await storage.delete("question_packs", reviewed.id);
    await expect(saveQuestionPack(storage, pack("Candidate"), { expectedCurrent: reviewed })).rejects.toMatchObject({
      name: "QuestionPackConflictError", current: undefined
    });
    expect(await storage.get("question_packs", reviewed.id)).toBeUndefined();
  });

  it("allows an unchanged reviewed replacement and keeps explicit programmatic replacement compatible", async () => {
    const storage = new MemoryAppStorage();
    const reviewed = pack("Reviewed");
    const candidate = pack("Candidate");
    await storage.put("question_packs", reviewed);
    await expect(saveQuestionPack(storage, candidate, { expectedCurrent: structuredClone(reviewed) })).resolves.toMatchObject({ replaced: true });
    const programmatic = pack("Programmatic");
    await saveQuestionPack(storage, programmatic);
    expect(await storage.get("question_packs", reviewed.id)).toEqual(programmatic);
  });
});

function pack(title: string, packVersion = "1.0.0"): QuestionPackRecord {
  const validation = validateQuestionPackPayload({
    format: "math-drill-question-pack", schemaVersion: 2, kind: "fixed_numeric",
    id: "shared-review-id", packVersion, title, publisher: title,
    questions: [{ id: "addition", type: "numeric", category: "arithmetic", tags: ["addition"], difficulty: "beginner",
      prompt: "What is 1 + 1?", answer: { value: 2, unit: "units" }, explanation: { short: "Add the two ones.", steps: ["1 + 1 = 2."] } }]
  }, "2026-10-17T12:00:00.000Z");
  if (validation.status === "invalid") throw new Error(validation.errors.join("\n"));
  return validation.pack;
}
