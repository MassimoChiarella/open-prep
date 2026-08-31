import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { ExhibitSprint } from "@/features/exhibits/ExhibitSprint";
import { buildExhibitSprintItems } from "@/features/exhibits/exhibitSprintSelection";
import { nextLocalPracticeNonce } from "@/lib/localPracticeNonce";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("ExhibitSprint", () => {
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
  }, 15_000);
});
