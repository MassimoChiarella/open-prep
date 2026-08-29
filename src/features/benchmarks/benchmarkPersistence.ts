import type { BenchmarkId } from "@/features/benchmarks/benchmarkTypes";
import type { DrillSession } from "@/lib/domain";
import type { AppStorage, BenchmarkResultRecord } from "@/lib/storage/appStorageTypes";

export interface PersistBenchmarkResultOptions {
  benchmarkId: BenchmarkId;
  completedAt?: string;
  id?: string;
  session: DrillSession;
  storage: AppStorage;
}

export async function persistBenchmarkResult(options: PersistBenchmarkResultOptions): Promise<BenchmarkResultRecord> {
  if (options.session.score === undefined) {
    throw new Error("Only completed benchmark sessions can be persisted.");
  }

  const completedAt = options.completedAt ?? options.session.endedAt;

  if (completedAt === undefined) {
    throw new Error("Completed benchmark sessions require a completion timestamp.");
  }

  const record: BenchmarkResultRecord = {
    id: options.id ?? `benchmark-result-${options.benchmarkId}-${options.session.id}`,
    benchmarkId: options.benchmarkId,
    completedAt,
    difficulty: options.session.settings.difficulty,
    score: options.session.score,
    sessionId: options.session.id
  };

  await options.storage.put("benchmark_results", record);

  return record;
}

export async function loadBenchmarkResults(
  storage: AppStorage,
  benchmarkId?: BenchmarkId
): Promise<BenchmarkResultRecord[]> {
  const results = await storage.getAll("benchmark_results");
  const filteredResults =
    benchmarkId === undefined ? results : results.filter((result) => result.benchmarkId === benchmarkId);

  return filteredResults.sort((first, second) => Date.parse(second.completedAt) - Date.parse(first.completedAt));
}
