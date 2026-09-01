import { describe, expect, it } from "vitest";

import { benchmarkTests } from "@/data/questionBank/benchmarkTests";
import {
  loadBenchmarkHistorySnapshot,
  loadBenchmarkResultPage,
  persistBenchmarkResult,
} from "@/features/benchmarks/benchmarkPersistence";
import { createBenchmarkSession } from "@/features/benchmarks/benchmarkSession";
import { completeDrillSession } from "@/features/drills/sessionCompletion";
import { submitAnswer } from "@/features/drills/answerSubmission";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("benchmark result persistence", () => {
  it("persists complete records", async () => {
    const storage = new MemoryAppStorage();
    const completed = createCompletedBenchmarkSession("beginner", "2026-06-02T12:00:00.000Z");

    const persisted = await persistBenchmarkResult({
      benchmarkId: "beginner",
      session: completed.session,
      storage
    });

    expect(await storage.get("benchmark_results", persisted.id)).toEqual(persisted);
    expect(persisted).toMatchObject({
      benchmarkId: "beginner",
      completedAt: "2026-06-02T12:00:10.000Z",
      difficulty: "beginner",
      id: `benchmark-result-beginner-${completed.session.id}`,
      score: completed.session.score,
      sessionId: completed.session.id,
      timingAccommodation: "standard"
    });
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

  it("saves accommodated attempts but keeps Standard-only comparison records", async () => {
    const storage = new MemoryAppStorage();
    const completed = createCompletedBenchmarkSession("beginner", "2026-06-02T12:00:00.000Z");
    const standard = {
      benchmarkId: "beginner",
      completedAt: "2026-06-02T12:00:10.000Z",
      difficulty: "beginner" as const,
      id: "standard-lower",
      score: { ...completed.session.score!, accuracy: 0.7, totalScore: 700 },
      sessionId: "standard-session"
    };
    const accommodated = {
      ...standard,
      completedAt: "2026-06-03T12:00:10.000Z",
      id: "accommodated-higher",
      score: { ...standard.score, accuracy: 1, totalScore: 1_000 },
      sessionId: "accommodated-session",
      timingAccommodation: "double_time" as const
    };

    await storage.put("benchmark_results", standard);
    await storage.put("benchmark_results", accommodated);

    const snapshot = await loadBenchmarkHistorySnapshot(storage);

    expect(snapshot.totalCount).toBe(2);
    expect(snapshot.results.map((result) => result.id)).toEqual(["accommodated-higher", "standard-lower"]);
    expect(snapshot.aggregates[0]).toMatchObject({
      attempts: 2,
      best: { id: "standard-lower" },
      bestScore: { id: "standard-lower" },
      latest: { id: "accommodated-higher" },
      latestStandard: { id: "standard-lower" },
      standardAttempts: 1
    });
  });

  it("records the selected policy and treats missing legacy values as Standard", async () => {
    const storage = new MemoryAppStorage();
    const completed = createCompletedBenchmarkSession("beginner", "2026-06-02T12:00:00.000Z");
    completed.session.settings = {
      ...completed.session.settings,
      timingAccommodation: "time_and_a_half"
    };

    const persisted = await persistBenchmarkResult({
      benchmarkId: "beginner",
      session: completed.session,
      storage
    });

    expect(persisted.timingAccommodation).toBe("time_and_a_half");

    await storage.put("benchmark_results", {
      ...persisted,
      completedAt: "2026-06-01T12:00:00.000Z",
      id: "legacy-standard",
      sessionId: "legacy-session",
      timingAccommodation: undefined
    });

    const snapshot = await loadBenchmarkHistorySnapshot(storage);
    expect(snapshot.aggregates[0]).toMatchObject({
      best: { id: "legacy-standard" },
      latestStandard: { id: "legacy-standard" },
      standardAttempts: 1
    });
  });

  it("pages large histories without duplicates and builds compact summaries", async () => {
    const storage = new MemoryAppStorage();
    const completed = createCompletedBenchmarkSession("beginner", "2026-06-02T12:00:00.000Z");

    await storage.mutate(
      Array.from({ length: 160 }, (_, index) => ({
        storeName: "benchmark_results" as const,
        type: "put" as const,
        value: {
          benchmarkId: index % 2 === 0 ? "beginner" : "intermediate",
          completedAt: "2026-06-02T12:00:10.000Z",
          difficulty: "beginner" as const,
          id: `result-${String(index).padStart(3, "0")}`,
          score: completed.session.score!,
          sessionId: `session-${index}`
        }
      }))
    );

    const snapshot = await loadBenchmarkHistorySnapshot(storage);

    expect(snapshot.totalCount).toBe(160);
    expect(snapshot.summaryRecordCount).toBe(160);
    expect(snapshot.results).toHaveLength(75);
    expect(snapshot.results[0]?.id).toBe("result-159");
    expect(snapshot.results.at(-1)?.id).toBe("result-085");
    expect(snapshot.aggregates.map((aggregate) => [aggregate.benchmarkId, aggregate.attempts])).toEqual([
      ["intermediate", 80],
      ["beginner", 80]
    ]);
    expect(snapshot.aggregates.find(({ benchmarkId }) => benchmarkId === "beginner")).toMatchObject({
      best: { id: "result-000" },
      bestScore: { id: "result-000" },
      latest: { id: "result-158" },
      previous: { id: "result-156" }
    });

    const secondPage = await loadBenchmarkResultPage(storage, snapshot.continuationKey);
    const combinedIds = [...snapshot.results, ...secondPage.results].map((result) => result.id);

    expect(secondPage.results).toHaveLength(75);
    expect(secondPage.results[0]?.id).toBe("result-084");
    expect(new Set(combinedIds).size).toBe(150);
  });

  it("keeps compact benchmark summaries exact beyond the 20,000-record performance target", async () => {
    const storage = new MemoryAppStorage();
    const completed = createCompletedBenchmarkSession("beginner", "2026-06-02T12:00:00.000Z");

    await storage.mutate(
      Array.from({ length: 20_001 }, (_, index) => ({
        storeName: "benchmark_results" as const,
        type: "put" as const,
        value: {
          benchmarkId: "beginner",
          completedAt: new Date(Date.UTC(2026, 0, 1) + index).toISOString(),
          difficulty: "beginner" as const,
          id: `target-result-${String(index).padStart(5, "0")}`,
          score: completed.session.score!,
          sessionId: `target-session-${index}`
        }
      }))
    );

    const snapshot = await loadBenchmarkHistorySnapshot(storage);

    expect(snapshot.summaryRecordCount).toBe(20_001);
    expect(snapshot.aggregates).toHaveLength(1);
    expect(snapshot.aggregates[0]).toMatchObject({
      attempts: 20_001,
      latest: { id: "target-result-20000" },
      previous: { id: "target-result-19999" }
    });
  }, 30_000);
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
