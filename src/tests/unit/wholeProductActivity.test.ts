import { describe, expect, it } from "vitest";

import type {
  FitStoryRecord,
  PracticeAttemptRecord,
  PracticeModuleId,
  PrepProfileRecord
} from "@/features/case-practice/practiceTypes";
import {
  createWholeProductActivityAccumulator,
  createWholeProductActivitySummary,
  wholeProductRecentActivityLimit
} from "@/features/progress/wholeProductActivity";
import type { DrillSettings, Question, SessionScore } from "@/lib/domain";
import type {
  BenchmarkResultRecord,
  ExhibitAttemptRecord,
  MarketSizingAttemptRecord,
  MistakeNotebookRecord,
  RetryScheduleRecord,
  StoredDrillSession
} from "@/lib/storage/appStorageTypes";

const practiceModules = [
  "brainstorming",
  "fit",
  "full_case",
  "lessons",
  "questioning",
  "structuring",
  "synthesis"
] as const satisfies readonly PracticeModuleId[];

describe("whole-product activity", () => {
  it("keeps every completed family and every case module in separate domain summaries", () => {
    const practiceRecords = practiceModules.map((module, index) =>
      practiceAttempt(module, `case-${index}`, `2026-08-20T${String(index + 10).padStart(2, "0")}:00:00Z`, 3, 4)
    );
    const summary = createWholeProductActivitySummary({
      benchmarkResults: [benchmarkResult("benchmark", "orphan-benchmark", "2026-08-20T19:00:00Z", 3, 1)],
      exhibitAttempts: [exhibitAttempt("exhibit", "2026-08-20T17:00:00Z", true)],
      marketSizingAttempts: [marketAttempt("market", "2026-08-20T18:00:00Z", 8, 10)],
      practiceRecords: [
        ...practiceRecords,
        prepProfile("2026-08-20T20:00:00Z", ["PRIVATE FIRM"])
      ],
      sessions: [drillSession("drill", "2026-08-20T09:00:00Z", 1, 1)]
    });

    expect(summary.activityCount).toBe(12);
    expect(summary.math).toMatchObject({
      accuracy: 0.5,
      completedSessionCount: 1,
      correctCount: 1,
      incorrectCount: 1,
      questionCount: 2
    });
    expect(summary.benchmarks).toMatchObject({
      accuracy: 0.75,
      completedResultCount: 1,
      correctCount: 3,
      incorrectCount: 1,
      questionCount: 4
    });
    expect(summary.exhibits).toMatchObject({
      accuracy: 1,
      averageScorePercent: 100,
      completedAttemptCount: 1,
      evaluatedAttemptCount: 1
    });
    expect(summary.marketSizing).toEqual({
      averageScorePercent: 80,
      completedAttemptCount: 1,
      scoredAttemptCount: 1
    });
    expect(summary.casePractice.completedAttemptCount).toBe(practiceModules.length);
    expect(summary.casePractice.modules.map(({ module }) => module)).toEqual(practiceModules);
    expect(summary.casePractice.modules.every((module) => module.completedAttemptCount === 1)).toBe(true);
    expect(summary.prepPlan).toEqual({ saved: true, updatedAt: "2026-08-20T20:00:00.000Z" });
    expect(summary).not.toHaveProperty("overallScore");
    expect(summary.recentActivities).toHaveLength(wholeProductRecentActivityLimit);
  });

  it.each([
    ["drill", () => createWholeProductActivitySummary({ sessions: [drillSession("only-drill", "2026-08-21T12:00:00Z")] })],
    ["benchmark", () => createWholeProductActivitySummary({ benchmarkResults: [benchmarkResult("only-benchmark", "only-benchmark-session", "2026-08-21T12:00:00Z")] })],
    ["exhibit", () => createWholeProductActivitySummary({ exhibitAttempts: [exhibitAttempt("only-exhibit", "2026-08-21T12:00:00Z", true)] })],
    ["market sizing", () => createWholeProductActivitySummary({ marketSizingAttempts: [marketAttempt("only-market", "2026-08-21T12:00:00Z", 3, 4)] })],
    ["case practice", () => createWholeProductActivitySummary({ practiceRecords: [practiceAttempt("questioning", "only-case", "2026-08-21T12:00:00Z")] })],
    ["prep plan", () => createWholeProductActivitySummary({ practiceRecords: [prepProfile("2026-08-21T12:00:00Z")] })]
  ])("treats %s-only storage as returning activity", (_family, createSummary) => {
    expect(createSummary()).toMatchObject({
      activityCount: 1,
      hasQualifyingActivity: true,
      hasReturningHistory: true,
      isEmpty: false
    });
  });

  it("recognizes case-only history without inventing math performance", () => {
    const summary = createWholeProductActivitySummary({
      practiceRecords: [practiceAttempt("structuring", "case-only", "2026-08-21T12:00:00Z", 2, 4)],
      timeZone: "UTC"
    });

    expect(summary).toMatchObject({
      activityCount: 1,
      activityDates: ["2026-08-21"],
      hasQualifyingActivity: true,
      hasReturningHistory: true,
      isEmpty: false,
      math: {
        completedSessionCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        questionCount: 0
      }
    });
    expect(summary.recentActivities).toEqual([
      {
        href: "/case-practice/structuring",
        id: "case:structuring:case-only",
        kind: "case_practice",
        label: "Structuring",
        timestamp: "2026-08-21T12:00:00.000Z"
      }
    ]);
  });

  it("counts a benchmark result and linked drill session once while retaining math detail", () => {
    const summary = createWholeProductActivitySummary({
      benchmarkResults: [benchmarkResult("result", "linked-session", "2026-08-22T12:05:00Z", 4, 1)],
      sessions: [drillSession("linked-session", "2026-08-22T12:00:00Z", 4, 1)],
      timeZone: "UTC"
    });

    expect(summary.activityCount).toBe(1);
    expect(summary.activityDates).toEqual(["2026-08-22"]);
    expect(summary.math).toMatchObject({ completedSessionCount: 1, questionCount: 5 });
    expect(summary.benchmarks).toMatchObject({ completedResultCount: 1, questionCount: 5 });
    expect(summary.recentActivities).toEqual([
      expect.objectContaining({
        id: "benchmark-session:linked-session",
        kind: "benchmark",
        timestamp: "2026-08-22T12:05:00.000Z"
      })
    ]);
  });

  it("chooses the latest duplicate benchmark then the smallest stable id and counts orphans once", () => {
    const summary = createWholeProductActivitySummary({
      benchmarkResults: [
        benchmarkResult("old", "duplicate-session", "2026-08-20T12:00:00Z", 0, 4),
        benchmarkResult("z-latest", "duplicate-session", "2026-08-23T12:00:00Z", 1, 3),
        benchmarkResult("a-latest", "duplicate-session", "2026-08-23T12:00:00Z", 4, 0),
        benchmarkResult("orphan", "other-orphan-session", "2026-08-22T12:00:00Z", 1, 1)
      ]
    });

    expect(summary.activityCount).toBe(2);
    expect(summary.benchmarks).toMatchObject({
      accuracy: 5 / 6,
      completedResultCount: 2,
      correctCount: 5,
      incorrectCount: 1,
      questionCount: 6
    });
    expect(summary.recentActivities.map(({ id }) => id)).toEqual([
      "benchmark-session:duplicate-session",
      "benchmark-session:other-orphan-session"
    ]);
  });

  it("excludes drafts, incomplete attempts, invalid completions, Fit stories, packs, and settings", () => {
    const draft = { ...drillSession("draft", "2026-08-24T10:00:00Z"), endedAt: undefined, score: undefined };
    const fitStory: FitStoryRecord = {
      action: "PRIVATE ACTION",
      competency: "impact",
      id: "fit-story",
      kind: "fit_story",
      reflection: "PRIVATE REFLECTION",
      result: "PRIVATE RESULT",
      situation: "PRIVATE SITUATION",
      task: "PRIVATE TASK",
      title: "PRIVATE TITLE",
      updatedAt: "2026-08-24T11:00:00Z"
    };
    const invalidAttempt = {
      ...practiceAttempt("fit", "invalid", "2026-08-24T12:00:00Z"),
      completedAt: "not-a-date"
    };

    const summary = createWholeProductActivitySummary({
      exhibitAttempts: [{ exhibitId: "draft", id: "draft-exhibit", startedAt: "2026-08-24T10:00:00Z" }],
      marketSizingAttempts: [{ id: "draft-market", startedAt: "2026-08-24T10:00:00Z", templateId: "draft" }],
      practiceRecords: [fitStory, invalidAttempt],
      sessions: [draft]
    });

    expect(summary).toMatchObject({
      activityCount: 0,
      activityDates: [],
      hasQualifyingActivity: false,
      hasReturningHistory: false,
      isEmpty: true,
      recentActivities: []
    });
  });

  it("orders equal timestamps by namespaced stable id and retains only the five newest items", () => {
    const tiedAt = "2026-08-25T12:00:00Z";
    const tied = createWholeProductActivitySummary({
      exhibitAttempts: [exhibitAttempt("same", tiedAt, true)],
      marketSizingAttempts: [marketAttempt("same", tiedAt, 1, 1)],
      practiceRecords: [
        practiceAttempt("structuring", "same", tiedAt),
        prepProfile(tiedAt)
      ],
      sessions: [drillSession("same", tiedAt)]
    });

    expect(tied.recentActivities.map(({ id }) => id)).toEqual([
      "case:structuring:same",
      "drill:same",
      "exhibit:same",
      "market-sizing:same",
      "prep-plan:prep-profile"
    ]);

    const many = createWholeProductActivitySummary({
      exhibitAttempts: Array.from({ length: 10 }, (_, index) =>
        exhibitAttempt(`exhibit-${index}`, `2026-08-${String(index + 1).padStart(2, "0")}T12:00:00Z`, true)
      )
    });

    expect(many.recentActivities).toHaveLength(5);
    expect(many.recentActivities.map(({ id }) => id)).toEqual([
      "exhibit:exhibit-9",
      "exhibit:exhibit-8",
      "exhibit:exhibit-7",
      "exhibit:exhibit-6",
      "exhibit:exhibit-5"
    ]);

    const shuffledDates = createWholeProductActivitySummary({
      exhibitAttempts: [
        exhibitAttempt("date-24", "2026-08-24T12:00:00Z", true),
        exhibitAttempt("date-26", "2026-08-26T12:00:00Z", true),
        exhibitAttempt("date-25", "2026-08-25T12:00:00Z", true)
      ],
      timeZone: "UTC"
    });
    expect(shuffledDates.activityDates).toEqual(["2026-08-26", "2026-08-25", "2026-08-24"]);
  });

  it("never copies story, profile, response, prompt, exhibit, or market-sizing prose", () => {
    const sentinels = [
      "PRIVATE STORY PROSE",
      "PRIVATE PROFILE FIRM",
      "PRIVATE DRILL PROMPT",
      "PRIVATE RAW ANSWER",
      "PRIVATE EXHIBIT FEEDBACK",
      "PRIVATE MARKET NOTE",
      "PRIVATE MISTAKE PROMPT"
    ];
    const story: FitStoryRecord = {
      action: sentinels[0],
      competency: "leadership",
      id: "story-safe-id",
      kind: "fit_story",
      reflection: sentinels[0],
      result: sentinels[0],
      situation: sentinels[0],
      task: sentinels[0],
      title: sentinels[0],
      updatedAt: "2026-08-26T09:00:00Z"
    };
    const session = drillSession("privacy-session", "2026-08-26T10:00:00Z");
    session.questions = [question("privacy-question", sentinels[2])];
    session.responses = [{
      errorTypes: ["none"],
      isCorrect: true,
      questionId: "privacy-question",
      rawInput: sentinels[3],
      submittedAt: "2026-08-26T10:00:00Z",
      timeTakenSeconds: 10
    }];
    const exhibit = {
      ...exhibitAttempt("privacy-exhibit", "2026-08-26T11:00:00Z", false),
      feedbackMessage: sentinels[4],
      rawInput: sentinels[3]
    };
    const market = {
      ...marketAttempt("privacy-market", "2026-08-26T12:00:00Z", 1, 2),
      finalAnswer: sentinels[3],
      inputValues: { private: sentinels[5] },
      note: sentinels[5]
    };
    const mistake = mistakeRecord(sentinels[6]);

    const serialized = JSON.stringify(createWholeProductActivitySummary({
      exhibitAttempts: [exhibit],
      marketSizingAttempts: [market],
      mistakeNotebook: [mistake],
      practiceRecords: [prepProfile("2026-08-26T13:00:00Z", [sentinels[1]]), story],
      sessions: [session]
    }));

    for (const sentinel of sentinels) expect(serialized).not.toContain(sentinel);
  });

  it("uses mistake and retry-only legacy records only to establish returning history", () => {
    const summary = createWholeProductActivitySummary({
      mistakeNotebook: [mistakeRecord("LEGACY PRIVATE PROMPT")],
      retrySchedules: [retrySchedule()]
    });

    expect(summary).toMatchObject({
      activityCount: 0,
      activityDates: [],
      hasQualifyingActivity: false,
      hasReturningHistory: true,
      isEmpty: false,
      recentActivities: []
    });
    expect(summary.math.completedSessionCount).toBe(0);
    expect(summary.benchmarks.completedResultCount).toBe(0);
    expect(summary.exhibits.completedAttemptCount).toBe(0);
    expect(summary.marketSizing.completedAttemptCount).toBe(0);
    expect(summary.casePractice.completedAttemptCount).toBe(0);
  });

  it("supports cursor-style ingestion and matches the one-shot helper", () => {
    const records = [
      practiceAttempt("questioning", "cursor-1", "2026-08-27T10:00:00Z"),
      practiceAttempt("synthesis", "cursor-2", "2026-08-27T11:00:00Z")
    ];
    const accumulator = createWholeProductActivityAccumulator({ timeZone: "UTC" });
    for (const record of records) accumulator.addPracticeRecord(record);
    accumulator.addDrillSession(drillSession("cursor-drill", "2026-08-27T12:00:00Z"));
    accumulator.addBenchmarkResult(benchmarkResult("cursor-benchmark", "cursor-orphan", "2026-08-27T13:00:00Z"));
    accumulator.addExhibitAttempt(exhibitAttempt("cursor-exhibit", "2026-08-27T14:00:00Z", true));
    accumulator.addMarketSizingAttempt(marketAttempt("cursor-market", "2026-08-27T15:00:00Z", 1, 2));

    expect(accumulator.finalize()).toEqual(createWholeProductActivitySummary({
      benchmarkResults: [benchmarkResult("cursor-benchmark", "cursor-orphan", "2026-08-27T13:00:00Z")],
      exhibitAttempts: [exhibitAttempt("cursor-exhibit", "2026-08-27T14:00:00Z", true)],
      marketSizingAttempts: [marketAttempt("cursor-market", "2026-08-27T15:00:00Z", 1, 2)],
      practiceRecords: records,
      sessions: [drillSession("cursor-drill", "2026-08-27T12:00:00Z")],
      timeZone: "UTC"
    }));
  });

  it("aggregates a large streamed practice fixture while bounding recent candidates", () => {
    const startedAt = performance.now();
    const accumulator = createWholeProductActivityAccumulator({ timeZone: "UTC" });
    const recordCount = 20_000;

    for (let index = 0; index < recordCount; index += 1) {
      accumulator.addPracticeRecord(practiceAttempt(
        practiceModules[index % practiceModules.length],
        `large-${String(index).padStart(5, "0")}`,
        `2026-08-28T${String(index % 24).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}:00Z`,
        index % 5,
        4
      ));
    }

    const summary = accumulator.finalize();
    const elapsedMs = performance.now() - startedAt;
    expect(summary.activityCount).toBe(recordCount);
    expect(summary.casePractice.completedAttemptCount).toBe(recordCount);
    expect(summary.casePractice.modules.reduce(
      (total, module) => total + module.completedAttemptCount,
      0
    )).toBe(recordCount);
    expect(summary.activityDates).toEqual(["2026-08-28"]);
    expect(summary.recentActivities).toHaveLength(wholeProductRecentActivityLimit);
    expect(elapsedMs).toBeLessThan(2_500);
  });
});

