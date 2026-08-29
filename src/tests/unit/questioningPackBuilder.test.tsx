import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuestioningPackBuilder } from "@/features/question-packs/QuestioningPackBuilder";
import { validateQuestionPackPayload } from "@/features/question-packs/questionPack";

describe("QuestioningPackBuilder", () => {
  it("creates a valid version-three questioning pack for preview", () => {
    const onPreview = vi.fn();
    render(<QuestioningPackBuilder onPreview={onPreview} />);

    fireEvent.click(screen.getByText("Build a questioning pack"));
    fireEvent.change(screen.getByLabelText("Pack title"), { target: { value: "Retail Questions" } });
    fireEvent.change(screen.getByLabelText("Case title"), { target: { value: "Retail growth" } });
    fireEvent.change(screen.getByLabelText("Industry"), { target: { value: "Retail" } });
    fireEvent.change(screen.getByLabelText("Situation"), { target: { value: "A retailer is evaluating a new growth plan." } });
    fireEvent.change(screen.getByLabelText("Objective"), { target: { value: "Ask the questions needed to evaluate the plan." } });
    fireEvent.click(screen.getByRole("button", { name: "Preview Pack" }));

    expect(onPreview).toHaveBeenCalledOnce();
    const payload: unknown = onPreview.mock.calls[0]?.[0];
    const validation = validateQuestionPackPayload(payload);
    expect(validation.status, validation.status === "invalid" ? validation.errors.join("\n") : undefined).toBe("valid");
    expect(payload).toMatchObject({
      format: "math-drill-question-pack",
      id: "retail-questions",
      kind: "case_practice",
      schemaVersion: 3
    });
  });

  it("reports malformed concepts JSON before preview", () => {
    const onPreview = vi.fn();
    render(<QuestioningPackBuilder onPreview={onPreview} />);

    fireEvent.click(screen.getByText("Build a questioning pack"));
    fireEvent.change(screen.getByLabelText("Concepts JSON"), { target: { value: "not-json" } });
    fireEvent.submit(screen.getByRole("button", { name: "Preview Pack" }).closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent("Concepts and scoring themes must be valid JSON arrays.");
    expect(onPreview).not.toHaveBeenCalled();
  });
});
