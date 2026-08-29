import type { AnswerSpec, ErrorType, ToleranceSpec, UnitType } from "@/lib/domain";
import { parseAnswer, type ParsedAnswer } from "@/lib/parser/parseAnswer";

export interface ValidateAnswerOptions {
  selectedUnit?: UnitType;
  timedOut?: boolean;
}

export interface ValidationResult {
  isCorrect: boolean;
  normalizedUserValue?: number;
  correctValue: number;
  errorTypes: ErrorType[];
  feedbackMessage: string;
}

const exactMatchEpsilon = 1e-9;
const magnitudeFactors = [10, 100, 1_000];

export function validateAnswer(
  rawInput: string,
  answer: AnswerSpec,
  options: ValidateAnswerOptions = {}
): ValidationResult {
  if (options.timedOut) {
    return {
      isCorrect: false,
      correctValue: answer.value,
      errorTypes: ["timeout"],
      feedbackMessage: "No answer was submitted before time ran out."
    };
  }

  const parsedAnswer = parseAnswer(rawInput);
  if (parsedAnswer.parseError || parsedAnswer.value === null) {
    return {
      isCorrect: false,
      correctValue: answer.value,
      errorTypes: ["arithmetic_error"],
      feedbackMessage: parsedAnswer.parseError ?? "Enter a valid number."
    };
  }

  const normalizedUserValue = normalizeSelectedUnitValue(parsedAnswer, options.selectedUnit);
  const unitError = hasUnitError(answer.unit, parsedAnswer, options.selectedUnit);
  const numericMatch = isWithinTolerance(normalizedUserValue, answer.value, answer.tolerance);
  const isCorrect = numericMatch && !unitError;

  return {
    isCorrect,
    normalizedUserValue,
    correctValue: answer.value,
    errorTypes: isCorrect ? ["none"] : classifyErrors(normalizedUserValue, answer, unitError, numericMatch),
    feedbackMessage: buildFeedbackMessage(isCorrect, numericMatch, unitError, normalizedUserValue, answer)
  };
}

function normalizeSelectedUnitValue(parsedAnswer: ParsedAnswer, selectedUnit?: UnitType): number {
  const value = parsedAnswer.value as number;

  return selectedUnit === "percentage" && !parsedAnswer.isPercentageInput ? value / 100 : value;
}

function isWithinTolerance(userValue: number, correctValue: number, tolerance?: ToleranceSpec): boolean {
  if (!tolerance) {
    return Math.abs(userValue - correctValue) <= exactMatchEpsilon;
  }

  if (tolerance.type === "absolute") {
    return Math.abs(userValue - correctValue) <= (tolerance.value ?? 0);
  }

  if (tolerance.type === "percentage") {
    const allowedDelta = Math.abs(correctValue) * (tolerance.value ?? 0);
    return Math.abs(userValue - correctValue) <= allowedDelta;
  }

  const min = tolerance.min ?? Number.NEGATIVE_INFINITY;
  const max = tolerance.max ?? Number.POSITIVE_INFINITY;
  return userValue >= min && userValue <= max;
}

function hasUnitError(expectedUnit: UnitType | undefined, parsedAnswer: ParsedAnswer, selectedUnit?: UnitType): boolean {
  const expected = expectedUnit ?? "none";
  const explicitUnits = [selectedUnit, parsedAnswer.unitHint].filter(
    (unit): unit is UnitType => unit !== undefined && unit !== "none"
  );

  if (expected === "k" || expected === "m" || expected === "b") {
    const explicitScale = selectedUnit ?? parsedAnswer.scaleHint;
    return explicitScale !== undefined && explicitScale !== expected;
  }

  if (explicitUnits.length === 0) {
    return false;
  }

  return explicitUnits.some((unit) => unit !== expected);
}

function classifyErrors(userValue: number, answer: AnswerSpec, unitError: boolean, numericMatch: boolean): ErrorType[] {
  const errors: ErrorType[] = [];

  if (unitError) {
    errors.push("unit_error");
  }

  if (isPercentagePointError(userValue, answer)) {
    errors.push("percentage_point_error");
  } else if (!numericMatch && isRoundingError(userValue, answer)) {
    errors.push("rounding_error");
  } else if (isMagnitudeError(userValue, answer.value)) {
    errors.push("magnitude_error");
  } else if (!unitError || Math.abs(userValue - answer.value) > exactMatchEpsilon) {
    errors.push("arithmetic_error");
  }

  return errors.length > 0 ? errors : ["arithmetic_error"];
}

function isMagnitudeError(userValue: number, correctValue: number): boolean {
  if (userValue === 0 || correctValue === 0) {
    return false;
  }

  const ratio = Math.abs(userValue / correctValue);
  return magnitudeFactors.some(
    (factor) => Math.abs(ratio - factor) <= exactMatchEpsilon || Math.abs(ratio - 1 / factor) <= exactMatchEpsilon
  );
}

function isPercentagePointError(userValue: number, answer: AnswerSpec): boolean {
  const percentagePointValue = answer.errorChecks?.percentagePointValue;
  return percentagePointValue !== undefined && Math.abs(userValue - percentagePointValue) <= exactMatchEpsilon;
}

function isRoundingError(userValue: number, answer: AnswerSpec): boolean {
  const roundingTolerance = answer.errorChecks?.roundingTolerance;
  return roundingTolerance !== undefined && isWithinTolerance(userValue, answer.value, roundingTolerance);
}

function buildFeedbackMessage(
  isCorrect: boolean,
  numericMatch: boolean,
  unitError: boolean,
  userValue: number,
  answer: AnswerSpec
): string {
  if (isCorrect) {
    return "Correct.";
  }

  if (unitError && numericMatch) {
    return "The number is correct, but the unit does not match.";
  }

  if (unitError) {
    return "Check both the number and the unit.";
  }

  if (isPercentagePointError(userValue, answer)) {
    return "This looks like a percentage-point answer; the question asks for the relative percentage change.";
  }

  if (isRoundingError(userValue, answer)) {
    return "The method is close, but the rounding is outside the accepted range.";
  }

  return "Check the calculation and try again.";
}
