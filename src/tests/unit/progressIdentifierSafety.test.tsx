import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { benchmarkTests } from "@/data/questionBank/benchmarkTests";
import { BenchmarkHistoryView } from "@/features/benchmarks/BenchmarkHistoryView";
import { createDrillSummaryLink } from "@/features/drills/drillSummaryLink";
import { createProgressSummary, loadProgressSummary } from "@/features/progress/progressAggregation";
import { DashboardContent, ProgressContent } from "@/features/progress/ProgressViews";
import { createWholeProductActivitySummary } from "@/features/progress/wholeProductActivity";
import { applyLocalRecovery, archiveLocalRecovery, diagnoseLocalRecovery, prepareLocalRecovery } from "@/features/settings/localRecordRecovery";
import { inspectProgressRecord, replaceLocalProgressWithImport, validateLocalProgressImportPayload, type LocalProgressExportV1 } from "@/features/settings/localProgressExport";
import { inspectStoredRecord } from "@/features/settings/recordDiagnostics";
import type { BenchmarkResultRecord, StoredDrillSession } from "@/lib/storage/appStorageTypes";
import { assertPersistableRecord } from "@/lib/validation/inputLimits";
import progressFixture from "@/tests/fixtures/storage-history/progress-export-v4.json";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(cleanup);

function session(id: string): StoredDrillSession {
  return { ...structuredClone(progressFixture.stores.drill_sessions[0]), id } as StoredDrillSession;
}
function benchmark(id: string, sessionId: string): BenchmarkResultRecord {
  return { ...structuredClone(progressFixture.stores.benchmark_results[0]), id, sessionId } as BenchmarkResultRecord;
}
function emptyProgress(): LocalProgressExportV1 {
  const payload = structuredClone(progressFixture) as LocalProgressExportV1;
  for (const storeName of Object.keys(payload.stores) as Array<keyof typeof payload.stores>) payload.stores[storeName] = [];
  return payload;
}

