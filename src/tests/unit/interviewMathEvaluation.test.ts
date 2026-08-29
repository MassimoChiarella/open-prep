import { describe, expect, it } from "vitest";

import { caseStyleQuestionTemplates } from "@/data/questionTemplates/caseStyleTemplates";
import { evaluateInterviewMath } from "@/features/drills/interviewMathEvaluation";
import { generateQuestionFromTemplate } from "@/features/questions/questionGenerator";
import { createSeededRandom } from "@/lib/random/seededRandom";

describe("evaluateInterviewMath", () => {
  it("awards full credit for a correct setup, calculation, unit, and interpretation", () => {
    const question = caseQuestion();
    const result = evaluateInterviewMath({
      equationOptionId: "equation-correct",
      interpretationOptionId: "interpretation-correct",
      question,
      rawInput: String(question.answer.value),
      selectedUnit: "m"
    });

    expect(result.validation).toMatchObject({
      errorTypes: ["none"],
      isCorrect: true
    });
    expect(result.interviewMath.score).toEqual({
      formulaSelection: 20,
      equationSetup: 20,
      calculationAccuracy: 30,
      unitsMagnitude: 15,
      interpretationSelection: 15,
      total: 100
    });
  });

  it("awards formula credit when the selected equation has a setup mistake", () => {
    const question = caseQuestion();
    const result = evaluateInterviewMath({
      equationOptionId: "equation-setup",
      question,
      rawInput: String(question.answer.value),
      selectedUnit: "m"
    });

    expect(result.validation).toMatchObject({
      errorTypes: ["setup_error"],
      isCorrect: false
    });
    expect(result.interviewMath.score).toMatchObject({
      formulaSelection: 20,
      equationSetup: 0,
      calculationAccuracy: 30,
      unitsMagnitude: 15,
      interpretationSelection: 0,
      total: 65
    });
  });

  it("classifies magnitude, unit, and attempted interpretation errors", () => {
    const question = caseQuestion();
    const result = evaluateInterviewMath({
      equationOptionId: "equation-correct",
      interpretationOptionId: "interpretation-one",
      question,
      rawInput: String(question.answer.value * 1_000),
      selectedUnit: "k"
    });

    expect(result.validation.errorTypes).toEqual([
      "magnitude_error",
      "unit_error",
      "interpretation_error"
    ]);
    expect(result.interviewMath.score.total).toBe(40);
  });

  it("keeps interpretation optional while reserving its points", () => {
    const question = caseQuestion();
    const result = evaluateInterviewMath({
      equationOptionId: "equation-correct",
      question,
      rawInput: String(question.answer.value),
      selectedUnit: "m"
    });

    expect(result.validation).toMatchObject({
      errorTypes: ["none"],
      isCorrect: true
    });
    expect(result.interviewMath.score.total).toBe(85);
    expect(result.validation.feedbackMessage).toContain("optional setup or interpretation");
  });

  it("allows equation setup to be optional without classifying an omitted setup as an error", () => {
    const question = caseQuestion();
    const result = evaluateInterviewMath({
      question,
      rawInput: String(question.answer.value),
      requireEquationSetup: false,
      selectedUnit: "m"
    });

    expect(result.validation).toMatchObject({ errorTypes: ["none"], isCorrect: true });
    expect(result.interviewMath.score.total).toBe(45);
  });

  it("requires an interpretation when the session setting enables it", () => {
    const question = caseQuestion();
    const result = evaluateInterviewMath({
      equationOptionId: "equation-correct",
      question,
      rawInput: String(question.answer.value),
      requireInterpretation: true,
      selectedUnit: "m"
    });

    expect(result.validation).toMatchObject({ errorTypes: ["interpretation_error"], isCorrect: false });
    expect(result.interviewMath.score.total).toBe(85);
  });

  it("scores a timeout as zero", () => {
    const question = caseQuestion();
    const result = evaluateInterviewMath({
      equationOptionId: "equation-correct",
      question,
      rawInput: "",
      selectedUnit: "m",
      timedOut: true
    });

    expect(result.validation.errorTypes).toEqual(["timeout"]);
    expect(result.interviewMath.score.total).toBe(0);
  });
});

function caseQuestion() {
  const template = caseStyleQuestionTemplates[0];

  return generateQuestionFromTemplate(template, {
    difficulty: template.difficulty[0],
    random: createSeededRandom("interview-math-evaluation")
  });
}
