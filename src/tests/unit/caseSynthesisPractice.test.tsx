import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { synthesisPrompts } from "@/data/casePractice/synthesisPrompts";
import { SynthesisPractice } from "@/features/case-practice/synthesis/SynthesisPractice";
import { SYNTHESIS_DIMENSIONS } from "@/features/case-practice/synthesis/synthesisScoring";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("SynthesisPractice", () => {
  it("scores, reveals the model close, and saves a synthesis attempt", async () => {
    const storage = new MemoryAppStorage();
    const prompt = synthesisPrompts[0];
    render(<SynthesisPractice prompts={[prompt]} storageFactory={() => storage} />);

    for (const dimension of SYNTHESIS_DIMENSIONS) {
      const correctOption = prompt.options[dimension].find(
        ({ id }) => id === prompt.correctResponse[dimension]
      );
      fireEvent.click(screen.getByRole("radio", { name: correctOption?.label }));
    }

    fireEvent.click(screen.getByRole("button", { name: "Score Response" }));

    expect(await screen.findByText("Score 4/4 saved on this device.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Model close" })).toBeInTheDocument();
    expect(screen.getByText(prompt.modelClose)).toBeInTheDocument();
    expect(storage.peekAll("practice_records")).toEqual([
      expect.objectContaining({
        itemId: prompt.id,
        kind: "attempt",
        maxScore: 4,
        module: "synthesis",
        score: 4
      })
    ]);
  });
});
