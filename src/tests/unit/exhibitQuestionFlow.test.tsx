import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { ExhibitQuestionFlow } from "@/features/exhibits/ExhibitQuestionFlow";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("ExhibitQuestionFlow", () => {
  it("retries the same checked exhibit attempt after an uncertain save", async () => {
    const storage = new MemoryAppStorage();
    const originalPut = storage.put.bind(storage);
    const writes = vi.spyOn(storage, "put").mockImplementationOnce(async (store, record) => {
      await originalPut(store, record);
      throw new Error("Response lost after commit");
    });
    render(<ExhibitQuestionFlow datasets={exhibitDatasets} storageFactory={() => storage} />);
    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "$48384000" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    const retry = await screen.findByRole("button", { name: "Retry Save" });
    const original = structuredClone(storage.peekAll("exhibit_attempts"));
    fireEvent.click(retry);
    await screen.findByText("Correct. Attempt saved on this device.");
    expect(writes.mock.calls[1]).toEqual(writes.mock.calls[0]);
    expect(storage.peekAll("exhibit_attempts")).toEqual(original);
  });

  it.each(["dataset", "question", "answer", "clear"])("ignores a delayed save status after changing the %s", async (change) => {
    const storage = new MemoryAppStorage();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const originalPut = storage.put.bind(storage);
    vi.spyOn(storage, "put").mockImplementation(async (store, value) => { await pending; await originalPut(store, value); });
    const datasets = [{ ...exhibitDatasets[0], questions: [...exhibitDatasets[0].questions, { ...exhibitDatasets[0].questions[0], id: "second-question" }] }, ...exhibitDatasets.slice(1)];
    render(<ExhibitQuestionFlow datasets={datasets} storageFactory={() => storage} />);
    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "$48384000" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    if (change === "dataset") fireEvent.change(screen.getByLabelText("Exhibit"), { target: { value: exhibitDatasets[1].id } });
    if (change === "question") fireEvent.change(screen.getByLabelText("Question"), { target: { value: "second-question" } });
    if (change === "answer") fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "7" } });
    if (change === "clear") fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await act(async () => release());
    expect(screen.queryByText("Correct. Attempt saved on this device.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Answer")).toHaveValue(change === "answer" ? "7" : "");
    expect(storage.peekAll("exhibit_attempts")).toHaveLength(1);
    expect(storage.peekAll("exhibit_attempts")[0].exhibitId).toBe(exhibitDatasets[0].id);
  });

  it("validates and persists a numeric exhibit answer", async () => {
    const storage = new MemoryAppStorage();

    render(<ExhibitQuestionFlow datasets={exhibitDatasets} storageFactory={() => storage} />);
    const datasetContext = screen.getByTestId("exhibit-dataset-context");
    const datasetTitle = within(datasetContext).getByText(exhibitDatasets[0].title);

    expect(datasetContext).not.toHaveClass("overflow-hidden");
    expect(datasetTitle).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(datasetTitle).not.toHaveClass("truncate");

    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "$48.4M" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Correct. Attempt saved on this device.");
    expect(screen.getByTestId("exhibit-solution-panel")).toHaveTextContent("Correct answer: $48,384,000");
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
