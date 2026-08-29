import { createDrillSettings } from "@/features/drills/drillSettings";
import type { DrillSettings } from "@/lib/domain";
import {
  progressStoreNames,
  type AppStorage,
  type UserSettingsRecord
} from "@/lib/storage/appStorageTypes";

export const defaultUserSettingsId = "default";

export async function loadUserDrillSettings(storage: AppStorage): Promise<DrillSettings | undefined> {
  const record = await storage.get("user_settings", defaultUserSettingsId);

  return record === undefined ? undefined : createDrillSettings(record.settings);
}

export async function saveUserDrillSettings(
  storage: AppStorage,
  settings: DrillSettings,
  updatedAt = new Date().toISOString()
): Promise<void> {
  await storage.put("user_settings", createUserSettingsRecord(settings, updatedAt));
}

export async function resetLocalData(storage: AppStorage): Promise<void> {
  await Promise.all(progressStoreNames.map((storeName) => storage.clear(storeName)));
}

export function createUserSettingsRecord(settings: DrillSettings, updatedAt: string): UserSettingsRecord {
  return {
    id: defaultUserSettingsId,
    settings: createDrillSettings(settings),
    updatedAt
  };
}
