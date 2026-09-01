import { describe, expect, it } from "vitest";

import { fitPracticePrompts } from "@/data/casePractice/fitPrompts";
import {
  createFitStoryRecord,
  fitReviewCriteria,
  scoreFitReview,
  validateFitStoryDraft,
  type FitStoryDraft
} from "@/features/case-practice/fit/fitPractice";
import type { PracticeAttemptRecord } from "@/features/case-practice/practiceTypes";
import { normalizeTimingAccommodation } from "@/features/timing/timingAccommodation";

const completeDraft: FitStoryDraft = {
  competency: "leadership",
  title: "  Launch recovery  ",
  situation: "  A critical launch was falling behind.  ",
  task: "  I had to recover the plan and rebuild confidence.  ",
  action: "  I reset priorities, assigned owners, and held daily risk reviews.  ",
  result: "  The team launched on time with no critical defects.  ",
  reflection: "  I now clarify ownership before delivery risks appear.  "
};

describe("fit self-review scoring", () => {
  it("scores only distinct checklist criteria", () => {
    expect(scoreFitReview(["answer_first", "specific_actions", "answer_first"])).toEqual({
      completedCriteria: ["answer_first", "specific_actions"],
      maxScore: 6,
      percentage: 33,
      score: 2
    });
  });

  it("returns a full score when every criterion is complete", () => {
    const result = scoreFitReview(fitReviewCriteria.map((criterion) => criterion.id));

    expect(result).toMatchObject({ maxScore: 6, percentage: 100, score: 6 });
  });

  it("keeps legacy attempts Standard while accepting an accommodated timing label", () => {
    const legacyAttempt: PracticeAttemptRecord = {
      completedAt: "2026-08-12T12:34:56.000Z",
      id: "attempt-fit-legacy",
      itemId: "leadership-uncertainty",
      kind: "attempt",
      maxScore: 6,
      module: "fit",
      score: 4
    };
    const accommodatedAttempt: PracticeAttemptRecord = {
      ...legacyAttempt,
      id: "attempt-fit-accommodated",
      timingAccommodation: "double_time"
    };

    expect(normalizeTimingAccommodation(legacyAttempt.timingAccommodation)).toBe("standard");
    expect(accommodatedAttempt.timingAccommodation).toBe("double_time");
  });
});

describe("fit story records", () => {
  it("validates required and maximum-length fields", () => {
    const errors = validateFitStoryDraft({
      ...completeDraft,
      action: " ",
      title: "x".repeat(81)
    });

    expect(errors).toEqual({
      action: "Action is required.",
      title: "Story title must be 80 characters or fewer."
    });
  });

  it("creates a trimmed local story record", () => {
    expect(createFitStoryRecord(completeDraft, "2026-08-12T12:34:56.000Z")).toEqual({
      action: "I reset priorities, assigned owners, and held daily risk reviews.",
      competency: "leadership",
      id: "fit-story-20260812123456000",
      kind: "fit_story",
      reflection: "I now clarify ownership before delivery risks appear.",
      result: "The team launched on time with no critical defects.",
      situation: "A critical launch was falling behind.",
      task: "I had to recover the plan and rebuild confidence.",
      title: "Launch recovery",
      updatedAt: "2026-08-12T12:34:56.000Z"
    });
  });

  it("rejects invalid records and preserves an existing record ID", () => {
    expect(() => createFitStoryRecord({ ...completeDraft, result: "" }, "2026-08-12T12:34:56.000Z")).toThrow(
      "Result is required."
    );
    expect(createFitStoryRecord(completeDraft, "2026-08-12T12:34:56.000Z", "fit-story-existing").id).toBe(
      "fit-story-existing"
    );
  });

  it("provides two original prompts for every fit competency", () => {
    expect(
      Object.fromEntries(
        ["leadership", "conflict", "failure", "impact"].map((competency) => [
          competency,
          fitPracticePrompts.filter((prompt) => prompt.competency === competency).length
        ])
      )
    ).toEqual({ conflict: 2, failure: 2, impact: 2, leadership: 2 });
  });
});
