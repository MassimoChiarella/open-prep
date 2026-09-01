import {
  type AppStorage,
  type AppStorageMutation,
  type AppStorageSnapshot
} from "@/lib/storage/appStorageTypes";

const personalDataStoreNames = ["practice_records", "market_sizing_attempts"] as const;

export interface PersonalDataClearPreview {
  fitStories: number;
  marketSizingNotes: number;
  preparationProfiles: number;
  totalItems: number;
}

export async function previewPersonalDataClear(
  storage: AppStorage
): Promise<PersonalDataClearPreview> {
  return countPersonalData(await storage.getSnapshot(personalDataStoreNames));
}

export async function clearPersonalData(
  storage: AppStorage
): Promise<PersonalDataClearPreview> {
  const snapshot = await storage.getSnapshot(personalDataStoreNames);
  const preview = countPersonalData(snapshot);
  const operations: AppStorageMutation[] = [];

  for (const record of snapshot.practice_records) {
    if (record.kind === "fit_story" || record.kind === "prep_profile") {
      operations.push({ key: record.id, storeName: "practice_records", type: "delete" });
    }
  }

  for (const attempt of snapshot.market_sizing_attempts) {
    if (!Object.hasOwn(attempt, "note")) continue;
    const { note: _note, ...attemptWithoutNote } = attempt;
    operations.push({ storeName: "market_sizing_attempts", type: "put", value: attemptWithoutNote });
  }

  if (operations.length > 0) await storage.mutate(operations);

  return preview;
}

function countPersonalData(
  snapshot: AppStorageSnapshot<typeof personalDataStoreNames>
): PersonalDataClearPreview {
  const fitStories = snapshot.practice_records.filter((record) => record.kind === "fit_story").length;
  const preparationProfiles = snapshot.practice_records.filter(
    (record) => record.kind === "prep_profile"
  ).length;
  const marketSizingNotes = snapshot.market_sizing_attempts.filter((attempt) =>
    Object.hasOwn(attempt, "note")
  ).length;

  return {
    fitStories,
    marketSizingNotes,
    preparationProfiles,
    totalItems: fitStories + preparationProfiles + marketSizingNotes
  };
}
