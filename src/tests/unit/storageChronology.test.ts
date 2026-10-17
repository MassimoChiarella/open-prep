import { describe, expect, it } from "vitest";

import { appStoreIndexNames, type BenchmarkResultRecord } from "@/lib/storage/appStorageTypes";
import { compareTimestampIndexKeys, requiresChronologyScan } from "@/lib/storage/storageChronology";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("indexed timestamp chronology", () => {
  it("keeps ordinary canonical dates on the fast path and detects exceptional indexed values", () => {
    for (const completedAt of ["0000-01-01T00:00:00.000Z", "2026-10-17T14:00:00.000Z", "9999-12-31T23:59:59.999Z"]) {
      expect(requiresChronologyScan("benchmark_results", { completedAt })).toBe(false);
    }
    for (const completedAt of ["+010000-01-01T00:00:00.000Z", "-000001-01-01T00:00:00.000Z", "2026-10-17T10:00:00-04:00", "broken", "2026-99-99T00:00:00.000Z", 3, null]) {
      expect(requiresChronologyScan("benchmark_results", { completedAt })).toBe(true);
    }
    expect(requiresChronologyScan("benchmark_results", {})).toBe(false);
    expect(requiresChronologyScan("market_sizing_attempts", { startedAt: "broken" })).toBe(false);
    expect(requiresChronologyScan("responses", { submittedAt: "broken" })).toBe(true);
    expect(requiresChronologyScan("drill_sessions", { updatedAt: "broken" })).toBe(true);
    expect(requiresChronologyScan("question_packs", { importedAt: "+010000-01-01T00:00:00.000Z" })).toBe(true);
  });

  it("uses epoch timestamps and raw IndexedDB-style ID ordering for equal instants", () => {
    const compare = (first: IDBValidKey, second: IDBValidKey) => first < second ? -1 : first > second ? 1 : 0;
    expect(compareTimestampIndexKeys(["2026-10-17T10:00:00-04:00", "tie_a"], ["2026-10-17T14:00:00Z", "tie_Z"], compare)).toBeGreaterThan(0);
    expect(compareTimestampIndexKeys(["+010000-01-01T00:00:00Z", "a"], ["2026-10-17T14:00:00Z", "b"], compare)).toBeGreaterThan(0);
    expect(compareTimestampIndexKeys(["broken", "a"], ["-000001-01-01T00:00:00Z", "b"], compare)).toBeLessThan(0);
  });

  it("normalizes current Memory writes while seedLegacy retains explicit raw fixtures", async () => {
    const storage = new MemoryAppStorage();
    const timestamp = "2026-10-17T10:00:00-04:00";
    const current = benchmark("current", timestamp);
    await storage.put("benchmark_results", current);
    storage.seedLegacy("benchmark_results", benchmark("legacy", timestamp));
    await storage.mutate([{ storeName: "benchmark_results", type: "put", value: benchmark("atomic", timestamp) }]);
    expect(current.completedAt).toBe(timestamp);
    expect((await storage.get("benchmark_results", "current"))?.completedAt).toBe("2026-10-17T14:00:00.000Z");
    expect((await storage.get("benchmark_results", "atomic"))?.completedAt).toBe("2026-10-17T14:00:00.000Z");
    expect((await storage.get("benchmark_results", "legacy"))?.completedAt).toBe(timestamp);
  });

  it.each(["next", "prev"] as const)("pages mixed legacy years and offsets without gaps in %s direction", async (direction) => {
    const storage = new MemoryAppStorage();
    for (const [id, time] of [
      ["future", "+010000-01-01T00:00:00.000Z"], ["negative", "-000001-01-01T00:00:00.000Z"],
      ["tie_a", "2026-10-17T10:00:00-04:00"], ["tie_Z", "2026-10-17T14:00:00Z"], ["older", "2026-10-17T13:00:00Z"], ["invalid", "broken"]
    ]) storage.seedLegacy("benchmark_results", benchmark(id, time));
    const ids: string[] = [];
    let afterKey: IDBValidKey | undefined;
    do {
      const page = await storage.getPage("benchmark_results", appStoreIndexNames.benchmark_results, { direction, limit: 2, afterKey });
      for (const value of page.values) ids.push(value.id);
      afterKey = page.continuationKey;
    } while (afterKey !== undefined);
    const chronological = ["invalid", "negative", "older", "tie_Z", "tie_a", "future"];
    expect(ids).toEqual(direction === "next" ? chronological : [...chronological].reverse());
  });
});

function benchmark(id: string, completedAt: string): BenchmarkResultRecord {
  return { id, completedAt, benchmarkId: "beginner", difficulty: "beginner", sessionId: id,
    score: { accuracy: 1, averageTimeSeconds: 1, categoryBreakdown: [], correctCount: 1, errorBreakdown: [], incorrectCount: 0, totalScore: 100 } };
}