const defaultSettings: DrillSettings = {
  categories: ["arithmetic"],
  difficulty: "intermediate",
  feedbackMode: "end_of_session",
  questionCount: 2,
  timeMode: "untimed"
};

function score(correctCount = 1, incorrectCount = 0): SessionScore {
  const questionCount = correctCount + incorrectCount;
  return {
    accuracy: questionCount === 0 ? 0 : correctCount / questionCount,
    averageTimeSeconds: 12,
    categoryBreakdown: [],
    correctCount,
    errorBreakdown: [],
    incorrectCount,
    totalScore: correctCount
  };
}

function drillSession(
  id: string,
  completedAt: string,
  correctCount = 1,
  incorrectCount = 0
): StoredDrillSession {
  return {
    endedAt: completedAt,
    id,
    questionIds: [],
    responses: [],
    score: score(correctCount, incorrectCount),
    settings: { ...defaultSettings, questionCount: correctCount + incorrectCount },
    startedAt: completedAt,
    updatedAt: completedAt
  };
}

function benchmarkResult(
  id: string,
  sessionId: string,
  completedAt: string,
  correctCount = 1,
  incorrectCount = 0
): BenchmarkResultRecord {
  return {
    benchmarkId: "baseline",
    completedAt,
    difficulty: "intermediate",
    id,
    score: score(correctCount, incorrectCount),
    sessionId
  };
}

