import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FitPracticeView } from "@/features/case-practice/fit/FitPracticeView";
import { timingAccommodationPreferenceKey } from "@/features/timing/timingAccommodationPreference";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.removeItem(timingAccommodationPreferenceKey);
});

describe("FitPracticeView", () => {
  it("describes invalid fields and focuses the first error", async () => {
    const storage = new MemoryAppStorage();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });

    render(<FitPracticeView storageFactory={() => storage} />);

    const title = await screen.findByLabelText("Story title");
    expect(title).toHaveAttribute("dir", "auto");
    expect(screen.getByLabelText("Situation")).toHaveAttribute("dir", "auto");
    fireEvent.click(screen.getByRole("button", { name: "Save Story" }));

    await waitFor(() => expect(title).toHaveFocus());
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAttribute("aria-describedby", "fit-story-title-error");
    expect(screen.getByText("Story title is required.")).toHaveAttribute("id", "fit-story-title-error");

    fireEvent.change(title, { target: { value: "Led a difficult turnaround" } });

    expect(title).toHaveAttribute("aria-invalid", "false");
    expect(title).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText("Story title is required.")).not.toBeInTheDocument();
  });

  it("contains imported rehearsal prompts and follow-up questions", async () => {
    const storage = new MemoryAppStorage();
    const prompt = "P".repeat(2_000);
    const followUp = "F".repeat(1_000);
    await storage.put("practice_records", {
      action: "Action",
      competency: "leadership",
      id: "fit-story-containment",
      kind: "fit_story",
      reflection: "Reflection",
      result: "Result",
      situation: "Situation",
      task: "Task",
      title: "Leadership example",
      updatedAt: "2026-08-30T12:00:00.000Z"
    });

    render(
      <FitPracticeView
        prompts={[{ competency: "leadership", followUps: [followUp], id: "fit-prompt-containment", prompt }]}
        storageFactory={() => storage}
      />
    );

    const promptNodes = await screen.findAllByText(prompt);
    const rehearsalPrompt = promptNodes.find((node) => node.tagName === "P");
    expect(rehearsalPrompt).toBeDefined();
    expect(rehearsalPrompt).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(screen.getByText(followUp)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
  });

  it.each([
    ["standard", 90, 90],
    ["time_and_a_half", 90, 135],
    ["double_time", 120, 240]
  ] as const)("expires %s rehearsal at its exact adjusted limit", async (accommodation, authoredSeconds, effectiveSeconds) => {
    const storage = new MemoryAppStorage();
    await seedStory(storage);
    render(<FitPracticeView storageFactory={() => storage} />);
    await waitFor(() => expect(screen.getByLabelText("Story")).toHaveValue("fit-story-saved"));

    fireEvent.change(screen.getByLabelText("Answer time"), { target: { value: String(authoredSeconds) } });
    fireEvent.change(screen.getByLabelText("Timing choice"), { target: { value: accommodation } });
    expect(screen.getByRole("timer", { name: `${effectiveSeconds} seconds remaining` })).toBeInTheDocument();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Start Rehearsal" }));
    act(() => vi.advanceTimersByTime((effectiveSeconds - 1) * 1_000));

    expect(screen.getByRole("button", { name: "Finish Rehearsal" })).toBeInTheDocument();
    expect(screen.getByRole("timer", { name: "1 second remaining" })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText("Self-review checklist")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finish Rehearsal" })).not.toBeInTheDocument();
    expect(screen.getByRole("timer", { name: "0 seconds remaining" })).toBeInTheDocument();
  });

  it("keeps Untimed practice running until the explicit finish action", async () => {
    const storage = new MemoryAppStorage();
    await seedStory(storage);
    render(<FitPracticeView storageFactory={() => storage} />);
    await waitFor(() => expect(screen.getByLabelText("Story")).toHaveValue("fit-story-saved"));

    fireEvent.change(screen.getByLabelText("Timing choice"), { target: { value: "untimed" } });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Start Rehearsal" }));
    act(() => vi.advanceTimersByTime(121_000));

    expect(screen.getByRole("timer", { name: "121 seconds elapsed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finish Rehearsal" })).toBeInTheDocument();
    expect(screen.queryByText("Self-review checklist")).not.toBeInTheDocument();
    expect(screen.getByTestId("fit-active-timing-accommodation")).toHaveTextContent(
      "Untimed practice. No automatic timeout; Standard limit: 2 min."
    );

    fireEvent.click(screen.getByRole("button", { name: "Finish Rehearsal" }));
    expect(screen.getByText("Self-review checklist")).toBeInTheDocument();
  });

  it("locks the active policy when the remembered preference changes", async () => {
    window.localStorage.setItem(timingAccommodationPreferenceKey, "time_and_a_half");
    const storage = new MemoryAppStorage();
    await seedStory(storage);
    render(<FitPracticeView storageFactory={() => storage} />);
    await waitFor(() => expect(screen.getByLabelText("Timing choice")).toHaveValue("time_and_a_half"));

    fireEvent.click(screen.getByRole("button", { name: "Start Rehearsal" }));
    window.localStorage.setItem(timingAccommodationPreferenceKey, "untimed");
    window.dispatchEvent(new StorageEvent("storage", {
      key: timingAccommodationPreferenceKey,
      newValue: "untimed"
    }));

    expect(screen.getByLabelText("Timing choice")).toHaveValue("time_and_a_half");
    expect(screen.getByTestId("fit-active-timing-accommodation")).toHaveTextContent(
      "Time and a half. Active limit: 3 min; Standard limit: 2 min."
    );
  });

  it("remembers a timing choice only after checked launch", async () => {
    window.localStorage.setItem(timingAccommodationPreferenceKey, "standard");
    const storage = new MemoryAppStorage();
    await seedStory(storage);
    render(<FitPracticeView storageFactory={() => storage} />);
    await waitFor(() => expect(screen.getByLabelText("Story")).toHaveValue("fit-story-saved"));

    fireEvent.change(screen.getByLabelText("Timing choice"), { target: { value: "double_time" } });
    expect(window.localStorage.getItem(timingAccommodationPreferenceKey)).toBe("standard");
    fireEvent.click(screen.getByRole("checkbox", { name: "Remember this timing choice on this device" }));
    expect(window.localStorage.getItem(timingAccommodationPreferenceKey)).toBe("standard");

    fireEvent.click(screen.getByRole("button", { name: "Start Rehearsal" }));
    expect(window.localStorage.getItem(timingAccommodationPreferenceKey)).toBe("double_time");
  });

  it("records the locked timing policy with the saved self-review", async () => {
    const storage = new MemoryAppStorage();
    await seedStory(storage);
    render(<FitPracticeView storageFactory={() => storage} />);
    await waitFor(() => expect(screen.getByLabelText("Story")).toHaveValue("fit-story-saved"));

    fireEvent.change(screen.getByLabelText("Answer time"), { target: { value: "90" } });
    fireEvent.change(screen.getByLabelText("Timing choice"), { target: { value: "time_and_a_half" } });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Start Rehearsal" }));
    act(() => vi.advanceTimersByTime(7_000));
    fireEvent.click(screen.getByRole("button", { name: "Finish Rehearsal" }));
    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: "Save Self-Review" }));

    await screen.findByText("Self-review saved locally: 0/6.");
    const attempt = storage.peekAll("practice_records").find((record) => record.kind === "attempt");
    expect(attempt).toMatchObject({
      durationSeconds: 7,
      itemId: "leadership-uncertainty",
      module: "fit",
      timingAccommodation: "time_and_a_half"
    });
    expect(screen.getByTestId("fit-active-timing-accommodation")).toHaveTextContent(
      "Time and a half. Active limit: 2m 15s; Standard limit: 1m 30s."
    );
  });

  it("completes an unsaved rehearsal without persisting or restoring story prose", async () => {
    const storage = new MemoryAppStorage();
    const localStorageWrite = vi.spyOn(Storage.prototype, "setItem");
    const firstRender = render(<FitPracticeView storageFactory={() => storage} />);
    await screen.findByLabelText("Story title");
    fillStoryDraft("Private client turnaround");

    expect(screen.getByText(/Story text is browser-local and unencrypted/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Settings for backup and clear controls." })).toHaveAttribute(
      "href",
      "/settings"
    );
    fireEvent.click(screen.getByRole("button", { name: "Rehearse Without Saving" }));

    expect(screen.getByLabelText("Story")).toHaveValue("fit-story-unsaved-rehearsal");
    expect(storage.peekAll("practice_records")).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Start Rehearsal" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish Rehearsal" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Self-Review" }));
    await screen.findByText("Self-review saved locally: 0/6.");

    const storedRecords = storage.peekAll("practice_records");
    expect(storedRecords).toHaveLength(1);
    expect(storedRecords[0]).toMatchObject({ kind: "attempt", module: "fit" });
    expect(JSON.stringify(storedRecords)).not.toContain("Private client turnaround");
    expect(JSON.stringify(storedRecords)).not.toContain("Sensitive situation prose");
    expect(localStorageWrite).not.toHaveBeenCalled();

    firstRender.unmount();
    render(<FitPracticeView storageFactory={() => storage} />);
    await screen.findByLabelText("Story title");
    expect(screen.getByLabelText("Story title")).toHaveValue("");
    expect(screen.queryByRole("option", { name: "Unsaved rehearsal draft" })).not.toBeInTheDocument();
    expect(storage.peekAll("practice_records").some((record) => record.kind === "fit_story")).toBe(false);
  });

  it("clears an ephemeral draft on cancel", async () => {
    const storage = new MemoryAppStorage();
    render(<FitPracticeView storageFactory={() => storage} />);
    await screen.findByLabelText("Story title");
    fillStoryDraft("Ephemeral story");
    fireEvent.click(screen.getByRole("button", { name: "Rehearse Without Saving" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByLabelText("Story title")).toHaveValue("");
    expect(screen.queryByRole("option", { name: "Unsaved rehearsal draft" })).not.toBeInTheDocument();
    expect(storage.peekAll("practice_records")).toEqual([]);
  });

  it("preserves saved story creation, editing, and deletion", async () => {
    const storage = new MemoryAppStorage();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<FitPracticeView storageFactory={() => storage} />);
    await screen.findByLabelText("Story title");
    fillStoryDraft("Saved leadership story");
    fireEvent.click(screen.getByRole("button", { name: "Save Story" }));

    await waitFor(() => expect(storage.peekAll("practice_records").filter((record) => record.kind === "fit_story")).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Story title"), { target: { value: "Updated leadership story" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Story" }));
    await waitFor(() => expect(storage.peekAll("practice_records").find((record) => record.kind === "fit_story")).toMatchObject({
      title: "Updated leadership story"
    }));

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(storage.peekAll("practice_records").some((record) => record.kind === "fit_story")).toBe(false));
  });
});

async function seedStory(storage: MemoryAppStorage): Promise<void> {
  await storage.put("practice_records", {
    action: "I assigned owners and removed blockers.",
    competency: "leadership",
    id: "fit-story-saved",
    kind: "fit_story",
    reflection: "I would align stakeholders earlier.",
    result: "The launch recovered.",
    situation: "A launch was behind schedule.",
    task: "I had to recover delivery.",
    title: "Leadership example",
    updatedAt: "2026-08-30T12:00:00.000Z"
  });
}

function fillStoryDraft(title: string): void {
  fireEvent.change(screen.getByLabelText("Story title"), { target: { value: title } });
  fireEvent.change(screen.getByLabelText("Situation"), { target: { value: "Sensitive situation prose" } });
  fireEvent.change(screen.getByLabelText("Task"), { target: { value: "Sensitive task prose" } });
  fireEvent.change(screen.getByLabelText("Action"), { target: { value: "Sensitive action prose" } });
  fireEvent.change(screen.getByLabelText("Result"), { target: { value: "Sensitive result prose" } });
  fireEvent.change(screen.getByLabelText("Reflection"), { target: { value: "Sensitive reflection prose" } });
}
