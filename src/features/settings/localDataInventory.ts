import { localePreferenceStorageKey } from "@/features/i18n/i18n";
import { questionPackPoolPreferenceStorageKey } from "@/features/question-packs/questionPackPoolPreference";
import { themePreferenceStorageKey } from "@/features/theme/theme";
import { timingAccommodationPreferenceKey } from "@/features/timing/timingAccommodationPreference";
import { appStoreNames } from "@/lib/storage/appStorageTypes";

export const completeBackupStoreNames = appStoreNames;

export const localPreferenceKeys = [
  localePreferenceStorageKey,
  themePreferenceStorageKey,
  timingAccommodationPreferenceKey,
  questionPackPoolPreferenceStorageKey
] as const;

export const completeBackupLimits = {
  maxFileBytes: 40 * 1024 * 1024,
  maxNestedCollectionItems: 10_000,
  maxQuestionPacks: 200,
  maxRecordsPerStore: 10_000,
  maxStringLength: 100_000,
  maxTotalRecords: 20_200
} as const;

export const localDataInvalidationChannel = "open-prep-local-data" as const;
export const localDataInvalidationFallbackKey = "open_prep_local_data_invalidation" as const;
export const localDataInvalidationKinds = ["personal_data_cleared", "all_data_cleared"] as const;

export type LocalDataInvalidationKind = (typeof localDataInvalidationKinds)[number];
export type CompleteBackupOptionalScope = "packs" | "preferences" | "private_text";
