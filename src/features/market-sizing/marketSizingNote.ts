import type { MarketSizingAttemptRecord } from "@/lib/storage/appStorageTypes";

export function hasSavedMarketSizingNote(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Legacy attempts have no field classification. Treat their text as private,
 * including when the original pack was replaced or removed. */
export function marketSizingNoteInputIds(record: MarketSizingAttemptRecord): string[] {
  return record.noteInputIds ?? Object.keys(record.inputValues ?? {}).filter(
    (id) => typeof record.inputValues?.[id] === "string"
  );
}

export function hasPrivateMarketSizingText(record: MarketSizingAttemptRecord): boolean {
  return hasSavedMarketSizingNote(record.note) || marketSizingNoteInputIds(record).some(
    (id) => hasSavedMarketSizingNote(record.inputValues?.[id])
  );
}

export function withoutMarketSizingNotes(record: MarketSizingAttemptRecord): MarketSizingAttemptRecord {
  const { note: _note, ...progress } = record;
  if (record.inputValues === undefined) return progress;
  const privateIds = new Set(marketSizingNoteInputIds(record));
  return {
    ...progress,
    noteInputIds: [],
    inputValues: Object.fromEntries(Object.entries(record.inputValues).filter(([id]) => !privateIds.has(id)))
  };
}

export function preserveMarketSizingNotes(
  imported: MarketSizingAttemptRecord,
  existing: MarketSizingAttemptRecord
): MarketSizingAttemptRecord {
  const privateIds = marketSizingNoteInputIds(existing);
  const privateValues = Object.fromEntries(privateIds.filter((id) =>
    Object.hasOwn(existing.inputValues ?? {}, id)).map((id) => [id, existing.inputValues![id]]));
  return {
    ...imported,
    ...(hasSavedMarketSizingNote(existing.note) ? { note: existing.note } : {}),
    ...(Object.keys(privateValues).length > 0 ? {
      inputValues: { ...imported.inputValues, ...privateValues },
      noteInputIds: [...new Set([...marketSizingNoteInputIds(imported), ...privateIds])]
    } : {})
  };
}
