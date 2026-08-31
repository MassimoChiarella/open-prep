import type { MarketSizingInputStep, MarketSizingTemplate } from "@/features/market-sizing/marketSizingTypes";
import { evaluateFormulaExpression } from "@/lib/math/formulaEvaluator";
import { parseAnswer } from "@/lib/parser/parseAnswer";
import { validateAnswer, type ValidationResult } from "@/lib/validation/validateAnswer";

export type MarketSizingStepRawValue = boolean | string | undefined;
export type MarketSizingStepValueMap = Record<string, MarketSizingStepRawValue>;

export type MarketSizingAssumptionStatus =
  | "in_range"
  | "invalid"
  | "missing"
  | "not_applicable"
  | "out_of_range";

export type MarketSizingFinalAnswerStatus = "invalid" | "match" | "missing" | "mismatch" | "not_ready";

export interface MarketSizingAssumptionEvaluation {
  hasAssumptionRange: boolean;
  message: string;
  normalizedValue?: number;
  rawValue?: MarketSizingStepRawValue;
  status: MarketSizingAssumptionStatus;
  stepId: string;
  variableName?: string;
}

export interface MarketSizingRangeSummary {
  inRange: number;
  outOfRange: number;
  total: number;
}

export interface MarketSizingFinalAnswerEvaluation {
  message: string;
  normalizedValue?: number;
  status: MarketSizingFinalAnswerStatus;
  validation?: ValidationResult;
}

export interface MarketSizingEvaluation {
  assumptionEvaluations: MarketSizingAssumptionEvaluation[];
  calculationError?: string;
  calculatedValue?: number;
  finalAnswer: MarketSizingFinalAnswerEvaluation;
  rangeSummary: MarketSizingRangeSummary;
  templateId: string;
  variables: Record<string, number>;
}

export interface EvaluateMarketSizingDraftOptions {
  finalAnswer?: string;
  locale?: string;
  stepValues: MarketSizingStepValueMap;
  template: MarketSizingTemplate;
}

export function evaluateMarketSizingDraft(options: EvaluateMarketSizingDraftOptions): MarketSizingEvaluation {
  const assumptionEvaluations = evaluateMarketSizingAssumptions(options.template, options.stepValues, options.locale);
  const variables = buildFormulaVariables(assumptionEvaluations);
  let calculatedValue: number | undefined;
  let calculationError: string | undefined;

  try {
    calculatedValue = calculateMarketSizingValue(options.template, variables);
  } catch (error) {
    calculationError = `The formula could not be calculated from these assumptions: ${errorMessage(error)} Change the assumptions and try again.`;
  }

  return {
    assumptionEvaluations,
    ...(calculationError === undefined ? {} : { calculationError }),
    calculatedValue,
    finalAnswer:
      calculationError === undefined
        ? evaluateMarketSizingFinalAnswer(options.template, calculatedValue, options.finalAnswer, options.locale)
        : { message: calculationError, status: "not_ready" },
    rangeSummary: summarizeRanges(assumptionEvaluations),
    templateId: options.template.id,
    variables
  };
}

export function evaluateMarketSizingAssumptions(
  template: MarketSizingTemplate,
  stepValues: MarketSizingStepValueMap,
  locale?: string
): MarketSizingAssumptionEvaluation[] {
  return template.inputSteps.map((step) => evaluateMarketSizingStep(step, stepValues[step.id], locale));
}

export function evaluateMarketSizingFinalAnswer(
  template: MarketSizingTemplate,
  calculatedValue: number | undefined,
  rawInput = "",
  locale?: string
): MarketSizingFinalAnswerEvaluation {
  if (calculatedValue === undefined) {
    return {
      message: "Complete numeric assumptions to calculate the expected answer.",
      status: "not_ready"
    };
  }

  if (rawInput.trim().length === 0) {
    return {
      message: "Enter a final answer to compare.",
      status: "missing"
    };
  }

  const validation = validateAnswer(rawInput, {
    value: calculatedValue,
    unit: template.outputUnit,
    tolerance: template.finalFormula.tolerance,
    roundingRule: template.finalFormula.roundingRule
  }, { locale });

  if (validation.normalizedUserValue === undefined) {
    return {
      message: validation.feedbackMessage,
      status: "invalid",
      validation
    };
  }

  return {
    message: validation.isCorrect ? "Final answer matches the calculated result." : validation.feedbackMessage,
    normalizedValue: validation.normalizedUserValue,
    status: validation.isCorrect ? "match" : "mismatch",
    validation
  };
}

