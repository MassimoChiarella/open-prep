/** Limits are UTF-16 code units, matching JavaScript strings and browser inputs. */
export const maxNumericInputLength = 4096;
export const maxStoredStringLength = 100000;
export const maxStoredCollectionItems = 10000;
// Complete Backup's depth20 envelope places progress records at depth5, packs at depth3.
export const maxStoredRecordDepth = 15;
export const maxStoredPackDepth = 17;
// Leaves 8 MiB for the Complete file envelope and indentation. Count the pretty
// record plus its maximum ten-space outer indentation, matching backup packing.
export const maxStoredRecordBytes = 32 * 1024 * 1024;
export const numericInputLimitMessage = "Use 4,096 characters or fewer for a numeric answer.";

export function assertNumericInput(value: string): void {
  if (value.length > maxNumericInputLength) throw new Error(numericInputLimitMessage);
}

/** Reject values that would be corrupted by JSON or exceed supported backup strings. */
export function assertPersistableRecord(value: unknown, options: { maxDepth?: number } = {}): void {
  const ancestors = new Set<object>();
  function visit(item: unknown, depth: number): void {
    if (typeof item === "number" && !Number.isFinite(item)) {
      throw new Error("Stored numbers must be finite.");
    }
    if (typeof item === "string" && item.length > maxStoredStringLength) {
      throw new Error("Stored text must contain 100,000 characters or fewer.");
    }
    if (typeof item === "bigint" || typeof item === "function" || typeof item === "symbol") {
      throw new Error("Stored values must support JSON backups.");
    }
    if (item === null || typeof item !== "object") return;
    if (ancestors.has(item)) throw new Error("Stored records cannot contain circular references.");
    if (depth > (options.maxDepth ?? maxStoredRecordDepth)) throw new Error("Stored record nesting exceeds supported backup depth.");
    if (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) {
      throw new Error("Stored records must contain plain JSON objects.");
    }
    if ((Array.isArray(item) ? item.length : Object.keys(item).length) > maxStoredCollectionItems) {
      throw new Error("Stored collections must contain 10,000 items or fewer.");
    }
    if (Array.isArray(item)) for (let index = 0; index < item.length; index += 1) {
      if (!Object.hasOwn(item, index) || item[index] === undefined) throw new Error("Stored arrays cannot contain missing values.");
    }
    ancestors.add(item);
    for (const [key, child] of Object.entries(item)) {
      if (key.length > maxStoredStringLength) throw new Error("Stored property names must contain 100,000 characters or fewer.");
      visit(child, depth + 1);
    }
    ancestors.delete(item);
  }
  visit(value, 0);
  assertStoredRecordBytes(value);
}

export function assertStoredRecordBytes(value: unknown): void {
  const serialized = JSON.stringify(value, null, 2) ?? "";
  const bytes = new TextEncoder().encode(serialized).byteLength + serialized.split("\n").length * 10;
  if (bytes > maxStoredRecordBytes) {
    throw new Error("A saved record must fit within the 32 MiB backup record limit. Shorten its text before saving.");
  }
}
