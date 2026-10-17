import { createBackupWorker, requestBackupWorker } from "@/features/settings/backupWorkerRequest";
import { publishLocalDataInvalidation, subscribeToLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import { applyLocalRecovery, archiveLocalRecovery, diagnoseLocalRecovery, prepareLocalRecovery, summarizeLocalRecoveryPreview, type LocalRecoveryItem, type LocalRecoveryPreview, type LocalRecoveryPreviewSummary } from "@/features/settings/localRecordRecovery";
import { AppStorageConflictError, type AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

export interface BrowserLocalRecovery {
  diagnose(): Promise<LocalRecoveryItem[]>;
  prepare(item: LocalRecoveryItem): Promise<LocalRecoveryPreviewSummary>;
  archive(): Promise<Blob>;
  apply(): Promise<{ removedRecords: number; updatedRecords: number }>;
  dispose(): void;
}

/** Retain original records and conflict fingerprints in one worker until explicit removal or cancel. */
export async function createBrowserLocalRecovery(storageFactory: () => AppStorage, signal: AbortSignal): Promise<BrowserLocalRecovery> {
  signal.throwIfAborted();
  const storage = storageFactory();
  const controller = new AbortController();
  let worker: Worker | undefined;
  let preview: LocalRecoveryPreview | undefined;
  let disposed = false;
  let unsubscribe = () => {};
  const dispose = (reason: unknown = new DOMException("Recovery canceled.", "AbortError")) => {
    if (disposed) return;
    disposed = true;
    controller.abort(reason);
    unsubscribe();
    signal.removeEventListener("abort", abort);
    worker?.terminate();
    storage.close();
    preview = undefined;
  };
  const abort = () => dispose(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  unsubscribe = subscribeToLocalDataInvalidation(() => dispose(new AppStorageConflictError("generation")));
  try {
    const expectedGeneration = await storage.getGeneration();
    controller.signal.throwIfAborted();
    if (storageFactory === createIndexedDbAppStorage && typeof Worker !== "undefined") {
      try { worker = createBackupWorker("local-record-recovery"); }
      catch { /* Keep recovery available when browser policy blocks workers. */ }
    }
    let requestId = 0;
    const check = async () => {
      controller.signal.throwIfAborted();
      await storage.atomic({ stores: [], expectedGeneration }, () => ({ operations: [], result: undefined }));
      controller.signal.throwIfAborted();
    };
    const read = async <TResult>(request: Record<string, unknown>, fallback: () => Promise<TResult>): Promise<TResult> => {
      try {
        await check();
        const result = worker === undefined ? await fallback() : await requestBackupWorker<TResult>(worker, { id: requestId++, ...request }, controller.signal, "Recovery could not be completed.");
        await check();
        return result;
      } catch (error) { dispose(error); throw error; }
    };
    const requirePreview = () => {
      if (preview === undefined) throw new Error("Review a record before continuing recovery.");
      return preview;
    };
    return {
      diagnose: () => read({ operation: "recovery_diagnose", expectedGeneration }, () => {
        preview = undefined;
        return diagnoseLocalRecovery(storage);
      }),
      prepare: (item) => read({ operation: "recovery_prepare", expectedGeneration, item }, async () => {
        preview = await prepareLocalRecovery(storage, item);
        return summarizeLocalRecoveryPreview(preview);
      }),
      archive: () => read({ operation: "recovery_archive" }, async () => new Blob([archiveLocalRecovery(requirePreview())], { type: "application/json" })),
      apply: async () => {
        try {
          await check();
          const result = worker === undefined
            ? await applyLocalRecovery(storage, requirePreview(), { publishInvalidation: false })
            : await requestBackupWorker<{ removedRecords: number; updatedRecords: number }>(worker, { id: requestId++, operation: "recovery_apply" }, controller.signal, "Recovery could not be completed.");
          await storage.atomic({ stores: [], expectedGeneration: expectedGeneration + 1 }, () => ({ operations: [], result: undefined }));
          controller.signal.throwIfAborted();
          dispose();
          publishLocalDataInvalidation("progress_replaced");
          return result;
        } catch (error) { dispose(error); throw error; }
      },
      dispose
    };
  } catch (error) {
    dispose(error);
    throw error;
  }
}
