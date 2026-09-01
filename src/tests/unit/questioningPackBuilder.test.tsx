import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuestioningPackBuilder } from "@/features/question-packs/QuestioningPackBuilder";
import { validateQuestionPackPayload } from "@/features/question-packs/questionPack";

afterEach(() => vi.restoreAllMocks());

describe("QuestioningPackBuilder", () => {
  it("creates a valid version-three questioning pack for preview", () => {
    const onPreview = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<QuestioningPackBuilder onPreview={onPreview} />);

    fireEvent.click(screen.getByText("Build a questioning pack"));
    expect(screen.getByLabelText("Pack title")).toHaveAttribute("dir", "auto");
    expect(screen.getByLabelText("Situation")).toHaveAttribute("dir", "auto");
    expect(screen.getByLabelText("Concepts JSON")).toHaveAttribute("dir", "ltr");
    fireEvent.change(screen.getByLabelText("Pack title"), { target: { value: "Retail Questions" } });
    fireEvent.change(screen.getByLabelText("Case title"), { target: { value: "Retail growth" } });
    fireEvent.change(screen.getByLabelText("Industry"), { target: { value: "Retail" } });
    fireEvent.change(screen.getByLabelText("Content language"), { target: { value: "ar" } });
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
      questioningPrompts: [expect.objectContaining({ language: "ar" })],
      schemaVersion: 3
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("associates malformed concepts JSON with its field and protects invalid work", () => {
    const onPreview = vi.fn();
    render(<QuestioningPackBuilder onPreview={onPreview} />);

    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
    fireEvent.click(screen.getByText("Build a questioning pack"));
    const concepts = screen.getByLabelText("Concepts JSON");
    fireEvent.change(concepts, { target: { value: "not-json" } });
    fireEvent.submit(screen.getByRole("button", { name: "Preview Pack" }).closest("form")!);

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Concepts must be valid JSON.");
    expect(concepts).toHaveAttribute("aria-invalid", "true");
    expect(concepts.getAttribute("aria-describedby")).toContain(error.id);
    expect(concepts).toHaveFocus();
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
    expect(onPreview).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect((concepts as HTMLTextAreaElement).value).toContain('"objective"');
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });

  it("distinguishes a non-array scoring theme value from malformed JSON", () => {
    const onPreview = vi.fn();
    render(<QuestioningPackBuilder onPreview={onPreview} />);

    const scoringThemes = screen.getByLabelText("Scoring themes JSON");
    fireEvent.change(scoringThemes, { target: { value: "{}" } });
    fireEvent.submit(screen.getByRole("button", { name: "Preview Pack" }).closest("form")!);

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Scoring themes must be a JSON array enclosed in square brackets.");
    expect(scoringThemes.getAttribute("aria-describedby")).toContain(error.id);
    expect(scoringThemes).toHaveFocus();
    expect(onPreview).not.toHaveBeenCalled();
  });

  it("reports an actionable question-count relationship error", () => {
    const onPreview = vi.fn();
    render(<QuestioningPackBuilder onPreview={onPreview} />);

    const maximum = screen.getByLabelText("Maximum questions");
    fireEvent.change(maximum, { target: { value: "2" } });
    fireEvent.submit(screen.getByRole("button", { name: "Preview Pack" }).closest("form")!);

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Maximum questions must be between the minimum and 12.");
    expect(maximum).toHaveAttribute("aria-invalid", "true");
    expect(maximum).toHaveAttribute("aria-describedby", error.id);
    expect(maximum).toHaveFocus();
    expect(onPreview).not.toHaveBeenCalled();
  });
});

function dispatchBeforeUnload(): Event {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}
