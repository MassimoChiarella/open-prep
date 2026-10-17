import type { ProgressSummary } from "@/features/progress/progressAggregation";
import { loadStoredSessionSummaryDetail, type StoredSessionSummaryDetail } from "@/features/drills/storedSessionSummary";
import { assertProgressGeneration, loadProgressSnapshot, type ProgressLoadOptions } from "@/features/progress/progressSnapshot";
import { subscribeToLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { AppStorage } from "@/lib/storage/appStorageTypes";

export type ProgressWorkerRequest = ProgressLoadOptions | { operation: "stored_session"; sessionId?: string };
type ProgressWorkerResult<TResult> = ({ status: "loaded"; generation: number } & TResult) | { status: "error" };

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
  signal?: AbortSignal
): Promise<StoredSessionSummaryDetail> {
  return (await loadBrowserProgressResult({ operation: "stored_session", ...(sessionId === undefined ? {} : { sessionId }) },
    (storage) => loadStoredSessionSummaryDetail(storage, sessionId, signal), signal, storageFactory)).detail;
}

async function loadBrowserProgressResult<TResult extends object>(
  request: ProgressWorkerRequest,
  loadFallback: (storage: AppStorage) => Promise<{ generation: number } & TResult>,
  signal?: AbortSignal,
  storageFactory: () => AppStorage = createIndexedDbAppStorage
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
      const abort = () => fail(new DOMException("Progress loading canceled.", "AbortError"));
      const unsubscribe = subscribeToLocalDataInvalidation(abort);
      signal?.addEventListener("abort", abort, { once: true });
      const finish = async (result: ProgressWorkerResult<TResult>) => {
        if (settled) return;
        try {
          if (result.status !== "loaded") throw new Error("Local progress is unavailable.");
          // A reset or restore must also invalidate a result when messaging is unavailable.
          await assertProgressGeneration(storage, result.generation);
          if (settled) return;
          settled = true;
          cleanup();
          resolve(result);
        } catch (error) {
          fail(error);
        }
      };
      if (worker === undefined) {
        void loadFallback(storage).then((result) => finish({ status: "loaded", ...result }), fail);
      } else {
        worker.onmessage = (event: MessageEvent<ProgressWorkerResult<TResult>>) => { void finish(event.data); };
        worker.onerror = () => fail(new Error("Local progress is unavailable."));
        worker.onmessageerror = () => fail(new Error("Local progress is unavailable."));
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
