import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { questioningPrompts } from "@/data/casePractice/questioningPrompts";
import { QuestioningPractice } from "@/features/case-practice/questioning/QuestioningPractice";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("QuestioningPractice", () => {
  it("scores typed questions and saves the local attempt without requiring ranking", async () => {
    const storage = new MemoryAppStorage();
    const prompt = questioningPrompts[0];
    render(<QuestioningPractice prompts={[prompt]} storageFactory={() => storage} />);

    expect(screen.getByLabelText("Practice case")).toHaveAttribute("dir", "auto");
    expect(screen.getByRole("heading", { name: prompt.title })).toHaveAttribute("lang", "en");
    const inputs = screen.getAllByPlaceholderText("Type a question you would ask the interviewer");
    expect(inputs[0]).toHaveAttribute("dir", "auto");
    fireEvent.change(inputs[0], { target: { value: "Was revenue growth driven by higher prices or more orders?" } });
    fireEvent.change(inputs[1], { target: { value: "Which food and ingredient costs increased?" } });
    fireEvent.change(inputs[2], { target: { value: "Did delivery and warehouse costs per order rise?" } });
    fireEvent.click(screen.getByRole("button", { name: "Score Questions" }));

    expect(await screen.findByRole("heading", { name: "Question review" })).toBeInTheDocument();
    expect(screen.getByText("Not scored")).toBeInTheDocument();
    await waitFor(() => expect(storage.peekAll("practice_records")).toEqual([
      expect.objectContaining({
        itemId: prompt.id,
        kind: "attempt",
        maxScore: 85,
        module: "questioning"
      })
    ]));
  });

  it("makes ranking optional and reorders questions with accessible controls", () => {
    const prompt = questioningPrompts[0];
    render(<QuestioningPractice prompts={[prompt]} storageFactory={() => new MemoryAppStorage()} />);

    expect(screen.queryByRole("button", { name: "Move question 2 up" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /Rank my questions/ }));

    const inputs = screen.getAllByPlaceholderText("Type a question you would ask the interviewer");
    fireEvent.change(inputs[0], { target: { value: "First question" } });
    fireEvent.change(inputs[1], { target: { value: "Second question" } });
    fireEvent.click(screen.getByRole("button", { name: "Move question 2 up" }));

    expect(screen.getAllByPlaceholderText("Type a question you would ask the interviewer")[0]).toHaveValue("Second question");
  });
});
