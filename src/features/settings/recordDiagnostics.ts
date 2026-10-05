import { assertStoredRecordBytes, isWellFormedUnicode, maxStoredStringLength, maxStoredCollectionItems, maxStoredRecordDepth, maxStoredPackDepth } from "@/lib/validation/inputLimits";
import type { AppStorageReplacement, AppStoreName } from "@/lib/storage/appStorageTypes";

export interface StoredRecordIssue {
  storeName: AppStoreName;
  recordId: string;
  path: string;
  reason: string;
}

/** Inspect before JSON conversion, which would erase non-finite values and undefined. */
export function inspectStoredRecord(storeName: AppStoreName, record: unknown): StoredRecordIssue[] {
  const recordId = typeof record === "object" && record !== null && "id" in record && typeof record.id === "string" ? record.id : "(invalid record ID)";
  const issues: StoredRecordIssue[] = [];
  const maxDepth = storeName === "question_packs" ? maxStoredPackDepth : maxStoredRecordDepth;
  const ancestors = new Set<object>();
  const add = (path: string, reason: string) => { if (issues.length < 50) issues.push({ storeName, recordId, path, reason }); };
  if (record !== null && typeof record === "object") {
    for (const field of ["id", "sessionId"] as const) {
      const identifier = (record as Record<string, unknown>)[field];
      if (typeof identifier === "string" && !isWellFormedUnicode(identifier)) add(field, "Record has invalid or missing fields.");
    }
  }
  function visit(value: unknown, path: string, depth: number): void {
    if (typeof value === "number" && !Number.isFinite(value)) add(path, "Number is not finite.");
    if (typeof value === "string" && value.length > maxStoredStringLength) add(path, `Text contains ${value.length} code units; the backup limit is ${maxStoredStringLength}.`);
    if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") add(path, "Value is not compatible with JSON backups.");
    if (value === null || typeof value !== "object") return;
    if (ancestors.has(value)) { add(path, "Circular references are not compatible with backups."); return; }
    if (depth > maxDepth) { add(path, "Value exceeds the supported backup nesting limit."); return; }
    if (Array.isArray(value) ? value.length > maxStoredCollectionItems : Object.keys(value).length > maxStoredCollectionItems) {
      add(path, "Collection exceeds the backup limit of 10,000 items.");
      return;
    }
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      add(path, "Value is not a plain backup object.");
      return;
    }
    if (Array.isArray(value)) for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index) || value[index] === undefined) add(`${path}[${index}]`, "Array contains a missing value that JSON would replace with null.");
    }
    ancestors.add(value);
    for (const [key, child] of Object.entries(value)) {
      const childPath = Array.isArray(value) ? `${path}[${key}]` : path ? `${path}.${key}` : key;
      if (key.length > maxStoredStringLength) add(path, "Property name exceeds the backup text limit.");
      visit(child, childPath, depth + 1);
    }
    ancestors.delete(value);
  }
  visit(record, "", 0);
  if (issues.length === 0) {
    try { assertStoredRecordBytes(record); }
    catch (error) { add("", error instanceof Error ? error.message : "Record exceeds supported backup bytes."); }
  }
  return issues;
}

export class IncompatibleStoredRecordError extends Error {
  constructor(readonly issues: readonly StoredRecordIssue[]) {
    const first = issues[0];
    super(first === undefined ? "Saved data is incompatible with backups. Review individual records in recovery." :
      `Saved data needs recovery: ${first.storeName}, record ${first.recordId.slice(0, 160)}, field ${first.path.slice(0, 160) || "record"}. ${first.reason}`);
    this.name = "IncompatibleStoredRecordError";
  }
}

export function assertBackupCompatibleRecords(snapshot: AppStorageReplacement): void {
  for (const storeName of Object.keys(snapshot) as AppStoreName[]) {
    for (const record of snapshot[storeName] ?? []) {
      const issues = inspectStoredRecord(storeName, record);
      if (issues.length > 0) throw new IncompatibleStoredRecordError(issues);
    }
  }
}
