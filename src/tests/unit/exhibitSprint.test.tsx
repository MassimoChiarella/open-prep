import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { ExhibitSprint } from "@/features/exhibits/ExhibitSprint";
import { buildExhibitSprintItems } from "@/features/exhibits/exhibitSprintSelection";
import { timingAccommodationPreferenceKey } from "@/features/timing/timingAccommodationPreference";
import { nextLocalPracticeNonce } from "@/lib/localPracticeNonce";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("ExhibitSprint", () => {
  beforeEach(() => window.localStorage.clear());

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("selects three to five diverse questions deterministically", () => {
    expect(buildExhibitSprintItems(exhibitDatasets, 2)).toHaveLength(3);
    expect(buildExhibitSprintItems(exhibitDatasets, 8)).toHaveLength(5);
    expect(buildExhibitSprintItems(exhibitDatasets, Number.NaN)).toHaveLength(3);
    expect(buildExhibitSprintItems(exhibitDatasets, 5).map((item) => item.dataset.visualization.type)).toEqual([
      "waterfall",
      "scatterplot",
      "stacked_bar",
      "index_chart",
      "table"
    ]);
  });

  it("rotates consecutive local sprints while preserving explicit-seed reproducibility", () => {
    globalThis.sessionStorage.removeItem("consulting-practice:exhibit-sprint-test:nonce");
    const firstSeed = nextLocalPracticeNonce("exhibit-sprint-test");
    const secondSeed = nextLocalPracticeNonce("exhibit-sprint-test");
    const first = buildExhibitSprintItems(exhibitDatasets, 5, firstSeed);
    const second = buildExhibitSprintItems(exhibitDatasets, 5, secondSeed);

    expect(first.map((item) => item.question.id)).not.toEqual(second.map((item) => item.question.id));
    expect(buildExhibitSprintItems(exhibitDatasets, 5, firstSeed)).toEqual(first);
    expect(new Set(first.map((item) => `${item.dataset.id}:${item.question.id}`)).size).toBe(5);
    expect(first.every((item) => item.dataset.questions.includes(item.question))).toBe(true);
  });

  it("runs a timed three-question sprint and shows a scored summary", async () => {
    const storage = new MemoryAppStorage();

    render(
      <ExhibitSprint
        backHref="/exhibits?pack=custom-exhibits"
        datasets={exhibitDatasets}
        seed={0}
        storageFactory={() => storage}
      />
    );

    fireEvent.click(screen.getByLabelText("3"));
    fireEvent.click(screen.getByRole("button", { name: "Start Exhibit Sprint" }));

    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("1:00 remaining");

    const prompt = screen.getByTestId("exhibit-sprint-prompt");
    const timer = screen.getByRole("timer");
    const exhibit = screen.getByTestId("exhibit-sprint-exhibit");

    expect(within(prompt).getByRole("heading")).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(prompt.compareDocumentPosition(timer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(timer.compareDocumentPosition(exhibit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("exhibit-sprint-response")).toHaveClass("lg:sticky");

    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "45.8%" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    const feedback = await screen.findByTestId("exhibit-sprint-feedback");
    expect(feedback).toHaveTextContent("Correct.");
    expect(feedback).toHaveClass("min-w-0", "grid-cols-[minmax(0,1fr)]", "[overflow-wrap:anywhere]");
    await waitFor(() => expect(screen.getByRole("button", { name: "Next Question" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Next Question" }));

    fireEvent.click(screen.getByLabelText("West"));
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Next Question" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Next Question" }));

    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "110000" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "View Summary" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "View Summary" }));

    const summary = screen.getByTestId("exhibit-sprint-summary");
    expect(summary).toHaveTextContent("3 of 3 correct");
    expect(within(summary).getAllByRole("listitem")[0]).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(screen.getByRole("link", { name: "Return to Exhibit Practice" })).toHaveAttribute(
      "href",
      "/exhibits?pack=custom-exhibits"
    );
    expect(await storage.getAll("exhibit_attempts")).toHaveLength(3);
    expect(screen.getByTestId("exhibit-sprint-summary-timing")).toHaveTextContent(
      "Timing accommodation: Standard time"
    );
  }, 15_000);

  it.each([
    ["standard", 60, "1:00 remaining"],
    ["time_and_a_half", 90, "1:30 remaining"],
    ["double_time", 120, "2:00 remaining"]
  ] as const)("expires %s timing at its exact adjusted deadline", async (accommodation, limit, label) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T12:00:00.000Z"));
    const storage = new MemoryAppStorage();

    render(<ExhibitSprint datasets={exhibitDatasets} seed={0} storageFactory={() => storage} />);
    fireEvent.click(screen.getByLabelText("3"));
    fireEvent.change(screen.getByLabelText("Timing choice"), {
      target: { value: accommodation }
    });
    fireEvent.click(screen.getByRole("button", { name: "Start Exhibit Sprint" }));

    expect(screen.getByRole("timer")).toHaveTextContent(label);
    await act(async () => vi.advanceTimersByTimeAsync(limit * 1_000 - 1));
    expect(screen.queryByTestId("exhibit-sprint-feedback")).not.toBeInTheDocument();

    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(screen.getByTestId("exhibit-sprint-feedback")).toHaveTextContent("Time expired");
    expect((await storage.getAll("exhibit_attempts"))[0]?.timingAccommodation).toBe(accommodation);
  });

  it("keeps Untimed Practice active until the learner submits an answer", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T12:00:00.000Z"));
    const storage = new MemoryAppStorage();

    render(<ExhibitSprint datasets={exhibitDatasets} seed={0} storageFactory={() => storage} />);
    fireEvent.click(screen.getByLabelText("3"));
    fireEvent.change(screen.getByLabelText("Timing choice"), { target: { value: "untimed" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Exhibit Sprint" }));

    expect(screen.getByRole("timer")).toHaveTextContent("No automatic expiry");
    expect(screen.getByTestId("exhibit-sprint-active-timing")).toHaveTextContent(
      "Untimed practice. No automatic timeout; the standard limit is 1 min."
    );
    await act(async () => vi.advanceTimersByTimeAsync(5 * 60 * 1_000));
    expect(screen.queryByTestId("exhibit-sprint-feedback")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "45.8%" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    expect(screen.getByTestId("exhibit-sprint-feedback")).toHaveTextContent("Correct.");
    await act(async () => undefined);
    expect((await storage.getAll("exhibit_attempts"))[0]?.timingAccommodation).toBe("untimed");
  });

  it("loads and writes the preference only through an explicit Remember launch", async () => {
    window.localStorage.setItem(timingAccommodationPreferenceKey, "time_and_a_half");
    const first = render(<ExhibitSprint datasets={exhibitDatasets} seed={0} />);

    await waitFor(() => expect(screen.getByLabelText("Timing choice")).toHaveValue("time_and_a_half"));
    fireEvent.change(screen.getByLabelText("Timing choice"), { target: { value: "double_time" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Exhibit Sprint" }));
    expect(window.localStorage.getItem(timingAccommodationPreferenceKey)).toBe("time_and_a_half");

    first.unmount();
    render(<ExhibitSprint datasets={exhibitDatasets} seed={0} />);
    await waitFor(() => expect(screen.getByLabelText("Timing choice")).toHaveValue("time_and_a_half"));
    fireEvent.change(screen.getByLabelText("Timing choice"), { target: { value: "double_time" } });
    fireEvent.click(screen.getByRole("checkbox", {
      name: "Remember this timing choice on this device"
    }));
    fireEvent.click(screen.getByRole("button", { name: "Start Exhibit Sprint" }));

    expect(window.localStorage.getItem(timingAccommodationPreferenceKey)).toBe("double_time");
  });

  it("refreshes an untouched setup choice when another tab changes the remembered preference", async () => {
    render(<ExhibitSprint datasets={exhibitDatasets} seed={0} />);
    expect(screen.getByLabelText("Timing choice")).toHaveValue("standard");

    window.localStorage.setItem(timingAccommodationPreferenceKey, "time_and_a_half");
    window.dispatchEvent(new StorageEvent("storage", {
      key: timingAccommodationPreferenceKey,
      newValue: "time_and_a_half"
    }));

    await waitFor(() => expect(screen.getByLabelText("Timing choice")).toHaveValue("time_and_a_half"));
  });

  it("locks the active policy and accepts an answer submitted in the final millisecond", async () => {
    vi.useFakeTimers();
    const startedAt = new Date("2026-06-02T12:00:00.000Z");
    vi.setSystemTime(startedAt);
    const storage = new MemoryAppStorage();

    render(<ExhibitSprint datasets={exhibitDatasets} seed={0} storageFactory={() => storage} />);
    fireEvent.click(screen.getByLabelText("3"));
    fireEvent.change(screen.getByLabelText("Timing choice"), { target: { value: "double_time" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Exhibit Sprint" }));

    window.localStorage.setItem(timingAccommodationPreferenceKey, "untimed");
    window.dispatchEvent(new StorageEvent("storage", {
      key: timingAccommodationPreferenceKey,
      newValue: "untimed"
    }));
    expect(screen.getByTestId("exhibit-sprint-active-timing")).toHaveTextContent(
      "Double time. Your limit is 2 min; the standard limit is 1 min."
    );

    await act(async () => vi.advanceTimersByTimeAsync(119_999));
    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "45.8%" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    await act(async () => vi.advanceTimersByTimeAsync(1));

    expect(screen.getByTestId("exhibit-sprint-feedback")).toHaveTextContent("Correct.");
    expect(screen.getByTestId("exhibit-sprint-feedback")).not.toHaveTextContent("Time expired");
    expect(await storage.getAll("exhibit_attempts")).toHaveLength(1);
    expect((await storage.getAll("exhibit_attempts"))[0]?.timingAccommodation).toBe("double_time");
  });
});
