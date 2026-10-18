import { buildBenchmarkSelectionHref } from "@/features/benchmarks/benchmarkSession";
import { loadLatestStoredSessionSummarySnapshot, loadStoredDrillSessionHistory, loadStoredResponseHistory, loadStoredSessionSummarySnapshotById } from "@/features/drills/drillPersistence";
import type { SessionSummarySnapshot } from "@/features/drills/sessionSummary";
import { createPersonalBestRecords, findSourcePersonalBests } from "@/features/progress/personalBests";
import { assertProgressGeneration } from "@/features/progress/progressSnapshot";
import type { AppStorage } from "@/lib/storage/appStorageTypes";

export interface StoredSessionSummaryDetail {
  newBestLabels: string[];
  repeatHref?: string;
  snapshot?: SessionSummarySnapshot;
}

export type StoredSessionSummarySnapshotListener = (snapshot: SessionSummarySnapshot, generation: number) => void | Promise<void>;

/** Keep lifetime history inside the worker; return only this session's display data. */
export async function loadStoredSessionSummaryDetail(
  storage: AppStorage,
  sessionId?: string,
  signal?: AbortSignal,
  onSnapshot?: StoredSessionSummarySnapshotListener
): Promise<{ generation: number; detail: StoredSessionSummaryDetail }> {
  signal?.throwIfAborted();
  const generation = await storage.getGeneration();
  const snapshot = sessionId === undefined
    ? await loadLatestStoredSessionSummarySnapshot(storage)
    : await loadStoredSessionSummarySnapshotById(storage, sessionId);
  signal?.throwIfAborted();
  await assertProgressGeneration(storage, generation);
  signal?.throwIfAborted();
  if (snapshot === undefined) return { generation, detail: { newBestLabels: [] } };
  // Release the bounded session before the lifetime personal-best and benchmark scans.
  await onSnapshot?.(snapshot, generation);
  signal?.throwIfAborted();
  const [sessions, responses, benchmarkResults] = await Promise.all([
    loadStoredDrillSessionHistory(storage), loadStoredResponseHistory(storage), storage.getAll("benchmark_results")
  ]);
  signal?.throwIfAborted();
  const sourceIds = [snapshot.id, ...benchmarkResults.filter((result) => result.sessionId === snapshot.id).map((result) => result.id)];
  const benchmarkResult = benchmarkResults.find((result) => result.sessionId === snapshot.id);
  const bests = findSourcePersonalBests(createPersonalBestRecords({ benchmarkResults, responses, sessions }), sourceIds);
  await assertProgressGeneration(storage, generation);
  return { generation, detail: {
    newBestLabels: bests.map((best) => best.label),
    ...(benchmarkResult === undefined ? {} : { repeatHref: buildBenchmarkSelectionHref(
      benchmarkResult.benchmarkId, /^question-pack:(?<packId>[^:]+):version:/.exec(benchmarkResult.benchmarkId)?.groups?.packId
    ) }),
    snapshot
  } };
}
