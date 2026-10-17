import { appStoreNames, type AppStorageReplacement, type AppStoreName } from "@/lib/storage/appStorageTypes";

const timestampFields = {
  drill_sessions: ["startedAt", "endedAt", "activeQuestionStartedAt", "updatedAt"],
  responses: ["submittedAt"],
  benchmark_results: ["completedAt"],
  user_settings: ["updatedAt"],
  market_sizing_attempts: ["startedAt", "completedAt"],
  exhibit_attempts: ["startedAt", "completedAt"],
  mistake_notebook: ["missedAt", "lastRetriedAt", "resolvedAt"],
  retry_schedules: ["dueAt", "createdAt", "updatedAt", "lastReviewedAt"],
  practice_records: ["completedAt", "updatedAt", "startedAt"],
  question_packs: ["importedAt"]
} as const satisfies Record<AppStoreName, readonly string[]>;

/** Compare instants rather than their timezone-dependent spellings. Invalid legacy values sort first. */
export function compareAbsoluteTimestamps(first: string, second: string): number {
  const firstTime = Date.parse(first);
  const secondTime = Date.parse(second);
  const firstValid = Number.isFinite(firstTime);
  const secondValid = Number.isFinite(secondTime);
  if (firstValid && secondValid) return firstTime - secondTime;
  if (firstValid !== secondValid) return firstValid ? 1 : -1;
  return first.localeCompare(second);
}

/** Canonicalize only stored event timestamps; preserve malformed legacy data for Recovery. */
export function normalizeStoredTimestamps<T>(storeName: AppStoreName, record: T): T {
  if (!isRecord(record)) return record;
  let normalized = normalizeFields(record, timestampFields[storeName]);

  if (storeName === "drill_sessions" && Array.isArray(record.responses)) {
    const originalResponses = record.responses;
    const responses = originalResponses.map((response: unknown) =>
      isRecord(response) ? normalizeFields(response, ["submittedAt"]) : response);
    if (responses.some((response, index) => response !== originalResponses[index])) {
      normalized = { ...normalized, responses };
    }
  }

  return normalized as T;
}

/** Use only after validating the original import, including any backup checksum. */
export function normalizeSnapshotTimestamps<T extends AppStorageReplacement>(snapshot: T): T {
  let normalized = snapshot;
  for (const storeName of appStoreNames) {
    const records = snapshot[storeName];
    if (!Array.isArray(records)) continue;
    const values = records.map((record) => normalizeStoredTimestamps(storeName, record));
    if (values.some((value, index) => value !== records[index])) {
      normalized = { ...normalized, [storeName]: values };
    }
  }
  return normalized;
}

function normalizeFields(record: Record<string, unknown>, fields: readonly string[]): Record<string, unknown> {
  let normalized = record;
  for (const field of fields) {
    const value = record[field];
    if (typeof value !== "string") continue;
    const time = Date.parse(value);
    if (!Number.isFinite(time)) continue;
    const canonical = new Date(time).toISOString();
    if (canonical !== value) normalized = { ...normalized, [field]: canonical };
  }
  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
