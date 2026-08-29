import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { ExhibitQuestionFlow } from "@/features/exhibits/ExhibitQuestionFlow";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("ExhibitQuestionFlow", () => {
  it("validates and persists a numeric exhibit answer", async () => {
    const storage = new MemoryAppStorage();

    render(<ExhibitQuestionFlow datasets={exhibitDatasets} storageFactory={() => storage} />);
    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "$48.4M" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Correct. Attempt saved on this device.");
    expect(screen.getByTestId("exhibit-solution-panel")).toHaveTextContent("Correct answer: $48.4M");
    expect(storage.peekAll("exhibit_attempts")).toEqual([
      expect.objectContaining({
        exhibitId: "exhibit_retail_formats_001",
        isCorrect: true,
        questionId: "suburban_gross_profit",
        rawInput: "$48.4M",
        score: 100
      })
    ]);
  });

  it("grades and persists a strategic choice", async () => {
    const storage = new MemoryAppStorage();

    render(<ExhibitQuestionFlow datasets={exhibitDatasets} storageFactory={() => storage} />);
    fireEvent.change(screen.getByLabelText("Exhibit"), {
      target: { value: "exhibit_regional_productivity_003" }
    });
    fireEvent.change(screen.getByLabelText("Question"), { target: { value: "conversion_priority" } });
    fireEvent.click(screen.getByLabelText("West"));
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Correct. Attempt saved on this device.");
    expect(storage.peekAll("exhibit_attempts")).toEqual([
      expect.objectContaining({
        exhibitId: "exhibit_regional_productivity_003",
        isCorrect: true,
        questionId: "conversion_priority",
        rawInput: "west",
        score: 100
      })
    ]);
  });
});
