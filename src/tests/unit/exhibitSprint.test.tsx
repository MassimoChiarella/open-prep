import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { ExhibitSprint } from "@/features/exhibits/ExhibitSprint";
import { buildExhibitSprintItems } from "@/features/exhibits/exhibitSprintSelection";
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

  it("runs a timed three-question sprint and shows a scored summary", async () => {
    const storage = new MemoryAppStorage();

    render(
      <ExhibitSprint
        backHref="/exhibits?pack=custom-exhibits"
        datasets={exhibitDatasets}
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

    expect(prompt.compareDocumentPosition(timer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(timer.compareDocumentPosition(exhibit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("exhibit-sprint-response")).toHaveClass("lg:sticky");

    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "45.8%" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    expect(await screen.findByTestId("exhibit-sprint-feedback")).toHaveTextContent("Correct.");
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

    expect(screen.getByTestId("exhibit-sprint-summary")).toHaveTextContent("3 of 3 correct");
    expect(screen.getByRole("link", { name: "Return to Exhibit Practice" })).toHaveAttribute(
      "href",
      "/exhibits?pack=custom-exhibits"
    );
    expect(await storage.getAll("exhibit_attempts")).toHaveLength(3);
  });
});
