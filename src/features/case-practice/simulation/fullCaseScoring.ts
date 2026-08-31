import {
  scoreCaseQuestioning,
  type CaseQuestioningScore,
  type CaseQuestioningSubmission
} from "@/features/case-practice/questioning/questioningScoring";
import {
  scoreBrainstorming,
  type BrainstormingScore,
  type BrainstormingSubmission
} from "@/features/case-practice/brainstorming/brainstormingScoring";
import {
  scoreCaseStructure,
  type CaseStructuringScore,
  type CaseStructuringSubmission
} from "@/features/case-practice/structuring/structuringScoring";
import {
  scoreSynthesisResponse,
  type SynthesisResponse,
  type SynthesisScore
} from "@/features/case-practice/synthesis/synthesisScoring";
import type { FullCaseSimulationSpec } from "@/features/case-practice/simulation/fullCaseTypes";
import type { ExhibitNumericQuestionSpec } from "@/features/exhibits/exhibitTypes";
import { validateAnswer, type ValidationResult } from "@/lib/validation/validateAnswer";

export type FullCaseSectionId = "brainstorming" | "calculation" | "questioning" | "structure" | "synthesis";

export interface FullCaseSubmission {
  brainstorming: BrainstormingSubmission;
  calculationInput: string;
  questioning?: CaseQuestioningSubmission;
  structure: CaseStructuringSubmission;
  synthesis: SynthesisResponse;
}

export interface FullCaseSectionScore {
  id: FullCaseSectionId;
  label: string;
  maxScore: number;
  score: number;
}

export interface FullCaseScore {
  brainstorming: BrainstormingScore;
  calculation: ValidationResult;
  maxScore: 100;
  questioning?: CaseQuestioningScore;
  sections: readonly FullCaseSectionScore[];
  structure: CaseStructuringScore;
  synthesis: SynthesisScore;
  totalScore: number;
}

export function scoreFullCaseSimulation(
  simulation: FullCaseSimulationSpec,
  submission: FullCaseSubmission,
  locale?: string
): FullCaseScore {
  const structure = scoreCaseStructure(simulation.structure, submission.structure);
  const questioning = simulation.questioning === undefined
    ? undefined
    : scoreCaseQuestioning(simulation.questioning, requireQuestioningSubmission(submission));
  const calculation = validateAnswer(
    submission.calculationInput,
    getFullCaseCalculationQuestion(simulation).answer,
    { locale }
  );
  const brainstorming = scoreBrainstorming(simulation.brainstorming, submission.brainstorming);
  const synthesis = scoreSynthesisResponse(simulation.synthesis, submission.synthesis);
  const sectionMaxScore = questioning === undefined ? 25 : 20;
  const sections: FullCaseSectionScore[] = [
    ...(questioning === undefined
      ? []
      : [section("questioning", "Questioning", questioning.totalScore, questioning.maxScore, sectionMaxScore)]),
    section("structure", "Structure", structure.totalScore, structure.maxScore, sectionMaxScore),
    {
      id: "calculation",
      label: "Exhibit and math",
      maxScore: sectionMaxScore,
      score: calculation.isCorrect ? sectionMaxScore : 0
    },
    section("brainstorming", "Brainstorming", brainstorming.totalScore, brainstorming.maxScore, sectionMaxScore),
    section("synthesis", "Synthesis", synthesis.totalScore, synthesis.maxScore, sectionMaxScore)
  ];

  return {
    brainstorming,
    calculation,
    maxScore: 100,
    ...(questioning === undefined ? {} : { questioning }),
    sections,
    structure,
    synthesis,
    totalScore: sections.reduce((total, item) => total + item.score, 0)
  };
}

export function getFullCaseCalculationQuestion(
  simulation: FullCaseSimulationSpec
): ExhibitNumericQuestionSpec {
  const question = simulation.exhibit.questions.find(
    (candidate) => candidate.id === simulation.calculationQuestionId
  );

  if (question === undefined || question.responseType === "multiple_choice") {
    throw new Error(`Missing numeric full-case question: ${simulation.calculationQuestionId}`);
  }

  return question;
}

function section(
  id: Exclude<FullCaseSectionId, "calculation">,
  label: string,
  score: number,
  sourceMaxScore: number,
  targetMaxScore: number
): FullCaseSectionScore {
  return {
    id,
    label,
    maxScore: targetMaxScore,
    score: sourceMaxScore <= 0
      ? 0
      : Math.round((Math.max(0, Math.min(score, sourceMaxScore)) / sourceMaxScore) * targetMaxScore)
  };
}

function requireQuestioningSubmission(submission: FullCaseSubmission): CaseQuestioningSubmission {
  if (submission.questioning === undefined) {
    throw new Error("This full case requires a questioning submission.");
  }
  return submission.questioning;
}