describe("saved progress identifier safety", () => {
  it.each(["\ud800", "\udfff", "prefix\ud800suffix"])("rejects malformed persisted identifiers and imports without touching other saved work (%j)", async (id) => {
    const payload = emptyProgress();
    payload.stores.drill_sessions = [session(id)];
    expect(validateLocalProgressImportPayload(JSON.parse(JSON.stringify(payload))).status).toBe("invalid");
    payload.stores.drill_sessions = [];
    payload.stores.benchmark_results = [benchmark("benchmark", id)];
    expect(validateLocalProgressImportPayload(payload).status).toBe("invalid");
    expect(inspectStoredRecord("benchmark_results", payload.stores.benchmark_results[0])).toEqual([
      expect.objectContaining({ path: "sessionId" })
    ]);
    expect(inspectProgressRecord("drill_sessions", session(id))).toEqual([expect.objectContaining({ path: "id" })]);

    const storage = new MemoryAppStorage();
    await storage.put("drill_sessions", session("unrelated"));
    await expect(storage.put("drill_sessions", session(id))).rejects.toThrow("well-formed Unicode");
    await expect(storage.atomic({ stores: ["benchmark_results"] }, () => ({
      operations: [{ storeName: "benchmark_results", type: "put", value: benchmark("benchmark", id) }], result: undefined
    }))).rejects.toThrow("well-formed Unicode");
    expect(await storage.getAll("drill_sessions")).toEqual([session("unrelated")]);
    expect(await storage.getAll("benchmark_results")).toEqual([]);
  });

  it("preserves valid Unicode identifiers and the exact encoded summary URL through import", async () => {
    const id = "session 🚀/\u0800&value";
    const payload = emptyProgress();
    payload.stores.drill_sessions = [session(id)];
    payload.stores.benchmark_results = [benchmark("result-🚀", id)];
    const validation = validateLocalProgressImportPayload(payload);
    expect(validation.status).toBe("valid");
    if (validation.status !== "valid") throw new Error(validation.errors.join("\n"));
    const storage = new MemoryAppStorage();
    await replaceLocalProgressWithImport(storage, validation.exportData);
    expect(await storage.get("drill_sessions", id)).toEqual(session(id));
    expect(createDrillSummaryLink(id, "Summary")).toEqual({ href: `/drills/summary?id=${encodeURIComponent(id)}`, label: "Summary" });
    expect(new URL(createDrillSummaryLink(id, "Summary").href, "https://local.invalid").searchParams.get("id")).toBe(id);
    expect(inspectProgressRecord("drill_sessions", session(id))).toEqual([]);
  });

  it("retains malformed Unicode in arbitrary answers, notes and story text", () => {
    const text = "Private text \ud800\udfff then a lone \ud800";
    const record = session("valid-session");
    record.responses[0].rawInput = text;
    expect(() => assertPersistableRecord({ id: "private-text", title: text, note: text, story: { situation: text } })).not.toThrow();
    expect(inspectStoredRecord("drill_sessions", record)).toEqual([]);
    const payload = emptyProgress();
    payload.stores.drill_sessions = [record];
    const validation = validateLocalProgressImportPayload(payload);
    expect(validation.status).toBe("valid");
    if (validation.status === "valid") expect(validation.exportData.stores.drill_sessions[0].responses[0].rawInput).toBe(text);
  });

  it("keeps historical malformed-ID scores and unrelated history visible with accurately labelled recovery links", async () => {
    const storage = new MemoryAppStorage();
    const malformed = session("\ud800");
    malformed.endedAt = malformed.updatedAt = "2026-09-01T00:00:00Z";
    const valid = session("valid-🚀");
    storage.seedLegacy("drill_sessions", malformed);
    await storage.put("drill_sessions", valid);
    storage.seedLegacy("benchmark_results", benchmark("malformed-result", malformed.id));
    await storage.put("benchmark_results", benchmark("valid-result", valid.id));

    const activity = createWholeProductActivitySummary({ sessions: [malformed, valid] });
    expect(activity.math.completedSessionCount).toBe(2);
    expect(activity.recentActivities).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: "/settings#record-recovery", label: "Review recovery" }),
      expect.objectContaining({ href: createDrillSummaryLink(valid.id, "").href, label: "Math drill" })
    ]));
    const summary = await loadProgressSummary(storage);
    expect(summary.dashboard.totalSessions).toBe(2);
    expect(summary.wholeProductActivity.benchmarks.completedResultCount).toBe(2);
    for (const Content of [DashboardContent, ProgressContent]) {
      const view = render(<Content summary={summary} />);
      expect(screen.getAllByRole("link", { name: "Review recovery" }).every((link) => link.getAttribute("href") === "/settings#record-recovery")).toBe(true);
      expect(screen.getByRole("link", { name: "View Summary" })).toHaveAttribute("href", createDrillSummaryLink(valid.id, "").href);
      view.unmount();
    }
    render(<BenchmarkHistoryView benchmarks={benchmarkTests} storageFactory={() => storage} />);
    const history = await screen.findByTestId("benchmark-history-results-table");
    expect(within(history).getByRole("link", { name: "Review recovery" })).toHaveAttribute("href", "/settings#record-recovery");
    expect(within(history).getByRole("link", { name: "Review" })).toHaveAttribute("href", createDrillSummaryLink(valid.id, "").href);
    expect(await storage.get("drill_sessions", malformed.id)).toEqual(malformed);
    expect(createProgressSummary({ sessions: [malformed, valid] }).dashboard.totalSessions).toBe(2);
  });

  it("archives malformed original keys losslessly and removes only their ownership closure", async () => {
    const storage = new MemoryAppStorage();
    const malformed = session("\ud800");
    const malformedBenchmark = benchmark("legacy-result", malformed.id);
    storage.seedLegacy("drill_sessions", malformed);
    storage.seedLegacy("benchmark_results", malformedBenchmark);
    await storage.put("drill_sessions", session("unrelated"));
    await storage.put("benchmark_results", benchmark("unrelated-result", "unrelated"));
    const items = await diagnoseLocalRecovery(storage);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ recordId: malformed.id, action: "remove_record" });
    const preview = await prepareLocalRecovery(storage, items[0]);
    expect(preview.counts).toEqual({ drill_sessions: 1, benchmark_results: 1 });
    const archive = JSON.parse(archiveLocalRecovery(preview)) as { records: Array<{ storeName: string; recordId: string; value: [string, number, Array<[string, [string, unknown]]>] }> };
    const originalSession = archive.records.find((record) => record.storeName === "drill_sessions")!;
    const originalBenchmark = archive.records.find((record) => record.storeName === "benchmark_results")!;
    expect(originalSession.recordId).toBe(malformed.id);
    expect(originalSession.value[2].find(([key]) => key === "id")?.[1]).toEqual(["string", malformed.id]);
    expect(originalBenchmark.value[2].find(([key]) => key === "sessionId")?.[1]).toEqual(["string", malformed.id]);
    expect(await storage.get("drill_sessions", malformed.id)).toEqual(malformed);
    await expect(applyLocalRecovery(storage, preview)).resolves.toEqual({ removedRecords: 2, updatedRecords: 0 });
    expect(await storage.getAll("drill_sessions")).toEqual([session("unrelated")]);
    expect(await storage.getAll("benchmark_results")).toEqual([benchmark("unrelated-result", "unrelated")]);
  });
});
