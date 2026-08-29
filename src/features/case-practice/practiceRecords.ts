import type {
  FitStoryRecord,
  PracticeAttemptRecord,
  PracticeModuleId,
  PrepProfileRecord
} from "@/features/case-practice/practiceTypes";
import type { AppStorage } from "@/lib/storage/appStorageTypes";

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
  const record: PrepProfileRecord = { ...profile, id: "prep-profile", kind: "prep_profile" };
  await storage.put("practice_records", record);
  return record;
}

export async function loadPrepProfile(storage: AppStorage): Promise<PrepProfileRecord | undefined> {
  const record = await storage.get("practice_records", "prep-profile");
  return record?.kind === "prep_profile" ? record : undefined;
}

export async function saveFitStory(storage: AppStorage, story: FitStoryRecord): Promise<void> {
  await storage.put("practice_records", story);
}

export async function loadFitStories(storage: AppStorage): Promise<FitStoryRecord[]> {
  return (await storage.getAll("practice_records"))
    .filter((record): record is FitStoryRecord => record.kind === "fit_story")
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

export async function deleteFitStory(storage: AppStorage, id: string): Promise<void> {
  await storage.delete("practice_records", id);
}

function safeTimestamp(value: string): string {
  return value.replace(/[^0-9]/g, "");
}
