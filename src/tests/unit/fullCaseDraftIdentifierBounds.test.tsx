import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { brightCartFullCase } from "@/data/casePractice/fullCaseSimulations";
import type { FullCaseDraftRecord } from "@/features/case-practice/practiceTypes";
import { FullCaseSimulation } from "@/features/case-practice/simulation/FullCaseSimulation";
import { canResumeFullCaseDraft, fullCaseContentKey, fullCaseDraftId, fullCaseDraftIdentifierMaxLength, isFullCaseDraftRecord } from "@/features/case-practice/simulation/fullCaseDraft";
import { readFullCaseDraft, writeFullCaseDraft } from "@/features/case-practice/simulation/fullCaseDraftPersistence";
import { toQuestionPackCasePracticeContent, validateQuestionPackPayload } from "@/features/question-packs/questionPack";
import { createCompleteBackupFilesFromStorage, restoreCompleteBackupFiles } from "@/features/settings/completeBackupStorage";
import { serializeCompleteBackupFile } from "@/features/settings/completeBackupSet";
import { createLocalProgressExport, replaceLocalProgressWithImport, serializeLocalProgressExport, validateLocalProgressImportPayload } from "@/features/settings/localProgressExport";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

beforeAll(() => Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() }));

function importedCase(packVersion: string) {
  const source = structuredClone(brightCartFullCase);
  source.id = "c".repeat(80);
  source.questioning!.id = "q".repeat(80);
  const result = validateQuestionPackPayload({
    format: "math-drill-question-pack", schemaVersion: 3, kind: "case_practice", id: "p".repeat(80),
    packVersion, title: "Maximum identifier case", fullCases: [source]
  });
  if (result.status === "invalid") throw new Error(result.errors.join("\n"));
  if (result.pack.kind !== "case_practice") throw new Error("Expected a case pack.");
  return { pack: result.pack, simulation: toQuestionPackCasePracticeContent(result.pack).fullCases![0] };
}

describe("composed full-case draft identifiers", () => {
  it.each(["v".repeat(100), "%".repeat(100), "\u0800".repeat(100), "🚀".repeat(50)])("saves, exports, restores and resumes legal maximum IDs (version %s)", async (version) => {
    const { pack, simulation } = importedCase(version);
    const storage = new MemoryAppStorage();
    const key = await fullCaseContentKey(simulation);
    const draft: FullCaseDraftRecord = {
      id: fullCaseDraftId(simulation.id), kind: "full_case_draft", simulationId: simulation.id, contentKey: key,
      startedAt: "2026-10-04T00:00:00Z", updatedAt: "2026-10-04T00:00:00Z", locale: "en", stage: 0,
      questions: Array.from({ length: simulation.questioning!.maximumQuestions }, (_, index) => ({ id: `${simulation.questioning!.id}-question-${index + 1}`, text: `Private question ${index + 1}` })),
      includeQuestionRanking: false, hypothesisId: "", branchIds: [], calculationInput: "", ideaIds: [], priorityIdeaIds: [], synthesis: {}
    };
    expect(simulation.id.length).toBeGreaterThan(200);
    expect(draft.questions.every((question) => question.id.length <= fullCaseDraftIdentifierMaxLength)).toBe(true);
    expect(canResumeFullCaseDraft(draft, simulation, key)).toBe(true);
    await storage.put("question_packs", pack);
    await writeFullCaseDraft(storage, simulation.id, (await readFullCaseDraft(storage, simulation.id)).token, draft);

    const progress = await createLocalProgressExport(storage, undefined, "complete");
    const parsed = validateLocalProgressImportPayload(JSON.parse(serializeLocalProgressExport(progress)));
    if (parsed.status === "invalid") throw new Error(parsed.errors.join("\n"));
    const progressTarget = new MemoryAppStorage();
    await replaceLocalProgressWithImport(progressTarget, parsed.exportData);
    expect((await readFullCaseDraft(progressTarget, simulation.id)).draft).toEqual(draft);

    const files = await createCompleteBackupFilesFromStorage(storage, { selectedOptionalScopes: ["private_text", "packs"] });
    const target = new MemoryAppStorage();
    await restoreCompleteBackupFiles(target, files.map((file) => JSON.parse(serializeCompleteBackupFile(file))));
    expect(await target.get("question_packs", pack.id)).toEqual(pack);
    const restored = (await readFullCaseDraft(target, simulation.id)).draft;
    expect(restored).toEqual(draft);
    expect(canResumeFullCaseDraft(restored, simulation, key)).toBe(true);
    expect(isFullCaseDraftRecord({ ...draft, simulationId: "x".repeat(fullCaseDraftIdentifierMaxLength + 1) })).toBe(false);
    expect(isFullCaseDraftRecord({ ...draft, questions: [{ id: "x".repeat(fullCaseDraftIdentifierMaxLength + 1), text: "" }] })).toBe(false);
  });

  it("autosaves every generated questioning suffix with the longest encoded imported IDs", async () => {
    const { simulation } = importedCase("\u0800".repeat(100));
    const storage = new MemoryAppStorage();
    const view = render(<FullCaseSimulation simulation={simulation} storageFactory={() => storage} />);
    const optIn = screen.getByRole("checkbox", { name: "Save a private draft on this device so I can resume this case." });
    await waitFor(() => expect(optIn).toBeEnabled());
    fireEvent.click(optIn);
    for (let count = simulation.questioning!.minimumQuestions; count < simulation.questioning!.maximumQuestions; count += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Add Question" }));
    }
    await waitFor(async () => expect((await readFullCaseDraft(storage, simulation.id)).draft).toMatchObject({ questions: expect.any(Array) }));
    const saved = (await readFullCaseDraft(storage, simulation.id)).draft;
    if (!isFullCaseDraftRecord(saved)) throw new Error("Expected saved draft.");
    expect(saved.questions).toHaveLength(simulation.questioning!.maximumQuestions);
    expect(saved.questions.map((question) => question.id)).toEqual(Array.from({ length: simulation.questioning!.maximumQuestions }, (_, index) => `${simulation.questioning!.id}-question-${index + 1}`));
    view.unmount();
    render(<FullCaseSimulation simulation={simulation} storageFactory={() => storage} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume draft" }));
    await waitFor(() => expect(optIn.isConnected).toBe(false));
    await waitFor(() => expect(screen.getAllByPlaceholderText("Type a question you would ask the interviewer")).toHaveLength(simulation.questioning!.maximumQuestions));
    expect(screen.getByRole("checkbox", { name: "Save a private draft on this device so I can resume this case." })).toBeChecked();
  });
});
