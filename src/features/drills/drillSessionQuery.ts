import {
  arithmeticDivisionModeOptions,
  arithmeticDivisionRoundingOptions,
  arithmeticMixedOperatorOptions,
  arithmeticMultiplicationStyleOptions,
  arithmeticNumberFormatOptions,
  arithmeticOperandSizeOptions,
  arithmeticTermCountOptions,
  caseCalculationStepCountOptions,
  caseIndustryOptions,
  categoryOptions,
  difficultyOptions,
  feedbackModeOptions,
  skillTagOptions,
  timeModeOptions,
  unitPreferenceOptions
} from "@/features/drills/drillSettingsOptions";
import type { DrillSettings } from "@/lib/domain";
import { timingAccommodationIds } from "@/features/timing/timingAccommodation";

import { createDrillSettings } from "@/features/drills/drillSettings";

export type DrillSessionSearchParams = URLSearchParams | Record<string, string | string[] | undefined>;

export interface ParsedDrillSessionQuery {
  settings: DrillSettings;
  warnings: string[];
}

export function parseDrillSettingsQuery(searchParams: DrillSessionSearchParams = {}): ParsedDrillSessionQuery {
  const warnings: string[] = [];
  const categories = parseCsvOptions(
    readParam(searchParams, "categories"),
    categoryOptions.map((option) => option.value),
    "category",
    warnings
  );
  const tags = parseCsvOptions(
    readParam(searchParams, "tags"),
    skillTagOptions.map((option) => option.value),
    "skill tag",
    warnings
  );
  const timeMode = parseSingleOption(
    readParam(searchParams, "timeMode"),
    timeModeOptions.map((option) => option.value),
    "untimed",
    "time mode",
    warnings
  );
  const questionPackId =
    readParam(searchParams, "source") === "question_pack"
      ? readParam(searchParams, "pack")?.trim() || undefined
      : undefined;

  return {
    settings: createDrillSettings({
      categories: categories.length > 0 ? categories : undefined,
      tags: tags.length > 0 ? tags : undefined,
      difficulty: parseSingleOption(
        readParam(searchParams, "difficulty"),
        difficultyOptions.map((option) => option.value),
        "beginner",
        "difficulty",
        warnings
      ),
      questionCount: parsePositiveInteger(readParam(searchParams, "count"), 5, 50, "question count", warnings),
      arithmeticTermCount: parseOptionalIntegerOption(
        readParam(searchParams, "terms"),
        arithmeticTermCountOptions,
        "arithmetic term count",
        warnings
      ),
      arithmeticNumberFormat: parseOptionalSingleOption(
        readParam(searchParams, "numberFormat"),
        arithmeticNumberFormatOptions.map((option) => option.value),
        "arithmetic number format",
        warnings
      ),
      arithmeticOperandSize: parseOptionalSingleOption(
        readParam(searchParams, "operandSize"),
        arithmeticOperandSizeOptions.map((option) => option.value),
        "arithmetic operand size",
        warnings
      ),
      arithmeticAllowNegatives: parseOptionalBoolean(
        readParam(searchParams, "negatives"),
        "negative-number setting",
        warnings
      ),
      arithmeticMultiplicationStyle: parseOptionalSingleOption(
        readParam(searchParams, "multiplicationStyle"),
        arithmeticMultiplicationStyleOptions.map((option) => option.value),
        "multiplication style",
        warnings
      ),
      arithmeticDivisionMode: parseOptionalSingleOption(
        readParam(searchParams, "divisionMode"),
        arithmeticDivisionModeOptions.map((option) => option.value),
        "division mode",
        warnings
      ),
      arithmeticDivisionRounding: parseOptionalSingleOption(
        readParam(searchParams, "divisionRounding"),
        arithmeticDivisionRoundingOptions.map((option) => option.value),
        "division rounding",
        warnings
      ),
      arithmeticMixedOperators: parseOptionalCsvOptions(
        readParam(searchParams, "operators"),
        arithmeticMixedOperatorOptions.map((option) => option.value),
        "mixed operator",
        warnings
      ),
      arithmeticUseParentheses: parseOptionalBoolean(
        readParam(searchParams, "parentheses"),
        "parentheses setting",
        warnings
      ),
      caseIndustry: parseOptionalSingleOption(
        readParam(searchParams, "caseIndustry"),
        caseIndustryOptions.map((option) => option.value),
        "case industry",
        warnings
      ),
      caseCalculationStepCount: parseOptionalIntegerOption(
        readParam(searchParams, "caseSteps"),
        caseCalculationStepCountOptions,
        "case calculation step count",
        warnings
      ),
      caseRequireEquationSetup: parseOptionalBoolean(
        readParam(searchParams, "requireEquation"),
        "case equation requirement",
        warnings
      ),
      caseRequireInterpretation: parseOptionalBoolean(
        readParam(searchParams, "requireInterpretation"),
        "case interpretation requirement",
        warnings
      ),
      unitPreference: parseOptionalSingleOption(
        readParam(searchParams, "unit"),
        unitPreferenceOptions.map((option) => option.value),
        "unit preference",
        warnings
      ),
      hintsEnabled: parseOptionalBoolean(readParam(searchParams, "hints"), "hints setting", warnings),
      questionPackId,
      timingAccommodation: parseSingleOption(
        readParam(searchParams, "timingAccommodation"),
        timingAccommodationIds,
        "standard",
        "timing accommodation",
        warnings
      ),
      timeMode,
      feedbackMode: parseSingleOption(
        readParam(searchParams, "feedbackMode"),
        feedbackModeOptions.map((option) => option.value),
        "instant",
        "feedback mode",
        warnings
      ),
      secondsPerQuestion:
        timeMode === "per_question"
          ? parsePositiveInteger(readParam(searchParams, "secondsPerQuestion"), 30, 120, "seconds per question", warnings)
          : undefined,
      totalSessionSeconds:
        timeMode === "session"
          ? parsePositiveInteger(readParam(searchParams, "totalSessionSeconds"), 300, 1800, "total session seconds", warnings)
          : undefined
    }),
    warnings
  };
}

