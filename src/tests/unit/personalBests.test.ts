import { describe, expect, it } from "vitest";

import { createDrillSettings } from "@/features/drills/drillSettings";
import {
  createPersonalBestRecords,
  findSourcePersonalBests,
  type PersonalBestRecord,
} from "@/features/progress/personalBests";
import type { BenchmarkResultRecord, StoredDrillSession, StoredUserResponse } from "@/lib/storage/appStorageTypes";

describe("personal bests", () => {
  it("derives accuracy, fastest correct time, streak, and benchmark score bests from local attempts", () => {
    const first = session("session-1", "2026-06-01", [
      response("question-1", true, 20),
      response("question-2", false, 40)
    ]);
    const second = session("session-2", "2026-06-02", [
      response("question-1", true, 12),
      response("question-2", true, 18)
    ]);
    const third = session("session-3", "2026-06-03", [
      response("question-1", true, 10),
      response("question-2", false, 24)
    ]);
    const bests = createPersonalBestRecords({
      benchmarkResults: [
        benchmarkResult("benchmark-old", 80, "2026-06-01T12:00:00.000Z"),
        benchmarkResult("benchmark-new", 90, "2026-06-02T12:00:00.000Z")
      ],
      responses: [first, second, third].flatMap((item) => item.responses.map((itemResponse) => storedResponse(item.id, itemResponse))),
      sessions: [first, second, third]
    });

    expect(findBest(bests, "drill_category:business_math:beginner:untimed:accuracy")).toMatchObject({
      metric: "accuracy",
      sourceId: "session-2",
      value: 1
    });
    expect(findBest(bests, "drill_skill:margin:beginner:untimed:average_time")).toMatchObject({
      metric: "average_time",
      sourceId: "session-3",
      value: 10
    });
    expect(findBest(bests, "drill_streak:beginner:untimed:streak")).toMatchObject({
      metric: "streak",
      sourceId: "session-3",
      value: 3
    });
    expect(findBest(bests, "benchmark:beginner:score")).toMatchObject({
      metric: "score",
      sourceId: "benchmark-new",
      value: 90
    });
    expect(findSourcePersonalBests(bests, ["session-2", "benchmark-new"]).map((best) => best.id)).toEqual([
      "benchmark:beginner:score",
      "drill_category:business_math:beginner:untimed:accuracy",
      "drill_skill:margin:beginner:untimed:accuracy"
    ]);
  });

  it("breaks tied bests deterministically", () => {
    const sessionA = session("session-a", "2026-06-02", [response("question-1", true, 10)]);
    const sessionB = session("session-b", "2026-06-02", [response("question-1", true, 10)]);

    for (const sessions of [
      [sessionB, sessionA],
      [sessionA, sessionB]
    ]) {
      const bests = createPersonalBestRecords({
        benchmarkResults: [
          benchmarkResult("benchmark-b", 90, "2026-06-02T12:00:00.000Z"),
          benchmarkResult("benchmark-a", 90, "2026-06-02T12:00:00.000Z")
        ],
        responses: sessions.flatMap((item) => item.responses.map((itemResponse) => storedResponse(item.id, itemResponse))),
        sessions
      });

      expect(findBest(bests, "benchmark:beginner:score")?.sourceId).toBe("benchmark-a");
      expect(findBest(bests, "drill_category:business_math:beginner:untimed:accuracy")?.sourceId).toBe("session-a");
      expect(findBest(bests, "drill_skill:margin:beginner:untimed:average_time")?.sourceId).toBe("session-a");
      expect(findBest(bests, "drill_streak:beginner:untimed:streak")?.sourceId).toBe("session-a");
    }
  });

  it("excludes accommodated attempts from Standard personal bests and streaks", () => {
    const standard = session("standard-session", "2026-06-01", [response("question-1", true, 20)]);
    const accommodated = {
      ...session("accommodated-session", "2026-06-02", [response("question-1", true, 5)]),
      settings: createDrillSettings({
        categories: ["business_math"],
        difficulty: "beginner",
        questionCount: 1,
        timingAccommodation: "double_time"
      })
    };
    const bests = createPersonalBestRecords({
      benchmarkResults: [
        benchmarkResult("standard-benchmark", 70, "2026-06-01T12:00:00.000Z"),
        { ...benchmarkResult("accommodated-benchmark", 100, "2026-06-02T12:00:00.000Z"), timingAccommodation: "time_and_a_half" }
      ],
      responses: [standard, accommodated].flatMap((item) =>
        item.responses.map((itemResponse) => storedResponse(item.id, itemResponse))
      ),
      sessions: [standard, accommodated]
    });

    expect(findBest(bests, "benchmark:beginner:score")).toMatchObject({
      sourceId: "standard-benchmark",
      value: 70
    });
    expect(findBest(bests, "drill_skill:margin:beginner:untimed:average_time")).toMatchObject({
      sourceId: "standard-session",
      value: 20
    });
    expect(findBest(bests, "drill_streak:beginner:untimed:streak")).toMatchObject({
      sourceId: "standard-session",
      value: 1
    });
    expect(findSourcePersonalBests(bests, ["accommodated-session", "accommodated-benchmark"])).toEqual([]);
  });

  it("calculates the longest streak with the same injected local-calendar policy", () => {
    const sessions = [
      sessionAt("session-1", "2026-06-01T23:30:00.000Z"),
      sessionAt("session-2", "2026-06-02T03:30:00.000Z")
    ];
    const torontoBests = createPersonalBestRecords({ sessions, timeZone: "America/Toronto" });
    const utcBests = createPersonalBestRecords({ sessions, timeZone: "UTC" });

    expect(findBest(torontoBests, "drill_streak:beginner:untimed:streak")?.value).toBe(1);
    expect(findBest(utcBests, "drill_streak:beginner:untimed:streak")?.value).toBe(2);
  });

  it.each([1_000, 5_000, 10_000, 20_000])(
    "preserves aggregate bests while appending %i sessions linearly",
    (count) => {
      const sessions = Array.from({ length: count }, (_, index) =>
        session(`scale-session-${index}`, "2026-06-01", [response("question-1", true, 10)])
      );
      const bests = createPersonalBestRecords({ sessions });

      expect(findBest(bests, "drill_streak:beginner:untimed:streak")?.value).toBe(1);
    }
  );
});

