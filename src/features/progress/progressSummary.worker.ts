import { loadProgressSnapshot } from "@/features/progress/progressSnapshot";
import type { ProgressWorkerRequest } from "@/features/progress/browserProgress";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import { AppStorageConflictError, type AppStorage } from "@/lib/storage/appStorageTypes";

self.onmessage = async (event: MessageEvent<ProgressWorkerRequest>) => {
  let storage: AppStorage | undefined;
  try {
    storage = createIndexedDbAppStorage();
    const result = "operation" in event.data
      ? await (await import("@/features/drills/storedSessionSummary")).loadStoredSessionSummaryDetail(
        storage, event.data.sessionId, undefined,
        (snapshot, generation) => self.postMessage({ status: "snapshot", generation, snapshot })
      )
      : await loadProgressSnapshot(storage, event.data);
    self.postMessage({ status: "loaded", ...result });
  } catch (error) {
    self.postMessage({ status: "error", ...(error instanceof AppStorageConflictError ? { conflictReason: error.reason } : {}) });
  } finally {
    storage?.close();
  }
};
