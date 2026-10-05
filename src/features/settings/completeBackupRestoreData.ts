import { readFileText } from "@/features/settings/backupFileParsing";
import type { CompleteBackupPreferences, CompleteBackupScope } from "@/features/settings/completeBackup";
import { validateCompleteBackupSet } from "@/features/settings/completeBackupSet";
import { createCompleteBackupSummary, type CompleteBackupRestoreResult, type CompleteBackupSummary } from "@/features/settings/completeBackupStorage";
import type { DrillSettings } from "@/lib/domain";

export type ValidatedCompleteBackupSet = Extract<Awaited<ReturnType<typeof validateCompleteBackupSet>>, { status: "valid" }>;
export type CompleteRestorePreview = { status: "valid"; summary: CompleteBackupSummary } | { status: "invalid"; errors: string[] };

export interface CompleteRestoreMetadata {
  preferences?: CompleteBackupPreferences;
  savedSettings?: DrillSettings;
  selectedScopes: CompleteBackupScope[];
}

export async function readAndValidateCompleteRestore(files: readonly File[], signal?: AbortSignal) {
  const payloads: unknown[] = [];
  for (const file of files) {
    signal?.throwIfAborted();
    try { payloads.push(JSON.parse(await readFileText(file))); }
    catch { throw new Error("Complete backup must contain valid JSON."); }
    signal?.throwIfAborted();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const validation = await validateCompleteBackupSet(payloads, files.map((file) => file.size));
  signal?.throwIfAborted();
  return validation;
}

export function summarizeCompleteRestore(validation: ValidatedCompleteBackupSet): CompleteBackupSummary {
  const parts = validation.backups.map((backup) => createCompleteBackupSummary(backup, 0));
  return parts.reduce((total, part) => ({
    ...total,
    packCount: total.packCount + part.packCount,
    privateEntryCount: total.privateEntryCount + part.privateEntryCount,
    progressRecordCount: total.progressRecordCount + part.progressRecordCount
  }), { ...parts[0], fileBytes: validation.sourceBytes, packCount: 0, privateEntryCount: 0, progressRecordCount: 0 });
}

export function completeRestoreMetadata(backup: CompleteBackupRestoreResult["backup"]): CompleteRestoreMetadata {
  return {
    selectedScopes: [...backup.selectedScopes],
    savedSettings: backup.sections.progress.stores.user_settings[0]?.settings,
    ...(backup.selectedScopes.includes("preferences") ? { preferences: backup.sections.preferences } : {})
  };
}
