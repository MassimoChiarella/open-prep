import { describe, expect, it } from "vitest";

import { brightCartFullCase } from "@/data/casePractice/fullCaseSimulations";
import {
  getFullCaseCalculationQuestion,
  scoreFullCaseSimulation,
  type FullCaseSubmission
} from "@/features/case-practice/simulation/fullCaseScoring";

describe("full-case scoring", () => {
  it("composes the five finished scorers into a 100-point result", () => {
    const result = scoreFullCaseSimulation(brightCartFullCase, perfectSubmission());

    expect(result.totalScore).toBe(100);
    expect(result.sections).toEqual([
      { id: "questioning", label: "Questioning", maxScore: 20, score: 20 },
      { id: "structure", label: "Structure", maxScore: 20, score: 20 },
      { id: "calculation", label: "Exhibit and math", maxScore: 20, score: 20 },
      { id: "brainstorming", label: "Brainstorming", maxScore: 20, score: 20 },
      { id: "synthesis", label: "Synthesis", maxScore: 20, score: 20 }
    ]);
    expect(result.calculation.isCorrect).toBe(true);
  });

  it("uses the numeric validator for scaled currency input", () => {
    const result = scoreFullCaseSimulation(brightCartFullCase, {
      ...perfectSubmission(),
      calculationInput: "$120K"
    });

    expect(result.calculation).toMatchObject({ isCorrect: true, normalizedUserValue: 120_000 });
    expect(result.totalScore).toBe(100);
  });

  it("keeps an incorrect calculation isolated to its weighted section", () => {
    const result = scoreFullCaseSimulation(brightCartFullCase, {
      ...perfectSubmission(),
      calculationInput: "12000"
    });

    expect(result.calculation.isCorrect).toBe(false);
    expect(result.calculation.errorTypes).toContain("magnitude_error");
    expect(result.totalScore).toBe(80);
  });

  it("keeps legacy cases on four equal sections", () => {
    const { questioning: _questioning, ...legacySimulation } = brightCartFullCase;
    const { questioning: _submission, ...legacySubmission } = perfectSubmission();
    const result = scoreFullCaseSimulation(legacySimulation, legacySubmission);

    expect(result.totalScore).toBe(100);
    expect(result.questioning).toBeUndefined();
    expect(result.sections.every((section) => section.maxScore === 25)).toBe(true);
  });

  it("accepts an alternate structuring hypothesis in v3 and legacy full cases", () => {
    const alternate = brightCartFullCase.structure.hypotheses.find(
      (hypothesis) => hypothesis.id !== brightCartFullCase.structure.acceptedHypothesisId
    );
    if (alternate === undefined) throw new Error("Expected an alternate hypothesis.");
    const simulation = {
      ...brightCartFullCase,
      structure: {
        ...brightCartFullCase.structure,
        acceptedHypothesisIds: [brightCartFullCase.structure.acceptedHypothesisId, alternate.id]
      }
    };
    const submission = {
      ...perfectSubmission(),
      structure: {
        ...perfectSubmission().structure,
        hypothesisId: alternate.id
      }
    };

    const v3 = scoreFullCaseSimulation(simulation, submission);
    const { questioning: _questioning, ...legacySimulation } = simulation;
    const { questioning: _submission, ...legacySubmission } = submission;
    const v2 = scoreFullCaseSimulation(legacySimulation, legacySubmission);

    expect(v3.structure).toMatchObject({ hypothesisAccepted: true, hypothesisPoints: 35 });
    expect(v3.totalScore).toBe(100);
    expect(v2.structure).toMatchObject({ hypothesisAccepted: true, hypothesisPoints: 35 });
    expect(v2.totalScore).toBe(100);
  });

  it("rejects a simulation without the configured numeric question", () => {
    expect(() =>
      getFullCaseCalculationQuestion({
        ...brightCartFullCase,
        calculationQuestionId: "missing"
      })
    ).toThrow("Missing numeric full-case question: missing");
  });
});

function perfectSubmission(): FullCaseSubmission {
  const relevantIdeaIds = brightCartFullCase.brainstorming.themes.flatMap((theme) =>
    theme.ideas.filter((idea) => idea.relevant).map((idea) => idea.id)
  );

  return {
    questioning: {
      includeRanking: false,
      questions: [
        { id: "q1", text: "What success target must the expansion reach by next quarter?" },
        { id: "q2", text: "Which cities and customer segments are in scope?" },
        { id: "q3", text: "How do customer adoption and order volume differ by city?" },
        { id: "q4", text: "What are contribution and break-even economics in each market?" },
        { id: "q5", text: "Can courier capacity sustain reliable on-time delivery?" }
      ]
    },
    structure: {
      hypothesisId: brightCartFullCase.structure.acceptedHypothesisId,
      branchIds: brightCartFullCase.structure.modelStructure.map((branch) => branch.branchId)
    },
    calculationInput: "120000",
    brainstorming: {
      selectedIdeaIds: relevantIdeaIds,
      priorityIdeaIds: brightCartFullCase.brainstorming.priorityIdeaIds
    },
    synthesis: brightCartFullCase.synthesis.correctResponse
  };
}
