import type { LocalProgressExportStores } from "@/features/settings/localProgressExport";
import type { AppStorageSnapshot } from "@/lib/storage/appStorageTypes";

export const privatePreservationStoreNames = [
  "market_sizing_attempts",
  "practice_records"
] as const;

export function preservePrivateData(
  imported: LocalProgressExportStores,
  existing: AppStorageSnapshot<typeof privatePreservationStoreNames>
): LocalProgressExportStores {
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

