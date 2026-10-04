import { loadProgressSnapshot, type ProgressLoadOptions } from "@/features/progress/progressSnapshot";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { AppStorage } from "@/lib/storage/appStorageTypes";

self.onmessage = async (event: MessageEvent<ProgressLoadOptions>) => {
  let storage: AppStorage | undefined;
  try {
    storage = createIndexedDbAppStorage();
    const result = await loadProgressSnapshot(storage, event.data);
    self.postMessage({ status: "loaded", ...result });
  } catch {
    self.postMessage({ status: "error" });
  } finally {
    storage?.close();
  }
};
