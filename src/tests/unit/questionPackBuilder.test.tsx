import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuestionPackBuilder } from "@/features/question-packs/QuestionPackBuilder";

describe("QuestionPackBuilder", () => {
  it("emits a raw fixed-numeric payload for preview", () => {
    const onPreview = vi.fn();
    render(<QuestionPackBuilder onPreview={onPreview} />);

    const builder = screen.getByTestId("question-pack-builder");
    expect(builder).not.toHaveAttribute("open");

    fireEvent.click(screen.getByText("Build a question pack"));
    fireEvent.change(screen.getByLabelText("Pack title"), { target: { value: "Company Practice" } });
    fireEvent.change(screen.getByLabelText("Version"), { target: { value: "2.1" } });
    fireEvent.change(screen.getByLabelText("Pack ID"), { target: { value: "company-practice" } });
    fireEvent.change(screen.getByLabelText("Publisher (optional)"), { target: { value: "Example School" } });
    fireEvent.change(screen.getByLabelText("License (optional)"), { target: { value: "CC-BY-4.0" } });
    fireEvent.change(screen.getByLabelText("Description (optional)"), {
      target: { value: "Custom margin practice." }
    });

    fireEvent.change(screen.getByLabelText("Question 1 prompt"), {
      target: { value: "Revenue is $12M and profit is $3M. What is margin?" }
    });
    fireEvent.change(screen.getByLabelText("Question 1 answer value"), { target: { value: "0.25" } });
    fireEvent.change(screen.getByLabelText("Question 1 unit"), { target: { value: "percentage" } });
    fireEvent.change(screen.getByLabelText("Question 1 difficulty"), { target: { value: "intermediate" } });
    fireEvent.change(screen.getByLabelText("Question 1 category"), { target: { value: "business_math" } });
    fireEvent.change(screen.getByLabelText("Question 1 primary tag"), { target: { value: "margin" } });
    fireEvent.change(screen.getByLabelText("Question 1 expected time"), { target: { value: "45" } });
    fireEvent.change(screen.getByLabelText("Question 1 rounding instruction"), {
      target: { value: "nearest_0_1" }
    });
    fireEvent.change(screen.getByLabelText("Question 1 tolerance"), { target: { value: "absolute" } });
    fireEvent.change(screen.getByLabelText("Question 1 tolerance value"), { target: { value: "0.001" } });
    fireEvent.change(screen.getByLabelText("Question 1 explanation summary"), {
      target: { value: "Divide profit by revenue." }
    });
    fireEvent.change(screen.getByLabelText("Question 1 explanation steps"), {
      target: { value: "Divide 3 by 12.\n\nConvert 0.25 to 25%." }
    });

    fireEvent.click(screen.getByRole("button", { name: "Preview Pack" }));

    expect(onPreview).toHaveBeenCalledWith({
      format: "math-drill-question-pack",
      schemaVersion: 2,
      kind: "fixed_numeric",
      id: "company-practice",
      packVersion: "2.1",
      title: "Company Practice",
      description: "Custom margin practice.",
      publisher: "Example School",
      license: "CC-BY-4.0",
      questions: [
        {
          id: "question-001",
          type: "numeric",
          category: "business_math",
          tags: ["margin"],
          difficulty: "intermediate",
          prompt: "Revenue is $12M and profit is $3M. What is margin?",
          answer: {
            value: 0.25,
            unit: "percentage",
            roundingRule: "nearest_0_1",
            tolerance: { type: "absolute", value: 0.001 }
          },
          explanation: {
            short: "Divide profit by revenue.",
            steps: ["Divide 3 by 12.", "Convert 0.25 to 25%."]
          },
          expectedTimeSeconds: 45
        }
      ]
    });
  });

  it("adds and removes questions without reusing generated IDs", () => {
    render(<QuestionPackBuilder onPreview={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Question" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Question" }));

    expect(screen.getAllByTestId("builder-question")).toHaveLength(3);
    expect(screen.getByLabelText("Question 2 ID")).toHaveValue("question-002");
    expect(screen.getByLabelText("Question 3 ID")).toHaveValue("question-003");

    fireEvent.click(screen.getByRole("button", { name: "Remove Question 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Question" }));

    expect(screen.getAllByTestId("builder-question")).toHaveLength(3);
    expect(screen.getByLabelText("Question 2 ID")).toHaveValue("question-003");
    expect(screen.getByLabelText("Question 3 ID")).toHaveValue("question-004");
  });
});
