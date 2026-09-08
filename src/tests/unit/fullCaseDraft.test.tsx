import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { brightCartFullCase } from "@/data/casePractice/fullCaseSimulations";
import type { FullCaseDraftRecord } from "@/features/case-practice/practiceTypes";
import { FullCaseSimulation } from "@/features/case-practice/simulation/FullCaseSimulation";
import { canResumeFullCaseDraft, fullCaseContentKey, fullCaseDraftId, isFullCaseDraftRecord } from "@/features/case-practice/simulation/fullCaseDraft";
import { getFullCaseCalculationQuestion } from "@/features/case-practice/simulation/fullCaseScoring";
import { createWholeProductActivitySummary } from "@/features/progress/wholeProductActivity";
import type { AppStoreName, AppStoreValue } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

beforeAll(() => Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() }));

async function draft(): Promise<FullCaseDraftRecord> {
  return {
    id: fullCaseDraftId(brightCartFullCase.id), kind: "full_case_draft", simulationId: brightCartFullCase.id,
    contentKey: await fullCaseContentKey(brightCartFullCase), startedAt: "2026-09-08T00:00:00Z", updatedAt: "2026-09-08T00:01:00Z",
    locale: "en", stage: 0, includeQuestionRanking: false,
    questions: Array.from({ length: brightCartFullCase.questioning!.minimumQuestions }, (_, index) => ({ id: `question-${index + 1}`, text: `Private saved question ${index + 1}` })),
    hypothesisId: "", branchIds: [], calculationInput: "", ideaIds: [], priorityIdeaIds: [], synthesis: {}
  };
}

