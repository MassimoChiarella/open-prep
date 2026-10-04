import {
  createProgressSummary,
  type CreateProgressSummaryOptions,
  type ProgressSummary
} from "@/features/progress/progressAggregation";
import type { AppStorage } from "@/lib/storage/appStorageTypes";

export type ProgressLoadOptions = Pick<CreateProgressSummaryOptions, "now" | "recentSessionLimit" | "timeZone">;

/** Read one consistent lifetime snapshot; aggregation runs after its transaction closes. */
export async function loadProgressSnapshot(
  storage: AppStorage,
  options: ProgressLoadOptions = {}
): Promise<{ generation: number; summary: ProgressSummary }> {
  const generation = await storage.getGeneration();
  const snapshot = await storage.getSnapshot([
    "drill_sessions", "responses", "mistake_notebook", "benchmark_results",
    "retry_schedules", "exhibit_attempts", "market_sizing_attempts", "practice_records"
  ]);
  const summary = createProgressSummary({
    ...options,
    sessions: snapshot.drill_sessions,
    responses: snapshot.responses,
    mistakeNotebook: snapshot.mistake_notebook,
    benchmarkResults: snapshot.benchmark_results,
    retrySchedules: snapshot.retry_schedules,
    exhibitAttempts: snapshot.exhibit_attempts,
    marketSizingAttempts: snapshot.market_sizing_attempts,
    practiceRecords: snapshot.practice_records
  });
  await assertProgressGeneration(storage, generation);
  return { generation, summary };
}

export async function assertProgressGeneration(storage: AppStorage, generation: number): Promise<void> {
  await storage.atomic({ stores: [], expectedGeneration: generation }, () => ({ operations: [], result: undefined }));
}
