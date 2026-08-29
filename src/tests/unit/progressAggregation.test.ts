import { describe, expect, it } from "vitest";

import { createProgressSummary, loadProgressSummary } from "@/features/progress/progressAggregation";
import type { Question, SkillCategory, SkillTag, UserResponse } from "@/lib/domain";
import type {
  BenchmarkResultRecord,
  MistakeNotebookRecord,
  RetryScheduleRecord,
  StoredDrillSession,
  StoredUserResponse,
} from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("progress aggregation", () => {
  it("excludes unfinished draft sessions from completed progress", () => {
    const completed = storedSession({ date: "2026-06-01", id: "completed" });
    const draft: StoredDrillSession = {
      ...storedSession({ date: "2026-06-02", id: "draft" }),
      draftKey: "/drills/session:settings",
      endedAt: undefined,
      score: undefined
    };

    const summary = createProgressSummary({ sessions: [completed, draft] });

    expect(summary.dashboard.totalSessions).toBe(1);
    expect(summary.dashboard.totalQuestionsAnswered).toBe(1);
    expect(summary.recentSessions.map((session) => session.id)).toEqual([completed.id]);
  });

  it("aggregates dashboard, category, skill, error, and recent-session metrics", () => {
    const sessions = [
      storedSession({
        id: "s1",
        date: "2026-06-01",
        questions: [
          question({ id: "q1", category: "arithmetic", tags: ["addition"] }),
          question({ id: "q2", category: "percentages", tags: ["percentage_change"] })
        ],
        responses: [
          response({ questionId: "q1", isCorrect: true, errorTypes: ["none"], timeTakenSeconds: 10 }),
          response({
            questionId: "q2",
            isCorrect: false,
            errorTypes: ["magnitude_error"],
            timeTakenSeconds: 30
          })
        ]
      }),
      storedSession({
        id: "s2",
        date: "2026-06-02",
        questions: [question({ id: "q3", category: "business_math", tags: ["margin"] })],
        responses: [
          response({
            questionId: "q3",
            isCorrect: false,
            errorTypes: ["unit_error", "rounding_error"],
            timeTakenSeconds: 20
          })
        ],
        totalScore: 65
      })
    ];

    const summary = createProgressSummary({
      now: "2026-06-02T12:00:00.000Z",
      sessions
    });

    expect(summary.dashboard).toEqual({
      averageTimeSeconds: 20,
      currentStreakDays: 2,
      lastSession: summary.recentSessions[0],
      overallAccuracy: 1 / 3,
      totalCorrect: 1,
      totalIncorrect: 2,
      totalQuestionsAnswered: 3,
      totalSessions: 2
    });
    expect(summary.categoryPerformance).toEqual([
      {
        accuracy: 1,
        averageTimeSeconds: 10,
        category: "arithmetic",
        correctCount: 1,
        questionCount: 1
      },
      {
        accuracy: 0,
        averageTimeSeconds: 20,
        category: "business_math",
        correctCount: 0,
        questionCount: 1
      },
      {
        accuracy: 0,
        averageTimeSeconds: 30,
        category: "percentages",
        correctCount: 0,
        questionCount: 1
      }
    ]);
    expect(summary.skillPerformance.map((item) => [item.tag, item.questionCount, item.accuracy])).toEqual([
      ["addition", 1, 1],
      ["margin", 1, 0],
      ["percentage_change", 1, 0]
    ]);
    expect(summary.errorBreakdown).toEqual([
      { errorType: "magnitude_error", count: 1 },
      { errorType: "rounding_error", count: 1 },
      { errorType: "unit_error", count: 1 }
    ]);
    expect(summary.magnitudeErrorCount).toBe(1);
    expect(summary.unitErrorCount).toBe(1);
    expect(summary.mistakeNotebook).toEqual([]);
    expect(summary.reviewQueue).toEqual({ dueCount: 0, nextDueAt: undefined, scheduledCount: 0 });
    expect(summary.recentSessions.map((item) => item.id)).toEqual(["s2", "s1"]);
    expect(summary.recentSessions[0]).toMatchObject({
      accuracy: 0,
      categories: ["business_math"],
      id: "s2",
      questionCount: 1,
      totalScore: 65
    });
    expect(summary.isEmpty).toBe(false);
  });

  it("deduplicates stored response records against session responses", () => {
    const sessions = [
      storedSession({
        id: "s1",
        date: "2026-06-02",
        questions: [question({ id: "q1", category: "arithmetic", tags: ["addition"] })],
        responses: [response({ questionId: "q1", isCorrect: true, errorTypes: ["none"] })]
      })
    ];
    const responses: StoredUserResponse[] = [
      {
        ...response({ questionId: "q1", isCorrect: true, errorTypes: ["none"] }),
        category: "arithmetic",
        id: "s1:q1",
        sessionId: "s1",
        tags: ["addition"]
      }
    ];

    expect(createProgressSummary({ responses, sessions }).dashboard.totalQuestionsAnswered).toBe(1);
  });

  it("keeps yesterday streaks alive and breaks stale streaks", () => {
    const active = createProgressSummary({
      now: "2026-06-03T12:00:00.000Z",
      sessions: [
        storedSession({ id: "s1", date: "2026-06-01" }),
        storedSession({ id: "s2", date: "2026-06-02" })
      ]
    });
    const stale = createProgressSummary({
      now: "2026-06-05T12:00:00.000Z",
      sessions: [
        storedSession({ id: "s1", date: "2026-06-01" }),
        storedSession({ id: "s2", date: "2026-06-02" })
      ]
    });

    expect(active.dashboard.currentStreakDays).toBe(2);
    expect(stale.dashboard.currentStreakDays).toBe(0);
  });

  it("returns an empty summary when no local records exist", () => {
    expect(createProgressSummary({ sessions: [] })).toEqual({
      additionalPractice: {
        exhibits: { attemptCount: 0, completedCount: 0 },
        marketSizing: { attemptCount: 0, completedCount: 0 }
      },
      categoryPerformance: [],
      dashboard: {
        averageTimeSeconds: 0,
        currentStreakDays: 0,
        lastSession: undefined,
        overallAccuracy: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        totalQuestionsAnswered: 0,
        totalSessions: 0
      },
      errorBreakdown: [],
      isEmpty: true,
      magnitudeErrorCount: 0,
      mistakeNotebook: [],
      personalBests: [],
      recentSessions: [],
      reviewQueue: { dueCount: 0, nextDueAt: undefined, scheduledCount: 0 },
      skillPerformance: [],
      unitErrorCount: 0
    });
  });

  it("summarizes exhibit and market-sizing activity, completion, and normalized scores", () => {
    const summary = createProgressSummary({
      exhibitAttempts: [
        {
          completedAt: "2026-06-02T12:05:00.000Z",
          exhibitId: "exhibit-1",
          id: "exhibit-complete",
          score: 100,
          startedAt: "2026-06-02T12:00:00.000Z"
        },
        {
          exhibitId: "exhibit-2",
          id: "exhibit-incomplete",
          startedAt: "2026-06-02T13:00:00.000Z"
        }
      ],
      marketSizingAttempts: [
        {
          completedAt: "2026-06-02T14:05:00.000Z",
          id: "market-complete",
          maxScore: 50,
          score: 40,
          startedAt: "2026-06-02T14:00:00.000Z",
          templateId: "market-1"
        }
      ],
      sessions: []
    });

    expect(summary.additionalPractice).toEqual({
      exhibits: { attemptCount: 2, averageScorePercent: 100, completedCount: 1 },
      marketSizing: { attemptCount: 1, averageScorePercent: 80, completedCount: 1 }
    });
    expect(summary.isEmpty).toBe(false);
  });

  it("summarizes due retry schedules for unresolved mistakes", () => {
    const dueMistake = mistakeRecord("mistake-due");
    const futureMistake = mistakeRecord("mistake-future");
    const resolvedMistake = { ...mistakeRecord("mistake-resolved"), status: "resolved" } satisfies MistakeNotebookRecord;

    const summary = createProgressSummary({
      mistakeNotebook: [dueMistake, futureMistake, resolvedMistake],
      now: "2026-06-03T12:00:00.000Z",
      retrySchedules: [
        retryScheduleRecord("schedule-due", dueMistake.id, "2026-06-03T00:00:00.000Z"),
        retryScheduleRecord("schedule-future", futureMistake.id, "2026-06-06T00:00:00.000Z"),
        retryScheduleRecord("schedule-resolved", resolvedMistake.id, "2026-06-02T00:00:00.000Z")
      ],
      sessions: []
    });

    expect(summary.reviewQueue).toEqual({
      dueCount: 1,
      nextDueAt: "2026-06-03T00:00:00.000Z",
      scheduledCount: 2
    });
    expect(summary.isEmpty).toBe(false);
  });

  it("loads sessions and responses from app storage", async () => {
    const storage = new MemoryAppStorage();
    const session = storedSession({ id: "s1", date: "2026-06-02" });
    const benchmarkResult = benchmarkRecord("benchmark-1", 100, "2026-06-02T12:00:00.000Z");
    const mistake = mistakeRecord();
    const retrySchedule = retryScheduleRecord("retry-schedule-1", mistake.id, "2026-06-02T00:00:00.000Z");

    await storage.put("drill_sessions", session);
    await storage.put("benchmark_results", benchmarkResult);
    await storage.put("mistake_notebook", mistake);
    await storage.put("retry_schedules", retrySchedule);
    await storage.put("exhibit_attempts", {
      completedAt: "2026-06-02T12:05:00.000Z",
      exhibitId: "exhibit-1",
      id: "exhibit-attempt-1",
      score: 100,
      startedAt: "2026-06-02T12:00:00.000Z"
    });
    await storage.put("market_sizing_attempts", {
      completedAt: "2026-06-02T12:10:00.000Z",
      id: "market-attempt-1",
      maxScore: 100,
      score: 75,
      startedAt: "2026-06-02T12:06:00.000Z",
      templateId: "market-1"
    });

    await expect(loadProgressSummary(storage, { now: "2026-06-02T12:00:00.000Z" })).resolves.toMatchObject({
      dashboard: {
        currentStreakDays: 1,
        totalQuestionsAnswered: 1,
        totalSessions: 1
      },
      mistakeNotebook: [mistake],
      additionalPractice: {
        exhibits: { attemptCount: 1, averageScorePercent: 100, completedCount: 1 },
        marketSizing: { attemptCount: 1, averageScorePercent: 75, completedCount: 1 }
      },
      reviewQueue: {
        dueCount: 1,
        scheduledCount: 1
      },
      personalBests: expect.arrayContaining([
        expect.objectContaining({
          id: "benchmark:beginner:score",
          sourceId: benchmarkResult.id
        }),
        expect.objectContaining({
          id: "drill_category:arithmetic:beginner:untimed:accuracy",
          sourceId: session.id
        })
      ])
    });
  });
});

