import { createBackupWorker, requestBackupWorker } from "@/features/settings/backupWorkerRequest";
import { completeRestoreMetadata, readAndValidateCompleteRestore, summarizeCompleteRestore, type CompleteRestoreMetadata, type CompleteRestorePreview } from "@/features/settings/completeBackupRestoreData";
import { replaceValidatedCompleteBackupSet, restoreCompleteBackupPreferences, type CompleteBackupRestoreResult, type CompleteBackupSummary } from "@/features/settings/completeBackupStorage";
import { publishLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

export interface PreparedCompleteRestore {
  summary: CompleteBackupSummary;
  restore(): Promise<CompleteRestoreMetadata & { preferenceResult: CompleteBackupRestoreResult["preferences"] }>;
  dispose(): void;
}

export async function prepareCompleteRestore(
  files: readonly File[],
  storageFactory: () => AppStorage,
  signal: AbortSignal
): Promise<{ status: "valid"; prepared: PreparedCompleteRestore } | { status: "invalid"; errors: string[] }> {
  signal.throwIfAborted();
  const storage = storageFactory();
  let worker: Worker | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    worker?.terminate();
    storage.close();
    signal.removeEventListener("abort", dispose);
  };
  signal.addEventListener("abort", dispose, { once: true });
  try {
    const expectedGeneration = await storage.getGeneration();
    signal.throwIfAborted();
    let summary: CompleteBackupSummary;
    let apply: () => Promise<CompleteRestoreMetadata>;
    if (storageFactory !== createIndexedDbAppStorage || typeof Worker === "undefined") {
      const validation = await readAndValidateCompleteRestore(files, signal);
      if (validation.status === "invalid") { dispose(); return validation; }
      summary = summarizeCompleteRestore(validation);
      apply = async () => completeRestoreMetadata(await replaceValidatedCompleteBackupSet(storage, validation, expectedGeneration));
    } else {
      worker = createBackupWorker("complete-backup-restore");
      const preview = await requestBackupWorker<CompleteRestorePreview>(worker, { id: 0, operation: "restore_prepare", files: [...files], expectedGeneration }, signal, "Complete backup validation failed.");
      if (preview.status === "invalid") { dispose(); return preview; }
      summary = preview.summary;
      const restoreWorker = worker;
      apply = () => requestBackupWorker<CompleteRestoreMetadata>(restoreWorker, { id: 1, operation: "restore_apply" }, signal, "Complete backup restore failed.");
    }
    await storage.atomic({ stores: [], expectedGeneration }, () => ({ operations: [], result: undefined }));
    signal.throwIfAborted();
    return { status: "valid", prepared: {
      summary, dispose,
      restore: async () => {
        signal.throwIfAborted();
        if (disposed) throw new Error("Select a backup before restoring.");
        const metadata = await apply();
        const preferenceResult = restoreCompleteBackupPreferences(metadata.preferences);
        dispose();
        publishLocalDataInvalidation("progress_replaced");
        return { ...metadata, preferenceResult };
      }
    } };
  } catch (error) {
    dispose();
    throw error;
  }
}
