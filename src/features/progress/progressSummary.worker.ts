import { loadProgressSnapshot } from "@/features/progress/progressSnapshot";
import { loadStoredSessionSummaryDetail } from "@/features/drills/storedSessionSummary";
import type { ProgressWorkerRequest } from "@/features/progress/browserProgress";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { AppStorage } from "@/lib/storage/appStorageTypes";

self.onmessage = async (event: MessageEvent<ProgressWorkerRequest>) => {
  let storage: AppStorage | undefined;
  try {
    storage = createIndexedDbAppStorage();
    const result = "operation" in event.data
      ? await loadStoredSessionSummaryDetail(storage, event.data.sessionId)
      : await loadProgressSnapshot(storage, event.data);
    self.postMessage({ status: "loaded", ...result });
  } catch {
    self.postMessage({ status: "error" });
  } finally {
    storage?.close();
  }
};
