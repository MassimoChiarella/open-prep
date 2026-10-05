import { isPrivatePracticeRecord, preservePrivateData, privatePreservationStoreNames } from "@/features/settings/privateDataPreservation";
import { hasPrivateMarketSizingText } from "@/features/market-sizing/marketSizingNote";
import {
  createCompleteBackup,
  serializeCompleteBackup,
  type CompleteBackupSections,
  type CompleteBackupCreationOptions,
  type CompleteBackupPreferences,
  type CompleteBackupV1
} from "@/features/settings/completeBackup";
import {
  backupFromFile,
  buildCompleteBackupPartFileName,
  createCompleteBackupSet,
  createSerializedCompleteBackupSet,
  validateCompleteBackupSet,
  type CompleteBackupFile
} from "@/features/settings/completeBackupSet";
import { completeBackupStoreNames, localPreferenceKeys } from "@/features/settings/localDataInventory";
import { publishLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import {
  progressStoreNames,
  type AppStorage,
} from "@/lib/storage/appStorageTypes";

type PreferenceReader = Pick<Storage, "getItem">;
type PreferenceWriter = Pick<Storage, "setItem">;

export interface CompleteBackupStorageCreationOptions extends Omit<CompleteBackupCreationOptions, "preferences"> {
  preferenceStorage?: PreferenceReader;
}

export interface CompleteBackupRestoreOptions {
  expectedGeneration?: number;
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

export interface PreparedCompleteBackup {
  files: { blob: Blob; fileName: string }[];
  summary: CompleteBackupSummary;
}

/** Prepare the exact download bytes once; React never receives the history tree. */
export async function prepareCompleteBackupFilesFromStorage(
  storage: AppStorage,
  options: CompleteBackupCreationOptions = {},
  expectedGeneration?: number,
  signal?: AbortSignal
): Promise<PreparedCompleteBackup> {
  signal?.throwIfAborted();
  const generation = expectedGeneration ?? await storage.getGeneration();
  const checkGeneration = () => storage.atomic({ stores: [], expectedGeneration: generation }, () => ({ operations: [], result: undefined }));
  await checkGeneration();
  const snapshot = await storage.getSnapshot(completeBackupStoreNames);
  signal?.throwIfAborted();
  const serializedFiles = await createSerializedCompleteBackupSet(snapshot, options, signal);
  const files: PreparedCompleteBackup["files"] = [];
  const summaries: CompleteBackupSummary[] = [];
  for (const { file, fileBytes, serialized } of serializedFiles) {
    signal?.throwIfAborted();
    files.push({ blob: new Blob([serialized], { type: "application/json" }), fileName: buildCompleteBackupPartFileName(file) });
    summaries.push(createCompleteBackupSummary(backupFromFile(file), fileBytes));
    await yieldToBrowser();
  }
  await checkGeneration();
  signal?.throwIfAborted();
  const summary = summaries.reduce((total, part) => ({
    ...total,
    fileBytes: total.fileBytes + part.fileBytes,
    packCount: total.packCount + part.packCount,
    privateEntryCount: total.privateEntryCount + part.privateEntryCount,
    progressRecordCount: total.progressRecordCount + part.progressRecordCount
  }), { ...summaries[0], fileBytes: 0, packCount: 0, privateEntryCount: 0, progressRecordCount: 0 });
  return { files, summary };
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

  const backup = await replaceValidatedCompleteBackupSet(storage, validation, options.expectedGeneration);
  const preferences = restoreCompleteBackupPreferences(backup.selectedScopes.includes("preferences") ? backup.sections.preferences : undefined, options.preferenceStorage);
  publishLocalDataInvalidation("progress_replaced");
  return { backup, preferences };
}

/** Accept only the output of full schema/set/checksum validation, kept inside the restore worker. */
export async function replaceValidatedCompleteBackupSet(
  storage: AppStorage,
  validation: Extract<Awaited<ReturnType<typeof validateCompleteBackupSet>>, { status: "valid" }>,
  expectedGeneration?: number
): Promise<CompleteBackupRestoreResult["backup"]> {

  const first = validation.backups[0];
  const progressStores = Object.fromEntries(
    progressStoreNames.map((storeName) => [storeName, []])
  ) as unknown as CompleteBackupSections["progress"]["stores"];
  let recordsSinceYield = 0;

  for (const part of validation.backups) {
    for (const storeName of progressStoreNames) {
      for (const record of part.sections.progress.stores[storeName]) {
        (progressStores[storeName] as unknown[]).push(record);
        recordsSinceYield += 1;
        if (recordsSinceYield === 1_000) {
          recordsSinceYield = 0;
          await yieldToBrowser();
        }
      }
    }
  }

  const sections: CompleteBackupSections = {
    ...first.sections,
    progress: {
      ...first.sections.progress,
      stores: progressStores
    },
    ...(first.selectedScopes.includes("packs")
      ? { packs: validation.backups.flatMap((part) => part.sections.packs ?? []) }
      : {})
  };
  const backup = { exportedAt: first.exportedAt, selectedScopes: first.selectedScopes, sections };
  const includesPrivateText = backup.selectedScopes.includes("private_text");
  const progress = backup.sections.progress.stores;
  const packs = backup.selectedScopes.includes("packs") ? { question_packs: backup.sections.packs ?? [] } : {};
  await storage.replaceSnapshot({
    ...progress,
    ...packs
  }, { expectedGeneration, ...(includesPrivateText ? {} : {
    readStores: privatePreservationStoreNames,
    preserve: (current) => ({
      ...preservePrivateData(progress, {
        practice_records: current.practice_records ?? [], market_sizing_attempts: current.market_sizing_attempts ?? []
      }),
      ...packs
    })
  }) });
  return backup;
}

export function restoreCompleteBackupPreferences(
  preferences: CompleteBackupPreferences | undefined,
  storage: PreferenceWriter | undefined = getLocalStorage()
): CompleteBackupRestoreResult["preferences"] {
  if (preferences === undefined) return { failedKeys: [], status: "not_selected" };
  const failedKeys = writePreferences(storage, preferences);
  return { failedKeys, status: failedKeys.length === 0 ? "restored" : "partial" };
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
        progress.market_sizing_attempts.filter(hasPrivateMarketSizingText).length
      : 0,
    progressRecordCount: progressStoreNames.reduce((total, storeName) => total + progress[storeName].length, 0),
    schemaVersion: backup.schemaVersion
  };
}

export function buildCompleteBackupFileName(exportedAt: string): string {
  return `open-prep-complete-backup-${exportedAt.slice(0, 10)}.json`;
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

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
