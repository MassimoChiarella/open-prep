import { IncompatibleStoredRecordError } from "@/features/settings/recordDiagnostics";

/** One bundled entry keeps export, restore, and inventory validation code shared. */
export function createBackupWorker(name: string): Worker {
  return new Worker(new URL("./completeBackupPreparation.worker.ts", import.meta.url), { type: "module", name });
}

export interface BackupWorkerResponse<TResult> {
  id: number;
  result?: TResult;
  error?: string;
  incompatibleRecords?: boolean;
}

export function requestBackupWorker<TResult>(
  worker: Worker,
  request: { id: number } & Record<string, unknown>,
  signal: AbortSignal,
  failureMessage: string
): Promise<TResult> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      worker.removeEventListener("messageerror", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const onMessage = (event: MessageEvent<BackupWorkerResponse<TResult>>) => {
      if (event.data.id !== request.id) return;
      cleanup();
      if (event.data.incompatibleRecords) reject(new IncompatibleStoredRecordError([]));
      else if (event.data.error !== undefined) reject(new Error(event.data.error));
      else if (event.data.result === undefined) reject(new Error(failureMessage));
      else resolve(event.data.result);
    };
    const onError = () => { cleanup(); reject(new Error(failureMessage)); };
    const onAbort = () => { cleanup(); reject(signal.reason); };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.addEventListener("messageerror", onError);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    else {
      try { worker.postMessage(request); }
      catch { onError(); }
    }
  });
}
