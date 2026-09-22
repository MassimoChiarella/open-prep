import type {
  AppStorageAtomicView, AppStorageReads, AppStorageReplacement, AppStoreKey, AppStoreName,
  AppStoreValue, DrillSessionWriteToken
} from "@/lib/storage/appStorageTypes";
import { AppStorageConflictError } from "@/lib/storage/appStorageTypes";

export const lifecycleMetadataKey = "lifecycle";
export const sessionRevisionKey = (id: string): string => `session:${id}`;

export function createAtomicView(
  records: AppStorageReplacement,
  reads: AppStorageReads,
  generation: number,
  revisions: ReadonlyMap<string, number>
): AppStorageAtomicView {
  function get<TStore extends AppStoreName>(storeName: TStore, key: AppStoreKey<TStore>): AppStoreValue<TStore> | undefined {
    const requested = reads[storeName];
    if (requested !== "all" && !requested?.includes(key as never)) {
      throw new Error(`Atomic read was not declared: ${storeName}.`);
    }
    return (records[storeName] as AppStoreValue<TStore>[] | undefined)?.find((record) => record.id === key);
  }
  return {
    generation,
    get,
    getAll: <TStore extends AppStoreName>(storeName: TStore): AppStoreValue<TStore>[] => {
      if (reads[storeName] !== "all") throw new Error(`Atomic full-store read was not declared: ${storeName}.`);
      return (records[storeName] ?? []) as AppStoreValue<TStore>[];
    },
    sessionToken: (id) => ({ generation, revision: revisions.get(id) ?? 0, exists: get("drill_sessions", id) !== undefined })
  };
}

export function assertSessionToken(actual: DrillSessionWriteToken, expected: DrillSessionWriteToken): void {
  if (actual.generation !== expected.generation) throw new AppStorageConflictError("generation");
  if (actual.revision !== expected.revision || actual.exists !== expected.exists) throw new AppStorageConflictError("session");
}
