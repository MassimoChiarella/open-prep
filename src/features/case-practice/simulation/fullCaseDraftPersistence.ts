import type { FullCaseDraftRecord } from "@/features/case-practice/practiceTypes";
import { fullCaseDraftId, isFullCaseDraftRecord } from "@/features/case-practice/simulation/fullCaseDraft";
import { AppStorageConflictError, type AppStorage, type DrillSessionWriteToken } from "@/lib/storage/appStorageTypes";

export async function readFullCaseDraft(storage: AppStorage, simulationId: string) {
  const id = fullCaseDraftId(simulationId);
  return storage.atomic({ stores: [], reads: { practice_records: [id] } }, (view) => ({
    operations: [], result: { draft: view.get("practice_records", id), token: view.practiceRecordToken(id) }
  }));
}

export async function writeFullCaseDraft(
  storage: AppStorage,
  simulationId: string,
  expected: DrillSessionWriteToken,
  draft?: FullCaseDraftRecord
): Promise<DrillSessionWriteToken> {
  const id = fullCaseDraftId(simulationId);
  if (draft !== undefined && (!isFullCaseDraftRecord(draft) || draft.id !== id)) throw new Error("Full-case draft exceeds supported limits.");
  return storage.atomic({ stores: ["practice_records"], reads: { practice_records: [id] }, expectedGeneration: expected.generation }, (view) => {
    const actual = view.practiceRecordToken(id);
    if (actual.revision !== expected.revision || actual.exists !== expected.exists) throw new AppStorageConflictError("practice");
    return {
      operations: draft === undefined ? [{ storeName: "practice_records", type: "delete", key: id }] : [{ storeName: "practice_records", type: "put", value: draft }],
      result: { ...actual, exists: draft !== undefined, revision: actual.revision + 1 }
    };
  });
}
