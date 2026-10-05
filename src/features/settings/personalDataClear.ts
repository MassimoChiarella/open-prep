import { hasPrivateMarketSizingText, withoutMarketSizingNotes } from "@/features/market-sizing/marketSizingNote";
import { isPrivatePracticeRecord } from "@/features/settings/privateDataPreservation";
import {
  type AppStorage,
  type AppStorageMutation,
  type AppStorageSnapshot
} from "@/lib/storage/appStorageTypes";

const personalDataStoreNames = ["practice_records", "market_sizing_attempts"] as const;

export interface PersonalDataClearPreview {
  fitStories: number;
  fullCaseDrafts: number;
  marketSizingNotes: number;
  preparationProfiles: number;
  totalItems: number;
}

export async function previewPersonalDataClear(
  storage: AppStorage
): Promise<PersonalDataClearPreview> {
  const preview: PersonalDataClearPreview = { fitStories: 0, fullCaseDrafts: 0, marketSizingNotes: 0, preparationProfiles: 0, totalItems: 0 };
  await Promise.all([
    storage.scan("practice_records", (record) => {
      if (record.kind === "fit_story") preview.fitStories += 1;
      if (record.kind === "full_case_draft") preview.fullCaseDrafts += 1;
      if (record.kind === "prep_profile") preview.preparationProfiles += 1;
    }),
    storage.scan("market_sizing_attempts", (record) => {
      if (hasPrivateMarketSizingText(record)) preview.marketSizingNotes += 1;
    })
  ]);
  preview.totalItems = preview.fitStories + preview.fullCaseDrafts + preview.marketSizingNotes + preview.preparationProfiles;
  return preview;
}

export async function clearPersonalData(
  storage: AppStorage
): Promise<PersonalDataClearPreview> {
  return storage.atomic({
    stores: personalDataStoreNames, advanceGeneration: true,
    reads: { practice_records: "all", market_sizing_attempts: "all" }
  }, (view) => {
    const snapshot = {
      practice_records: view.getAll("practice_records"), market_sizing_attempts: view.getAll("market_sizing_attempts")
    };
    const preview = countPersonalData(snapshot);
    const operations: AppStorageMutation[] = [];

    for (const record of snapshot.practice_records) {
      if (isPrivatePracticeRecord(record)) {
        operations.push({ key: record.id, storeName: "practice_records", type: "delete" });
      }
    }

    for (const attempt of snapshot.market_sizing_attempts) {
      if (!hasPrivateMarketSizingText(attempt) && !Object.hasOwn(attempt, "note")) continue;
      operations.push({ storeName: "market_sizing_attempts", type: "put", value: withoutMarketSizingNotes(attempt) });
    }

    return { operations, result: preview };
  });
}

export function countPersonalData(
  snapshot: AppStorageSnapshot<typeof personalDataStoreNames>
): PersonalDataClearPreview {
  const fullCaseDrafts = snapshot.practice_records.filter((record) => record.kind === "full_case_draft").length;
  const fitStories = snapshot.practice_records.filter((record) => record.kind === "fit_story").length;
  const preparationProfiles = snapshot.practice_records.filter(
    (record) => record.kind === "prep_profile"
  ).length;
  const marketSizingNotes = snapshot.market_sizing_attempts.filter((attempt) =>
    hasPrivateMarketSizingText(attempt)
  ).length;

  return {
    fitStories,
    fullCaseDrafts,
    marketSizingNotes,
    preparationProfiles,
    totalItems: fitStories + fullCaseDrafts + preparationProfiles + marketSizingNotes
  };
}
