import type { AppIndexedStoreName, AppStoreName } from "@/lib/storage/appStorageTypes";

const indexedTimestampFields = {
  drill_sessions: "updatedAt",
  responses: "submittedAt",
  benchmark_results: "completedAt",
  question_packs: "importedAt"
} as const satisfies Record<AppIndexedStoreName, string>;

export const chronologyMetadataKey = (storeName: AppStoreName): string => `chronology:${storeName}`;

export function requiresChronologyScan(storeName: AppStoreName, record: unknown): boolean {
  if (!Object.hasOwn(indexedTimestampFields, storeName) || typeof record !== "object" || record === null) return false;
  const field = indexedTimestampFields[storeName as AppIndexedStoreName];
  const timestamp = (record as Record<string, unknown>)[field];
  return timestamp !== undefined && (typeof timestamp !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(timestamp) || !Number.isFinite(Date.parse(timestamp)));
}

/** Keep continuation keys unchanged while ordering their timestamps by instant and IDs by IndexedDB rules. */
export function compareTimestampIndexKeys(
  first: IDBValidKey,
  second: IDBValidKey,
  compareKeys: (first: IDBValidKey, second: IDBValidKey) => number
): number {
  if (!Array.isArray(first) || !Array.isArray(second)) return compareKeys(first, second);
  const firstTime = typeof first[0] === "string" ? Date.parse(first[0]) : NaN;
  const secondTime = typeof second[0] === "string" ? Date.parse(second[0]) : NaN;
  const firstValid = Number.isFinite(firstTime);
  const secondValid = Number.isFinite(secondTime);
  if (firstValid && secondValid) return firstTime - secondTime || compareKeys(first[1], second[1]);
  if (firstValid !== secondValid) return firstValid ? 1 : -1;
  return compareKeys(first, second);
}
