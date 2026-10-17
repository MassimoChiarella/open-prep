import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { AppNav } from "@/components/AppNav";
import { brightCartFullCase } from "@/data/casePractice/fullCaseSimulations";
import type { FullCaseDraftRecord } from "@/features/case-practice/practiceTypes";
import { FullCaseSimulation } from "@/features/case-practice/simulation/FullCaseSimulation";
import { fullCaseContentKey, fullCaseDraftId } from "@/features/case-practice/simulation/fullCaseDraft";
import * as draftPersistence from "@/features/case-practice/simulation/fullCaseDraftPersistence";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

vi.mock("next/navigation", () => ({ usePathname: () => "/case-practice/simulation" }));
beforeAll(() => Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

const optIn = "Save a private draft on this device so I can resume this case.";
const pendingMessage = "Leave this case? A local save or removal is still pending. Keep this page open until it finishes.";
const failedMessage = "Leave this active session? Some recent progress could not be saved on this device.";

function checkExit(message: string) {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.click(screen.getByTestId("focused-task-exit"));
  expect(confirm).toHaveBeenLastCalledWith(message);
}

describe("full-case exit guidance", () => {
  it("warns that incomplete work is unsaved without private-draft consent", async () => {
    const storage = new MemoryAppStorage();
    render(<><AppNav /><FullCaseSimulation storageFactory={() => storage} /></>);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: optIn })).toBeEnabled());
    for (const question of screen.getAllByPlaceholderText("Type a question you would ask the interviewer")) {
      fireEvent.change(question, { target: { value: "What is the target revenue and deadline?" } });
    }
    fireEvent.click(screen.getByRole("button", { name: "Continue to Structure" }));
    checkExit("Leave this case? Private draft saving is off. Any unsaved work on this page will be lost.");
    expect(storage.peekAll("practice_records")).toEqual([]);
  });

  it("distinguishes a pending edit from an acknowledged private draft and a failed save", async () => {
    const storage = new MemoryAppStorage();
    render(<><AppNav /><FullCaseSimulation storageFactory={() => storage} /></>);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: optIn })).toBeEnabled());
    fireEvent.click(screen.getByRole("checkbox", { name: optIn }));
    await waitFor(() => expect(screen.getByText("Private draft saved on this device.")).toBeVisible());
    checkExit("Leave this case? Your private draft is saved on this device.");

    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const original = draftPersistence.writeFullCaseDraft;
    const write = vi.spyOn(draftPersistence, "writeFullCaseDraft").mockImplementationOnce(async (...args) => {
      await gate;
      return original(...args);
    });
    fireEvent.change(screen.getAllByPlaceholderText("Type a question you would ask the interviewer")[0], { target: { value: "A pending private question" } });
    checkExit(pendingMessage);
    expect(screen.getByText("Private draft saved on this device.")).not.toBeVisible();
    await waitFor(() => expect(write).toHaveBeenCalled());
    checkExit(pendingMessage);
    await act(async () => { release(); });
    await waitFor(() => expect(screen.getByText("Private draft saved on this device.")).toBeVisible());
    checkExit("Leave this case? Your private draft is saved on this device.");

    write.mockRejectedValueOnce(new Error("Storage full"));
    fireEvent.change(screen.getAllByPlaceholderText("Type a question you would ask the interviewer")[0], { target: { value: "A private question that could not save" } });
    await screen.findByText("The local draft could not be read or updated. Keep this page open to preserve your current work.");
    checkExit(failedMessage);
  });

  it.each([false, true])("waits for completed-result acknowledgement before claiming it is saved (failure=%s)", async (failure) => {
    const storage = new MemoryAppStorage();
    await storage.put("practice_records", await completedDraft());
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const originalPut = storage.put.bind(storage);
    const put = vi.spyOn(storage, "put").mockImplementation(async (store, record) => {
      await gate;
      if (failure) throw new Error("Storage full");
      await originalPut(store, record);
    });
    render(<><AppNav /><FullCaseSimulation storageFactory={() => storage} /></>);
    fireEvent.click(await screen.findByRole("button", { name: "Resume draft" }));
    await waitFor(() => expect(put).toHaveBeenCalled());
    checkExit(pendingMessage);
    await act(async () => { release(); });
    await screen.findByText(failure
      ? "Your score is still visible, but this case could not be saved locally."
      : "This full-case result is available to your local preparation roadmap.");
    checkExit(failure ? failedMessage : "Leave this active session? Submitted progress is saved on this device.");
  });

  it("does not acknowledge a newer queued edit when an older draft save finishes", async () => {
    const storage = new MemoryAppStorage();
    render(<><AppNav /><FullCaseSimulation storageFactory={() => storage} /></>);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: optIn })).toBeEnabled());
    fireEvent.click(screen.getByRole("checkbox", { name: optIn }));
    await waitFor(() => expect(screen.getByText("Private draft saved on this device.")).toBeVisible());
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const original = draftPersistence.writeFullCaseDraft;
    const write = vi.spyOn(draftPersistence, "writeFullCaseDraft").mockImplementationOnce(async (...args) => {
      await gate;
      return original(...args);
    });
    const question = screen.getAllByPlaceholderText("Type a question you would ask the interviewer")[0];
    fireEvent.change(question, { target: { value: "An older in-flight edit" } });
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    fireEvent.change(question, { target: { value: "A newer queued edit" } });
    await act(async () => { release(); });
    checkExit(pendingMessage);
    expect(screen.getByText("Private draft saved on this device.")).not.toBeVisible();
    await waitFor(() => expect(screen.getByText("Private draft saved on this device.")).toBeVisible());
    expect(await storage.get("practice_records", fullCaseDraftId(brightCartFullCase.id))).toMatchObject({
      questions: expect.arrayContaining([expect.objectContaining({ text: "A newer queued edit" })])
    });
  });
});

async function completedDraft(): Promise<FullCaseDraftRecord> {
  const ideaIds = brightCartFullCase.brainstorming.themes.flatMap((theme) => theme.ideas)
    .slice(0, brightCartFullCase.brainstorming.selectionLimit).map((idea) => idea.id);
  return {
    id: fullCaseDraftId(brightCartFullCase.id), kind: "full_case_draft", simulationId: brightCartFullCase.id,
    contentKey: await fullCaseContentKey(brightCartFullCase), startedAt: "2026-10-17T00:00:00Z", updatedAt: "2026-10-17T00:02:00Z",
    completedAt: "2026-10-17T00:02:00Z", locale: "en", stage: 4, includeQuestionRanking: false,
    questions: Array.from({ length: brightCartFullCase.questioning!.minimumQuestions }, (_, index) => ({ id: `question-${index}`, text: "What drives the revenue outcome?" })),
    hypothesisId: brightCartFullCase.structure.acceptedHypothesisId, branchIds: brightCartFullCase.structure.modelStructure.map((branch) => branch.branchId),
    calculationInput: "120000", ideaIds, priorityIdeaIds: ideaIds.slice(0, brightCartFullCase.brainstorming.priorityLimit),
    synthesis: brightCartFullCase.synthesis.correctResponse
  };
}
