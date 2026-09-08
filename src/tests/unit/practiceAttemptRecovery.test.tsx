import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { brainstormingPrompts } from "@/data/casePractice/brainstormingPrompts";
import { conceptLessons } from "@/data/casePractice/conceptLessons";
import { synthesisPrompts } from "@/data/casePractice/synthesisPrompts";
import { BrainstormingDrill } from "@/features/case-practice/brainstorming/BrainstormingDrill";
import { FitPracticeView } from "@/features/case-practice/fit/FitPracticeView";
import { ConceptLessonsView } from "@/features/case-practice/lessons/ConceptLessonsView";
import { QuestioningPractice } from "@/features/case-practice/questioning/QuestioningPractice";
import { StructuringPractice } from "@/features/case-practice/structuring/StructuringPractice";
import { SynthesisPractice } from "@/features/case-practice/synthesis/SynthesisPractice";
import { usePracticeAttemptSave } from "@/features/case-practice/usePracticeAttemptSave";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(() => vi.restoreAllMocks());

describe("completed practice save recovery", () => {
  it.each(["structuring", "questioning", "brainstorming", "synthesis", "lessons", "fit"] as const)(
    "retries the same completed %s attempt without repeating the exercise", async (module) => {
      const storage = new MemoryAppStorage();
      const originalPut = storage.put.bind(storage);
      const writes = vi.spyOn(storage, "put").mockImplementationOnce(async (store, value) => {
        await originalPut(store, value);
        throw new Error("Response lost after commit");
      });
      const props = { storageFactory: () => storage };
      if (module === "structuring") {
        render(<StructuringPractice {...props} />);
        fireEvent.click(screen.getAllByRole("radio")[0]);
        fireEvent.click(screen.getAllByRole("checkbox")[0]);
        fireEvent.click(screen.getByRole("button", { name: "Score Structure" }));
      } else if (module === "questioning") {
        render(<QuestioningPractice {...props} />);
        for (const input of screen.getAllByPlaceholderText("Type a question you would ask the interviewer")) {
          fireEvent.change(input, { target: { value: "What is your name?" } });
        }
        fireEvent.click(screen.getByRole("button", { name: "Score Questions" }));
      } else if (module === "brainstorming") {
        render(<BrainstormingDrill {...props} />);
        const prompt = brainstormingPrompts[0];
        const ideas = screen.getAllByRole("checkbox", { name: /^Include / }).slice(0, prompt.selectionLimit);
        ideas.forEach((input) => fireEvent.click(input));
        screen.getAllByRole("checkbox", { name: /^Prioritize / }).slice(0, prompt.priorityLimit).forEach((input) => fireEvent.click(input));
        fireEvent.click(screen.getByRole("button", { name: "Score and Save" }));
      } else if (module === "synthesis") {
        const { container } = render(<SynthesisPractice {...props} prompts={synthesisPrompts} />);
        for (const fieldset of container.querySelectorAll("fieldset")) {
          fireEvent.click(fieldset.querySelector("input")!);
        }
        fireEvent.click(screen.getByRole("button", { name: "Score Response" }));
      } else if (module === "lessons") {
        render(<ConceptLessonsView {...props} lessons={conceptLessons} />);
        await act(async () => {});
        fireEvent.click(screen.getAllByRole("radio")[0]);
        fireEvent.click(screen.getByRole("button", { name: "Check Answer" }));
      } else {
        render(<FitPracticeView {...props} />);
        await waitFor(() => expect(screen.queryByText("Loading stories saved in this browser...")).not.toBeInTheDocument());
        for (const label of ["Story title", "Situation", "Task", "Action", "Result", "Reflection"]) {
          fireEvent.change(screen.getByLabelText(label), { target: { value: `Example ${label}` } });
        }
        fireEvent.click(screen.getByRole("button", { name: "Rehearse Without Saving" }));
        fireEvent.click(screen.getByRole("button", { name: "Start Rehearsal" }));
        fireEvent.click(screen.getByRole("button", { name: "Finish Rehearsal" }));
        fireEvent.click(screen.getByRole("button", { name: "Save Self-Review" }));
      }

      const retry = await screen.findByRole("button", { name: "Retry Save" });
      const original = structuredClone(storage.peekAll("practice_records"));
      expect(original).toHaveLength(1);
      expect(original[0]).toMatchObject({ kind: "attempt", module });
      fireEvent.click(retry);
      await waitFor(() => expect(screen.queryByRole("button", { name: "Retry Save" })).not.toBeInTheDocument());
      expect(writes).toHaveBeenCalledTimes(2);
      expect(writes.mock.calls[1]).toEqual(writes.mock.calls[0]);
      expect(storage.peekAll("practice_records")).toEqual(original);
    }
  );

  it("keeps the new attempt state when a previous write completes out of order", async () => {
    const storage = new MemoryAppStorage();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const originalPut = storage.put.bind(storage);
    vi.spyOn(storage, "put").mockImplementationOnce(async (store, value) => { await pending; await originalPut(store, value); });
    const { result } = renderHook(() => usePracticeAttemptSave(() => storage));
    const first = { module: "synthesis" as const, itemId: "first", completedAt: "2026-09-01T12:00:00Z", score: 2, maxScore: 4 };
    let firstSave!: Promise<boolean>;
    act(() => { firstSave = result.current.saveAttempt(first); });
    expect(result.current.saveState).toBe("saving");
    act(() => result.current.resetSave());
    await act(async () => { expect(await result.current.saveAttempt({ ...first, itemId: "second" })).toBe(true); });
    expect(result.current.saveState).toBe("saved");
    await act(async () => { release(); expect(await firstSave).toBe(false); });
    expect(result.current.saveState).toBe("saved");
    expect(storage.peekAll("practice_records").filter((record) => record.kind === "attempt").map((attempt) => attempt.itemId).sort()).toEqual(["first", "second"]);
  });

  it("ignores simultaneous retry clicks and preserves the completed snapshot", async () => {
    const storage = new MemoryAppStorage();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const originalPut = storage.put.bind(storage);
    const writes = vi.spyOn(storage, "put").mockRejectedValueOnce(new Error("Unavailable"))
      .mockImplementationOnce(async (store, value) => { await pending; await originalPut(store, value); });
    const { result } = renderHook(() => usePracticeAttemptSave(() => storage));
    const attempt = { module: "synthesis" as const, itemId: "first", completedAt: "2026-09-01T12:00:00Z", score: 2, maxScore: 4 };
    await act(async () => { expect(await result.current.saveAttempt(attempt)).toBe(false); });
    attempt.score = 4;
    let retry!: Promise<boolean>;
    act(() => { retry = result.current.retrySave(); });
    await act(async () => { expect(await result.current.retrySave()).toBe(false); });
    expect(writes).toHaveBeenCalledTimes(2);
    await act(async () => { release(); expect(await retry).toBe(true); });
    expect(storage.peekAll("practice_records")[0]).toMatchObject({ score: 2, completedAt: "2026-09-01T12:00:00Z" });
  });

  it("keeps a synthesis answer edit after a delayed old save completes", async () => {
    const storage = new MemoryAppStorage();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const originalPut = storage.put.bind(storage);
    vi.spyOn(storage, "put").mockImplementationOnce(async (store, value) => { await pending; await originalPut(store, value); });
    const { container } = render(<SynthesisPractice prompts={synthesisPrompts} storageFactory={() => storage} />);
    for (const fieldset of container.querySelectorAll("fieldset")) fireEvent.click(fieldset.querySelector("input")!);
    fireEvent.click(screen.getByRole("button", { name: "Score Response" }));
    fireEvent.click(container.querySelectorAll("fieldset")[0].querySelectorAll("input")[1]);
    await act(async () => release());
    expect(screen.queryByText(/saved on this device\./)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Response review" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Score Response" })).toBeEnabled();
    expect(storage.peekAll("practice_records")).toHaveLength(1);
  });
});
