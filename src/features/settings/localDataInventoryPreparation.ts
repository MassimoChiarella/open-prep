import { createBackupWorker, requestBackupWorker, type BackupWorkerResponse } from "@/features/settings/backupWorkerRequest";
import { readLocalDataRecordInventory, type LocalDataRecordInventory } from "@/features/settings/localDataRecordInventory";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

export type LocalDataInventoryResponse = BackupWorkerResponse<LocalDataRecordInventory>;

/** Browser workers retain private record text and send back counts only. */
export async function prepareLocalDataInventory(storageFactory: () => AppStorage, signal: AbortSignal): Promise<LocalDataRecordInventory> {
  signal.throwIfAborted();
  const storage = storageFactory();
  let worker: Worker | undefined;
  try {
    const expectedGeneration = await storage.getGeneration();
    signal.throwIfAborted();
    let inventory: LocalDataRecordInventory;
    if (storageFactory !== createIndexedDbAppStorage || typeof Worker === "undefined") {
      inventory = await readLocalDataRecordInventory(storage);
    } else {
      worker = createBackupWorker("local-data-inventory");
      inventory = await requestBackupWorker(worker, { id: 0, operation: "inventory", expectedGeneration }, signal, "Local data inventory could not be read.");
    }
    signal.throwIfAborted();
    await storage.atomic({ stores: [], expectedGeneration }, () => ({ operations: [], result: undefined }));
    signal.throwIfAborted();
    return inventory;
  } finally { worker?.terminate(); storage.close(); }
}
