import {
  publishLocalDataInvalidation,
  type LocalDataInvalidationDelivery
} from "@/features/settings/localDataInvalidation";
import {
  localPreferenceKeys,
  type LocalDataInvalidationKind
} from "@/features/settings/localDataInventory";
import {
  appStoreNames,
  type AppStorage,
  type AppStorageSnapshot
} from "@/lib/storage/appStorageTypes";

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
  const snapshot = await storage.getSnapshot(appStoreNames);
  const preferenceStorage = options.preferenceStorage === undefined
    ? getLocalStorage()
    : options.preferenceStorage ?? undefined;
  const fitStories = snapshot.practice_records.filter((record) => record.kind === "fit_story").length;
  const preparationProfiles = snapshot.practice_records.filter(
    (record) => record.kind === "prep_profile"
  ).length;
  const marketSizingNotes = snapshot.market_sizing_attempts.filter((attempt) =>
    Object.hasOwn(attempt, "note")
  ).length;

  return {
    indexedDbRecords: countSnapshotRecords(snapshot),
    installedPacks: snapshot.question_packs.length,
    personalItems: fitStories + preparationProfiles + marketSizingNotes,
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

  if (failedKeys.length > 0) {
    return {
      database: "cleared",
      invalidation: { status: "not_published" },
      preferences: { failedKeys, status: "partial" },
      status: "partial"
    };
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
      preferences: { failedKeys, status: "cleared" },
      status: delivery === "unavailable" ? "partial" : "complete"
    };
  } catch {
    return {
      database: "cleared",
      invalidation: { status: "failed" },
      preferences: { failedKeys, status: "cleared" },
      status: "partial"
    };
  }
}

function countSnapshotRecords(snapshot: AppStorageSnapshot<typeof appStoreNames>): number {
  return appStoreNames.reduce((total, storeName) => total + snapshot[storeName].length, 0);
}

function getLocalStorage(): PreferenceStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
