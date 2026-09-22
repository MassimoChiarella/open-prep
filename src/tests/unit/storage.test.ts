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
    expect(appDatabaseVersion).toBe(10);
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

  it("scans records without requiring an unbounded result array", async () => {
    const storage = new MemoryAppStorage();
    const first = storedDrillSession();
    const second = { ...storedDrillSession(), id: "session-2" };
    await storage.put("drill_sessions", first);
    await storage.put("drill_sessions", second);
    const ids: string[] = [];

    await storage.scan("drill_sessions", (session) => ids.push(session.id));

    expect(ids).toEqual(["session-1", "session-2"]);
    await expect(
      storage.scan("drill_sessions", () => {
        throw new Error("stop scan");
      })
    ).rejects.toThrow("stop scan");
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

  it("pages drill sessions and responses by their chronological indexes", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("drill_sessions", storedDrillSession());
    await storage.put("drill_sessions", {
      ...storedDrillSession(),
      id: "session-2",
      updatedAt: "2026-06-02T00:02:00.000Z"
    });
    await storage.put("responses", {
      errorTypes: ["none"], id: "response-1", isCorrect: true, questionId: "question-1",
      rawInput: "1", sessionId: "session-1", submittedAt: "2026-06-02T00:00:01.000Z", timeTakenSeconds: 1
    });

    expect((await storage.getPage("drill_sessions", appStoreIndexNames.drill_sessions, {
      direction: "prev", limit: 1
    })).values.map(({ id }) => id)).toEqual(["session-2"]);
    expect((await storage.getPage("responses", appStoreIndexNames.responses, {
      direction: "prev", limit: 1
    })).values.map(({ id }) => id)).toEqual(["response-1"]);
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

  it("captures requested stores in one typed snapshot before later writes", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("drill_sessions", storedDrillSession());

    const pending = storage.getSnapshot(["drill_sessions", "question_packs"] as const);
    await storage.put("drill_sessions", { ...storedDrillSession(), id: "session-2" });
    const snapshot = await pending;

    expect(snapshot.drill_sessions.map(({ id }) => id)).toEqual(["session-1"]);
    expect(snapshot.question_packs).toEqual([]);
    expect(Object.keys(snapshot)).toEqual(["drill_sessions", "question_packs"]);
  });

  it("atomically replaces only the stores named in a snapshot", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("drill_sessions", storedDrillSession());
    await storage.put("user_settings", {
      id: "default",
      settings: createDrillSettings(),
      updatedAt: "2026-06-02T00:00:00.000Z"
    });

    await storage.replaceSnapshot({ drill_sessions: [] });

    expect(await storage.getAll("drill_sessions")).toEqual([]);
    expect(await storage.getAll("user_settings")).toHaveLength(1);
  });

  it("handles empty snapshots and rejects duplicate store requests", async () => {
    const storage = new MemoryAppStorage();

    await expect(storage.getSnapshot([] as const)).resolves.toEqual({});
    await expect(storage.getSnapshot(["drill_sessions", "drill_sessions"] as const)).rejects.toThrow(
      "must be unique"
    );
  });

  it("fails early when IndexedDB is unavailable", () => {
    expect(() => createIndexedDbAppStorage({ indexedDB: null })).toThrow(
      "IndexedDB is not available in this environment."
    );
  });

  it("rejects stale lifecycle work after even an empty reset", async () => {
    const storage = new MemoryAppStorage();
    const generation = await storage.getGeneration();
    await storage.clearAll();
    await expect(storage.mutate([{ storeName: "drill_sessions", type: "put", value: storedDrillSession() }], {
      expectedGeneration: generation
    })).rejects.toMatchObject({ reason: "generation" });
    expect(await storage.getAll("drill_sessions")).toEqual([]);
  });

  it("commits decisions from a current atomic read and aborts thrown decisions", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("drill_sessions", storedDrillSession());
    const before = await storage.getDrillSession("session-1");
    const token = await storage.atomic({ stores: ["drill_sessions"], reads: { drill_sessions: ["session-1"] } }, (view) => ({
      operations: [{ storeName: "drill_sessions", type: "put", value: { ...view.get("drill_sessions", "session-1")!, updatedAt: "2026-06-03T00:00:00.000Z" } }],
      result: view.sessionToken("session-1")
    }));
    expect(token).toEqual(before.token);
    expect((await storage.getDrillSession("session-1")).token.revision).toBe(token.revision + 1);
    const snapshot = await storage.getAll("drill_sessions");
    await expect(storage.atomic({ stores: ["drill_sessions"] }, () => { throw new Error("cancel decision"); })).rejects.toThrow("cancel decision");
    expect(await storage.getAll("drill_sessions")).toEqual(snapshot);
  });

  it("preserves latest private data inside the replacement decision", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("market_sizing_attempts", { id: "note", templateId: "template", startedAt: "2026-06-02T00:00:00.000Z", note: "latest" });
    await storage.replaceSnapshot({ market_sizing_attempts: [] }, {
      readStores: ["market_sizing_attempts"], preserve: (current) => current
    });
    expect((await storage.getAll("market_sizing_attempts"))[0].note).toBe("latest");
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
