export type StoragePersistenceStatus = "best_effort" | "error" | "persistent" | "unsupported";

interface StoragePersistenceManager {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
}

export async function queryStoragePersistence(
  manager: StoragePersistenceManager | undefined = globalThis.navigator?.storage
): Promise<StoragePersistenceStatus> {
  if (typeof manager?.persisted !== "function") return "unsupported";
  try {
    return await manager.persisted() ? "persistent" : "best_effort";
  } catch {
    return "error";
  }
}

export async function requestStoragePersistence(
  manager: StoragePersistenceManager | undefined = globalThis.navigator?.storage
): Promise<StoragePersistenceStatus> {
  if (typeof manager?.persisted !== "function" || typeof manager.persist !== "function") {
    return "unsupported";
  }
  try {
    if (await manager.persisted()) return "persistent";
    return await manager.persist() ? "persistent" : "best_effort";
  } catch {
    return "error";
  }
}
