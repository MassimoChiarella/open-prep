import type { CompleteBackupPreparationRequest, CompleteBackupPreparationResponse } from "@/features/settings/completeBackupPreparation";
import { prepareCompleteBackupFilesFromStorage } from "@/features/settings/completeBackupStorage";
import { IncompatibleStoredRecordError } from "@/features/settings/recordDiagnostics";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

self.addEventListener("message", async (event: MessageEvent<CompleteBackupPreparationRequest>) => {
  let storage: ReturnType<typeof createIndexedDbAppStorage> | undefined;
  let response: CompleteBackupPreparationResponse;
  try {
    storage = createIndexedDbAppStorage();
    response = { prepared: await prepareCompleteBackupFilesFromStorage(
      storage, event.data.options, event.data.expectedGeneration
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