function storedSession({
  date,
  id,
  questions = [question({ id: "q1", category: "arithmetic", tags: ["addition"] })],
  responses = [response({ questionId: "q1", isCorrect: true, errorTypes: ["none"], timeTakenSeconds: 10 })],
  totalScore = 100
}: {
  date: string;
  id: string;
  questions?: Question[];
  responses?: UserResponse[];
  totalScore?: number;
}): StoredDrillSession {
  const correctCount = responses.filter((item) => item.isCorrect).length;

  return {
    id,
    endedAt: `${date}T00:00:30.000Z`,
    questionIds: questions.map((item) => item.id),
    questions,
    responses,
    score: {
      accuracy: responses.length === 0 ? 0 : correctCount / responses.length,
      averageTimeSeconds: responses.length === 0 ? 0 : responses.reduce((total, item) => total + item.timeTakenSeconds, 0) / responses.length,
      categoryBreakdown: [],
      correctCount,
      errorBreakdown: [],
      incorrectCount: responses.length - correctCount,
      totalScore
    },
    settings: {
      categories: Array.from(new Set(questions.map((item) => item.category))),
      difficulty: "beginner",
      feedbackMode: "instant",
      questionCount: questions.length,
      timeMode: "untimed"
    },
    startedAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:30.000Z`
  };
}

function response(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    errorTypes: ["none"],
    isCorrect: true,
    normalizedValue: 10,
    questionId: "q1",
    rawInput: "10",
    submittedAt: "2026-06-02T00:00:10.000Z",
    timeTakenSeconds: 10,
    ...overrides
  };
}

function question({
  category,
  id,
  tags
}: {
  category: SkillCategory;
  id: string;
  tags: SkillTag[];
}): Question {
  return {
    answer: { value: 10 },
    category,
    difficulty: "beginner",
    explanation: {
      short: "Use the local formula.",
      steps: ["Calculate the answer."]
    },
    id,
    prompt: "What is the answer?",
    tags,
    type: "numeric"
  };
}

function mistakeRecord(id = "mistake-1"): MistakeNotebookRecord {
  return {
    id,
    sourceQuestionId: "q1",
    sourceType: "drill",
    prompt: "What is the answer?",
    answer: { value: 10 },
    category: "arithmetic",
    tags: ["addition"],
    difficulty: "beginner",
    explanation: {
      short: "Use the local formula.",
      steps: ["Calculate the answer."]
    },
    rawInput: "9",
    normalizedValue: 9,
    errorTypes: ["arithmetic_error"],
    missedAt: "2026-06-02T00:00:10.000Z",
    retryCount: 0,
    status: "unresolved"
  };
}

function retryScheduleRecord(id: string, sourceId: string, dueAt: string): RetryScheduleRecord {
  return {
    id,
    sourceId,
    sourceType: "mistake_notebook",
    dueAt,
    intervalDays: 1,
    attemptCount: 0,
    createdAt: "2026-06-02T00:00:00.000Z",
    updatedAt: "2026-06-02T00:00:00.000Z"
  };
}

function benchmarkRecord(id: string, totalScore: number, completedAt: string): BenchmarkResultRecord {
  return {
    benchmarkId: "beginner",
    completedAt,
    difficulty: "beginner",
    id,
    score: {
      accuracy: 1,
      averageTimeSeconds: 10,
      categoryBreakdown: [],
      correctCount: 1,
      errorBreakdown: [],
      incorrectCount: 0,
      totalScore
    },
    sessionId: id
  };
}
