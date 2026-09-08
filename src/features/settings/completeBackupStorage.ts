import { isPrivatePracticeRecord, preservePrivateData, privatePreservationStoreNames } from "@/features/settings/privateDataPreservation";
import {
  createCompleteBackup,
  serializeCompleteBackup,
  type CompleteBackupSections,
  type CompleteBackupCreationOptions,
  type CompleteBackupPreferences,
  type CompleteBackupV1
} from "@/features/settings/completeBackup";
import {
  createCompleteBackupSet,
  validateCompleteBackupSet,
  type CompleteBackupFile
} from "@/features/settings/completeBackupSet";
import { completeBackupStoreNames, localPreferenceKeys } from "@/features/settings/localDataInventory";
import { publishLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import {
  progressStoreNames,
  type AppStorage,
  type AppStorageMutation,
  type AppStorageSnapshot,
  type AppStoreName
} from "@/lib/storage/appStorageTypes";

type PreferenceReader = Pick<Storage, "getItem">;
type PreferenceWriter = Pick<Storage, "setItem">;

export interface CompleteBackupStorageCreationOptions extends Omit<CompleteBackupCreationOptions, "preferences"> {
  preferenceStorage?: PreferenceReader;
}

export interface CompleteBackupRestoreOptions {
  preferenceStorage?: PreferenceWriter;
  sourceBytes?: number;
  sourceSizes?: readonly number[];
}

export interface CompleteBackupRestoreResult {
  backup: Pick<CompleteBackupV1, "exportedAt" | "selectedScopes" | "sections">;
  preferences: {
    failedKeys: string[];
    status: "not_selected" | "partial" | "restored";
  };
}

export interface CompleteBackupSummary {
  fileBytes: number;
  packCount: number;
  preferencesIncluded: boolean;
  privateEntryCount: number;
  progressRecordCount: number;
  schemaVersion: number;
}

export async function createCompleteBackupFromStorage(
  storage: AppStorage,
  options: CompleteBackupStorageCreationOptions = {}
): Promise<CompleteBackupV1> {
  const { preferenceStorage = getLocalStorage(), ...creationOptions } = options;
  const snapshot = await storage.getSnapshot(completeBackupStoreNames);
  const includesPreferences = creationOptions.selectedOptionalScopes?.includes("preferences") ?? false;

  return createCompleteBackup(snapshot, {
    ...creationOptions,
    ...(includesPreferences ? { preferences: readPreferences(preferenceStorage) } : {})
  });
}

export async function createCompleteBackupFilesFromStorage(
  storage: AppStorage,
  options: CompleteBackupStorageCreationOptions = {}
): Promise<CompleteBackupFile[]> {
  const { preferenceStorage = getLocalStorage(), ...creationOptions } = options;
  const snapshot = await storage.getSnapshot(completeBackupStoreNames);
  return createCompleteBackupSet(snapshot, {
    ...creationOptions,
    ...(creationOptions.selectedOptionalScopes?.includes("preferences")
      ? { preferences: readPreferences(preferenceStorage) }
      : {})
  });
}

export async function restoreCompleteBackup(
  storage: AppStorage,
  payload: unknown,
  options: CompleteBackupRestoreOptions = {}
): Promise<CompleteBackupRestoreResult> {
  return restoreCompleteBackupFiles(storage, [payload], {
    ...options,
    ...(options.sourceBytes === undefined ? {} : { sourceSizes: [options.sourceBytes] })
  });
}

export async function restoreCompleteBackupFiles(
  storage: AppStorage,
  payloads: readonly unknown[],
  options: CompleteBackupRestoreOptions = {}
): Promise<CompleteBackupRestoreResult> {
  const validation = await validateCompleteBackupSet(payloads, options.sourceSizes);

  if (validation.status === "invalid") {
    throw new Error(validation.errors[0] ?? "Complete backup is invalid.");
  }

  const first = validation.backups[0];
  const sections: CompleteBackupSections = {
    ...first.sections,
    progress: {
      ...first.sections.progress,
      stores: Object.fromEntries(progressStoreNames.map((storeName) => [
        storeName,
        validation.backups.flatMap((part) => part.sections.progress.stores[storeName] as unknown[])
      ])) as CompleteBackupSections["progress"]["stores"]
    },
    ...(first.selectedScopes.includes("packs")
      ? { packs: validation.backups.flatMap((part) => part.sections.packs ?? []) }
      : {})
  };
  const backup = { exportedAt: first.exportedAt, selectedScopes: first.selectedScopes, sections };
  const includesPrivateText = backup.selectedScopes.includes("private_text");
  const existingPrivateData = includesPrivateText
    ? undefined
    : await storage.getSnapshot(privatePreservationStoreNames);
  const progress = includesPrivateText
    ? backup.sections.progress.stores
    : preservePrivateData(backup.sections.progress.stores, existingPrivateData!);
  const operations: AppStorageMutation[] = [];

  for (const storeName of progressStoreNames) {
    appendReplacement(operations, storeName, progress[storeName]);
  }
  if (backup.selectedScopes.includes("packs")) {
    appendReplacement(operations, "question_packs", backup.sections.packs ?? []);
  }

  await storage.mutate(operations);

  if (!backup.selectedScopes.includes("preferences")) {
    publishLocalDataInvalidation("progress_replaced");
    return { backup, preferences: { failedKeys: [], status: "not_selected" } };
  }

  const failedKeys = writePreferences(options.preferenceStorage ?? getLocalStorage(), backup.sections.preferences!);
  publishLocalDataInvalidation("progress_replaced");

  return {
    backup,
    preferences: {
      failedKeys,
      status: failedKeys.length === 0 ? "restored" : "partial"
    }
  };
}

export function createCompleteBackupSummary(
  backup: CompleteBackupV1,
  sourceBytes = new TextEncoder().encode(serializeCompleteBackup(backup)).byteLength
): CompleteBackupSummary {
  const progress = backup.sections.progress.stores;

  return {
    fileBytes: sourceBytes,
    packCount: backup.sections.packs?.length ?? 0,
    preferencesIncluded: backup.selectedScopes.includes("preferences"),
    privateEntryCount: backup.selectedScopes.includes("private_text")
      ? progress.practice_records.filter((record) => isPrivatePracticeRecord(record)).length +
        progress.market_sizing_attempts.filter((record) => Object.hasOwn(record, "note")).length
      : 0,
    progressRecordCount: progressStoreNames.reduce((total, storeName) => total + progress[storeName].length, 0),
    schemaVersion: backup.schemaVersion
  };
}

export function buildCompleteBackupFileName(exportedAt: string): string {
  return `open-prep-complete-backup-${exportedAt.slice(0, 10)}.json`;
}

function appendReplacement<TStore extends AppStoreName>(
  operations: AppStorageMutation[],
  storeName: TStore,
  records: AppStorageSnapshot<readonly TStore[]>[TStore]
): void {
  operations.push({ storeName, type: "clear" } as AppStorageMutation);
  for (const value of records) {
    operations.push({ storeName, type: "put", value } as AppStorageMutation);
  }
}

function readPreferences(storage: PreferenceReader | undefined): Partial<Record<keyof CompleteBackupPreferences, unknown>> {
  return Object.fromEntries(localPreferenceKeys.map((key) => [key, storage?.getItem(key)]));
}

function writePreferences(storage: PreferenceWriter | undefined, preferences: CompleteBackupPreferences): string[] {
  const failedKeys: string[] = [];

  for (const key of localPreferenceKeys) {
    try {
      if (storage === undefined) throw new Error("Preference storage is unavailable.");
      storage.setItem(key, preferences[key]);
    } catch {
      failedKeys.push(key);
    }
  }

  return failedKeys;
}

function getLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