export function buildDrillSessionSeed(settings: DrillSettings, nonce?: string | number): string {
  const seedParts: Array<string | number> = [
    "session",
    settings.categories.join("-"),
    settings.tags?.join("-") ?? "all",
    settings.difficulty,
    settings.questionCount,
    settings.timingAccommodation ?? "standard",
    settings.timeMode,
    settings.feedbackMode,
    ...(settings.questionPackId === undefined ? [] : [settings.questionPackId])
  ];

  if (hasArithmeticCustomization(settings)) {
    seedParts.push(
      `terms-${settings.arithmeticTermCount ?? 2}`,
      `format-${settings.arithmeticNumberFormat ?? "integer"}`,
      `size-${settings.arithmeticOperandSize ?? "medium"}`,
      `negatives-${settings.arithmeticAllowNegatives === true ? "yes" : "no"}`,
      `multiply-${settings.arithmeticMultiplicationStyle ?? "difficulty_scaled"}`,
      `division-${settings.arithmeticDivisionMode ?? "exact"}`,
      `round-${settings.arithmeticDivisionRounding ?? "nearest_0_1"}`,
      `operators-${settings.arithmeticMixedOperators?.join("-") ?? "add-subtract-multiply"}`,
      `parentheses-${settings.arithmeticUseParentheses === false ? "no" : "yes"}`,
      `unit-${settings.unitPreference ?? "none"}`
    );
  }

  if (hasCaseCustomization(settings)) {
    seedParts.push(
      `case-industry-${settings.caseIndustry ?? "any"}`,
      `case-steps-${settings.caseCalculationStepCount ?? "any"}`,
      `case-equation-${settings.caseRequireEquationSetup === false ? "optional" : "required"}`,
      `case-interpretation-${settings.caseRequireInterpretation === true ? "required" : "optional"}`
    );
  }

  if (nonce !== undefined) {
    seedParts.push(`nonce-${nonce}`);
  }

  return seedParts.join(":");
}

