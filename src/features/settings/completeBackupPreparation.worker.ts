import type { CompleteBackupPreparationRequest, CompleteBackupPreparationResponse } from "@/features/settings/completeBackupPreparation";
import { prepareCompleteBackupFilesFromStorage } from "@/features/settings/completeBackupStorage";
import { replaceValidatedCompleteBackupSet } from "@/features/settings/completeBackupStorage";
import type { BackupWorkerResponse } from "@/features/settings/backupWorkerRequest";
import { completeRestoreMetadata, readAndValidateCompleteRestore, summarizeCompleteRestore, type ValidatedCompleteBackupSet } from "@/features/settings/completeBackupRestoreData";
import { readLocalDataRecordInventory } from "@/features/settings/localDataRecordInventory";
import { prepareStandardProgressExportFromStorage } from "@/features/settings/localProgressExport";
import { IncompatibleStoredRecordError } from "@/features/settings/recordDiagnostics";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

type LocalDataWorkerRequest = CompleteBackupPreparationRequest |
  { id: number; operation: "standard" | "inventory"; expectedGeneration: number } |
  { id: number; operation: "restore_prepare"; files: File[]; expectedGeneration: number } |
  { id: number; operation: "restore_apply" };
let validatedRestore: ValidatedCompleteBackupSet | undefined;
let restoreStorage: ReturnType<typeof createIndexedDbAppStorage> | undefined;
let restoreGeneration: number | undefined;

self.addEventListener("message", async (event: MessageEvent<LocalDataWorkerRequest>) => {
  const request = event.data;
  if ("operation" in request) {
    let storage: ReturnType<typeof createIndexedDbAppStorage> | undefined;
    let response: BackupWorkerResponse<unknown>;
    try {
      if (request.operation === "restore_prepare") {
        restoreStorage?.close();
        validatedRestore = undefined;
        restoreStorage = createIndexedDbAppStorage();
        restoreGeneration = request.expectedGeneration;
        await restoreStorage.atomic({ stores: [], expectedGeneration: restoreGeneration }, () => ({ operations: [], result: undefined }));
        const validation = await readAndValidateCompleteRestore(request.files);
        if (validation.status === "invalid") {
          restoreStorage.close();
          restoreStorage = undefined;
          response = { id: request.id, result: validation };
        } else {
          validatedRestore = validation;
          response = { id: request.id, result: { status: "valid", summary: summarizeCompleteRestore(validation) } };
        }
      } else if (request.operation === "restore_apply") {
        if (validatedRestore === undefined || restoreStorage === undefined || restoreGeneration === undefined) throw new Error("Select a valid backup before restoring.");
        const backup = await replaceValidatedCompleteBackupSet(restoreStorage, validatedRestore, restoreGeneration);
        validatedRestore = undefined;
        restoreStorage.close();
        restoreStorage = undefined;
        response = { id: request.id, result: completeRestoreMetadata(backup) };
      } else {
        storage = createIndexedDbAppStorage();
        const result = request.operation === "standard"
          ? await prepareStandardProgressExportFromStorage(storage, request.expectedGeneration)
          : await readLocalDataRecordInventory(storage);
        await storage.atomic({ stores: [], expectedGeneration: request.expectedGeneration }, () => ({ operations: [], result: undefined }));
        response = { id: request.id, result };
      }
    } catch (error) {
      response = { id: request.id, error: error instanceof Error ? error.message : "Local data operation failed.", incompatibleRecords: error instanceof IncompatibleStoredRecordError };
    } finally {
      storage?.close();
    }
    self.postMessage(response);
    return;
  }
  let storage: ReturnType<typeof createIndexedDbAppStorage> | undefined;
  let response: CompleteBackupPreparationResponse;
  try {
    storage = createIndexedDbAppStorage();
    response = { prepared: await prepareCompleteBackupFilesFromStorage(
      storage, request.options, request.expectedGeneration
    ) };
  } catch (error) {
    response = { error: error instanceof IncompatibleStoredRecordError
      ? "Saved data is incompatible with backups. Review individual records in recovery."
      : error instanceof Error ? error.message : "Complete backup creation failed." };
  } finally {
    storage?.close();
  }
  self.postMessage(response);
});
