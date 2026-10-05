import { createBackupWorker, requestBackupWorker } from "@/features/settings/backupWorkerRequest";
import { prepareStandardProgressExportFromStorage, type PreparedStandardProgressExport } from "@/features/settings/localProgressExport";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

export type { PreparedStandardProgressExport } from "@/features/settings/localProgressExport";

export async function prepareStandardProgressExport(
  storageFactory: () => AppStorage,
  signal: AbortSignal
): Promise<PreparedStandardProgressExport> {
  signal.throwIfAborted();
  const storage = storageFactory();
  let worker: Worker | undefined;
  try {
    const expectedGeneration = await storage.getGeneration();
    signal.throwIfAborted();
    let prepared: PreparedStandardProgressExport;
    if (storageFactory !== createIndexedDbAppStorage || typeof Worker === "undefined") {
      prepared = await prepareStandardProgressExportFromStorage(storage, expectedGeneration, signal);
    } else {
      worker = createBackupWorker("standard-progress-preparation");
      prepared = await requestBackupWorker(worker, { id: 0, operation: "standard", expectedGeneration }, signal, "Local progress export failed.");
    }
    await storage.atomic({ stores: [], expectedGeneration }, () => ({ operations: [], result: undefined }));
    signal.throwIfAborted();
    return prepared;
  } finally {
    worker?.terminate();
    storage.close();
  }
}
