import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { brightCartFullCase } from "@/data/casePractice/fullCaseSimulations";
import type { FullCaseDraftRecord } from "@/features/case-practice/practiceTypes";
import { FullCaseSimulation } from "@/features/case-practice/simulation/FullCaseSimulation";
import { canResumeFullCaseDraft, fullCaseContentKey, fullCaseDraftId, isFullCaseDraftRecord } from "@/features/case-practice/simulation/fullCaseDraft";
import * as fullCaseScoring from "@/features/case-practice/simulation/fullCaseScoring";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

beforeAll(() => Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

const questionGuidance = "Complete each question using 300 characters or fewer before finishing this case.";
const savedGuidance = "This full-case result is available to your local preparation roadmap.";

describe("full-case draft scoring validation", () => {
  it.each(["x".repeat(301), ""])("preserves an invalid completed question and lets the learner repair it (%j)", async (text) => {
    const storage = new MemoryAppStorage();
    const draft = await readyDraft(text);
    expect(isFullCaseDraftRecord(draft)).toBe(true);
    expect(canResumeFullCaseDraft(draft, brightCartFullCase, draft.contentKey)).toBe(true);
    await storage.put("practice_records", draft);
    render(<FullCaseSimulation storageFactory={() => storage} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume draft" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(questionGuidance);
    const question = screen.getAllByPlaceholderText("Type a question you would ask the interviewer")[0];
    expect(question).toHaveValue(text);
    expect(question).toHaveFocus();
    expect(screen.getByRole("button", { name: "Continue to Structure" })).toBeDisabled();
    expect(storage.peekAll("practice_records").filter((record) => record.kind === "attempt")).toEqual([]);

    fireEvent.change(question, { target: { value: "x".repeat(300) } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(question).toHaveFocus();
    continueToSynthesis();
    fireEvent.click(screen.getByRole("button", { name: "Complete Case" }));
    await screen.findByText(savedGuidance);
    expect(storage.peekAll("practice_records").filter((record) => record.kind === "attempt")).toHaveLength(1);
  });

  it("validates all restored stages when finishing an incomplete draft", async () => {
    const storage = new MemoryAppStorage();
    const { completedAt: _completedAt, ...draft } = await readyDraft("x".repeat(301));
    await storage.put("practice_records", draft);
    render(<FullCaseSimulation storageFactory={() => storage} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume draft" }));
    fireEvent.click(await screen.findByRole("button", { name: "Complete Case" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(questionGuidance);
    expect(screen.getAllByPlaceholderText("Type a question you would ask the interviewer")[0]).toHaveValue("x".repeat(301));
    expect(storage.peekAll("practice_records").filter((record) => record.kind === "attempt")).toEqual([]);
  });

  it("scores a completed draft whose question is exactly at the supported limit", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("practice_records", await readyDraft("x".repeat(300)));
    render(<FullCaseSimulation storageFactory={() => storage} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume draft" }));
    await screen.findByText(savedGuidance);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(storage.peekAll("practice_records").filter((record) => record.kind === "attempt")).toHaveLength(1);
  });

  it("keeps responses available for retry if scoring unexpectedly fails", async () => {
    const storage = new MemoryAppStorage();
    const { completedAt: _completedAt, ...draft } = await readyDraft("What drives the revenue outcome?");
    await storage.put("practice_records", draft);
    vi.spyOn(fullCaseScoring, "scoreFullCaseSimulation").mockImplementationOnce(() => { throw new Error("Scoring unavailable"); });
    render(<FullCaseSimulation storageFactory={() => storage} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume draft" }));
    fireEvent.click(await screen.findByRole("button", { name: "Complete Case" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This case could not be scored. Review your responses before trying again.");
    expect(screen.getByRole("button", { name: "Complete Case" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Complete Case" }));
    await screen.findByText(savedGuidance);
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});

function continueToSynthesis() {
  for (const stage of ["Structure", "Exhibit and math", "Brainstorm", "Synthesize"]) {
    fireEvent.click(screen.getByRole("button", { name: `Continue to ${stage}` }));
  }
}

async function readyDraft(firstQuestion: string): Promise<FullCaseDraftRecord> {
  const ideaIds = brightCartFullCase.brainstorming.themes.flatMap((theme) => theme.ideas)
    .slice(0, brightCartFullCase.brainstorming.selectionLimit).map((idea) => idea.id);
  return {
    id: fullCaseDraftId(brightCartFullCase.id), kind: "full_case_draft", simulationId: brightCartFullCase.id,
    contentKey: await fullCaseContentKey(brightCartFullCase), startedAt: "2026-10-17T00:00:00Z", updatedAt: "2026-10-17T00:02:00Z",
    completedAt: "2026-10-17T00:02:00Z", locale: "en", stage: 4, includeQuestionRanking: false,
    questions: Array.from({ length: brightCartFullCase.questioning!.minimumQuestions }, (_, index) => ({ id: `question-${index}`, text: index === 0 ? firstQuestion : "What drives the revenue outcome?" })),
    hypothesisId: brightCartFullCase.structure.acceptedHypothesisId, branchIds: brightCartFullCase.structure.modelStructure.map((branch) => branch.branchId),
    calculationInput: "120000", ideaIds, priorityIdeaIds: ideaIds.slice(0, brightCartFullCase.brainstorming.priorityLimit),
    synthesis: brightCartFullCase.synthesis.correctResponse
  };
}
