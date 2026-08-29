import { describe, expect, it } from "vitest";

import {
  buildDailyWorkoutHref,
  createDailyWorkoutSession,
  dailyWorkoutSourceParam
} from "@/features/drills/dailyWorkout";
import type { SkillCategory, SkillTag } from "@/lib/domain";
import type {
  MistakeNotebookRecord,
  RetryScheduleRecord,
  StoredUserResponse
} from "@/lib/storage/appStorageTypes";

const now = "2026-08-09T12:00:00.000Z";

describe("Daily Workout", () => {
  it("builds links with the default product count and clamps requests to 10-20", () => {
    const defaultUrl = new URL(buildDailyWorkoutHref(), "http://localhost");
    const minimumUrl = new URL(buildDailyWorkoutHref(3), "http://localhost");
    const maximumUrl = new URL(buildDailyWorkoutHref(50), "http://localhost");

    expect(defaultUrl.pathname).toBe("/drills/session");
    expect(defaultUrl.searchParams.get("source")).toBe(dailyWorkoutSourceParam);
    expect(defaultUrl.searchParams.get("count")).toBe("10");
    expect(minimumUrl.searchParams.get("count")).toBe("10");
    expect(maximumUrl.searchParams.get("count")).toBe("20");
  });

  it("queues due reviews first, then weakness questions, then a mixed fill", () => {
    const dueOne = mistake({ id: "due-one", tags: ["addition"] });
    const dueTwo = mistake({ id: "due-two", tags: ["division"] });
    const created = createDailyWorkoutSession(
      {
        mistakes: [dueTwo, dueOne],
        responses: [
          ...Array.from({ length: 10 }, (_, index) =>
            response(`percentage-miss-${index + 1}`, "percentages", false, ["percentage_change"])
          ),
          response("arithmetic-correct", "arithmetic", true, ["addition"])
        ],
        retrySchedules: [
          schedule("schedule-two", dueTwo.id, "2026-08-08T12:00:00.000Z"),
          schedule("schedule-one", dueOne.id, "2026-08-07T12:00:00.000Z")
        ]
      },
      deterministicOptions()
    );

    expect(created.questions).toHaveLength(10);
    expect(created.questions.slice(0, 2).map((question) => question.id)).toEqual([
      "retry-due-one",
      "retry-due-two"
    ]);
    expect(created.questions.slice(2, 6).every((question) =>
      question.category === "percentages" && question.tags.includes("percentage_change")
    )).toBe(true);
    expect(new Set(created.questions.slice(6).map((question) => question.category)).size).toBeGreaterThan(1);
    expect(created.questions.slice(6).every((question) => question.category !== "percentages")).toBe(true);
    expect(created.session.questionIds).toEqual(created.questions.map((question) => question.id));
    expect(created.session.settings.questionCount).toBe(10);
  });

  it("uses the weakest skill before the balanced fill when no reviews are due", () => {
    const created = createDailyWorkoutSession(
      {
        mistakes: [],
        responses: [
          ...Array.from({ length: 10 }, (_, index) =>
            response(`business-miss-${index + 1}`, "business_math", false, ["margin"])
          ),
          response("percentage-correct", "percentages", true, ["percentage_change"])
        ],
        retrySchedules: []
      },
      deterministicOptions()
    );

    expect(created.questions.slice(0, 5).every((question) =>
      question.category === "business_math" && question.tags.includes("margin")
    )).toBe(true);
    expect(created.questions.slice(5).every((question) => question.category !== "business_math")).toBe(true);
  });

  it("produces a balanced local workout with no history or due items", () => {
    const created = createDailyWorkoutSession(
      { mistakes: [], responses: [], retrySchedules: [] },
      deterministicOptions()
    );
    const categoryCounts = created.questions.reduce<Record<string, number>>((counts, question) => {
      counts[question.category] = (counts[question.category] ?? 0) + 1;
      return counts;
    }, {});

    expect(created.questions).toHaveLength(10);
    expect(categoryCounts).toEqual({
      arithmetic: 2,
      business_math: 2,
      fractions_decimals_ratios: 2,
      percentages: 2,
      weighted_averages: 2
    });
    expect(created.questions.every((question) => question.metadata?.sourceType === "generated")).toBe(true);
  });

  it("clamps session counts and produces unique deterministic questions", () => {
    const data = { mistakes: [], responses: [], retrySchedules: [] };
    const first = createDailyWorkoutSession(data, {
      ...deterministicOptions(),
      questionCount: 50
    });
    const second = createDailyWorkoutSession(data, {
      ...deterministicOptions(),
      questionCount: 50
    });

    expect(first).toEqual(second);
    expect(first.questions).toHaveLength(20);
    expect(new Set(first.questions.map((question) => question.id))).toHaveLength(20);
    expect(createDailyWorkoutSession(data, {
      ...deterministicOptions(),
      questionCount: 2
    }).questions).toHaveLength(10);
  });

  it("ignores due schedules when the current date is invalid and still fills locally", () => {
    const missed = mistake({ id: "invalid-date-due" });
    const created = createDailyWorkoutSession(
      {
        mistakes: [missed],
        responses: [],
        retrySchedules: [schedule("invalid-date-schedule", missed.id, "2026-08-08T12:00:00.000Z")]
      },
      { ...deterministicOptions(), now: "not-a-date" }
    );

    expect(created.questions).toHaveLength(10);
    expect(created.questions.every((question) => !question.id.startsWith("retry-"))).toBe(true);
  });
});

function deterministicOptions() {
  return {
    now,
    questionCount: 10,
    seed: "daily-workout-test",
    sessionId: "daily-workout-session",
    startedAt: now
  } as const;
}

function response(
  id: string,
  category: SkillCategory,
  isCorrect: boolean,
  tags: SkillTag[]
): StoredUserResponse {
  return {
    category,
    errorTypes: isCorrect ? ["none"] : ["arithmetic_error"],
    id,
    isCorrect,
    questionId: id,
    rawInput: isCorrect ? "10" : "9",
    sessionId: "history-session",
    submittedAt: now,
    tags,
    timeTakenSeconds: isCorrect ? 10 : 30
  };
}

function mistake(overrides: Partial<MistakeNotebookRecord> = {}): MistakeNotebookRecord {
  return {
    answer: { value: 25 },
    category: "arithmetic",
    difficulty: "beginner",
    errorTypes: ["arithmetic_error"],
    explanation: { short: "Use the formula.", steps: ["Calculate the result."] },
    id: "mistake",
    missedAt: "2026-08-01T12:00:00.000Z",
    prompt: "Missed prompt",
    rawInput: "20",
    retryCount: 0,
    sourceQuestionId: "source-question",
    sourceType: "drill",
    status: "unresolved",
    tags: ["addition"],
    ...overrides
  };
}

function schedule(id: string, sourceId: string, dueAt: string): RetryScheduleRecord {
  return {
    attemptCount: 0,
    createdAt: "2026-08-01T12:00:00.000Z",
    dueAt,
    id,
    intervalDays: 1,
    sourceId,
    sourceType: "mistake_notebook",
    updatedAt: "2026-08-01T12:00:00.000Z"
  };
}
