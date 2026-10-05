import type { CompleteBackupCreationOptions } from "@/features/settings/completeBackup";
import { createBackupWorker } from "@/features/settings/backupWorkerRequest";
import {
  prepareCompleteBackupFilesFromStorage,
  type PreparedCompleteBackup
} from "@/features/settings/completeBackupStorage";
import { localPreferenceKeys, type CompleteBackupOptionalScope } from "@/features/settings/localDataInventory";
import { IncompatibleStoredRecordError } from "@/features/settings/recordDiagnostics";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

export interface CompleteBackupPreparationRequest {
  expectedGeneration: number;
  options: CompleteBackupCreationOptions;
}

export type CompleteBackupPreparationResponse =
  | { prepared: PreparedCompleteBackup }
  | { error: string };

/** Only small options enter the worker; the consistent history snapshot stays there. */
export async function prepareCompleteBackup(
  storageFactory: () => AppStorage,
  scopes: readonly CompleteBackupOptionalScope[],
  signal: AbortSignal
): Promise<PreparedCompleteBackup> {
  signal.throwIfAborted();
  const storage = storageFactory();
  let worker: Worker | undefined;
  try {
    const expectedGeneration = await storage.getGeneration();
    signal.throwIfAborted();
    const options: CompleteBackupCreationOptions = {
      selectedOptionalScopes: [...scopes],
      ...(scopes.includes("preferences") ? { preferences: readPreferences() } : {})
    };
    // Injected storage adapters and environments without Workers retain the shared,
    // yielding path. A failed browser worker reports an error instead of freezing
    // the page by silently retrying a large snapshot on its main thread.
    if (storageFactory !== createIndexedDbAppStorage || typeof Worker === "undefined") {
      return await prepareCompleteBackupFilesFromStorage(storage, options, expectedGeneration, signal);
    }
    worker = createBackupWorker("complete-backup-preparation");
    const prepared = await runPreparationWorker(worker, { options, expectedGeneration }, signal);
    signal.throwIfAborted();
    // getGeneration() is document-cached. This transaction reads the current token
    // before accepting a result prepared across a reset/restore in another tab.
    await storage.atomic({ stores: [], expectedGeneration }, () => ({ operations: [], result: undefined }));
    signal.throwIfAborted();
    return prepared;
  } catch (error) {
    if (error instanceof IncompatibleStoredRecordError) throw new Error("Saved data is incompatible with backups. Review individual records in recovery.");
    throw error;
  } finally {
    worker?.terminate();
    storage.close();
  }
}

function runPreparationWorker(
  worker: Worker,
  request: CompleteBackupPreparationRequest,
  signal: AbortSignal
): Promise<PreparedCompleteBackup> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      worker.removeEventListener("messageerror", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const onMessage = (event: MessageEvent<CompleteBackupPreparationResponse>) => {
      cleanup();
      if ("error" in event.data) reject(new Error(event.data.error));
      else resolve(event.data.prepared);
    };
    const onError = () => { cleanup(); reject(new Error("Complete backup creation failed.")); };
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

function readPreferences(): NonNullable<CompleteBackupCreationOptions["preferences"]> {
  try {
    return Object.fromEntries(localPreferenceKeys.map((key) => [key, localStorage.getItem(key)]));
  } catch {
    return {};
  }
}
