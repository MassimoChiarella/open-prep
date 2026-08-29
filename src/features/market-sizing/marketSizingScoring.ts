import type {
  MarketSizingEvaluation,
  MarketSizingStepValueMap
} from "@/features/market-sizing/marketSizingEvaluation";
import type {
  MarketSizingRubricDimension,
  MarketSizingScoreDimension,
  MarketSizingTemplate
} from "@/features/market-sizing/marketSizingTypes";
import type { ErrorType } from "@/lib/domain";

export interface ScoreMarketSizingAttemptOptions {
  evaluation: MarketSizingEvaluation;
  interpretationId?: string;
  note?: string;
  stepValues: MarketSizingStepValueMap;
  template: MarketSizingTemplate;
}

export interface MarketSizingScoreDimensionResult {
  awardedPoints: number;
  id: MarketSizingScoreDimension;
  label: string;
  maxPoints: number;
  message: string;
}

export interface MarketSizingAttemptScore {
  breakdown: MarketSizingScoreDimensionResult[];
  errorTypes: ErrorType[];
  maxScore: number;
  totalScore: number;
}

export function scoreMarketSizingAttempt(options: ScoreMarketSizingAttemptOptions): MarketSizingAttemptScore {
  const breakdown = options.template.rubric.map((dimension) => scoreDimension(dimension, options));
  const totalScore = breakdown.reduce((sum, dimension) => sum + dimension.awardedPoints, 0);
  const maxScore = breakdown.reduce((sum, dimension) => sum + dimension.maxPoints, 0);

  return {
    breakdown,
    errorTypes: createMarketSizingErrorTypes(options),
    maxScore,
    totalScore
  };
}

function scoreDimension(
  dimension: MarketSizingRubricDimension,
  options: ScoreMarketSizingAttemptOptions
): MarketSizingScoreDimensionResult {
  if (dimension.id === "structure") {
    return scoreStructure(dimension, options);
  }

  if (dimension.id === "assumptions") {
    return scoreAssumptions(dimension, options.evaluation);
  }

  if (dimension.id === "math") {
    return scoreMath(dimension, options.evaluation);
  }

  if (dimension.id === "units") {
    return scoreUnits(dimension, options.evaluation);
  }

  if (dimension.id === "sense_check") {
    return scoreSenseCheck(dimension, options);
  }

  return scoreInterpretation(dimension, options);
}

function scoreStructure(
  dimension: MarketSizingRubricDimension,
  options: ScoreMarketSizingAttemptOptions
): MarketSizingScoreDimensionResult {
  const requiredSteps = options.template.inputSteps.filter((step) => step.required);
  const completedSteps = requiredSteps.filter((step) => isStepComplete(options.stepValues[step.id])).length;

  return {
    ...dimension,
    awardedPoints: proportionalPoints(completedSteps, requiredSteps.length, dimension.maxPoints),
    message: `${completedSteps}/${requiredSteps.length} required fields completed.`
  };
}

function scoreAssumptions(
  dimension: MarketSizingRubricDimension,
  evaluation: MarketSizingEvaluation
): MarketSizingScoreDimensionResult {
  const { inRange, total } = evaluation.rangeSummary;

  return {
    ...dimension,
    awardedPoints: proportionalPoints(inRange, total, dimension.maxPoints),
    message: `${inRange}/${total} ranged assumptions are in range.`
  };
}

function scoreMath(
  dimension: MarketSizingRubricDimension,
  evaluation: MarketSizingEvaluation
): MarketSizingScoreDimensionResult {
  return {
    ...dimension,
    awardedPoints: evaluation.finalAnswer.status === "match" ? dimension.maxPoints : 0,
    message:
      evaluation.finalAnswer.status === "match"
        ? "Final answer matches the calculated result."
        : evaluation.finalAnswer.message
  };
}

function scoreUnits(
  dimension: MarketSizingRubricDimension,
  evaluation: MarketSizingEvaluation
): MarketSizingScoreDimensionResult {
  const validation = evaluation.finalAnswer.validation;
  const hasUnitError = validation?.errorTypes.includes("unit_error") ?? false;
  const unitAccepted = validation?.normalizedUserValue !== undefined && !hasUnitError;

  return {
    ...dimension,
    awardedPoints: unitAccepted ? dimension.maxPoints : 0,
    message: unitAccepted ? "Final answer unit is acceptable." : "Final answer unit is missing or incorrect."
  };
}

function scoreSenseCheck(
  dimension: MarketSizingRubricDimension,
  options: ScoreMarketSizingAttemptOptions
): MarketSizingScoreDimensionResult {
  const completed = isSenseCheckComplete(options);

  return {
    ...dimension,
    awardedPoints: completed ? dimension.maxPoints : 0,
    message: completed ? "Sense-check completed." : "Sense-check is not complete."
  };
}

function scoreInterpretation(
  dimension: MarketSizingRubricDimension,
  options: ScoreMarketSizingAttemptOptions
): MarketSizingScoreDimensionResult {
  const hasInterpretation = (options.interpretationId ?? "").trim().length > 0;
  const hasSelfReviewNote = (options.note ?? "").trim().length > 0;

  return {
    ...dimension,
    awardedPoints: hasInterpretation || hasSelfReviewNote ? dimension.maxPoints : 0,
    message:
      hasInterpretation || hasSelfReviewNote
        ? "Interpretation or self-review note captured."
        : "Select an interpretation or add a self-review note."
  };
}

function createMarketSizingErrorTypes(options: ScoreMarketSizingAttemptOptions): ErrorType[] {
  const errors = new Set<ErrorType>();

  for (const assumption of options.evaluation.assumptionEvaluations) {
    if (assumption.status === "invalid" || assumption.status === "missing" || assumption.status === "out_of_range") {
      errors.add("setup_error");
    }
  }

  for (const errorType of options.evaluation.finalAnswer.validation?.errorTypes ?? []) {
    if (errorType !== "none") {
      errors.add(errorType);
    }
  }

  if (!isSenseCheckComplete(options) || !hasInterpretation(options)) {
    errors.add("interpretation_error");
  }

  return errors.size === 0 ? ["none"] : Array.from(errors);
}

function isSenseCheckComplete(options: ScoreMarketSizingAttemptOptions): boolean {
  if (!options.template.senseCheck.required) {
    return true;
  }

  const explicitStep = options.template.inputSteps.find(
    (step) => step.id === "sense_check" && step.inputKind === "boolean"
  );

  return explicitStep === undefined
    ? hasInterpretation(options)
    : options.stepValues[explicitStep.id] === true;
}

function hasInterpretation(options: Pick<ScoreMarketSizingAttemptOptions, "interpretationId" | "note">): boolean {
  return (options.interpretationId ?? "").trim().length > 0 || (options.note ?? "").trim().length > 0;
}

function isStepComplete(value: boolean | string | undefined): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return value !== undefined && value.trim().length > 0;
}

function proportionalPoints(completed: number, total: number, maxPoints: number): number {
  if (total === 0) {
    return maxPoints;
  }

  return Math.round((completed / total) * maxPoints);
}
