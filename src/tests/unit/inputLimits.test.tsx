import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NumericAnswerInput } from "@/components/NumericAnswerInput";
import { submitAnswer } from "@/features/drills/answerSubmission";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { evaluateMarketSizingDraft, evaluateMarketSizingFinalAnswer } from "@/features/market-sizing/marketSizingEvaluation";
import { marketSizingTemplates } from "@/data/marketSizing/marketSizingTemplates";
import { assertNumericInput, assertPersistableRecord, numericInputLimitMessage } from "@/lib/validation/inputLimits";

describe("exportable input boundaries", () => {
  it.each([4095, 4096])("accepts a new %i-code-unit numeric submission", (length) => {
    const created = createDrillSession({ seed: "input-boundary", settings: { questionCount: 1, tags: ["addition"] } });
    const submitted = submitAnswer({ session: created.session, question: created.questions[0], rawInput: "0".repeat(length), timeTakenSeconds: 1 });
    expect(submitted.response.rawInput).toHaveLength(length);
  });

  it("rejects an oversized submission without recording an incorrect answer", () => {
    const created = createDrillSession({ seed: "input-boundary", settings: { questionCount: 1, tags: ["addition"] } });
    expect(() => submitAnswer({ session: created.session, question: created.questions[0], rawInput: "0".repeat(4097), timeTakenSeconds: 1 })).toThrow(numericInputLimitMessage);
    expect(created.session.responses).toEqual([]);
    expect(() => assertNumericInput("😀".repeat(2049))).toThrow(numericInputLimitMessage);
  });

  it("retains oversized pasted text for correction and clears its accessible error after editing", () => {
    function Input() {
      const [value, setValue] = useState("");
      return <NumericAnswerInput aria-label="Answer" value={value} onChange={(event) => setValue(event.currentTarget.value)} />;
    }
    render(<Input />);
    const input = screen.getByRole("textbox", { name: "Answer" });
    fireEvent.change(input, { target: { value: "0".repeat(4097) } });
    expect(input).toHaveValue("0".repeat(4097));
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription(numericInputLimitMessage);
    fireEvent.change(input, { target: { value: "12.5" } });
    expect(input).toBeValid();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps sizing assumptions and final answers editable instead of grading oversized values", () => {
    const template = marketSizingTemplates[0];
    expect(evaluateMarketSizingFinalAnswer(template, 1, "0".repeat(4097))).toMatchObject({ status: "invalid", message: numericInputLimitMessage });
    const result = evaluateMarketSizingDraft({ template, stepValues: { population: "0".repeat(4097) } });
    expect(result.assumptionEvaluations.find((step) => step.stepId === "population")).toMatchObject({ status: "invalid", message: numericInputLimitMessage });
    expect(result.calculatedValue).toBeUndefined();
  });

  it.each([99999, 100000])("preserves the legacy %i-code-unit string envelope", (length) => {
    expect(() => assertPersistableRecord({ rawInput: "0".repeat(length), normalizedValue: undefined, value: 1e308 })).not.toThrow();
  });

  it("rejects direct non-finite and oversized stored values before JSON erases evidence", () => {
    expect(() => assertPersistableRecord({ response: { rawInput: "0".repeat(100001) } })).toThrow("100,000");
    for (const value of [NaN, Infinity, -Infinity]) expect(() => assertPersistableRecord({ responses: [{ value }] })).toThrow("finite");
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => assertPersistableRecord(cyclic)).toThrow("circular");
  });
});
