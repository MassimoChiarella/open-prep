import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuestionPackBuilder } from "@/features/question-packs/QuestionPackBuilder";

afterEach(() => vi.restoreAllMocks());

describe("QuestionPackBuilder", () => {
  it("emits a raw fixed-numeric payload for preview", () => {
    const onPreview = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<QuestionPackBuilder onPreview={onPreview} />);

    const builder = screen.getByTestId("question-pack-builder");
    expect(builder).not.toHaveAttribute("open");

    fireEvent.click(screen.getByText("Build a question pack"));
    expect(screen.getByLabelText("Pack title")).toHaveAttribute("dir", "auto");
    expect(screen.getByLabelText("Question 1 prompt")).toHaveAttribute("dir", "auto");
    expect(screen.getByLabelText("Question 1 explanation summary")).toHaveAttribute("dir", "auto");
    expect(screen.getByLabelText("Question 1 explanation steps")).toHaveAttribute("dir", "auto");
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
    expect(fetchSpy).not.toHaveBeenCalled();
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

  it("duplicates and reorders questions without changing stable IDs", () => {
    render(<QuestionPackBuilder onPreview={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Question" }));
    fireEvent.click(screen.getByRole("button", { name: "Duplicate Question 1" }));

    expect(questionIds()).toEqual(["question-001", "question-003", "question-002"]);

    fireEvent.click(screen.getByRole("button", { name: "Move Question 3 up" }));

    expect(questionIds()).toEqual(["question-001", "question-002", "question-003"]);
    expect(screen.getByRole("button", { name: "Move Question 1 up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Question 3 down" })).toBeDisabled();
  });

  it("associates actionable validation errors with the affected field", () => {
    const onPreview = vi.fn();
    render(<QuestionPackBuilder onPreview={onPreview} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Question" }));
    const duplicateId = screen.getByLabelText("Question 2 ID");
    fireEvent.change(duplicateId, { target: { value: "question-001" } });
    fireEvent.submit(screen.getByRole("button", { name: "Preview Pack" }).closest("form")!);

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Use a unique question ID.");
    expect(duplicateId).toHaveAttribute("aria-invalid", "true");
    expect(duplicateId).toHaveAttribute("aria-describedby", error.id);
    expect(onPreview).not.toHaveBeenCalled();
  });

  it("guards dirty work on unload and clears the guard after discard", () => {
    render(<QuestionPackBuilder onPreview={vi.fn()} />);

    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Pack title"), { target: { value: "Unsaved pack" } });
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(screen.getByLabelText("Pack title")).toHaveValue("");
    expect(screen.getByLabelText("Pack ID")).toHaveValue("my-question-pack");
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });

  it("confirms only dirty same-origin navigation", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<QuestionPackBuilder onPreview={vi.fn()} />);
    const link = document.createElement("a");
    const reachedLink = vi.fn((event: MouseEvent) => event.preventDefault());
    link.href = "/progress";
    link.addEventListener("click", reachedLink);
    document.body.append(link);

    link.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, cancelable: true }));
    expect(confirm).not.toHaveBeenCalled();
    expect(reachedLink).toHaveBeenCalledOnce();

    reachedLink.mockClear();
    fireEvent.change(screen.getByLabelText("Pack title"), { target: { value: "Unsaved pack" } });
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, cancelable: true }));
    expect(confirm).toHaveBeenCalledWith("Leave this builder? Your unsaved changes will be lost.");
    expect(reachedLink).not.toHaveBeenCalled();

    link.remove();
  });
});

function dispatchBeforeUnload(): Event {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

function questionIds(): string[] {
  return screen.getAllByLabelText(/Question \d+ ID/).map((input) => (input as HTMLInputElement).value);
}
