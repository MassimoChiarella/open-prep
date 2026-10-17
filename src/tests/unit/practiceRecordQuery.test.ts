import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { loadFitStories, loadFitStoryBank, loadPracticeAttempts, saveFitStory } from "@/features/case-practice/practiceRecords";
import type { FitStoryRecord, PracticeAttemptRecord, PracticeRecord } from "@/features/case-practice/practiceTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("practice record queries", () => {
  it("selects records by kind and optional module regardless of imported IDs", async () => {
    const storage = new MemoryAppStorage();
    const story = makeStory();
    const fitAttempt = makeAttempt("arbitrary imported fit result", "fit");
    const structuringAttempt = makeAttempt("fit-story-looking-attempt-id", "structuring");
    const profile: PracticeRecord = { id: "prep-profile", kind: "prep_profile", updatedAt: timestamp, targetFirms: ["Private firm"], weeklySessions: 3, experienceLevel: "beginner" };
    for (const record of [story, fitAttempt, structuringAttempt, profile]) await storage.put("practice_records", record);
    const stories = await storage.queryPracticeRecords("fit_story");
    const attempts = await storage.queryPracticeRecords("attempt");
    expectTypeOf(stories).toEqualTypeOf<FitStoryRecord[]>();
    expectTypeOf(attempts).toEqualTypeOf<PracticeAttemptRecord[]>();
    expect(stories).toEqual([story]);
    expect(attempts).toHaveLength(2);
    expect(await storage.queryPracticeRecords("attempt", "fit")).toEqual([fitAttempt]);
    expect(await storage.queryPracticeRecords("attempt", "structuring")).toEqual([structuringAttempt]);
    expect(await storage.queryPracticeRecords("attempt", "synthesis")).toEqual([]);
    expect(await storage.queryPracticeRecords("prep_profile")).toEqual([profile]);
    expect(await storage.queryPracticeRecords("full_case_draft")).toEqual([]);
  });

  it("returns independent clones without cloning unrelated private records in the test double", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("practice_records", makeStory());
    const attempt = makeAttempt("arbitrary import", "fit");
    await storage.put("practice_records", attempt);
    const clone = vi.spyOn(globalThis, "structuredClone");
    try {
      const result = await storage.queryPracticeRecords("attempt", "fit");
      expect(clone.mock.calls.map(([value]) => value)).toEqual([attempt]);
      result[0].score = 0;
      expect(await storage.queryPracticeRecords("attempt", "fit")).toEqual([attempt]);
    } finally { clone.mockRestore(); }
  });

  it("routes story and module history loaders through filtered queries", async () => {
    const storage = new MemoryAppStorage();
    const story = makeStory();
    const attempt = makeAttempt("arbitrary imported result", "fit");
    await storage.put("practice_records", story);
    await storage.put("practice_records", attempt);
    const all = vi.spyOn(storage, "getAll").mockRejectedValue(new Error("Unrelated collection read"));
    const query = vi.spyOn(storage, "queryPracticeRecords");
    expect(await loadFitStories(storage)).toEqual([story]);
    expect(await loadPracticeAttempts(storage, "fit")).toEqual([attempt]);
    expect(await loadPracticeAttempts(storage)).toEqual([attempt]);
    expect(query.mock.calls).toEqual([["fit_story"], ["attempt", "fit"], ["attempt", undefined]]);
    expect(all).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("pairs the latest saved story with its atomic write token after the indexed list changes", async () => {
    const storage = new MemoryAppStorage();
    const story = makeStory();
    await saveFitStory(storage, story);
    const [original] = await loadFitStoryBank(storage);
    const edited = { ...story, title: "Acknowledged newer title" };
    await saveFitStory(storage, edited, original.token);
    vi.spyOn(storage, "queryPracticeRecords").mockResolvedValueOnce([story]);
    try {
      const [loaded] = await loadFitStoryBank(storage);
      expect(loaded.story).toEqual(edited);
      expect(loaded.token.revision).toBe(original.token.revision + 1);
      await expect(saveFitStory(storage, { ...story, title: "Stale edit" }, original.token)).rejects.toMatchObject({ reason: "practice" });
      await expect(saveFitStory(storage, { ...edited, title: "Current edit" }, loaded.token)).resolves.toMatchObject({ revision: loaded.token.revision + 1 });
    } finally { vi.restoreAllMocks(); }
  });
});

const timestamp = "2026-10-17T12:00:00.000Z";
function makeStory(): FitStoryRecord {
  return { id: "attempt-looking-private-import", kind: "fit_story", updatedAt: timestamp, competency: "leadership", title: "Private story", situation: "Situation", task: "Task", action: "Action", result: "Result", reflection: "Reflection" };
}
function makeAttempt(id: string, module: PracticeAttemptRecord["module"]): PracticeAttemptRecord {
  return { id, kind: "attempt", module, itemId: "item", completedAt: timestamp, score: 3, maxScore: 4 };
}
