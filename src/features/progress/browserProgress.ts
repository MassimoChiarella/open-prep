import type { ProgressSummary } from "@/features/progress/progressAggregation";
import { loadStoredSessionSummaryDetail, type StoredSessionSummaryDetail, type StoredSessionSummarySnapshotListener } from "@/features/drills/storedSessionSummary";
import type { SessionSummarySnapshot } from "@/features/drills/sessionSummary";
import { assertProgressGeneration, loadProgressSnapshot, type ProgressLoadOptions } from "@/features/progress/progressSnapshot";
import { subscribeToLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import { AppStorageConflictError, type AppStorage } from "@/lib/storage/appStorageTypes";

export type ProgressWorkerRequest = ProgressLoadOptions | { operation: "stored_session"; sessionId?: string };

export class UnverifiedStoredSessionSummaryError extends Error {
  constructor() {
    super("Saved session results could not be verified.");
    this.name = "UnverifiedStoredSessionSummaryError";
  }
}

type ProgressWorkerResult<TResult> =
  | ({ status: "loaded"; generation: number } & TResult)
  | { status: "snapshot"; generation: number; snapshot: SessionSummarySnapshot }
  | { status: "error"; conflictReason?: AppStorageConflictError["reason"] };

/** Keep history, question snapshots and response deduplication off the interface thread. */
export async function loadBrowserProgressSummary(
  options: ProgressLoadOptions = {},
  signal?: AbortSignal
): Promise<ProgressSummary> {
  return (await loadBrowserProgressResult(options, (storage) => loadProgressSnapshot(storage, options), signal)).summary;
}

export async function loadBrowserStoredSessionSummary(
  storageFactory: () => AppStorage,
  sessionId?: string,
  signal?: AbortSignal,
  onSnapshot?: StoredSessionSummarySnapshotListener
): Promise<StoredSessionSummaryDetail> {
  return (await loadBrowserProgressResult({ operation: "stored_session", ...(sessionId === undefined ? {} : { sessionId }) },
    (storage, publishSnapshot) => loadStoredSessionSummaryDetail(storage, sessionId, signal, publishSnapshot), signal, storageFactory, onSnapshot)).detail;
}

async function loadBrowserProgressResult<TResult extends object>(
  request: ProgressWorkerRequest,
  loadFallback: (storage: AppStorage, publishSnapshot: StoredSessionSummarySnapshotListener) => Promise<{ generation: number } & TResult>,
  signal?: AbortSignal,
  storageFactory: () => AppStorage = createIndexedDbAppStorage,
  onSnapshot?: StoredSessionSummarySnapshotListener
): Promise<TResult> {
  if (signal?.aborted) throw new DOMException("Progress loading canceled.", "AbortError");
  const storage = storageFactory();
  let worker: Worker | undefined;
  try {
    if (storageFactory === createIndexedDbAppStorage && typeof Worker !== "undefined") {
      try {
        worker = new Worker(new URL("./progressSummary.worker.ts", import.meta.url), { type: "module", name: "progress-summary" });
      } catch {
        // Retain local progress where browser policy disables background workers.
      }
    }
    return await new Promise<TResult>((resolve, reject) => {
      let settled = false;
      let snapshotGeneration: number | undefined;
      const cleanup = () => {
        signal?.removeEventListener("abort", abort);
        unsubscribe();
        worker?.terminate();
      };
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      const failChecked = async (error: unknown) => {
        if (settled) return;
        if (snapshotGeneration !== undefined) {
          try {
            // Failed enrichment may race with a reset even when no invalidation message arrives.
            await assertProgressGeneration(storage, snapshotGeneration);
          } catch (verificationError) {
            fail(verificationError instanceof AppStorageConflictError ? verificationError : new UnverifiedStoredSessionSummaryError());
            return;
          }
        }
        fail(error);
      };
      const abort = () => fail(new DOMException("Progress loading canceled.", "AbortError"));
      const unsubscribe = subscribeToLocalDataInvalidation(abort);
      signal?.addEventListener("abort", abort, { once: true });
      const finish = async (result: ProgressWorkerResult<TResult>) => {
        if (settled) return;
        try {
          if (result.status === "error") {
            if (result.conflictReason !== undefined) throw new AppStorageConflictError(result.conflictReason);
            throw new Error("Local progress is unavailable.");
          }
          // A reset or restore must also invalidate a result when messaging is unavailable.
          await assertProgressGeneration(storage, result.generation);
          if (settled) return;
          if (result.status === "snapshot") {
            snapshotGeneration = result.generation;
            await onSnapshot?.(result.snapshot, result.generation);
            return;
          }
          settled = true;
          cleanup();
          resolve(result);
        } catch (error) {
          await failChecked(error);
        }
      };
      if (worker === undefined) {
        void loadFallback(storage, async (snapshot, generation) => {
          if (settled) throw new DOMException("Progress loading canceled.", "AbortError");
          await finish({ status: "snapshot", snapshot, generation });
          if (settled) throw new DOMException("Progress loading canceled.", "AbortError");
        })
          .then((result) => finish({ status: "loaded", ...result }), failChecked);
      } else {
        // Generation checks are asynchronous; preserve the worker's snapshot-before-detail order.
        let messages = Promise.resolve();
        worker.onmessage = (event: MessageEvent<ProgressWorkerResult<TResult>>) => {
          messages = messages.then(() => finish(event.data));
        };
        worker.onerror = () => { void failChecked(new Error("Local progress is unavailable.")); };
        worker.onmessageerror = () => { void failChecked(new Error("Local progress is unavailable.")); };
        try {
          worker.postMessage(request);
        } catch (error) {
          fail(error);
        }
      }
    });
  } finally {
    worker?.terminate();
    storage.close();
  }
}
