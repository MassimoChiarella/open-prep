import { describe, expect, it } from "vitest";

import {
  deleteFitStory,
  loadFitStories,
  loadPracticeAttempts,
  loadPrepProfile,
  saveFitStory,
  savePracticeAttempt,
  savePrepProfile
} from "@/features/case-practice/practiceRecords";
import type { FitStoryRecord } from "@/features/case-practice/practiceTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("case practice records", () => {
  it("persists attempts and filters them by module", async () => {
    const storage = new MemoryAppStorage();

    await savePracticeAttempt(storage, {
      completedAt: "2026-08-12T12:00:00.000Z",
      itemId: "profit-structure",
      maxScore: 4,
      module: "structuring",
      score: 3
    });
    await savePracticeAttempt(storage, {
      completedAt: "2026-08-12T12:05:00.000Z",
      itemId: "market-entry-close",
      maxScore: 4,
      module: "synthesis",
      score: 4
    });

    expect(await loadPracticeAttempts(storage, "structuring")).toMatchObject([
      { itemId: "profit-structure", kind: "attempt", score: 3 }
    ]);
    expect(await loadPracticeAttempts(storage)).toHaveLength(2);
  });

  it("persists one profile and editable fit stories", async () => {
    const storage = new MemoryAppStorage();
    const story: FitStoryRecord = {
      action: "Replanned the work and aligned owners.",
      competency: "leadership",
      id: "fit-story-launch",
      kind: "fit_story",
      reflection: "Clarify ownership earlier.",
      result: "Delivered on time.",
      situation: "A launch was slipping.",
      task: "Recover the plan.",
      title: "Launch recovery",
      updatedAt: "2026-08-12T12:00:00.000Z"
    };

    await savePrepProfile(storage, {
      experienceLevel: "intermediate",
      interviewDate: "2026-09-15",
      targetFirms: ["Firm A"],
      updatedAt: "2026-08-12T12:00:00.000Z",
      weeklySessions: 5
    });
    await saveFitStory(storage, story);

    expect(await loadPrepProfile(storage)).toMatchObject({ id: "prep-profile", weeklySessions: 5 });
    expect(await loadFitStories(storage)).toEqual([story]);

    await deleteFitStory(storage, story.id);
    expect(await loadFitStories(storage)).toEqual([]);
  });
});
