import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FitPracticeView } from "@/features/case-practice/fit/FitPracticeView";
import { createFitStoryRecord } from "@/features/case-practice/fit/fitPractice";
import { I18nProvider, LanguageSelect } from "@/features/i18n/I18nProvider";
import { localePreferenceStorageKey } from "@/features/i18n/i18n";
import frenchMessages from "@/features/i18n/locales/fr";
import { CasePracticeQuestionPackContent } from "@/features/question-packs/CasePracticeQuestionPackContent";
import { questionPackPoolPreferenceStorageKey } from "@/features/question-packs/questionPackPoolPreference";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.localStorage.removeItem(localePreferenceStorageKey);
  window.localStorage.removeItem(questionPackPoolPreferenceStorageKey);
});

describe("Fit story recovery and rehearsal identity", () => {
  it("keeps the nonfirst story, chosen prompt and elapsed rehearsal through a wrapper language update", async () => {
    const storage = new MemoryAppStorage();
    const conflict = makeStory("Older conflict story", "conflict", "2026-10-01T00:00:00Z");
    const leadership = makeStory("Newer leadership story", "leadership", "2026-10-02T00:00:00Z");
    await storage.put("practice_records", conflict);
    await storage.put("practice_records", leadership);
    const load = vi.spyOn(storage, "getAll");
    render(
      <I18nProvider loadLocale={async () => frenchMessages}>
        <LanguageSelect />
        <CasePracticeQuestionPackContent view="fit" storageFactory={() => storage} />
      </I18nProvider>
    );
    await waitFor(() => expect(screen.getByLabelText("Story")).toHaveValue(leadership.id));
    const storySelect = screen.getByLabelText("Story");
    const promptSelect = screen.getByLabelText("Prompt");
    fireEvent.change(storySelect, { target: { value: conflict.id } });
    fireEvent.change(promptSelect, { target: { value: "conflict-team" } });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Start Rehearsal" }));
    act(() => vi.advanceTimersByTime(7_000));
    const finish = screen.getByRole("button", { name: "Finish Rehearsal" });
    await act(async () => fireEvent.change(screen.getByLabelText("Language"), { target: { value: "fr" } }));
    expect(document.documentElement.lang).toBe("fr");
    expect(storySelect).toBeInTheDocument();
    expect(storySelect).toHaveValue(conflict.id);
    expect(promptSelect).toHaveValue("conflict-team");
    expect(screen.getByRole("timer")).toHaveTextContent("1:53");
    expect(finish).toBeInTheDocument();
    expect(load.mock.calls.filter(([store]) => store === "practice_records")).toHaveLength(1);
    fireEvent.click(finish);
    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: frenchMessages["Save Self-Review"] }));
    await waitFor(() => expect(storage.peekAll("practice_records").find((record) => record.kind === "attempt")).toMatchObject({
      itemId: "conflict-team", durationSeconds: 7, module: "fit"
    }));
  });

  it("merges a story saved during the initial read and preserves its save status", async () => {
    const storage = new MemoryAppStorage();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(storage, "getAll").mockImplementationOnce(async () => { await gate; return []; });
    render(<FitPracticeView storageFactory={() => storage} />);
    expect(screen.getByText("Loading stories saved in this browser...")).toBeInTheDocument();
    fillStory("Saved during loading");
    fireEvent.click(screen.getByRole("button", { name: "Save Story" }));
    expect(await screen.findByRole("heading", { name: "Saved during loading" })).toBeInTheDocument();
    const stored = storage.peekAll("practice_records").find((record) => record.kind === "fit_story")!;
    await act(async () => release());
    expect(screen.getByRole("heading", { name: "Saved during loading" })).toBeInTheDocument();
    expect(screen.getByText("1 saved")).toBeInTheDocument();
    expect(screen.getByLabelText("Story")).toHaveValue(stored.id);
    expect(screen.getByText("Your story is available for local rehearsal.")).toBeInTheDocument();
    expect(storage.peekAll("practice_records").filter((record) => record.kind === "fit_story")).toHaveLength(1);
  });

  it("preserves a running unsaved rehearsal when the initial story bank resolves", async () => {
    const storage = new MemoryAppStorage();
    const leadership = makeStory("Saved leadership story", "leadership", "2026-10-01T00:00:00Z");
    await storage.put("practice_records", leadership);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(storage, "getAll").mockImplementationOnce(async () => { await gate; return [leadership]; });
    render(<FitPracticeView storageFactory={() => storage} />);
    fillStory("Unsaved conflict story");
    fireEvent.change(screen.getByLabelText("Competency"), { target: { value: "conflict" } });
    fireEvent.click(screen.getByRole("button", { name: "Rehearse Without Saving" }));
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "conflict-team" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Rehearsal" }));
    await act(async () => release());
    expect(screen.getByLabelText("Story")).toHaveValue("fit-story-unsaved-rehearsal");
    expect(screen.getByLabelText("Prompt")).toHaveValue("conflict-team");
    expect(screen.getByRole("button", { name: "Finish Rehearsal" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Finish Rehearsal" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Self-Review" }));
    await waitFor(() => expect(storage.peekAll("practice_records").find((record) => record.kind === "attempt")).toMatchObject({ itemId: "conflict-team" }));
    expect(storage.peekAll("practice_records").filter((record) => record.kind === "fit_story")).toEqual([leadership]);
  });

  it("does not resurrect a successfully deleted story from a delayed reload", async () => {
    const storage = new MemoryAppStorage();
    const story = makeStory("Delete while reloading", "leadership", "2026-10-01T00:00:00Z");
    await storage.put("practice_records", story);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const view = render(<FitPracticeView storageFactory={() => storage} />);
    await screen.findByRole("heading", { name: story.title });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(storage, "getAll").mockImplementationOnce(async () => { await gate; return [story]; });
    view.rerender(<FitPracticeView storageFactory={() => storage} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete" })));
    expect(storage.peekAll("practice_records")).toEqual([]);
    await act(async () => release());
    expect(screen.queryByRole("heading", { name: story.title })).not.toBeInTheDocument();
    expect(screen.getByText("0 saved")).toBeInTheDocument();
    expect(storage.peekAll("practice_records")).toEqual([]);
  });
});

function makeStory(title: string, competency: "conflict" | "leadership", timestamp: string) {
  return createFitStoryRecord({ title, competency, situation: "A launch was delayed.", task: "Restore delivery.", action: "Aligned the owners.", result: "Delivery recovered.", reflection: "Align earlier." }, timestamp);
}

function fillStory(title: string) {
  fireEvent.change(screen.getByLabelText("Story title"), { target: { value: title } });
  for (const label of ["Situation", "Task", "Action", "Result", "Reflection"]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value: `${label} synthetic example` } });
  }
}
