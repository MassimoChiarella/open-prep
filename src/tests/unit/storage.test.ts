import { describe, expect, it } from "vitest";

import { createDrillSettings } from "@/features/drills/drillSettings";
import {
  appDatabaseName,
  appDatabaseVersion,
  appStoreNames,
  progressStoreNames,
  type StoredDrillSession,
} from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("typed app storage", () => {
  it("defines the MVP IndexedDB stores", () => {
    expect(appDatabaseName).toBe("consulting_math_drill_tool");
    expect(appDatabaseVersion).toBe(7);
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
