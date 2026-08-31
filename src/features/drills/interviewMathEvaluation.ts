import type {
  ErrorType,
  InterviewMathResponse,
  InterviewMathScore,
  Question,
  UnitType
} from "@/lib/domain";
import { validateAnswer, type ValidationResult } from "@/lib/validation/validateAnswer";

export const interviewMathScoreWeights = {
  formulaSelection: 20,
  equationSetup: 20,
  calculationAccuracy: 30,
  unitsMagnitude: 15,
  interpretationSelection: 15
} as const;

export interface InterviewMathSubmission {
  equationOptionId?: string;
  interpretationOptionId?: string;
  requireEquationSetup?: boolean;
  requireInterpretation?: boolean;
}

export interface EvaluateInterviewMathInput extends InterviewMathSubmission {
  locale?: string;
  question: Question;
  rawInput: string;
  selectedUnit?: UnitType;
  timedOut?: boolean;
}

export interface InterviewMathEvaluation {
  interviewMath: InterviewMathResponse;
  validation: ValidationResult;
}

export function evaluateInterviewMath(input: EvaluateInterviewMathInput): InterviewMathEvaluation {
  const spec = input.question.metadata?.caseStyle?.interviewMath;

  if (spec === undefined) {
    throw new Error(`Question "${input.question.id}" has no Interview Math configuration.`);
  }

  const numericValidation = validateAnswer(input.rawInput, input.question.answer, {
    locale: input.locale,
    selectedUnit: input.selectedUnit,
    timedOut: input.timedOut
  });

  if (input.timedOut) {
    return createEvaluation(input, numericValidation, emptyInterviewMathScore());
  }

  const equationRequired = input.requireEquationSetup !== false;
  const interpretationRequired = input.requireInterpretation === true;
  const equationAttempted = Boolean(input.equationOptionId);
  const equation = spec.equationOptions.find((option) => option.id === input.equationOptionId);
  const interpretationAttempted = Boolean(input.interpretationOptionId);
  const interpretation = spec.interpretationOptions.find(
    (option) => option.id === input.interpretationOptionId
  );
  const unitAndMagnitudeCorrect =
    input.selectedUnit === spec.expectedUnit &&
    numericValidation.unitStatus === "compatible" &&
    !numericValidation.errorTypes.includes("magnitude_error");
  const score: InterviewMathScore = {
    formulaSelection: equation?.formulaCorrect === true ? interviewMathScoreWeights.formulaSelection : 0,
    equationSetup: equation?.setupCorrect === true ? interviewMathScoreWeights.equationSetup : 0,
    calculationAccuracy: numericValidation.isCorrect ? interviewMathScoreWeights.calculationAccuracy : 0,
    unitsMagnitude: unitAndMagnitudeCorrect ? interviewMathScoreWeights.unitsMagnitude : 0,
    interpretationSelection:
      interpretation?.isCorrect === true ? interviewMathScoreWeights.interpretationSelection : 0,
    total: 0
  };
  score.total = interviewMathScoreTotal(score);

  const errorTypes: ErrorType[] = [];

  if ((equationRequired || equationAttempted) && equation?.formulaCorrect !== true) {
    errorTypes.push("formula_error");
  }

  if ((equationRequired || equationAttempted) && equation?.setupCorrect !== true) {
    errorTypes.push("setup_error");
  }

  const numericUnitError = numericValidation.errorTypes.includes("unit_error");
  errorTypes.push(
    ...numericValidation.errorTypes.filter(
      (errorType) => errorType !== "none" && errorType !== "unit_error"
    )
  );

  if (input.selectedUnit !== spec.expectedUnit || numericUnitError) {
    errorTypes.push("unit_error");
  }

  if ((interpretationRequired || interpretationAttempted) && interpretation?.isCorrect !== true) {
    errorTypes.push("interpretation_error");
  }

  const isCorrect =
    ((!equationRequired && !equationAttempted) ||
      (equation?.formulaCorrect === true && equation.setupCorrect)) &&
    numericValidation.isCorrect &&
    unitAndMagnitudeCorrect &&
    ((!interpretationRequired && !interpretationAttempted) || interpretation?.isCorrect === true);
  const validation: ValidationResult = {
    ...numericValidation,
    isCorrect,
    errorTypes: errorTypes.length === 0 ? ["none"] : errorTypes,
    feedbackMessage: interviewMathFeedbackMessage(isCorrect, score.total)
  };

  return createEvaluation(input, validation, score);
}

function createEvaluation(
  input: InterviewMathSubmission,
  validation: ValidationResult,
  score: InterviewMathScore
): InterviewMathEvaluation {
  return {
    interviewMath: {
      equationOptionId: input.equationOptionId,
      interpretationOptionId: input.interpretationOptionId,
      score
    },
    validation
  };
}

function emptyInterviewMathScore(): InterviewMathScore {
  return {
    formulaSelection: 0,
    equationSetup: 0,
    calculationAccuracy: 0,
    unitsMagnitude: 0,
    interpretationSelection: 0,
    total: 0
  };
}

function interviewMathScoreTotal(score: InterviewMathScore): number {
  return (
    score.formulaSelection +
    score.equationSetup +
    score.calculationAccuracy +
    score.unitsMagnitude +
    score.interpretationSelection
  );
}

function interviewMathFeedbackMessage(isCorrect: boolean, score: number): string {
  if (score === 100) {
    return "Strong setup, calculation, units, and interpretation.";
  }

  if (isCorrect) {
    return "The required components are correct. Complete optional setup or interpretation for more points.";
  }

  return `Review the setup, calculation, units, and interpretation. You earned ${score}/100 points.`;
}
