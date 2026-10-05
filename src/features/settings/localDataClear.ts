import {
  publishLocalDataInvalidation,
  type LocalDataInvalidationDelivery
} from "@/features/settings/localDataInvalidation";
import {
  localPreferenceKeys,
  type LocalDataInvalidationKind
} from "@/features/settings/localDataInventory";
import { readLocalDataRecordInventory, type LocalDataRecordInventory } from "@/features/settings/localDataRecordInventory";
import type { AppStorage } from "@/lib/storage/appStorageTypes";

type LocalPreferenceKey = (typeof localPreferenceKeys)[number];
type PreferenceStorage = Pick<Storage, "getItem" | "removeItem">;
type InvalidationPublisher = (
  kind: LocalDataInvalidationKind
) => LocalDataInvalidationDelivery | Promise<LocalDataInvalidationDelivery>;

export interface ClearAllSavedAppDataOptions {
  preferenceStorage?: PreferenceStorage | null;
  publishInvalidation?: InvalidationPublisher;
}

export interface ClearAllSavedAppDataPreview {
  indexedDbRecords: number;
  installedPacks: number;
  personalItems: number;
  preferenceCount: number;
  preferencesAvailable: boolean;
}

export interface ClearAllSavedAppDataResult {
  database: "cleared";
  invalidation: {
    delivery?: LocalDataInvalidationDelivery;
    status: "failed" | "not_published" | "published" | "unavailable";
  };
  preferences: {
    failedKeys: LocalPreferenceKey[];
    status: "cleared" | "partial";
  };
  status: "complete" | "partial";
}

export async function previewAllSavedAppData(
  storage: AppStorage,
  options: Pick<ClearAllSavedAppDataOptions, "preferenceStorage"> = {}
): Promise<ClearAllSavedAppDataPreview> {
  return createAllSavedAppDataPreview(await readLocalDataRecordInventory(storage), options);
}

export function createAllSavedAppDataPreview(
  inventory: LocalDataRecordInventory,
  options: Pick<ClearAllSavedAppDataOptions, "preferenceStorage"> = {}
): ClearAllSavedAppDataPreview {
  const preferenceStorage = options.preferenceStorage === undefined
    ? getLocalStorage()
    : options.preferenceStorage ?? undefined;

  return {
    indexedDbRecords: inventory.indexedDbRecords,
    installedPacks: inventory.installedPacks,
    personalItems: inventory.personal.totalItems,
    preferenceCount: preferenceStorage === undefined
      ? 0
      : localPreferenceKeys.filter((key) => preferenceStorage.getItem(key) !== null).length,
    preferencesAvailable: preferenceStorage !== undefined
  };
}

export async function clearAllSavedAppData(
  storage: AppStorage,
  options: ClearAllSavedAppDataOptions = {}
): Promise<ClearAllSavedAppDataResult> {
  await storage.clearAll();

  const preferenceStorage = options.preferenceStorage === undefined
    ? getLocalStorage()
    : options.preferenceStorage ?? undefined;
  const failedKeys: LocalPreferenceKey[] = [];

  for (const key of localPreferenceKeys) {
    try {
      if (preferenceStorage === undefined) throw new Error("Preference storage is unavailable.");
      preferenceStorage.removeItem(key);
    } catch {
      failedKeys.push(key);
    }
  }

  const publisher = options.publishInvalidation ?? publishLocalDataInvalidation;
  try {
    const delivery = await publisher("all_data_cleared");
    return {
      database: "cleared",
      invalidation: {
        delivery,
        status: delivery === "unavailable" ? "unavailable" : "published"
      },
      preferences: { failedKeys, status: failedKeys.length > 0 ? "partial" : "cleared" },
      status: delivery === "unavailable" || failedKeys.length > 0 ? "partial" : "complete"
    };
  } catch {
    return {
      database: "cleared",
      invalidation: { status: "failed" },
      preferences: { failedKeys, status: failedKeys.length > 0 ? "partial" : "cleared" },
      status: "partial"
    };
  }
}

function getLocalStorage(): PreferenceStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