describe("full-case private drafts", () => {
  it.each([0, 1])("focuses the restored heading when resuming stage %s", async (stage) => {
    const storage = new MemoryAppStorage();
    await storage.put("practice_records", { ...await draft(), stage });
    render(<FullCaseSimulation storageFactory={() => storage} />);
    const resume = await screen.findByRole("button", { name: "Resume draft" });
    resume.focus();
    fireEvent.click(resume);
    expect(document.getElementById(stage === 0 ? "questioning-stage-heading" : "structure-stage-heading")).toHaveFocus();
  });

  it("returns focus to the retry after failed deletion and to opt-in after successful discard", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("practice_records", await draft());
    render(<FullCaseSimulation storageFactory={() => storage} />);
    const discard = await screen.findByRole("button", { name: "Discard draft" });
    vi.spyOn(storage, "delete").mockRejectedValueOnce(new Error("Temporary storage failure"));
    discard.focus();
    fireEvent.click(discard);
    await screen.findByText("The local draft could not be read or updated. Keep this page open to preserve your current work.");
    expect(discard).toHaveFocus();
    expect(screen.getByRole("button", { name: "Resume draft" })).toBeDisabled();
    fireEvent.click(discard);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Save a private draft on this device so I can resume this case." })).toHaveFocus());
  });

  it.each([false, true])("does not resurrect a discarded draft during pending deletion (resumed=%s)", async (resume) => {
    const storage = new MemoryAppStorage();
    const saved = await draft();
    await storage.put("practice_records", saved);
    render(<FullCaseSimulation storageFactory={() => storage} />);
    const resumeButton = await screen.findByRole("button", { name: "Resume draft" });
    if (resume) {
      fireEvent.click(resumeButton);
      await screen.findByText("Private draft saved on this device.");
    }
    const originalDelete = storage.delete.bind(storage);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(storage, "delete").mockImplementation(async (store, key) => { await pending; await originalDelete(store, key); });
    fireEvent.click(resume
      ? screen.getByRole("checkbox", { name: "Save a private draft on this device so I can resume this case." })
      : screen.getByRole("button", { name: "Discard draft" }));
    if (!resume) expect(resumeButton).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Save a private draft on this device so I can resume this case." })).toBeDisabled();
    const question = screen.getAllByPlaceholderText("Type a question you would ask the interviewer")[0];
    question.focus();
    fireEvent.change(question, { target: { value: "New text during deletion" } });
    await act(async () => { release(); await pending; });
    expect(await storage.get("practice_records", saved.id)).toBeUndefined();
    expect(question).toHaveFocus();
  });

  it("allows a failed private-draft deletion to be retried", async () => {
    const storage = new MemoryAppStorage();
    const saved = await draft();
    await storage.put("practice_records", saved);
    render(<FullCaseSimulation storageFactory={() => storage} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume draft" }));
    await screen.findByText("Private draft saved on this device.");
    vi.spyOn(storage, "delete").mockRejectedValueOnce(new Error("Temporary storage failure"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Save a private draft on this device so I can resume this case." }));
    fireEvent.click(await screen.findByRole("button", { name: "Discard draft" }));
    await waitFor(async () => expect(await storage.get("practice_records", saved.id)).toBeUndefined());
  });

  it("validates bounded drafts against current content and excludes them from completed activity", async () => {
    const saved = await draft();
    expect(isFullCaseDraftRecord(saved)).toBe(true);
    expect(canResumeFullCaseDraft(saved, brightCartFullCase, saved.contentKey)).toBe(true);
    expect(canResumeFullCaseDraft(saved, brightCartFullCase, "a".repeat(64))).toBe(false);
    expect(canResumeFullCaseDraft({ ...saved, branchIds: ["unknown"] }, brightCartFullCase, saved.contentKey)).toBe(false);
    expect(isFullCaseDraftRecord({ ...saved, questions: [{ id: "q", text: "x".repeat(10_001) }] })).toBe(false);
    expect(isFullCaseDraftRecord({ ...saved, stage: -1 })).toBe(false);
    expect(isFullCaseDraftRecord({ ...saved, locale: "unknown" })).toBe(false);
    expect(isFullCaseDraftRecord({ ...saved, questions: [saved.questions[0], saved.questions[0]] })).toBe(false);
    const activity = createWholeProductActivitySummary({ practiceRecords: [saved] });
    expect(activity.casePractice.completedAttemptCount).toBe(0);
    expect(activity.hasQualifyingActivity).toBe(false);
  });

  it("saves only after opt-in and resumes the same text after remount", async () => {
    const storage = new MemoryAppStorage();
    const storageFactory = () => storage;
    const first = render(<FullCaseSimulation storageFactory={storageFactory} />);
    const optIn = screen.getByRole("checkbox", { name: "Save a private draft on this device so I can resume this case." });
    await waitFor(() => expect(optIn).toBeEnabled());
    fireEvent.change(screen.getAllByPlaceholderText("Type a question you would ask the interviewer")[0], { target: { value: "Keep this private question" } });
    expect(await storage.getAll("practice_records")).toEqual([]);
    fireEvent.click(optIn);
    await waitFor(async () => expect(await storage.get("practice_records", fullCaseDraftId(brightCartFullCase.id))).toMatchObject({ questions: expect.arrayContaining([{ id: expect.any(String), text: "Keep this private question" }]) }));
    first.unmount();
    render(<FullCaseSimulation storageFactory={storageFactory} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume draft" }));
    expect(screen.getAllByPlaceholderText("Type a question you would ask the interviewer")[0]).toHaveValue("Keep this private question");
    expect(screen.getByRole("checkbox", { name: "Save a private draft on this device so I can resume this case." })).toBeChecked();
  });

  it("requires discard when content changes and removes the stored private text", async () => {
    const storage = new MemoryAppStorage();
    const saved = await draft();
    await storage.put("practice_records", saved);
    render(<FullCaseSimulation simulation={{ ...brightCartFullCase, situation: "Changed case content" }} storageFactory={() => storage} />);
    expect(await screen.findByText("The saved draft uses different case content or is invalid. Discard it to save a new draft.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resume draft" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
    await waitFor(async () => expect(await storage.get("practice_records", saved.id)).toBeUndefined());
  });

  it("recovers a completed draft and retries a failed save without another attempt", async () => {
    class CommitThenReject extends MemoryAppStorage {
      rejectOnce = true;
      override async put<TStore extends AppStoreName>(store: TStore, value: AppStoreValue<TStore>): Promise<void> {
        await super.put(store, value);
        if (store === "practice_records" && "kind" in value && value.kind === "attempt" && this.rejectOnce) {
          this.rejectOnce = false;
          throw new Error("Lost completion acknowledgment");
        }
      }
    }
    const storage = new CommitThenReject();
    const saved = await draft();
    saved.stage = 4;
    saved.completedAt = "2026-09-08T00:02:00Z";
    saved.hypothesisId = brightCartFullCase.structure.acceptedHypothesisId;
    saved.branchIds = brightCartFullCase.structure.modelStructure.map((branch) => branch.branchId);
    saved.calculationInput = String(getFullCaseCalculationQuestion(brightCartFullCase).answer.value);
    saved.ideaIds = brightCartFullCase.brainstorming.themes.flatMap((theme) => theme.ideas.filter((idea) => idea.relevant).map((idea) => idea.id)).slice(0, brightCartFullCase.brainstorming.selectionLimit);
    saved.priorityIdeaIds = saved.ideaIds.slice(0, brightCartFullCase.brainstorming.priorityLimit);
    saved.synthesis = brightCartFullCase.synthesis.correctResponse;
    await storage.put("practice_records", saved);
    render(<FullCaseSimulation storageFactory={() => storage} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume draft" }));
    fireEvent.click(await screen.findByRole("button", { name: "Retry local save" }));
    expect(await screen.findByText("This full-case result is available to your local preparation roadmap.")).toBeInTheDocument();
    await waitFor(async () => expect(await storage.getAll("practice_records")).toEqual([
      expect.objectContaining({ kind: "attempt", completedAt: "2026-09-08T00:02:00.000Z", durationSeconds: 120 })
    ]));
  });
});
