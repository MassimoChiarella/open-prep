/** Limits are UTF-16 code units, matching JavaScript strings and browser inputs. */
export const maxNumericInputLength = 4096;
export const maxStoredStringLength = 100000;
export const numericInputLimitMessage = "Use 4,096 characters or fewer for a numeric answer.";

export function assertNumericInput(value: string): void {
  if (value.length > maxNumericInputLength) throw new Error(numericInputLimitMessage);
}

/** Reject values that would be corrupted by JSON or exceed supported backup strings. */
export function assertPersistableRecord(value: unknown): void {
  const ancestors = new Set<object>();
  function visit(item: unknown): void {
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
    ancestors.add(item);
    for (const child of Object.values(item)) visit(child);
    ancestors.delete(item);
  }
  visit(value);
}
