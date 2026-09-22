import { describe, expect, it } from "vitest";

import { caseStyleQuestionTemplates } from "@/data/questionTemplates/caseStyleTemplates";
import { evaluateInterviewMath } from "@/features/drills/interviewMathEvaluation";
import { generateQuestionFromTemplate } from "@/features/questions/questionGenerator";
import type { Question } from "@/lib/domain";
import { createSeededRandom } from "@/lib/random/seededRandom";
import { validateGeneratedTemplateQuestionPackPayload } from "@/features/question-packs/questionPackTemplate";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { submitAnswer } from "@/features/drills/answerSubmission";
import { completeDrillSession } from "@/features/drills/sessionCompletion";
import { createSessionSummarySnapshot } from "@/features/drills/sessionSummary";
import { persistCompletedDrillSession } from "@/features/drills/drillPersistence";
import { scoreResponse } from "@/features/scoring/scoringEngine";
import { createCompleteBackupFilesFromStorage, restoreCompleteBackupFiles } from "@/features/settings/completeBackupStorage";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("evaluateInterviewMath", () => {
  it("awards and preserves full credit for a validated unitless imported question", async () => {
    const result = validateGeneratedTemplateQuestionPackPayload({
      format: "math-drill-question-pack", schemaVersion: 2, packVersion: "1.0", id: "unitless-case", title: "Unitless case",
      kind: "generated_template", templates: [{
        id: "ratio", category: "case_math", tags: ["ratio_conversion"], difficulty: ["intermediate"],
        promptTemplate: "What is {a} divided by {b}?",
        variables: { a: { type: "integer", values: [10] }, b: { type: "integer", values: [2] } },
        formula: { expression: "a/b" }, answerUnit: "none", explanationTemplate: { steps: ["Divide to obtain {answer}."] },
        caseStyle: { calculationStepCount: 2, industry: "retail", interviewMath: {
          expectedUnit: "none",
          equationOptions: [
            { id: "right", label: "{a}/{b}", formulaCorrect: true, setupCorrect: true },
            { id: "wrong", label: "{a}*{b}", formulaCorrect: false, setupCorrect: false }
          ],
          interpretationOptions: [
            { id: "right", label: "The ratio is {answer}.", isCorrect: true },
            { id: "wrong", label: "The ratio is 100.", isCorrect: false }
          ]
        } }
      }]
    });
    expect(result.status).toBe("valid");
    if (result.status !== "valid") throw new Error(result.errors.join("; "));
    const created = createDrillSession({
      seed: "unitless-score", templates: result.pack.templates, startedAt: "2026-06-02T00:00:00.000Z",
      settings: { categories: ["case_math"], difficulty: "intermediate", questionCount: 1 }
    });
    const question = created.questions[0];
    const correctInput = {
      question, rawInput: "5", equationOptionId: "right", interpretationOptionId: "right",
      requireEquationSetup: true, requireInterpretation: true
    };
    for (const selectedUnit of [undefined, "currency", "m"] as const) {
      expect(evaluateInterviewMath({ ...correctInput, selectedUnit }).validation).toMatchObject({
        isCorrect: false, errorTypes: ["unit_error"]
      });
    }
    const submitted = submitAnswer({
      session: created.session, question, rawInput: "5", selectedUnit: "none", timeTakenSeconds: 2,
      submittedAt: "2026-06-02T00:00:02.000Z", interviewMath: correctInput
    });
    expect(submitted.validation).toMatchObject({ isCorrect: true, unitStatus: "compatible", errorTypes: ["none"] });
    expect(submitted.response.interviewMath?.score.total).toBe(100);
    expect(scoreResponse(submitted.response)).toBe(100);
    const completed = completeDrillSession({
      session: submitted.session, questions: created.questions, endedAt: "2026-06-02T00:00:02.000Z"
    });
    expect(createSessionSummarySnapshot(completed, created.questions).score.totalScore).toBe(100);
    const storage = new MemoryAppStorage();
    await persistCompletedDrillSession({ storage, session: completed, questions: created.questions });
    const restored = new MemoryAppStorage();
    await restoreCompleteBackupFiles(restored, await createCompleteBackupFilesFromStorage(storage));
    expect((await restored.get("drill_sessions", completed.id))?.score?.totalScore).toBe(100);
    expect((await restored.getAll("responses"))[0].isCorrect).toBe(true);
  });

  it.each(caseStyleQuestionTemplates)("accepts the promised currency scale notation for $id", (template) => {
    const question = generateQuestionFromTemplate(template, {
      difficulty: template.difficulty[0], random: createSeededRandom("audit-money")
    });
    const result = evaluateInterviewMath({
      equationOptionId: "equation-correct", interpretationOptionId: "interpretation-correct",
      question, rawInput: `$${question.answer.value}M`, selectedUnit: "m"
    });
    expect(result.validation.isCorrect).toBe(true);
    expect(result.interviewMath.score.total).toBe(100);
  });
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

  it("uses the selected unit when normalizing a canonical percentage answer", () => {
    const source = caseQuestion();
    const question: Question = {
      ...source,
      answer: { value: 0.2, unit: "percentage" },
      metadata: {
        ...source.metadata,
        caseStyle: {
          ...source.metadata!.caseStyle!,
          interviewMath: {
            ...source.metadata!.caseStyle!.interviewMath,
            expectedUnit: "percentage"
          }
        },
        sourceType: source.metadata!.sourceType
      }
    };
    const result = evaluateInterviewMath({
      equationOptionId: "equation-correct",
      question,
      rawInput: "20",
      selectedUnit: "percentage"
    });

    expect(result.validation).toMatchObject({ isCorrect: true, normalizedUserValue: 0.2 });
    expect(result.interviewMath.score).toMatchObject({ calculationAccuracy: 30, unitsMagnitude: 15 });
  });
});

function caseQuestion() {
  const template = caseStyleQuestionTemplates[0];

  return generateQuestionFromTemplate(template, {
    difficulty: template.difficulty[0],
    random: createSeededRandom("interview-math-evaluation")
  });
}
