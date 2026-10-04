import { describe, expect, it, vi } from "vitest";

import { loadProgressSummary } from "@/features/progress/progressAggregation";
import { loadProgressSnapshot } from "@/features/progress/progressSnapshot";
import { createDeterministicRecommendations } from "@/features/recommendations/recommendationRules";
import type { StoredDrillSession } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("consistent progress snapshots", () => {
  it.each(["UTC", "America/Toronto", "Asia/Kolkata"])("preserves exact lifetime metrics and recommendations in %s", async (timeZone) => {
    const storage = new MemoryAppStorage();
    const dates = ["2026-03-07T23:30:00.000Z", "2026-03-08T06:30:00.000Z", "2026-03-09T04:30:00.000Z", "2026-11-01T05:30:00.000Z"];
    for (const [index, date] of dates.entries()) {
      const session = completedSession(`legacy-session-${index}`, date);
      if (index === 1) session.settings.timingAccommodation = "double_time";
      if (index === 2) delete session.questions;
      await storage.put("drill_sessions", session);
      // Separately persisted values override the embedded response, preserving historical IDs.
      for (const response of session.responses.slice(0, 1)) await storage.put("responses", {
        ...response, id: `${session.id}:${response.questionId}`, sessionId: session.id,
        category: "arithmetic", tags: ["addition"], isCorrect: false,
        errorTypes: ["magnitude_error"], timeTakenSeconds: 3.25
      });
      await storage.put("benchmark_results", {
        benchmarkId: "historical-benchmark", id: `benchmark-${index}`, sessionId: session.id,
        completedAt: date, difficulty: "beginner", score: session.score!,
        ...(index === 1 ? { timingAccommodation: "double_time" as const } : {})
      });
    }
    const draft = completedSession("unfinished", dates[3]);
    delete draft.score;
    await storage.put("drill_sessions", draft);
    for (const id of ["tie-z", "tie-a"]) await storage.put("benchmark_results", {
      benchmarkId: "historical-benchmark", id, sessionId: id, completedAt: dates[3], difficulty: "beginner",
      score: { ...completedSession(id, dates[3]).score!, totalScore: 2000 }
    });
    const original = completedSession("source", dates[0]);
    await storage.put("mistake_notebook", {
      id: "historical-mistake", sourceQuestionId: "old-template-value-10", sourceType: "drill",
      sourceSessionId: original.id, prompt: "Old snapshot", answer: { value: 10 }, category: "arithmetic",
      tags: ["addition"], difficulty: "beginner", explanation: { short: "Add", steps: ["Add"] },
      rawInput: "9", normalizedValue: 9, errorTypes: ["arithmetic_error"], missedAt: dates[0], retryCount: 2, status: "unresolved"
    });
    await storage.put("retry_schedules", {
      id: "old-schedule", sourceId: "historical-mistake", sourceType: "mistake_notebook",
      dueAt: dates[1], intervalDays: 1, attemptCount: 2, createdAt: dates[0], updatedAt: dates[0]
    });
    await storage.put("exhibit_attempts", { id: "exhibit", exhibitId: "exhibit", startedAt: dates[0], completedAt: dates[1], score: 75, isCorrect: false });
    await storage.put("market_sizing_attempts", { id: "sizing", templateId: "sizing", startedAt: dates[0], completedAt: dates[1], score: 3, maxScore: 4 });
    await storage.put("practice_records", { id: "case", kind: "attempt", itemId: "case", module: "questioning", completedAt: dates[2], score: 70, maxScore: 85 });
    await storage.put("practice_records", { id: "prep-profile", kind: "prep_profile", experienceLevel: "beginner", targetFirms: [], weeklySessions: 3, updatedAt: dates[3] });
    const options = { timeZone, now: "2026-11-01T12:00:00.000Z" };
    const reference = await loadProgressSummary(storage, options);
    const snapshot = vi.spyOn(storage, "getSnapshot");
    const actual = await loadProgressSnapshot(storage, options);
    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(actual.summary).toEqual(reference);
    expect(createDeterministicRecommendations(actual.summary, options.now)).toEqual(createDeterministicRecommendations(reference, options.now));
  });

  it("rejects a snapshot invalidated by reset without needing an invalidation message", async () => {
    const storage = new MemoryAppStorage();
    const read = storage.getSnapshot.bind(storage);
    vi.spyOn(storage, "getSnapshot").mockImplementation(async (names) => {
      const snapshot = await read(names);
      await storage.clearAll();
      return snapshot;
    });
    await expect(loadProgressSnapshot(storage)).rejects.toThrow(/Local data changed/);
  });

  it("propagates snapshot failures", async () => {
    const storage = new MemoryAppStorage();
    vi.spyOn(storage, "getSnapshot").mockRejectedValue(new Error("snapshot unavailable"));
    await expect(loadProgressSnapshot(storage)).rejects.toThrow("snapshot unavailable");
  });
});

function completedSession(id: string, date: string): StoredDrillSession {
  const questions = Array.from({ length: 12 }, (_, index) => ({
    id: index === 0 ? "old-template-value-10" : `template:v2:[[\"value\",${index}]]`,
    type: "numeric" as const, category: "arithmetic" as const, tags: ["addition" as const],
    difficulty: index % 2 === 0 ? "beginner" as const : "intermediate" as const,
    prompt: "What is 5 + 5?", answer: { value: 10 }, explanation: { short: "Add", steps: ["Add"] }
  }));
  return {
    id, startedAt: date, endedAt: date, updatedAt: date,
    settings: { categories: ["arithmetic"], difficulty: "beginner", questionCount: questions.length, timeMode: "untimed", feedbackMode: "instant" },
    questionIds: questions.map((question) => question.id), questions,
    responses: questions.map((question, index) => ({ questionId: question.id, rawInput: "10", normalizedValue: 10, isCorrect: true, errorTypes: ["none"], submittedAt: date, timeTakenSeconds: 0.1 + index })),
    score: { accuracy: 1, totalScore: 1200, correctCount: 12, incorrectCount: 0, averageTimeSeconds: 5.6, categoryBreakdown: [], errorBreakdown: [] }
  };
}
