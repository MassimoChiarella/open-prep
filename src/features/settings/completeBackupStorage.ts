import {
  createCompleteBackup,
  serializeCompleteBackup,
  validateCompleteBackupPayload,
  type CompleteBackupCreationOptions,
  type CompleteBackupPreferences,
  type CompleteBackupV1
} from "@/features/settings/completeBackup";
import { completeBackupStoreNames, localPreferenceKeys } from "@/features/settings/localDataInventory";
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
}

export interface CompleteBackupRestoreResult {
  backup: CompleteBackupV1;
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

const privatePreservationStoreNames = [
  "market_sizing_attempts",
  "practice_records"
] as const;

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

export async function restoreCompleteBackup(
  storage: AppStorage,
  payload: unknown,
  options: CompleteBackupRestoreOptions = {}
): Promise<CompleteBackupRestoreResult> {
  const validation = await validateCompleteBackupPayload(payload, { sourceBytes: options.sourceBytes });

  if (validation.status === "invalid") {
    throw new Error(validation.errors[0] ?? "Complete backup is invalid.");
  }

  const backup = structuredClone(validation.backup);
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
    return { backup, preferences: { failedKeys: [], status: "not_selected" } };
  }

  const failedKeys = writePreferences(options.preferenceStorage ?? getLocalStorage(), backup.sections.preferences!);

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
      ? progress.practice_records.filter((record) => record.kind === "fit_story" || record.kind === "prep_profile").length +
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

function preservePrivateData(
  imported: CompleteBackupV1["sections"]["progress"]["stores"],
  existing: AppStorageSnapshot<typeof privatePreservationStoreNames>
): CompleteBackupV1["sections"]["progress"]["stores"] {
  const practiceRecords = new Map(imported.practice_records.map((record) => [record.id, record]));
  for (const record of existing.practice_records) {
    if (record.kind === "fit_story" || record.kind === "prep_profile") practiceRecords.set(record.id, record);
  }

  const marketSizingAttempts = new Map(imported.market_sizing_attempts.map((record) => [record.id, record]));
  for (const record of existing.market_sizing_attempts) {
    if (!Object.hasOwn(record, "note")) continue;
    const importedRecord = marketSizingAttempts.get(record.id);
    marketSizingAttempts.set(record.id, importedRecord === undefined ? record : { ...importedRecord, note: record.note });
  }

  return {
    ...imported,
    market_sizing_attempts: [...marketSizingAttempts.values()],
    practice_records: [...practiceRecords.values()]
  };
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