function hasArithmeticCustomization(settings: DrillSettings): boolean {
  return (
    settings.arithmeticTermCount !== undefined ||
    settings.arithmeticNumberFormat !== undefined ||
    settings.arithmeticOperandSize !== undefined ||
    settings.arithmeticAllowNegatives !== undefined ||
    settings.arithmeticMultiplicationStyle !== undefined ||
    settings.arithmeticDivisionMode !== undefined ||
    settings.arithmeticDivisionRounding !== undefined ||
    settings.arithmeticMixedOperators !== undefined ||
    settings.arithmeticUseParentheses !== undefined ||
    settings.unitPreference !== undefined
  );
}

function hasCaseCustomization(settings: DrillSettings): boolean {
  return (
    settings.caseIndustry !== undefined ||
    settings.caseCalculationStepCount !== undefined ||
    settings.caseRequireEquationSetup !== undefined ||
    settings.caseRequireInterpretation !== undefined
  );
}

function readParam(searchParams: DrillSessionSearchParams, key: string): string | undefined {
  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(key) ?? undefined;
  }

  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseCsvOptions<TValue extends string>(
  rawValue: string | undefined,
  allowedValues: readonly TValue[],
  label: string,
  warnings: string[]
): TValue[] {
  if (rawValue === undefined || rawValue.trim() === "") {
    return [];
  }

  const allowed = new Set<TValue>(allowedValues);
  const parsed: TValue[] = [];

  for (const candidate of rawValue.split(",")) {
    const value = candidate.trim() as TValue;

    if (allowed.has(value)) {
      parsed.push(value);
    } else if (value !== "") {
      warnings.push(`Ignored unsupported ${label}: ${value}.`);
    }
  }

  return Array.from(new Set(parsed));
}

function parseOptionalCsvOptions<TValue extends string>(
  rawValue: string | undefined,
  allowedValues: readonly TValue[],
  label: string,
  warnings: string[]
): TValue[] | undefined {
  const values = parseCsvOptions(rawValue, allowedValues, label, warnings);
  return values.length > 0 ? values : undefined;
}

function parseSingleOption<TValue extends string>(
  rawValue: string | undefined,
  allowedValues: readonly TValue[],
  fallback: TValue,
  label: string,
  warnings: string[]
): TValue {
  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  const value = rawValue.trim() as TValue;
  if (allowedValues.includes(value)) {
    return value;
  }

  warnings.push(`Used default ${label}; unsupported value was ${rawValue}.`);
  return fallback;
}

function parseOptionalSingleOption<TValue extends string>(
  rawValue: string | undefined,
  allowedValues: readonly TValue[],
  label: string,
  warnings: string[]
): TValue | undefined {
  if (rawValue === undefined || rawValue.trim() === "") {
    return undefined;
  }

  const value = rawValue.trim() as TValue;
  if (allowedValues.includes(value)) {
    return value;
  }

  warnings.push(`Ignored unsupported ${label}: ${rawValue}.`);
  return undefined;
}

function parseOptionalIntegerOption<TValue extends number>(
  rawValue: string | undefined,
  allowedValues: readonly TValue[],
  label: string,
  warnings: string[]
): TValue | undefined {
  if (rawValue === undefined || rawValue.trim() === "") {
    return undefined;
  }

  const value = Number(rawValue);
  if (allowedValues.includes(value as TValue)) {
    return value as TValue;
  }

  warnings.push(`Ignored unsupported ${label}: ${rawValue}.`);
  return undefined;
}

function parseOptionalBoolean(
  rawValue: string | undefined,
  label: string,
  warnings: string[]
): boolean | undefined {
  if (rawValue === undefined || rawValue.trim() === "") {
    return undefined;
  }

  if (["1", "true"].includes(rawValue.toLowerCase())) {
    return true;
  }

  if (["0", "false"].includes(rawValue.toLowerCase())) {
    return false;
  }

  warnings.push(`Ignored unsupported ${label}: ${rawValue}.`);
  return undefined;
}

function parsePositiveInteger(
  rawValue: string | undefined,
  fallback: number,
  max: number,
  label: string,
  warnings: string[]
): number {
  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    warnings.push(`Used default ${label}; expected a positive whole number.`);
    return fallback;
  }

  if (parsed > max) {
    warnings.push(`Capped ${label} at ${max}.`);
    return max;
  }

  return parsed;
}