function exhibitAttempt(id: string, completedAt: string, isCorrect: boolean): ExhibitAttemptRecord {
  return {
    completedAt,
    exhibitId: "exhibit",
    id,
    isCorrect,
    score: isCorrect ? 100 : 0,
    startedAt: completedAt
  };
}

function marketAttempt(
  id: string,
  completedAt: string,
  scoreValue: number,
  maxScore: number
): MarketSizingAttemptRecord {
  return {
    completedAt,
    id,
    maxScore,
    score: scoreValue,
    startedAt: completedAt,
    templateId: "market-template"
  };
}

function practiceAttempt(
  module: PracticeModuleId,
  id: string,
  completedAt: string,
  scoreValue = 1,
  maxScore = 1
): PracticeAttemptRecord {
  return {
    completedAt,
    id,
    itemId: "safe-item-id",
    kind: "attempt",
    maxScore,
    module,
    score: scoreValue
  };
}

function prepProfile(updatedAt: string, targetFirms: string[] = []): PrepProfileRecord {
  return {
    experienceLevel: "intermediate",
    id: "prep-profile",
    kind: "prep_profile",
    targetFirms,
    updatedAt,
    weeklySessions: 3
  };
}

function question(id: string, prompt: string): Question {
  return {
    answer: { value: 1 },
    category: "arithmetic",
    difficulty: "intermediate",
    explanation: { short: "Safe explanation", steps: ["Safe explanation"] },
    id,
    prompt,
    tags: ["addition"],
    type: "numeric"
  };
}

function mistakeRecord(prompt: string): MistakeNotebookRecord {
  return {
    answer: { value: 1 },
    category: "arithmetic",
    difficulty: "intermediate",
    errorTypes: ["arithmetic_error"],
    explanation: {
      short: "PRIVATE MISTAKE EXPLANATION",
      steps: ["PRIVATE MISTAKE EXPLANATION"]
    },
    id: "legacy-mistake",
    missedAt: "2026-08-01T10:00:00Z",
    prompt,
    rawInput: "PRIVATE MISTAKE ANSWER",
    retryCount: 0,
    sourceQuestionId: "safe-question-id",
    sourceType: "drill",
    status: "unresolved",
    tags: ["addition"]
  };
}

function retrySchedule(): RetryScheduleRecord {
  return {
    attemptCount: 0,
    createdAt: "2026-08-01T10:00:00Z",
    dueAt: "2026-08-02T10:00:00Z",
    id: "legacy-retry",
    intervalDays: 1,
    sourceId: "legacy-mistake",
    sourceType: "mistake_notebook",
    updatedAt: "2026-08-01T10:00:00Z"
  };
}