function evaluateMarketSizingStep(
  step: MarketSizingInputStep,
  rawValue: MarketSizingStepRawValue,
  locale?: string
): MarketSizingAssumptionEvaluation {
  const numericInput =
    step.inputKind === "currency" ||
    step.inputKind === "integer" ||
    step.inputKind === "number" ||
    step.inputKind === "percentage";

  if (!numericInput || step.variableName === undefined) {
    return {
      hasAssumptionRange: false,
      message: "Not part of the calculation.",
      rawValue,
      status: "not_applicable",
      stepId: step.id
    };
  }

  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return {
      hasAssumptionRange: step.assumptionRange !== undefined,
      message: "Enter an assumption.",
      rawValue,
      status: "missing",
      stepId: step.id,
      variableName: step.variableName
    };
  }

  const parsed = parseAnswer(rawValue, {
    locale: step.inputKind === "integer" || step.inputKind === "number" ? "en-US" : locale
  });

  if (parsed.parseError !== undefined || parsed.value === null) {
    return {
      hasAssumptionRange: step.assumptionRange !== undefined,
      message: parsed.parseError ?? "Enter a valid number.",
      rawValue,
      status: "invalid",
      stepId: step.id,
      variableName: step.variableName
    };
  }

  if (step.inputKind === "integer" && !Number.isInteger(parsed.value)) {
    return {
      hasAssumptionRange: step.assumptionRange !== undefined,
      message: "Enter a whole number.",
      rawValue,
      status: "invalid",
      stepId: step.id,
      variableName: step.variableName
    };
  }

  const inRange = isWithinAssumptionRange(parsed.value, step);

  return {
    message: inRange ? "In range." : "Outside range.",
    hasAssumptionRange: step.assumptionRange !== undefined,
    normalizedValue: parsed.value,
    rawValue,
    status: inRange ? "in_range" : "out_of_range",
    stepId: step.id,
    variableName: step.variableName
  };
}

function isWithinAssumptionRange(value: number, step: MarketSizingInputStep): boolean {
  const range = step.assumptionRange;

  if (range === undefined) {
    return true;
  }

  return value >= range.min && value <= range.max;
}

function buildFormulaVariables(
  assumptionEvaluations: readonly MarketSizingAssumptionEvaluation[]
): Record<string, number> {
  return Object.fromEntries(
    assumptionEvaluations.flatMap((evaluation) =>
      evaluation.variableName !== undefined && evaluation.normalizedValue !== undefined
        ? [[evaluation.variableName, evaluation.normalizedValue]]
        : []
    )
  );
}

function calculateMarketSizingValue(
  template: MarketSizingTemplate,
  variables: Record<string, number>
): number | undefined {
  const requiredVariables = template.inputSteps
    .map((step) => step.variableName)
    .filter((variableName): variableName is string => variableName !== undefined);

  if (requiredVariables.some((variableName) => variables[variableName] === undefined)) {
    return undefined;
  }

  return evaluateFormulaExpression(template.finalFormula.expression, variables);
}

function summarizeRanges(
  assumptionEvaluations: readonly MarketSizingAssumptionEvaluation[]
): MarketSizingRangeSummary {
  const rangedEvaluations = assumptionEvaluations.filter((evaluation) =>
    evaluation.hasAssumptionRange
  );

  return {
    inRange: rangedEvaluations.filter((evaluation) => evaluation.status === "in_range").length,
    outOfRange: rangedEvaluations.filter((evaluation) => evaluation.status === "out_of_range").length,
    total: rangedEvaluations.length
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The formula returned an invalid result.";
}
