import { describe, expect, it, vi } from "vitest";

import {
  deleteQuestionPack,
  getQuestionPackStoredBytes,
  loadQuestionPackPage,
  loadQuestionPacks,
  projectQuestionPackUsage,
  questionPackListPageSize,
  questionPackMaxInstalledBytes,
  questionPackMaxInstalledPacks,
  QuestionPackQuotaError,
  saveQuestionPack
} from "@/features/question-packs/questionPack";
import type { FixedNumericQuestionPackRecord } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("question-pack installed-library limits", () => {
  it("allows exact count and byte quotas and rejects one over", () => {
    expect(projectQuestionPackUsage({ installedCount: questionPackMaxInstalledPacks - 1, totalBytes: 0 }, 1))
      .toMatchObject({ installedCount: questionPackMaxInstalledPacks, replaced: false, totalBytes: 1 });
    expectQuotaError(
      () => projectQuestionPackUsage({ installedCount: questionPackMaxInstalledPacks, totalBytes: 0 }, 1),
      "count"
    );

    expect(projectQuestionPackUsage({ installedCount: 0, totalBytes: questionPackMaxInstalledBytes - 100 }, 100))
      .toMatchObject({ installedCount: 1, totalBytes: questionPackMaxInstalledBytes });
    expectQuotaError(
      () => projectQuestionPackUsage({ installedCount: 0, totalBytes: questionPackMaxInstalledBytes - 100 }, 101),
      "bytes"
    );
  });

  it("keeps legacy over-quota data and permits only non-worsening oversized replacements", () => {
    expect(projectQuestionPackUsage({
      existingPackBytes: 200,
      installedCount: questionPackMaxInstalledPacks + 1,
      totalBytes: questionPackMaxInstalledBytes + 100
    }, 200)).toMatchObject({
      installedCount: questionPackMaxInstalledPacks + 1,
      replaced: true,
      totalBytes: questionPackMaxInstalledBytes + 100
    });
    expect(projectQuestionPackUsage({
      existingPackBytes: 200,
      installedCount: questionPackMaxInstalledPacks + 1,
      totalBytes: questionPackMaxInstalledBytes + 100
    }, 100)).toMatchObject({ totalBytes: questionPackMaxInstalledBytes });
    expectQuotaError(
      () => projectQuestionPackUsage({
        existingPackBytes: 200,
        installedCount: questionPackMaxInstalledPacks + 1,
        totalBytes: questionPackMaxInstalledBytes + 100
      }, 201),
      "bytes"
    );
  });

  it("enforces the count quota before writes while allowing replacement and deletion", async () => {
    const storage = new MemoryAppStorage();
    const installed = Array.from(
      { length: questionPackMaxInstalledPacks - 1 },
      (_, index) => pack(index)
    );
    await Promise.all(installed.map((value) => storage.put("question_packs", value)));

    const boundary = pack(questionPackMaxInstalledPacks - 1);
    await expect(saveQuestionPack(storage, boundary)).resolves.toMatchObject({
      installedCount: questionPackMaxInstalledPacks,
      replaced: false
    });
    await expect(saveQuestionPack(storage, pack(questionPackMaxInstalledPacks))).rejects.toMatchObject({
      reason: "count"
    });
    expect(await storage.count("question_packs")).toBe(questionPackMaxInstalledPacks);

    await expect(saveQuestionPack(storage, { ...boundary, packVersion: "2.0.0", title: "Replacement" }))
      .resolves.toMatchObject({ installedCount: questionPackMaxInstalledPacks, replaced: true });
    expect(await storage.get("question_packs", boundary.id)).toMatchObject({
      packVersion: "2.0.0",
      title: "Replacement"
    });

    await deleteQuestionPack(storage, boundary.id);
    expect(await storage.count("question_packs")).toBe(questionPackMaxInstalledPacks - 1);
    await expect(saveQuestionPack(storage, pack(questionPackMaxInstalledPacks)))
      .resolves.toMatchObject({ installedCount: questionPackMaxInstalledPacks });
  });

  it("serializes concurrent installs so the count quota cannot be crossed", async () => {
    const storage = new MemoryAppStorage();
    await Promise.all(
      Array.from({ length: questionPackMaxInstalledPacks - 1 }, (_, index) =>
        storage.put("question_packs", pack(index))
      )
    );

    const results = await Promise.allSettled([
      saveQuestionPack(storage, pack(questionPackMaxInstalledPacks - 1)),
      saveQuestionPack(storage, pack(questionPackMaxInstalledPacks))
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(results.filter(({ status }) => status === "rejected")).toHaveLength(1);
    expect(results.find(({ status }) => status === "rejected")).toMatchObject({
      reason: { reason: "count" }
    });
    expect(await storage.count("question_packs")).toBe(questionPackMaxInstalledPacks);
  });

  it("does not alter the prior pack when a replacement write fails", async () => {
    const storage = new MemoryAppStorage();
    const original = pack(0);
    await storage.put("question_packs", original);
    const put = vi.spyOn(storage, "put").mockRejectedValueOnce(new Error("quota write failed"));

    await expect(saveQuestionPack(storage, { ...original, title: "Should not persist" }))
      .rejects.toThrow("quota write failed");
    expect(await storage.get("question_packs", original.id)).toEqual(original);
    put.mockRestore();
  });

  it("pages hundreds of legacy packs without gaps, duplicates, or getAll", async () => {
    const storage = new MemoryAppStorage();
    const installed = Array.from({ length: 300 }, (_, index) => pack(index));
    await Promise.all(installed.map((value) => storage.put("question_packs", value)));
    const getAll = vi.spyOn(storage, "getAll").mockRejectedValue(new Error("unbounded read"));

    const first = await loadQuestionPackPage(storage);
    const second = await loadQuestionPackPage(storage, first.continuationKey);
    const all = await loadQuestionPacks(storage);

    expect(first.values).toHaveLength(questionPackListPageSize);
    expect(second.values).toHaveLength(questionPackListPageSize);
    expect(first.values.map(({ id }) => id)).toEqual(
      Array.from({ length: questionPackListPageSize }, (_, index) => `pack-${299 - index}`)
    );
    expect(new Set([...first.values, ...second.values].map(({ id }) => id)).size).toBe(
      questionPackListPageSize * 2
    );
    expect(all).toHaveLength(300);
    expect(new Set(all.map(({ id }) => id)).size).toBe(300);
    expect(getAll).not.toHaveBeenCalled();
  });

  it("measures the deterministic UTF-8 payload bytes stored in IndexedDB", () => {
    const value = { ...pack(0), description: "Résumé 📈" };
    expect(getQuestionPackStoredBytes(value)).toBe(Buffer.byteLength(JSON.stringify(value), "utf8"));
  });
});

function expectQuotaError(callback: () => unknown, reason: "bytes" | "count"): void {
  let thrown: unknown;
  try {
    callback();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(QuestionPackQuotaError);
  expect(thrown).toMatchObject({ reason });
}

function pack(index: number): FixedNumericQuestionPackRecord {
  return {
    id: `pack-${index}`,
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "fixed_numeric",
    packVersion: "1.0.0",
    title: `Pack ${index}`,
    description: `Legacy detail ${index}`,
    questions: [{
      id: `question-${index}`,
      type: "numeric",
      category: "arithmetic",
      tags: ["addition"],
      difficulty: "beginner",
      prompt: `${index} + 1 = ?`,
      answer: { value: index + 1, unit: "none" },
      explanation: { short: "Add one.", steps: [`${index} + 1 = ${index + 1}.`] }
    }],
    importedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString()
  };
}
