import { previewPersonalDataClear, type PersonalDataClearPreview } from "@/features/settings/personalDataClear";
import { appStoreNames, type AppStorage } from "@/lib/storage/appStorageTypes";

export interface LocalDataRecordInventory {
  indexedDbRecords: number;
  installedPacks: number;
  personal: PersonalDataClearPreview;
}

/** Native counts do not clone history; private records are visited one at a time. */
export async function readLocalDataRecordInventory(storage: AppStorage): Promise<LocalDataRecordInventory> {
  const [counts, personal] = await Promise.all([
    Promise.all(appStoreNames.map((storeName) => storage.count(storeName))),
    previewPersonalDataClear(storage)
  ]);
  return { indexedDbRecords: counts.reduce((total, count) => total + count, 0), installedPacks: counts[appStoreNames.indexOf("question_packs")], personal };
}
