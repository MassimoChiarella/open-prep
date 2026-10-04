import {
  appStoreNames, AppStorageConflictError,
  type AppStorage, type AppStorageAtomicView, type AppStorageMutation, type AppStorageSnapshot, type AppStoreName
} from "@/lib/storage/appStorageTypes";
import { publishLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import type { StoredRecordIssue } from "@/features/settings/recordDiagnostics";
import { inspectProgressRecord } from "@/features/settings/localProgressExport";
import { inspectBackupPackRecord } from "@/features/settings/completeBackup";

type Snapshot = AppStorageSnapshot<typeof appStoreNames>;
export interface LocalRecoveryItem {
  id: string;
  storeName: AppStoreName;
  recordId: string;
  action: "remove_record" | "remove_note";
  issues: StoredRecordIssue[];
  unavailableReason?: string;
}
interface RecoveryRecord { storeName: AppStoreName; recordId: string; value: unknown }
export interface LocalRecoveryPreview extends LocalRecoveryItem {
  generation: number;
  counts: Partial<Record<AppStoreName, number>>;
  records: RecoveryRecord[];
  fingerprint: string;
  reviewHistoryRetained: boolean;
}

const allReads = Object.fromEntries(appStoreNames.map((name) => [name, "all" as const]));

export async function diagnoseLocalRecovery(storage: AppStorage): Promise<LocalRecoveryItem[]> {
  const { snapshot } = await readSnapshot(storage);
  return diagnoseSnapshot(snapshot);
}

export async function prepareLocalRecovery(storage: AppStorage, item: LocalRecoveryItem): Promise<LocalRecoveryPreview> {
  const { snapshot, generation } = await readSnapshot(storage);
  const current = diagnoseSnapshot(snapshot).find((candidate) => candidate.id === item.id);
  if (current === undefined) throw new AppStorageConflictError("session");
  if (current.unavailableReason !== undefined) throw new Error(current.unavailableReason);
  return makePreview(snapshot, generation, current);
}

export function archiveLocalRecovery(preview: LocalRecoveryPreview): string {
  return `${JSON.stringify({
    format: "open-prep-record-recovery", schemaVersion: 1,
    purpose: "Diagnostic archive of original local records; not a restorable Complete Backup.",
    target: { storeName: preview.storeName, recordId: preview.recordId, action: preview.action },
    records: preview.records.map((record) => ({ storeName: record.storeName, recordId: record.recordId, value: encodeValue(record.value) }))
  }, null, 2)}\n`;
}

export async function applyLocalRecovery(storage: AppStorage, preview: LocalRecoveryPreview): Promise<{ removedRecords: number; updatedRecords: number }> {
  const result = await storage.atomic({ stores: appStoreNames, reads: allReads, expectedGeneration: preview.generation, advanceGeneration: true }, (view) => {
    const current = makePreview(snapshotFromView(view), view.generation, preview);
    if (current.fingerprint !== preview.fingerprint) throw new AppStorageConflictError("session");
    const operations: AppStorageMutation[] = [];
    if (current.action === "remove_note") {
      const attempt = view.get("market_sizing_attempts", current.recordId);
      if (attempt === undefined) throw new AppStorageConflictError("session");
      const { note: _note, ...withoutNote } = attempt;
      operations.push({ storeName: "market_sizing_attempts", type: "put", value: withoutNote });
    } else {
      for (const record of current.records) operations.push({ storeName: record.storeName, type: "delete", key: record.recordId } as AppStorageMutation);
    }
    return { operations, result: { removedRecords: current.action === "remove_note" ? 0 : current.records.length, updatedRecords: current.action === "remove_note" ? 1 : 0 } };
  });
  publishLocalDataInvalidation("progress_replaced");
  return result;
}

async function readSnapshot(storage: AppStorage) {
  return storage.atomic({ stores: [], reads: allReads }, (view) => ({
    operations: [], result: { snapshot: snapshotFromView(view), generation: view.generation }
  }));
}

function snapshotFromView(view: AppStorageAtomicView): Snapshot {
  return Object.fromEntries(appStoreNames.map((name) => [name, view.getAll(name)])) as Snapshot;
}

function diagnoseSnapshot(snapshot: Snapshot): LocalRecoveryItem[] {
  const items = new Map<string, LocalRecoveryItem>();
  for (const storeName of appStoreNames) {
    for (const record of snapshot[storeName]) {
      const issues = storeName === "question_packs" ? inspectBackupPackRecord(record) : inspectProgressRecord(storeName, record);
      if (issues.length === 0) continue;
      const owner = resolveOwner(snapshot, storeName, record.id);
      const action = storeName === "market_sizing_attempts" && issues.every((issue) => issue.path === "note" || issue.path.startsWith("note.") || issue.path.startsWith("note[")) ? "remove_note" : "remove_record";
      const id = JSON.stringify([owner.storeName, owner.recordId, action]);
      const existing = items.get(id);
      if (existing !== undefined) { existing.issues.push(...issues); continue; }
      items.set(id, { id, ...owner, action, issues,
        ...(typeof record.id === "string" && record.id.length > 0 ? {} : { unavailableReason: "The stored key is invalid. Automatic removal is unavailable for this record." })
      });
    }
  }
  return [...items.values()].map((item) => {
    if (item.unavailableReason !== undefined) return item;
    try {
      collectOwnedRecords(snapshot, item);
      return item;
    } catch (error) {
      return { ...item, unavailableReason: error instanceof Error ? error.message : "This record's ownership could not be verified. Automatic removal is unavailable." };
    }
  });
}

function resolveOwner(snapshot: Snapshot, storeName: AppStoreName, recordId: string): Pick<LocalRecoveryItem, "storeName" | "recordId" | "unavailableReason"> {
  const record = snapshot[storeName].find((value) => value.id === recordId);
  if (record === undefined) return { storeName, recordId };
  let sessionId: string | undefined;
  if (storeName === "responses" || storeName === "benchmark_results") sessionId = (record as { sessionId: string }).sessionId;
  if (storeName === "retry_schedules") {
    const schedule = record as Snapshot["retry_schedules"][number];
    if (snapshot.mistake_notebook.some((mistake) => mistake.id === schedule.sourceId)) return resolveOwner(snapshot, "mistake_notebook", schedule.sourceId);
  }
  if (storeName === "mistake_notebook") {
    const mistake = record as Snapshot["mistake_notebook"][number];
    const responseSession = snapshot.responses.find((response) => response.id === mistake.sourceResponseId)?.sessionId;
    if (mistake.sourceSessionId !== undefined && responseSession !== undefined && mistake.sourceSessionId !== responseSession) {
      return { storeName, recordId, unavailableReason: "This record points to different source attempts. Automatic removal would have ambiguous ownership." };
    }
    sessionId = mistake.sourceSessionId ?? responseSession;
  }
  return sessionId !== undefined && snapshot.drill_sessions.some((session) => session.id === sessionId)
    ? { storeName: "drill_sessions", recordId: sessionId }
    : { storeName, recordId };
}

function makePreview(snapshot: Snapshot, generation: number, item: LocalRecoveryItem): LocalRecoveryPreview {
  const { records, reviewHistoryRetained } = collectOwnedRecords(snapshot, item);
  const counts: Partial<Record<AppStoreName, number>> = {};
  for (const record of records) counts[record.storeName] = (counts[record.storeName] ?? 0) + 1;
  const fingerprint = JSON.stringify(encodeValue({ storeName: item.storeName, recordId: item.recordId, action: item.action, records }));
  return { ...item, generation, records, counts, fingerprint, reviewHistoryRetained };
}

function collectOwnedRecords(snapshot: Snapshot, item: LocalRecoveryItem): { records: RecoveryRecord[]; reviewHistoryRetained: boolean } {
  if (item.unavailableReason !== undefined) throw new Error(item.unavailableReason);
  const primary = snapshot[item.storeName].find((record) => record.id === item.recordId);
  if (primary === undefined) throw new AppStorageConflictError("session");
  const records: RecoveryRecord[] = [{ storeName: item.storeName, recordId: item.recordId, value: primary }];
  let reviewHistoryRetained = false;
  if (item.action === "remove_record") {
    const responseIds = new Set<string>();
    if (item.storeName === "drill_sessions") {
      for (const response of snapshot.responses) if (response.sessionId === item.recordId) {
        records.push({ storeName: "responses", recordId: response.id, value: response }); responseIds.add(response.id);
      }
      for (const benchmark of snapshot.benchmark_results) if (benchmark.sessionId === item.recordId) records.push({ storeName: "benchmark_results", recordId: benchmark.id, value: benchmark });
      const session = primary as Snapshot["drill_sessions"][number];
      reviewHistoryRetained = Array.isArray(session.questions) && session.questions.some((question) => typeof question?.metadata?.variables?.mistakeId === "string");
    }
    if (item.storeName === "responses") responseIds.add(item.recordId);
    const mistakeIds = new Set(item.storeName === "mistake_notebook" ? [item.recordId] : []);
    for (const mistake of snapshot.mistake_notebook) {
      if (!((item.storeName === "drill_sessions" && mistake.sourceSessionId === item.recordId) || (mistake.sourceResponseId !== undefined && responseIds.has(mistake.sourceResponseId)))) continue;
      const owner = resolveOwner(snapshot, "mistake_notebook", mistake.id);
      if (owner.unavailableReason !== undefined) throw new Error(owner.unavailableReason);
      records.push({ storeName: "mistake_notebook", recordId: mistake.id, value: mistake }); mistakeIds.add(mistake.id);
    }
    for (const schedule of snapshot.retry_schedules) if (mistakeIds.has(schedule.sourceId)) records.push({ storeName: "retry_schedules", recordId: schedule.id, value: schedule });
  }
  return { records, reviewHistoryRetained };
}

/** Every value is tagged, so user text cannot impersonate an undefined/non-finite marker. */
function encodeValue(value: unknown, seen = new Map<object, number>()): unknown[] {
  if (value === undefined) return ["undefined"];
  if (value === null) return ["null"];
  if (typeof value === "number") return ["number", Object.is(value, -0) ? "-0" : Number.isFinite(value) ? value : String(value)];
  if (typeof value === "string" || typeof value === "boolean") return [typeof value, value];
  if (typeof value === "bigint") return ["bigint", String(value)];
  if (typeof value !== "object") throw new Error("This record contains a value that cannot be archived losslessly.");
  const previous = seen.get(value);
  if (previous !== undefined) return ["reference", previous];
  const id = seen.size;
  seen.set(value, id);
  if (Array.isArray(value)) return ["array", id, Array.from({ length: value.length }, (_, index) => Object.hasOwn(value, index) ? encodeValue(value[index], seen) : ["hole"])];
  if (value instanceof Date) return ["date", id, Number.isFinite(value.getTime()) ? value.toISOString() : "invalid"];
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error("This record type cannot be archived losslessly. No records were changed.");
  return ["object", id, Object.keys(value).sort().map((key) => [key, encodeValue((value as Record<string, unknown>)[key], seen)])];
}
