import type { ProgressSummary } from "@/features/progress/progressAggregation";
import { assertProgressGeneration, loadProgressSnapshot, type ProgressLoadOptions } from "@/features/progress/progressSnapshot";
import { subscribeToLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

type ProgressWorkerResult = { status: "loaded"; generation: number; summary: ProgressSummary } | { status: "error" };

/** Keep history, question snapshots and response deduplication off the interface thread. */
export async function loadBrowserProgressSummary(
  options: ProgressLoadOptions = {},
  signal?: AbortSignal
): Promise<ProgressSummary> {
  if (signal?.aborted) throw new DOMException("Progress loading canceled.", "AbortError");
  const storage = createIndexedDbAppStorage();
  let worker: Worker | undefined;
  try {
    if (typeof Worker !== "undefined") {
      try {
        worker = new Worker(new URL("./progressSummary.worker.ts", import.meta.url), { type: "module", name: "progress-summary" });
      } catch {
        // Retain local progress where browser policy disables background workers.
      }
    }
    return await new Promise<ProgressSummary>((resolve, reject) => {
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
      const finish = async (result: ProgressWorkerResult) => {
        if (settled) return;
        try {
          if (result.status !== "loaded") throw new Error("Local progress is unavailable.");
          // A reset or restore must also invalidate a result when messaging is unavailable.
          await assertProgressGeneration(storage, result.generation);
          if (settled) return;
          settled = true;
          cleanup();
          resolve(result.summary);
        } catch (error) {
          fail(error);
        }
      };
      if (worker === undefined) {
        void loadProgressSnapshot(storage, options).then((result) => finish({ status: "loaded", ...result }), fail);
      } else {
        worker.onmessage = (event: MessageEvent<ProgressWorkerResult>) => { void finish(event.data); };
        worker.onerror = () => fail(new Error("Local progress is unavailable."));
        worker.onmessageerror = () => fail(new Error("Local progress is unavailable."));
        try {
          worker.postMessage(options);
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
