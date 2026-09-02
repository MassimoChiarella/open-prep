import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { questioningPrompts } from "@/data/casePractice/questioningPrompts";
import { QuestioningPractice } from "@/features/case-practice/questioning/QuestioningPractice";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("QuestioningPractice", () => {
  it("explains incomplete fragments and only enables scoring for complete questions", () => {
    const prompt = questioningPrompts[0];
    render(<QuestioningPractice prompts={[prompt]} storageFactory={() => new MemoryAppStorage()} />);

    const inputs = screen.getAllByPlaceholderText("Type a question you would ask the interviewer");
    fireEvent.change(inputs[0], { target: { value: "price" } });
    fireEvent.change(inputs[1], { target: { value: "Which ingredient costs increased?" } });
    fireEvent.change(inputs[2], { target: { value: "Did shipping costs per order rise?" } });

    expect(inputs[0]).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Write a complete question with enough detail to show what relationship or evidence you want to test.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Score Questions" })).toBeDisabled();

    fireEvent.change(inputs[0], { target: { value: "Did revenue change because of price or volume?" } });

    expect(inputs[0]).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByRole("button", { name: "Score Questions" })).toBeEnabled();
  });

  it("scores typed questions and saves the local attempt without requiring ranking", async () => {
    const storage = new MemoryAppStorage();
    const prompt = questioningPrompts[0];
    render(<QuestioningPractice prompts={[prompt]} storageFactory={() => storage} />);

    expect(screen.getByLabelText("Practice case")).toHaveAttribute("dir", "auto");
    expect(screen.getByRole("heading", { name: prompt.title })).toHaveAttribute("lang", "en");
    expect(screen.getByText(prompt.situation)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(screen.getByText(prompt.objective)).toHaveClass("[overflow-wrap:anywhere]");
    const inputs = screen.getAllByPlaceholderText("Type a question you would ask the interviewer");
    expect(inputs[0]).toHaveAttribute("dir", "auto");
    fireEvent.change(inputs[0], { target: { value: "Was revenue growth driven by higher prices or more orders?" } });
    fireEvent.change(inputs[1], { target: { value: "Which food and ingredient costs increased?" } });
    fireEvent.change(inputs[2], { target: { value: "Did delivery and warehouse costs per order rise?" } });
    fireEvent.click(screen.getByRole("button", { name: "Score Questions" }));

    expect(await screen.findByRole("heading", { name: "Question review" })).toBeInTheDocument();
    expect(screen.getByText("Not scored")).toBeInTheDocument();
    expect(screen.getByText(prompt.intents[0].referenceQuestions[0])).toHaveClass(
      "min-w-0",
      "[overflow-wrap:anywhere]"
    );
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

    expect(screen.getByRole("button", { name: "Move question 1 up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move question 3 down" })).toBeDisabled();
    for (const button of screen.getAllByRole("button", { name: /^Move question \d+ (up|down)$/ })) {
      expect(button).toHaveClass("h-11", "min-w-11");
      expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      expect(button.querySelector("svg")).toHaveAttribute("focusable", "false");
    }

    const inputs = screen.getAllByPlaceholderText("Type a question you would ask the interviewer");
    fireEvent.change(inputs[0], { target: { value: "First question" } });
    fireEvent.change(inputs[1], { target: { value: "Second question" } });
    fireEvent.click(screen.getByRole("button", { name: "Move question 2 up" }));

    expect(screen.getAllByPlaceholderText("Type a question you would ask the interviewer")[0]).toHaveValue("Second question");

    fireEvent.click(screen.getByRole("button", { name: "Move question 1 down" }));
    expect(screen.getAllByPlaceholderText("Type a question you would ask the interviewer")[0]).toHaveValue("First question");
  });
});
