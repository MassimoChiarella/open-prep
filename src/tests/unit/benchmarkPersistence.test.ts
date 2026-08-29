import { describe, expect, it } from "vitest";

import { benchmarkTests } from "@/data/questionBank/benchmarkTests";
import {
  loadBenchmarkResults,
  persistBenchmarkResult,
} from "@/features/benchmarks/benchmarkPersistence";
import { createBenchmarkSession } from "@/features/benchmarks/benchmarkSession";
import { completeDrillSession } from "@/features/drills/sessionCompletion";
import { submitAnswer } from "@/features/drills/answerSubmission";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("benchmark result persistence", () => {
  it("persists complete records and loads them newest first", async () => {
    const storage = new MemoryAppStorage();
    const older = createCompletedBenchmarkSession("beginner", "2026-06-02T12:00:00.000Z");
    const newer = createCompletedBenchmarkSession("beginner", "2026-06-03T12:00:00.000Z");
    const other = createCompletedBenchmarkSession("intermediate", "2026-06-04T12:00:00.000Z");

    await persistBenchmarkResult({ benchmarkId: "beginner", session: older.session, storage });
    await persistBenchmarkResult({ benchmarkId: "beginner", session: newer.session, storage });
    await persistBenchmarkResult({ benchmarkId: "intermediate", session: other.session, storage });

    const beginnerResults = await loadBenchmarkResults(storage, "beginner");

    expect(beginnerResults.map((result) => result.sessionId)).toEqual([
      newer.session.id,
      older.session.id
    ]);
    expect(beginnerResults[1]).toMatchObject({
      benchmarkId: "beginner",
      completedAt: "2026-06-02T12:00:10.000Z",
      difficulty: "beginner",
      id: `benchmark-result-beginner-${older.session.id}`,
      score: older.session.score,
      sessionId: older.session.id
    });
    expect(await storage.getAll("benchmark_results")).toHaveLength(3);
  });

  it("rejects incomplete benchmark sessions", async () => {
    const created = createBenchmarkSession(benchmarkTests[0], {
      startedAt: "2026-06-02T12:00:00.000Z"
    });

    await expect(
      persistBenchmarkResult({
        benchmarkId: "beginner",
        session: created.session,
        storage: new MemoryAppStorage()
      })
    ).rejects.toThrow("Only completed benchmark sessions can be persisted.");
  });
});

function createCompletedBenchmarkSession(
  benchmarkId: "beginner" | "intermediate",
  startedAt: string
): ReturnType<typeof createBenchmarkSession> {
  const benchmark = benchmarkTests.find((item) => item.id === benchmarkId);

  if (benchmark === undefined) {
    throw new Error(`Missing benchmark ${benchmarkId}.`);
  }

  const created = createBenchmarkSession(benchmark, { startedAt });
  let session = created.session;

  for (const question of created.questions) {
    session = submitAnswer({
      session,
      question,
      rawInput: String(question.answer.value),
      submittedAt: "2026-06-02T12:00:05.000Z",
      timeTakenSeconds: 5
    }).session;
  }

  return {
    ...created,
    session: completeDrillSession({
      endedAt: new Date(Date.parse(startedAt) + 10_000).toISOString(),
      questions: created.questions,
      session
    })
  };
}
