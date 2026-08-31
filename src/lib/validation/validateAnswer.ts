import type { AnswerSpec, ErrorType, ToleranceSpec, UnitType } from "@/lib/domain";
import { parseAnswer, type ParsedAnswer } from "@/lib/parser/parseAnswer";

export interface ValidateAnswerOptions {
  locale?: string;
  selectedUnit?: UnitType;
  timedOut?: boolean;
}

export type UnitValidationStatus = "compatible" | "incompatible" | "malformed" | "omitted";

export interface ValidationResult {
  isCorrect: boolean;
  numericMatch?: boolean;
  normalizedUserValue?: number;
  correctValue: number;
  errorTypes: ErrorType[];
  feedbackMessage: string;
  unitStatus?: UnitValidationStatus;
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
      numericMatch: false,
      correctValue: answer.value,
      errorTypes: ["timeout"],
      feedbackMessage: "No answer was submitted before time ran out.",
      unitStatus: "omitted"
    };
  }

  const parsedAnswer = parseAnswer(rawInput, { locale: options.locale });
  if (parsedAnswer.parseError || parsedAnswer.value === null) {
    return {
      isCorrect: false,
      numericMatch: false,
      correctValue: answer.value,
      errorTypes: ["arithmetic_error"],
      feedbackMessage: parsedAnswer.parseError ?? "Enter a valid number.",
      unitStatus: "malformed"
    };
  }

  const candidates = normalizedValueCandidates(parsedAnswer, answer.unit, options.selectedUnit);
  const matchingValue = candidates.find((value) => isWithinTolerance(value, answer.value, answer.tolerance));
  const normalizedUserValue = matchingValue ?? candidates[0];
  const numericMatch = matchingValue !== undefined;
  const legacyPercentageMatch =
    (answer.unit ?? "none") === "none" && parsedAnswer.isPercentageInput && numericMatch;
  const unitStatus = getUnitStatus(answer.unit, parsedAnswer, options.selectedUnit, legacyPercentageMatch);
  const unitError = unitStatus === "incompatible";
  const isCorrect = numericMatch && !unitError;

  return {
    isCorrect,
    numericMatch,
    normalizedUserValue,
    correctValue: answer.value,
    errorTypes: isCorrect ? ["none"] : classifyErrors(normalizedUserValue, answer, unitError, numericMatch),
    feedbackMessage: buildFeedbackMessage(isCorrect, numericMatch, unitError, normalizedUserValue, answer),
    unitStatus
  };
}

function normalizedValueCandidates(
  parsedAnswer: ParsedAnswer,
  expectedUnit: UnitType | undefined,
  selectedUnit: UnitType | undefined
): number[] {
  let value = parsedAnswer.value as number;
  if (isScaleUnit(expectedUnit) && parsedAnswer.scaleHint !== undefined) {
    value /= scaleMultiplier(expectedUnit);
  }
  if (
    selectedUnit === "percentage" &&
    !parsedAnswer.isPercentageInput &&
    parsedAnswer.unitHint === undefined &&
    parsedAnswer.scaleHint === undefined
  ) {
    value /= 100;
  }

  const candidates = [value];
  if ((expectedUnit ?? "none") === "none" && parsedAnswer.isPercentageInput) {
    candidates.push(value * 100);
  }
  return Array.from(new Set(candidates));
}

function isWithinTolerance(userValue: number, correctValue: number, tolerance?: ToleranceSpec): boolean {
  if (!tolerance) {
    return Math.abs(userValue - correctValue) <= exactMatchEpsilon;
  }

  if (tolerance.type === "absolute") {
    return Math.abs(userValue - correctValue) <= (tolerance.value ?? 0) + exactMatchEpsilon;
  }

  if (tolerance.type === "percentage") {
    const allowedDelta = Math.abs(correctValue) * (tolerance.value ?? 0);
    return Math.abs(userValue - correctValue) <= allowedDelta + exactMatchEpsilon;
  }

  const min = tolerance.min ?? Number.NEGATIVE_INFINITY;
  const max = tolerance.max ?? Number.POSITIVE_INFINITY;
  return userValue >= min - exactMatchEpsilon && userValue <= max + exactMatchEpsilon;
}

function getUnitStatus(
  expectedUnit: UnitType | undefined,
  parsedAnswer: ParsedAnswer,
  selectedUnit: UnitType | undefined,
  legacyPercentageMatch: boolean
): UnitValidationStatus {
  const expected = expectedUnit ?? "none";
  const selected = selectedUnit === "none" ? undefined : selectedUnit;
  const typedUnit = parsedAnswer.unitHint;
  const typedScale = parsedAnswer.scaleHint;
  const selectedScale = isScaleUnit(selected) ? selected : undefined;

  if (typedScale !== undefined && selectedScale !== undefined && typedScale !== selectedScale) {
    return "incompatible";
  }

  if (isScaleUnit(expected)) {
    if (typedUnit !== undefined || (selected !== undefined && !isScaleUnit(selected))) return "incompatible";
    if ((typedScale !== undefined && typedScale !== expected) || (selectedScale !== undefined && selectedScale !== expected)) {
      return "incompatible";
    }
    return typedScale === expected || selectedScale === expected ? "compatible" : "omitted";
  }

  if (selectedScale !== undefined) return "incompatible";
  if (legacyPercentageMatch) return "compatible";
  if (typedUnit !== undefined && typedUnit !== expected) return "incompatible";
  if (selected !== undefined && selected !== expected) return "incompatible";
  if (typedUnit === expected || selected === expected) return "compatible";
  if (expected === "none" && typedScale !== undefined) return "compatible";
  return "omitted";
}

function isScaleUnit(unit: UnitType | undefined): unit is "k" | "m" | "b" {
  return unit === "k" || unit === "m" || unit === "b";
}

function scaleMultiplier(unit: "k" | "m" | "b"): number {
  if (unit === "k") {
    return 1_000;
  }
  return unit === "m" ? 1_000_000 : 1_000_000_000;
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
