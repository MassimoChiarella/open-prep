import { describe, expect, it } from "vitest";

import type { AnswerSpec } from "@/lib/domain";
import { validateAnswer } from "@/lib/validation/validateAnswer";

describe("validateAnswer", () => {
  it("accepts exact numeric matches and equivalent parsed formats", () => {
    const answer: AnswerSpec = { value: 1_000_000, unit: "currency" };

    expect(validateAnswer("$1M", answer)).toMatchObject({
      isCorrect: true,
      normalizedUserValue: 1_000_000,
      errorTypes: ["none"]
    });

    expect(validateAnswer("1000000", answer)).toMatchObject({
      isCorrect: true,
      normalizedUserValue: 1_000_000,
      errorTypes: ["none"]
    });
  });

  it("accepts answers within absolute tolerance", () => {
    const answer: AnswerSpec = {
      value: 97.2,
      tolerance: { type: "absolute", value: 2.8 }
    };

    expect(validateAnswer("100", answer).isCorrect).toBe(true);
    expect(validateAnswer("101", answer).isCorrect).toBe(false);
  });

  it("accepts answers within percentage tolerance", () => {
    const answer: AnswerSpec = {
      value: 200,
      tolerance: { type: "percentage", value: 0.05 }
    };

    expect(validateAnswer("190", answer).isCorrect).toBe(true);
    expect(validateAnswer("189.9", answer).isCorrect).toBe(false);
  });

  it("accepts answers within a range tolerance", () => {
    const answer: AnswerSpec = {
      value: 97.2,
      tolerance: { type: "range", min: 95, max: 100 }
    };

    expect(validateAnswer("95", answer).isCorrect).toBe(true);
    expect(validateAnswer("100", answer).isCorrect).toBe(true);
    expect(validateAnswer("94.9", answer).isCorrect).toBe(false);
  });

  it("classifies explicit unit errors", () => {
    const answer: AnswerSpec = { value: 0.15, unit: "percentage" };

    expect(validateAnswer("$0.15", answer)).toMatchObject({
      isCorrect: false,
      normalizedUserValue: 0.15,
      errorTypes: ["unit_error"]
    });
  });

  it("normalizes a selected percentage unit for a unitless numeric entry", () => {
    expect(validateAnswer("15", { value: 0.15, unit: "percentage" }, { selectedUnit: "percentage" })).toMatchObject({
      isCorrect: true,
      normalizedUserValue: 0.15
    });
  });

  it("accepts canonical and legacy percent-value answers without changing magnitude", () => {
    const canonical: AnswerSpec = { value: 0.2, unit: "percentage" };
    const legacy: AnswerSpec = { value: 20, unit: "none" };

    expect(validateAnswer("20%", canonical)).toMatchObject({ isCorrect: true, normalizedUserValue: 0.2 });
    expect(validateAnswer("20", canonical, { selectedUnit: "percentage" })).toMatchObject({ isCorrect: true, normalizedUserValue: 0.2 });
    expect(validateAnswer("20%", legacy)).toMatchObject({ isCorrect: true, normalizedUserValue: 20 });
    expect(validateAnswer("20", legacy)).toMatchObject({ isCorrect: true, normalizedUserValue: 20 });
    expect(validateAnswer("200%", canonical).isCorrect).toBe(false);
  });

  it("keeps typed and selected scale semantics coherent", () => {
    const answer: AnswerSpec = { value: 12, unit: "m" };

    expect(validateAnswer("12M", answer, { selectedUnit: "m" })).toMatchObject({
      isCorrect: true,
      normalizedUserValue: 12,
      unitStatus: "compatible"
    });
    expect(validateAnswer("12", answer, { selectedUnit: "m" })).toMatchObject({ isCorrect: true });
    expect(validateAnswer("0.012K", answer, { selectedUnit: "m" })).toMatchObject({
      isCorrect: false,
      unitStatus: "incompatible"
    });
  });

  it("reports explicit, omitted, and incompatible unit states independently from numeric accuracy", () => {
    const answer: AnswerSpec = { value: 1_000_000, unit: "currency" };

    expect(validateAnswer("$1M", answer).unitStatus).toBe("compatible");
    expect(validateAnswer("1M", answer).unitStatus).toBe("omitted");
    expect(validateAnswer("1M", answer, { selectedUnit: "percentage" }).unitStatus).toBe("incompatible");
    expect(validateAnswer("$1000000", answer, { selectedUnit: "percentage" })).toMatchObject({
      isCorrect: false,
      numericMatch: true,
      unitStatus: "incompatible"
    });
  });

  it("passes locale separator policy through validation", () => {
    expect(validateAnswer("1.234", { value: 1_234 }, { locale: "de" }).isCorrect).toBe(true);
    expect(validateAnswer("1.234", { value: 1_234 }, { locale: "en" }).isCorrect).toBe(false);
  });

  it("classifies magnitude errors", () => {
    const answer: AnswerSpec = { value: 120_000_000, unit: "currency" };

    expect(validateAnswer("$12M", answer)).toMatchObject({
      isCorrect: false,
      normalizedUserValue: 12_000_000,
      errorTypes: ["magnitude_error"]
    });
  });

  it("classifies percentage-point confusion from a deterministic alternate value", () => {
    const answer: AnswerSpec = {
      value: 0.25,
      unit: "percentage",
      errorChecks: {
        percentagePointValue: 0.05
      }
    };

    expect(validateAnswer("5%", answer)).toMatchObject({
      isCorrect: false,
      normalizedUserValue: 0.05,
      errorTypes: ["percentage_point_error"],
      feedbackMessage: "This looks like a percentage-point answer; the question asks for the relative percentage change."
    });
  });

  it("classifies rounding errors inside a broader near-miss tolerance", () => {
    const answer: AnswerSpec = {
      value: 97.2,
      tolerance: { type: "range", min: 95, max: 100 },
      errorChecks: {
        roundingTolerance: { type: "range", min: 94, max: 101 }
      }
    };

    expect(validateAnswer("94.5", answer)).toMatchObject({
      isCorrect: false,
      normalizedUserValue: 94.5,
      errorTypes: ["rounding_error"],
      feedbackMessage: "The method is close, but the rounding is outside the accepted range."
    });

    expect(validateAnswer("93.9", answer)).toMatchObject({
      isCorrect: false,
      errorTypes: ["arithmetic_error"]
    });
  });

  it("returns timeout and parse-error results deterministically", () => {
    const answer: AnswerSpec = { value: 42 };

    expect(validateAnswer("", answer)).toMatchObject({
      isCorrect: false,
      errorTypes: ["arithmetic_error"],
      feedbackMessage: "Enter a number."
    });

    expect(validateAnswer("", answer, { timedOut: true })).toMatchObject({
      isCorrect: false,
      errorTypes: ["timeout"]
    });
  });
});
