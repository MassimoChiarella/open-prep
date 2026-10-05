import { describe, expect, it } from "vitest";

import { brightCartFullCase } from "@/data/casePractice/fullCaseSimulations";
import type { FullCaseDraftRecord } from "@/features/case-practice/practiceTypes";
import { fullCaseContentKey, fullCaseDraftId } from "@/features/case-practice/simulation/fullCaseDraft";
import { readFullCaseDraft, writeFullCaseDraft } from "@/features/case-practice/simulation/fullCaseDraftPersistence";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("private draft transaction guards", () => {
  it("rejects stale saves and deletes while preserving the newest private text", async () => {
    const storage = new MemoryAppStorage();
    const draft = await fixture();
    const initial = await readFullCaseDraft(storage, draft.simulationId);
    const shared = await writeFullCaseDraft(storage, draft.simulationId, initial.token, draft);
    const newer = { ...draft, questions: [{ id: "question-1", text: "Newest private text" }] };
    await writeFullCaseDraft(storage, draft.simulationId, shared, newer);
    await expect(writeFullCaseDraft(storage, draft.simulationId, shared, draft)).rejects.toMatchObject({ reason: "practice" });
    await expect(writeFullCaseDraft(storage, draft.simulationId, shared)).rejects.toMatchObject({ reason: "practice" });
    expect((await readFullCaseDraft(storage, draft.simulationId)).draft).toEqual(newer);
  });

  it("retains a tombstone across deletion, history clear, and draft recreation", async () => {
    const storage = new MemoryAppStorage();
    const draft = await fixture();
    const absent = (await readFullCaseDraft(storage, draft.simulationId)).token;
    const saved = await writeFullCaseDraft(storage, draft.simulationId, absent, draft);
    const deleted = await writeFullCaseDraft(storage, draft.simulationId, saved);
    await storage.clear("drill_sessions");
    await storage.clear("practice_records");
    expect((await readFullCaseDraft(storage, draft.simulationId)).token).toEqual(deleted);
    await expect(writeFullCaseDraft(storage, draft.simulationId, absent, draft)).rejects.toMatchObject({ reason: "practice" });
    await expect(writeFullCaseDraft(storage, draft.simulationId, saved, draft)).rejects.toMatchObject({ reason: "practice" });
    const recreated = await writeFullCaseDraft(storage, draft.simulationId, deleted, draft);
    expect(recreated).toMatchObject({ exists: true, revision: 3 });
    await expect(writeFullCaseDraft(storage, draft.simulationId, saved)).rejects.toMatchObject({ reason: "practice" });
  });

  it("rejects old lifecycle tokens and rolls back failed draft writes with their revisions", async () => {
    const draft = await fixture();
    const storage = new MemoryAppStorage();
    const before = await readFullCaseDraft(storage, draft.simulationId);
    await storage.clearAll();
    await expect(writeFullCaseDraft(storage, draft.simulationId, before.token, draft)).rejects.toMatchObject({ reason: "generation" });
    const failing = new MemoryAppStorage(0);
    const token = (await readFullCaseDraft(failing, draft.simulationId)).token;
    await expect(writeFullCaseDraft(failing, draft.simulationId, token, draft)).rejects.toThrow("Injected atomic mutation failure");
    expect(await readFullCaseDraft(failing, draft.simulationId)).toEqual({ draft: undefined, token });
  });
});

async function fixture(): Promise<FullCaseDraftRecord> {
  return {
    id: fullCaseDraftId(brightCartFullCase.id), simulationId: brightCartFullCase.id, kind: "full_case_draft",
    contentKey: await fullCaseContentKey(brightCartFullCase), updatedAt: "2026-10-04T00:00:00Z", startedAt: "2026-10-04T00:00:00Z",
    locale: "en", stage: 0, questions: [{ id: "question-1", text: "Original private text" }],
    includeQuestionRanking: false, hypothesisId: "", branchIds: [], calculationInput: "", ideaIds: [], priorityIdeaIds: [], synthesis: {}
  };
}
