import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FitPracticeView } from "@/features/case-practice/fit/FitPracticeView";
import { createFitStoryRecord } from "@/features/case-practice/fit/fitPractice";
import { loadFitStoryBank, saveFitStory } from "@/features/case-practice/practiceRecords";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(() => vi.restoreAllMocks());

async function fixture() {
  const storage = new MemoryAppStorage();
  const story = createFitStoryRecord({ title: "Saved launch", competency: "leadership", situation: "Delay", task: "Recover", action: "Original action", result: "Delivered", reflection: "Align earlier" }, "2026-10-17T12:00:00Z", "imported-legacy-id");
  await saveFitStory(storage, story);
  render(<FitPracticeView storageFactory={() => storage} />);
  await screen.findByRole("heading", { name: story.title });
  const [snapshot] = await loadFitStoryBank(storage);
  return { storage, story, snapshot };
}

describe("Fit conflict recovery", () => {
  it("retains stale editor text and explicitly saves it under a new ID", async () => {
    const { storage, story, snapshot } = await fixture();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "My unsaved result" } });
    await saveFitStory(storage, { ...story, action: "Newer saved action" }, snapshot.token);
    fireEvent.click(screen.getByRole("button", { name: "Update Story" }));
    await screen.findByText("Story changed");
    expect(screen.getByLabelText("Result")).toHaveValue("My unsaved result");
    expect(await storage.get("practice_records", story.id)).toMatchObject({ action: "Newer saved action" });
    fireEvent.click(screen.getByRole("button", { name: "Keep my draft as a new story" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Story" }));
    await waitFor(() => expect(storage.peekAll("practice_records")).toHaveLength(2));
    expect(storage.peekAll("practice_records")).toContainEqual(expect.objectContaining({ result: "My unsaved result", action: "Original action" }));
    expect(await storage.get("practice_records", story.id)).toMatchObject({ action: "Newer saved action" });
  });

  it("does not delete a story changed after its visible version was loaded", async () => {
    const { storage, story, snapshot } = await fixture();
    await saveFitStory(storage, { ...story, action: "Newer saved action" }, snapshot.token);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByText("Story changed");
    expect(await storage.get("practice_records", story.id)).toMatchObject({ action: "Newer saved action" });
    expect(screen.getByText("1 saved")).toBeInTheDocument();
  });
});
