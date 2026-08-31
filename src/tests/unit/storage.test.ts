import { describe, expect, it } from "vitest";

import { createDrillSettings } from "@/features/drills/drillSettings";
import {
  appDatabaseName,
  appDatabaseVersion,
  appStoreIndexNames,
  appStoreNames,
  progressStoreNames,
  type StoredDrillSession,
} from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("typed app storage", () => {
  it("defines the MVP IndexedDB stores", () => {
    expect(appDatabaseName).toBe("consulting_math_drill_tool");
    expect(appDatabaseVersion).toBe(8);
    expect(progressStoreNames).toEqual([
      "drill_sessions",
      "responses",
      "benchmark_results",
      "user_settings",
      "market_sizing_attempts",
      "exhibit_attempts",
      "mistake_notebook",
      "retry_schedules",
      "practice_records"
    ]);
    expect(appStoreNames).toEqual([
      "drill_sessions",
      "responses",
      "benchmark_results",
      "user_settings",
      "market_sizing_attempts",
      "exhibit_attempts",
      "mistake_notebook",
      "retry_schedules",
      "practice_records",
      "question_packs"
    ]);
  });

  it("writes, reads, lists, and deletes typed records", async () => {
    const storage = new MemoryAppStorage();
    const session = storedDrillSession();

    await storage.put("drill_sessions", session);

    expect(await storage.get("drill_sessions", "session-1")).toEqual(session);
    expect(await storage.getAll("drill_sessions")).toEqual([session]);

    await storage.delete("drill_sessions", session.id);

    expect(await storage.get("drill_sessions", session.id)).toBeUndefined();
  });

  it("pages newest-first by a stable compound index without gaps or duplicates", async () => {
    const storage = new MemoryAppStorage();

    for (const [id, completedAt] of [
      ["result-a", "2026-06-02T00:00:00.000Z"],
      ["result-b", "2026-06-03T00:00:00.000Z"],
      ["result-c", "2026-06-03T00:00:00.000Z"],
      ["result-d", "2026-06-04T00:00:00.000Z"]
    ] as const) {
      await storage.put("benchmark_results", {
        benchmarkId: "baseline_beginner",
        completedAt,
        difficulty: "beginner",
        id,
        score: {
          accuracy: 1,
          averageTimeSeconds: 1,
          categoryBreakdown: [],
          correctCount: 1,
          errorBreakdown: [],
          incorrectCount: 0,
          totalScore: 1
        },
        sessionId: `session-${id}`
      });
    }

    const first = await storage.getPage("benchmark_results", appStoreIndexNames.benchmark_results, {
      direction: "prev",
      limit: 2
    });
    const second = await storage.getPage("benchmark_results", appStoreIndexNames.benchmark_results, {
      afterKey: first.continuationKey,
      direction: "prev",
      limit: 2
    });

    expect(first.values.map(({ id }) => id)).toEqual(["result-d", "result-c"]);
    expect(second.values.map(({ id }) => id)).toEqual(["result-b", "result-a"]);
    expect(second.continuationKey).toBeUndefined();
    expect(await storage.count("benchmark_results")).toBe(4);
  });

  it("clears individual stores and all local data", async () => {
    const storage = new MemoryAppStorage();
    const session = storedDrillSession();

    await storage.put("drill_sessions", session);
    await storage.clear("drill_sessions");

    expect(await storage.getAll("drill_sessions")).toEqual([]);

    await storage.put("drill_sessions", session);

    await storage.clearAll();

    expect(await storage.getAll("drill_sessions")).toEqual([]);
  });

  it("commits multi-store mutations together in the storage test double", async () => {
    const storage = new MemoryAppStorage();
    const session = storedDrillSession();

    await storage.mutate([
      { storeName: "drill_sessions", type: "put", value: session },
      {
        storeName: "responses",
        type: "put",
        value: {
          errorTypes: ["none"],
          id: "session-1:question-1",
          isCorrect: true,
          questionId: "question-1",
          rawInput: "1",
          sessionId: "session-1",
          submittedAt: "2026-06-02T00:00:01.000Z",
          timeTakenSeconds: 1
        }
      }
    ]);

    expect(await storage.getAll("drill_sessions")).toEqual([session]);
    expect(await storage.getAll("responses")).toHaveLength(1);
  });

  it("fails early when IndexedDB is unavailable", () => {
    expect(() => createIndexedDbAppStorage({ indexedDB: null })).toThrow(
      "IndexedDB is not available in this environment."
    );
  });
});

function storedDrillSession(): StoredDrillSession {
  return {
    id: "session-1",
    questionIds: ["question-1"],
    responses: [],
    settings: createDrillSettings({ questionCount: 1 }),
    startedAt: "2026-06-02T00:00:00.000Z",
    updatedAt: "2026-06-02T00:01:00.000Z"
  };
}
