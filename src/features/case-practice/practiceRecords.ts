import type {
  FitStoryRecord,
  PracticeAttemptRecord,
  PracticeModuleId,
  PrepProfileRecord
} from "@/features/case-practice/practiceTypes";
import { AppStorageConflictError, type AppStorage, type DrillSessionWriteToken } from "@/lib/storage/appStorageTypes";
import { maxStoredStringLength } from "@/lib/validation/inputLimits";

export const prepProfileFirmsLimitMessage = "Use 100,000 characters or fewer for target firms.";

export function arePrepProfileFirmsWithinLimit(firms: readonly string[]): boolean {
  let length = Math.max(0, firms.length - 1) * 2;
  for (const firm of firms) {
    length += firm.length;
    if (length > maxStoredStringLength) return false;
  }
  return length <= maxStoredStringLength;
}

export async function savePracticeAttempt(
  storage: AppStorage,
  attempt: Omit<PracticeAttemptRecord, "id" | "kind">
): Promise<PracticeAttemptRecord> {
  const record: PracticeAttemptRecord = {
    ...attempt,
    id: ["attempt", attempt.module, attempt.itemId, safeTimestamp(attempt.completedAt)].join("-"),
    kind: "attempt"
  };

  await storage.put("practice_records", record);
  return record;
}

export async function loadPracticeAttempts(
  storage: AppStorage,
  module?: PracticeModuleId
): Promise<PracticeAttemptRecord[]> {
  return (await storage.getAll("practice_records"))
    .filter(
      (record): record is PracticeAttemptRecord =>
        record.kind === "attempt" && (module === undefined || record.module === module)
    )
    .sort((first, second) => second.completedAt.localeCompare(first.completedAt));
}

export async function savePrepProfile(
  storage: AppStorage,
  profile: Omit<PrepProfileRecord, "id" | "kind">
): Promise<PrepProfileRecord> {
  if (!arePrepProfileFirmsWithinLimit(profile.targetFirms)) throw new Error(prepProfileFirmsLimitMessage);
  const record: PrepProfileRecord = { ...profile, id: "prep-profile", kind: "prep_profile" };
  await storage.put("practice_records", record);
  return record;
}

export async function loadPrepProfile(storage: AppStorage): Promise<PrepProfileRecord | undefined> {
  const record = await storage.get("practice_records", "prep-profile");
  return record?.kind === "prep_profile" ? record : undefined;
}

export async function loadFitStoryBank(storage: AppStorage) {
  const stories = await loadFitStories(storage);
  return storage.atomic({ stores: [], reads: { practice_records: stories.map(({ id }) => id) } }, (view) => ({
    operations: [], result: stories.flatMap(({ id }) => {
      const story = view.get("practice_records", id);
      return story?.kind === "fit_story" ? [{ story, token: view.practiceRecordToken(id) }] : [];
    })
  }));
}

export async function saveFitStory(storage: AppStorage, story: FitStoryRecord, expected?: DrillSessionWriteToken): Promise<DrillSessionWriteToken> {
  return writeFitStory(storage, story.id, expected, story);
}

export async function loadFitStories(storage: AppStorage): Promise<FitStoryRecord[]> {
  return (await storage.getAll("practice_records"))
    .filter((record): record is FitStoryRecord => record.kind === "fit_story")
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

export async function deleteFitStory(storage: AppStorage, id: string, expected?: DrillSessionWriteToken): Promise<DrillSessionWriteToken> {
  return writeFitStory(storage, id, expected);
}

async function writeFitStory(storage: AppStorage, id: string, expected?: DrillSessionWriteToken, story?: FitStoryRecord): Promise<DrillSessionWriteToken> {
  return storage.atomic({ stores: ["practice_records"], reads: { practice_records: [id] }, expectedGeneration: expected?.generation }, (view) => {
    const actual = view.practiceRecordToken(id);
    const current = view.get("practice_records", id);
    if (current !== undefined && current.kind !== "fit_story") throw new AppStorageConflictError("practice");
    if (expected !== undefined && (actual.revision !== expected.revision || actual.exists !== expected.exists)) throw new AppStorageConflictError("practice");
    if (story !== undefined && expected === undefined && actual.exists) throw new AppStorageConflictError("practice");
    return {
      operations: story === undefined ? [{ storeName: "practice_records", type: "delete", key: id }] : [{ storeName: "practice_records", type: "put", value: story }],
      result: { ...actual, exists: story !== undefined, revision: actual.revision + (story !== undefined || actual.exists ? 1 : 0) }
    };
  });
}

function safeTimestamp(value: string): string {
  return value.replace(/[^0-9]/g, "");
}
