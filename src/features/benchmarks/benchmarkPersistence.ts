import type { BenchmarkId } from "@/features/benchmarks/benchmarkTypes";
import type { DrillSession } from "@/lib/domain";
import {
  appStoreIndexNames,
  type AppStorage,
  type BenchmarkResultRecord
} from "@/lib/storage/appStorageTypes";

export const benchmarkHistoryPageSize = 75;
const benchmarkAggregateScanPageSize = 2_000;

export interface BenchmarkHistoryAggregate {
  attempts: number;
  benchmarkId: string;
  best: BenchmarkResultRecord;
  bestScore: BenchmarkResultRecord;
  latest: BenchmarkResultRecord;
  previous?: BenchmarkResultRecord;
}

export interface BenchmarkHistorySnapshot {
  aggregates: BenchmarkHistoryAggregate[];
  continuationKey?: IDBValidKey;
  results: BenchmarkResultRecord[];
  summaryRecordCount: number;
  totalCount: number;
}

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

export async function loadBenchmarkHistorySnapshot(
  storage: AppStorage
): Promise<BenchmarkHistorySnapshot> {
  const totalCount = await storage.count("benchmark_results");
  const firstPage = await loadBenchmarkResultPage(storage);
  const aggregates = new Map<string, BenchmarkHistoryAggregate>();

  addBenchmarkResultsToAggregates(aggregates, firstPage.results);

  let summaryRecordCount = firstPage.results.length;
  let summaryContinuationKey = firstPage.continuationKey;

  while (summaryContinuationKey !== undefined) {
    const page = await loadBenchmarkResultPage(
      storage,
      summaryContinuationKey,
      benchmarkAggregateScanPageSize
    );

    addBenchmarkResultsToAggregates(aggregates, page.results);
    summaryRecordCount += page.results.length;
    summaryContinuationKey = page.continuationKey;
  }

  return {
    aggregates: Array.from(aggregates.values()).sort(compareAggregateLatest),
    ...(firstPage.continuationKey === undefined ? {} : { continuationKey: firstPage.continuationKey }),
    results: firstPage.results,
    summaryRecordCount,
    totalCount
  };
}

export async function loadBenchmarkResultPage(
  storage: AppStorage,
  afterKey?: IDBValidKey,
  limit = benchmarkHistoryPageSize
): Promise<{ continuationKey?: IDBValidKey; results: BenchmarkResultRecord[] }> {
  const page = await storage.getPage(
    "benchmark_results",
    appStoreIndexNames.benchmark_results,
    {
      ...(afterKey === undefined ? {} : { afterKey }),
      direction: "prev",
      limit
    }
  );

  return {
    ...(page.continuationKey === undefined ? {} : { continuationKey: page.continuationKey }),
    results: page.values
  };
}

function addBenchmarkResultsToAggregates(
  aggregates: Map<string, BenchmarkHistoryAggregate>,
  results: readonly BenchmarkResultRecord[]
): void {
  for (const result of results) {
    const current = aggregates.get(result.benchmarkId);

    if (current === undefined) {
      aggregates.set(result.benchmarkId, {
        attempts: 1,
        benchmarkId: result.benchmarkId,
        best: result,
        bestScore: result,
        latest: result
      });
      continue;
    }

    current.attempts += 1;

    if (isLaterResult(result, current.latest)) {
      current.previous = current.latest;
      current.latest = result;
    } else if (current.previous === undefined || isLaterResult(result, current.previous)) {
      current.previous = result;
    }

    if (
      result.score.accuracy > current.best.score.accuracy ||
      (result.score.accuracy === current.best.score.accuracy && isPreferredMetricTie(result, current.best))
    ) {
      current.best = result;
    }
    if (
      result.score.totalScore > current.bestScore.score.totalScore ||
      (result.score.totalScore === current.bestScore.score.totalScore && isPreferredMetricTie(result, current.bestScore))
    ) {
      current.bestScore = result;
    }
  }
}

function compareAggregateLatest(
  first: BenchmarkHistoryAggregate,
  second: BenchmarkHistoryAggregate
): number {
  return compareResults(second.latest, first.latest);
}

function isLaterResult(candidate: BenchmarkResultRecord, current: BenchmarkResultRecord): boolean {
  return compareResults(candidate, current) > 0;
}

function isPreferredMetricTie(candidate: BenchmarkResultRecord, current: BenchmarkResultRecord): boolean {
  return candidate.completedAt > current.completedAt || (
    candidate.completedAt === current.completedAt && candidate.id < current.id
  );
}

function compareResults(first: BenchmarkResultRecord, second: BenchmarkResultRecord): number {
  return first.completedAt.localeCompare(second.completedAt) || first.id.localeCompare(second.id);
}
