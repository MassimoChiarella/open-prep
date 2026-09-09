import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { brightCartFullCase } from "@/data/casePractice/fullCaseSimulations";
import type { FullCaseDraftRecord } from "@/features/case-practice/practiceTypes";
import { FullCaseSimulation } from "@/features/case-practice/simulation/FullCaseSimulation";
import { fullCaseContentKey, fullCaseDraftId, isFullCaseDraftRecord } from "@/features/case-practice/simulation/fullCaseDraft";
import { publishLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const optInLabel = "Save a private draft on this device so I can resume this case.";
const questionPlaceholder = "Type a question you would ask the interviewer";
const draftId = fullCaseDraftId(brightCartFullCase.id);

beforeAll(() => Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

describe("full-case draft write lifecycle", () => {
  it("coalesces rapid draft edits and persists the newest snapshot", async () => {
    const storage = new MemoryAppStorage();
    render(<FullCaseSimulation storageFactory={() => storage} />);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: optInLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole("checkbox", { name: optInLabel }));
    await screen.findByText("Private draft saved on this device.");
    const write = vi.spyOn(storage, "put");
    const input = screen.getAllByPlaceholderText(questionPlaceholder)[0];

    fireEvent.change(input, { target: { value: "First edit" } });
    fireEvent.change(input, { target: { value: "Second edit" } });
    fireEvent.change(input, { target: { value: "Newest edit" } });

    await waitFor(() => expect(
      write.mock.calls.filter(([store]) => store === "practice_records")
    ).toHaveLength(1));
    expect(await storage.get("practice_records", draftId)).toMatchObject({
      questions: expect.arrayContaining([expect.objectContaining({ text: "Newest edit" })])
    });
  });

  it("grades a resumed completed draft using its input locale when the UI uses another locale", async () => {
    const storage = new MemoryAppStorage();
    const saved = await synthesisDraft();
    saved.locale = "de";
    saved.calculationInput = "120.000";
    saved.completedAt = "2026-09-08T00:02:00Z";
    await storage.put("practice_records", saved);
    render(<FullCaseSimulation storageFactory={() => storage} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume draft" }));
    await screen.findByText("This full-case result is available to your local preparation roadmap.");
    const feedback = screen.getByRole("heading", { name: "Exhibit and math feedback" }).closest("article");
    expect(feedback).toHaveTextContent("Correct.");
    expect(storage.peekAll("practice_records").filter((record) => record.kind === "attempt")).toHaveLength(1);
  });

  it("does not finish or delete a new run after resetting during a completed-draft write", async () => {
    const storage = new MemoryAppStorage();
    const storageFactory = () => storage;
    await storage.put("practice_records", await synthesisDraft());
    render(<FullCaseSimulation storageFactory={storageFactory} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume draft" }));
    await screen.findByText("Private draft saved on this device.");
    const delayed = holdDraftWrites(storage, (draft) => draft.completedAt !== undefined);
    fireEvent.click(screen.getByRole("button", { name: "Complete Case" }));
    await waitFor(() => expect(delayed.started()).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Retry Full Case" }));
    expect(screen.getByRole("checkbox", { name: optInLabel })).not.toBeChecked();
    fireEvent.change(screen.getAllByPlaceholderText(questionPlaceholder)[0], { target: { value: "A new run's private question" } });
    fireEvent.click(screen.getByRole("checkbox", { name: optInLabel }));
    await act(async () => { delayed.release(); });
    await waitFor(async () => expect(await storage.get("practice_records", draftId)).toMatchObject({
      questions: expect.arrayContaining([expect.objectContaining({ text: "A new run's private question" })])
    }));
    expect(storage.peekAll("practice_records").filter((record) => record.kind === "attempt")).toEqual([]);
    expect(screen.queryByTestId("full-case-total-score")).not.toBeInTheDocument();
  });

  it.each([
    { action: "unmount", preservesDraft: true },
    { action: "invalidation", preservesDraft: false }
  ] as const)("preserves queued autosaves on navigation and cancels after invalidation ($action)", async ({ action, preservesDraft }) => {
    const storage = new MemoryAppStorage();
    const view = render(<FullCaseSimulation storageFactory={() => storage} />);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: optInLabel })).toBeEnabled());
    const delayed = holdDraftWrites(storage, () => true);
    fireEvent.click(screen.getByRole("checkbox", { name: optInLabel }));
    await waitFor(() => expect(delayed.started()).toBe(true));
    fireEvent.change(screen.getAllByPlaceholderText(questionPlaceholder)[0], { target: { value: "Queued private edit" } });
    if (action === "unmount") view.unmount();
    else act(() => { publishLocalDataInvalidation("personal_data_cleared", { broadcastChannelFactory: null, fallbackStorage: null }); });
    await act(async () => { delayed.release(); });
    expect(delayed.spy).toHaveBeenCalledTimes(preservesDraft ? 2 : 1);
    expect(storage.peekAll("practice_records").some((record) => isFullCaseDraftRecord(record) && record.questions.some((question) => question.text === "Queued private edit"))).toBe(preservesDraft);
  });

  it("finishes an explicit private-draft deletion if navigation unmounts while an autosave is pending", async () => {
    const storage = new MemoryAppStorage();
    const view = render(<FullCaseSimulation storageFactory={() => storage} />);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: optInLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole("checkbox", { name: optInLabel }));
    await screen.findByText("Private draft saved on this device.");
    const delayed = holdDraftWrites(storage, () => true);
    fireEvent.change(screen.getAllByPlaceholderText(questionPlaceholder)[0], { target: { value: "Private content being discarded" } });
    await waitFor(() => expect(delayed.started()).toBe(true));
    fireEvent.click(screen.getByRole("checkbox", { name: optInLabel }));
    view.unmount();
    await act(async () => { delayed.release(); });
    expect(await storage.get("practice_records", draftId)).toBeUndefined();
  });

  it("keeps an active draft editable when equivalent content is passed as a new object", async () => {
    const storage = new MemoryAppStorage();
    const storageFactory = () => storage;
    const view = render(<FullCaseSimulation simulation={brightCartFullCase} storageFactory={storageFactory} />);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: optInLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole("checkbox", { name: optInLabel }));
    await screen.findByText("Private draft saved on this device.");
    const read = vi.spyOn(storage, "get");
    view.rerender(<FullCaseSimulation simulation={structuredClone(brightCartFullCase)} storageFactory={storageFactory} />);
    await act(async () => { await fullCaseContentKey(brightCartFullCase); });
    expect(read).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Resume draft" })).not.toBeInTheDocument();
    fireEvent.change(screen.getAllByPlaceholderText(questionPlaceholder)[0], { target: { value: "Edit after equivalent content rerender" } });
    await waitFor(async () => expect(await storage.get("practice_records", draftId)).toMatchObject({
      questions: expect.arrayContaining([expect.objectContaining({ text: "Edit after equivalent content rerender" })])
    }));
  });

  it("waits for a pending discard before the same case remount can load or save a new draft", async () => {
    const storage = new MemoryAppStorage();
    const storageFactory = () => storage;
    const first = render(<FullCaseSimulation storageFactory={storageFactory} />);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: optInLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole("checkbox", { name: optInLabel }));
    await screen.findByText("Private draft saved on this device.");
    const delayed = holdDraftWrites(storage, () => true);
    fireEvent.change(screen.getAllByPlaceholderText(questionPlaceholder)[0], { target: { value: "Discarded before remount" } });
    await waitFor(() => expect(delayed.started()).toBe(true));
    fireEvent.click(screen.getByRole("checkbox", { name: optInLabel }));
    first.unmount();
    render(<FullCaseSimulation storageFactory={storageFactory} />);
    await act(async () => { await fullCaseContentKey(brightCartFullCase); });
    expect(screen.getByRole("checkbox", { name: optInLabel })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Resume draft" })).not.toBeInTheDocument();

    await act(async () => { delayed.release(); });
    await waitFor(() => expect(screen.getByRole("checkbox", { name: optInLabel })).toBeEnabled());
    expect(await storage.get("practice_records", draftId)).toBeUndefined();
    fireEvent.change(screen.getAllByPlaceholderText(questionPlaceholder)[0], { target: { value: "Keep this new run" } });
    fireEvent.click(screen.getByRole("checkbox", { name: optInLabel }));
    await waitFor(async () => expect(await storage.get("practice_records", draftId)).toMatchObject({
      questions: expect.arrayContaining([expect.objectContaining({ text: "Keep this new run" })])
    }));
  });
});

