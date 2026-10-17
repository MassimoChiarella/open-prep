import { describe, expect, it } from "vitest";
import { deleteFitStory, loadFitStoryBank, saveFitStory } from "@/features/case-practice/practiceRecords";
import { createFitStoryRecord } from "@/features/case-practice/fit/fitPractice";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("Fit story write conflicts", () => {
  it("protects newer edits and deletions for arbitrary imported story IDs", async () => {
    const storage = new MemoryAppStorage();
    const story = createFitStoryRecord({ title: "Launch", competency: "leadership", situation: "Delay", task: "Recover", action: "Original action", result: "Delivered", reflection: "Align earlier" }, "2026-10-17T12:00:00Z", "imported-story-without-prefix");
    await saveFitStory(storage, story);
    const [first] = await loadFitStoryBank(storage);
    const [second] = await loadFitStoryBank(storage);
    const newer = { ...story, action: "Newest action" };
    const saved = await saveFitStory(storage, newer, first.token);
    await expect(saveFitStory(storage, { ...second.story, result: "Stale result" }, second.token)).rejects.toThrow("changed");
    await expect(deleteFitStory(storage, story.id, second.token)).rejects.toThrow("changed");
    expect(await storage.get("practice_records", story.id)).toEqual({ ...newer, updatedAt: "2026-10-17T12:00:00.000Z" });
    await deleteFitStory(storage, story.id, saved);
    await expect(saveFitStory(storage, second.story, second.token)).rejects.toThrow("changed");
    expect(await storage.get("practice_records", story.id)).toBeUndefined();
    expect(await storage.getGeneration()).toBe(0);
  });

  it("rejects token reuse after delete/recreate and prevents accidental existing-ID creation", async () => {
    const storage = new MemoryAppStorage();
    const story = createFitStoryRecord({ title: "Launch", competency: "leadership", situation: "Delay", task: "Recover", action: "Plan", result: "Delivered", reflection: "Align" }, "2026-10-17T12:00:00Z", "legacy-id");
    const saved = await saveFitStory(storage, story);
    await expect(saveFitStory(storage, story)).rejects.toThrow("changed");
    const absent = await deleteFitStory(storage, story.id, saved);
    const recreated = await saveFitStory(storage, story, absent);
    expect(recreated.revision).toBeGreaterThan(absent.revision);
    await expect(saveFitStory(storage, story, absent)).rejects.toThrow("changed");
    await expect(deleteFitStory(storage, story.id, saved)).rejects.toThrow("changed");
  });
});
