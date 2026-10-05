import { describe, expect, it } from "vitest";

import { caseStyleQuestionTemplates } from "@/data/questionTemplates/caseStyleTemplates";
import { submitAnswer } from "@/features/drills/answerSubmission";
import { evaluateInterviewMath } from "@/features/drills/interviewMathEvaluation";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { generateQuestionFromTemplate } from "@/features/questions/questionGenerator";
import { scoreResponse } from "@/features/scoring/scoringEngine";
import { createSeededRandom } from "@/lib/random/seededRandom";

describe("Interview Math independent calculation and unit credit", () => {
  it.each(["typed", "selected", "omitted"] as const)("keeps calculation points with an accepted number and %s unit error", (kind) => {
    const question = monetaryQuestion();
    const rawInput = kind === "typed" ? `${question.answer.value} years` : String(question.answer.value);
    const selectedUnit = kind === "selected" ? "users" as const : kind === "omitted" ? undefined : "m" as const;
    const created = createDrillSession({ seed: "unit-policy-session", settings: { questionCount: 1 } });
    const submitted = submitAnswer({
      session: { ...created.session, questionIds: [question.id] },
      question,
      rawInput,
      selectedUnit,
      timeTakenSeconds: 5,
      interviewMath: { equationOptionId: "equation-correct", interpretationOptionId: "interpretation-correct" }
    });
    expect(submitted.validation).toMatchObject({ isCorrect: false, numericMatch: true, errorTypes: ["unit_error"] });
    expect(submitted.response.interviewMath?.score).toMatchObject({ calculationAccuracy: 30, unitsMagnitude: 0, total: 85 });
    expect(scoreResponse(submitted.response)).toBe(85);
  });

  it("keeps accepted tolerance credit but still deducts calculation points for numerical errors", () => {
    const question = monetaryQuestion();
    const common = { question, equationOptionId: "equation-correct", interpretationOptionId: "interpretation-correct", selectedUnit: "m" as const };
    const tolerated = evaluateInterviewMath({ ...common, rawInput: `${question.answer.value + 0.002} years` });
    expect(tolerated.validation).toMatchObject({ numericMatch: true, errorTypes: ["unit_error"] });
    expect(tolerated.interviewMath.score).toMatchObject({ calculationAccuracy: 30, unitsMagnitude: 0, total: 85 });
    const wrongNumber = evaluateInterviewMath({ ...common, rawInput: `${question.answer.value * 10}M` });
    expect(wrongNumber.validation.numericMatch).toBe(false);
    expect(wrongNumber.interviewMath.score).toMatchObject({ calculationAccuracy: 0, unitsMagnitude: 0, total: 55 });
    expect(wrongNumber.validation.errorTypes).toContain("magnitude_error");
    expect(evaluateInterviewMath({ ...common, rawInput: "invalid" }).interviewMath.score.calculationAccuracy).toBe(0);
    expect(evaluateInterviewMath({ ...common, rawInput: "", timedOut: true }).interviewMath.score.total).toBe(0);
  });
});

function monetaryQuestion() {
  const template = caseStyleQuestionTemplates[0];
  return generateQuestionFromTemplate(template, { difficulty: template.difficulty[0], random: createSeededRandom("unit-policy") });
}