function holdDraftWrites(storage: MemoryAppStorage, predicate: (draft: FullCaseDraftRecord) => boolean) {
  let release!: () => void;
  let started = false;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const original = storage.put.bind(storage);
  const spy = vi.spyOn(storage, "put").mockImplementation(async (store, value) => {
    if (store === "practice_records" && isFullCaseDraftRecord(value) && predicate(value)) {
      started = true;
      await gate;
    }
    await original(store, value);
  });
  return { release, spy, started: () => started };
}

async function synthesisDraft(): Promise<FullCaseDraftRecord> {
  return {
    id: draftId, kind: "full_case_draft", simulationId: brightCartFullCase.id,
    contentKey: await fullCaseContentKey(brightCartFullCase), startedAt: "2026-09-08T00:00:00Z", updatedAt: "2026-09-08T00:01:00Z",
    locale: "en", stage: 4, includeQuestionRanking: false,
    questions: Array.from({ length: brightCartFullCase.questioning!.minimumQuestions }, (_, index) => ({ id: `question-${index + 1}`, text: "What drives the outcome?" })),
    hypothesisId: brightCartFullCase.structure.acceptedHypothesisId,
    branchIds: brightCartFullCase.structure.modelStructure.map((branch) => branch.branchId),
    calculationInput: "1", ideaIds: [], priorityIdeaIds: [], synthesis: brightCartFullCase.synthesis.correctResponse
  };
}