function session(id: string, date: string, responses: StoredDrillSession["responses"]): StoredDrillSession {
  return {
    id,
    questionIds: responses.map((item) => item.questionId),
    responses,
    score: {
      accuracy: responses.filter((item) => item.isCorrect).length / responses.length,
      averageTimeSeconds: responses.reduce((total, item) => total + item.timeTakenSeconds, 0) / responses.length,
      categoryBreakdown: [],
      correctCount: responses.filter((item) => item.isCorrect).length,
      errorBreakdown: [],
      incorrectCount: responses.filter((item) => !item.isCorrect).length,
      totalScore: 0
    },
    settings: createDrillSettings({ categories: ["business_math"], difficulty: "beginner", questionCount: responses.length }),
    startedAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:05:00.000Z`
  };
}

function sessionAt(id: string, completedAt: string): StoredDrillSession {
  return {
    ...session(id, completedAt.slice(0, 10), [response("question-1", true, 10)]),
    startedAt: completedAt,
    updatedAt: completedAt
  };
}

function response(questionId: string, isCorrect: boolean, timeTakenSeconds: number): StoredDrillSession["responses"][number] {
  return {
    errorTypes: isCorrect ? ["none"] : ["arithmetic_error"],
    isCorrect,
    questionId,
    rawInput: isCorrect ? "10" : "9",
    submittedAt: "2026-06-01T12:01:00.000Z",
    timeTakenSeconds
  };
}

function storedResponse(sessionId: string, item: StoredDrillSession["responses"][number]): StoredUserResponse {
  return {
    ...item,
    category: "business_math",
    id: `${sessionId}:${item.questionId}`,
    sessionId,
    tags: ["margin"]
  };
}

function benchmarkResult(id: string, totalScore: number, completedAt: string): BenchmarkResultRecord {
  return {
    benchmarkId: "beginner",
    completedAt,
    difficulty: "beginner",
    id,
    score: {
      accuracy: totalScore / 100,
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

function findBest(records: readonly PersonalBestRecord[], id: string): PersonalBestRecord | undefined {
  return records.find((record) => record.id === id);
}
