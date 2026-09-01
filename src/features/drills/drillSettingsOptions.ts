import type {
  ArithmeticDivisionMode,
  ArithmeticDivisionRounding,
  ArithmeticMixedOperator,
  ArithmeticMultiplicationStyle,
  ArithmeticNumberFormat,
  ArithmeticOperandSize,
  CaseCalculationStepCount,
  CaseIndustry,
  Difficulty,
  DrillSettings,
  SkillCategory,
  SkillTag,
  UnitType
} from "@/lib/domain";

export interface DrillOption<TValue extends string> {
  value: TValue;
  label: string;
}

export const categoryOptions: DrillOption<SkillCategory>[] = [
  { value: "arithmetic", label: "Arithmetic" },
  { value: "percentages", label: "Percentages" },
  { value: "fractions_decimals_ratios", label: "Fractions and decimals" },
  { value: "growth_compounding", label: "Growth and compounding" },
  { value: "business_math", label: "Business math" },
  { value: "weighted_averages", label: "Weighted averages" },
  { value: "case_math", label: "Case-style mixed" }
];

export const skillTagOptions: DrillOption<SkillTag>[] = [
  { value: "addition", label: "Addition" },
  { value: "subtraction", label: "Subtraction" },
  { value: "multiplication", label: "Multiplication" },
  { value: "division", label: "Division" },
  { value: "mixed_operations", label: "Mixed operations" },
  { value: "percentage_of_number", label: "Percent of number" },
  { value: "percentage_change", label: "Percent change" },
  { value: "reverse_percentage", label: "Reverse percent" },
  { value: "percentage_points", label: "Percentage points" },
  { value: "fraction_conversion", label: "Fraction conversion" },
  { value: "ratio_conversion", label: "Ratio conversion" },
  { value: "revenue", label: "Revenue" },
  { value: "profit", label: "Profit" },
  { value: "cost", label: "Cost" },
  { value: "margin", label: "Margin" },
  { value: "contribution_margin", label: "Contribution margin" },
  { value: "breakeven", label: "Breakeven" },
  { value: "roi", label: "ROI" },
  { value: "payback", label: "Payback" },
  { value: "market_share", label: "Market share" },
  { value: "capacity_utilization", label: "Capacity utilization" },
  { value: "weighted_average", label: "Weighted average" },
  { value: "simple_growth", label: "Simple growth" },
  { value: "compound_growth", label: "Compound growth" },
  { value: "cagr", label: "CAGR" },
  { value: "rule_of_72", label: "Rule of 72" },
  { value: "unit_conversion", label: "Unit conversion" }
];

export const difficultyOptions: DrillOption<Difficulty>[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" }
];

export const questionCountOptions = [5, 10, 20, 30] as const;

export const arithmeticTermCountOptions = [2, 3, 4, 5] as const;

export const arithmeticNumberFormatOptions: DrillOption<ArithmeticNumberFormat>[] = [
  { value: "integer", label: "Integers" },
  { value: "decimal", label: "Decimals" }
];

export const arithmeticOperandSizeOptions: DrillOption<ArithmeticOperandSize>[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" }
];

export const arithmeticMultiplicationStyleOptions: DrillOption<ArithmeticMultiplicationStyle>[] = [
  { value: "difficulty_scaled", label: "Match difficulty" },
  { value: "single_digit", label: "Single-digit" },
  { value: "double_digit", label: "Double-digit" },
  { value: "triple_digit", label: "Triple-digit" },
  { value: "multiple_5", label: "Multiples of 5" },
  { value: "multiple_10", label: "Multiples of 10" },
  { value: "multiple_25", label: "Multiples of 25" },
  { value: "multiple_50", label: "Multiples of 50" }
];

export const arithmeticDivisionModeOptions: DrillOption<ArithmeticDivisionMode>[] = [
  { value: "exact", label: "Exact" },
  { value: "approximate", label: "Approximate" },
  { value: "remainder", label: "Remainder" }
];

export const arithmeticDivisionRoundingOptions: DrillOption<ArithmeticDivisionRounding>[] = [
  { value: "nearest_whole", label: "Nearest whole" },
  { value: "nearest_0_1", label: "Nearest tenth" }
];

export const arithmeticMixedOperatorOptions: DrillOption<ArithmeticMixedOperator>[] = [
  { value: "addition", label: "Add" },
  { value: "subtraction", label: "Subtract" },
  { value: "multiplication", label: "Multiply" },
  { value: "division", label: "Divide" }
];

export const caseIndustryOptions: DrillOption<CaseIndustry>[] = [
  { value: "retail", label: "Retail" },
  { value: "saas", label: "SaaS" },
  { value: "banking", label: "Banking" },
  { value: "insurance", label: "Insurance" },
  { value: "airlines", label: "Airlines" },
  { value: "healthcare", label: "Healthcare" },
  { value: "telecom", label: "Telecom" },
  { value: "consumer_goods", label: "Consumer goods" },
  { value: "marketplaces", label: "Marketplaces" },
  { value: "manufacturing", label: "Manufacturing" }
];

export const caseCalculationStepCountOptions = [2, 3, 4, 5, 6] as const satisfies readonly CaseCalculationStepCount[];

export const unitPreferenceOptions: DrillOption<UnitType>[] = [
  { value: "none", label: "None" },
  { value: "currency", label: "$" },
  { value: "percentage", label: "%" },
  { value: "percentage_points", label: "Percentage points" },
  { value: "k", label: "K" },
  { value: "m", label: "M" },
  { value: "b", label: "B" },
  { value: "customers", label: "Customers" },
  { value: "users", label: "Users" },
  { value: "units", label: "Units" },
  { value: "years", label: "Years" },
  { value: "months", label: "Months" },
  { value: "days", label: "Days" },
  { value: "stores", label: "Stores" }
];

export const timeModeOptions: DrillOption<DrillSettings["timeMode"]>[] = [
  { value: "untimed", label: "Untimed" },
  { value: "per_question", label: "Per question" },
  { value: "session", label: "Session" }
];

export const feedbackModeOptions: DrillOption<DrillSettings["feedbackMode"]>[] = [
  { value: "instant", label: "Instant" },
  { value: "end_of_session", label: "End only" },
  { value: "retry_first", label: "Retry first" }
];

export function buildDrillSettingsQuery(settings: DrillSettings): string {
  const params = new URLSearchParams({
    categories: settings.categories.join(","),
    difficulty: settings.difficulty,
    count: String(settings.questionCount),
    timingAccommodation: settings.timingAccommodation ?? "standard",
    timeMode: settings.timeMode,
    feedbackMode: settings.feedbackMode
  });

  if (settings.tags !== undefined && settings.tags.length > 0) {
    params.set("tags", settings.tags.join(","));
  }

  if (settings.secondsPerQuestion !== undefined) {
    params.set("secondsPerQuestion", String(settings.secondsPerQuestion));
  }

  if (settings.totalSessionSeconds !== undefined) {
    params.set("totalSessionSeconds", String(settings.totalSessionSeconds));
  }

  if (settings.arithmeticTermCount !== undefined) {
    params.set("terms", String(settings.arithmeticTermCount));
  }

  if (settings.arithmeticNumberFormat !== undefined) {
    params.set("numberFormat", settings.arithmeticNumberFormat);
  }

  if (settings.arithmeticOperandSize !== undefined) {
    params.set("operandSize", settings.arithmeticOperandSize);
  }

  if (settings.arithmeticAllowNegatives !== undefined) {
    params.set("negatives", settings.arithmeticAllowNegatives ? "1" : "0");
  }

  if (settings.arithmeticMultiplicationStyle !== undefined) {
    params.set("multiplicationStyle", settings.arithmeticMultiplicationStyle);
  }

  if (settings.arithmeticDivisionMode !== undefined) {
    params.set("divisionMode", settings.arithmeticDivisionMode);
  }

  if (settings.arithmeticDivisionRounding !== undefined) {
    params.set("divisionRounding", settings.arithmeticDivisionRounding);
  }

  if (settings.arithmeticMixedOperators !== undefined && settings.arithmeticMixedOperators.length > 0) {
    params.set("operators", settings.arithmeticMixedOperators.join(","));
  }

  if (settings.arithmeticUseParentheses !== undefined) {
    params.set("parentheses", settings.arithmeticUseParentheses ? "1" : "0");
  }

  if (settings.caseIndustry !== undefined) {
    params.set("caseIndustry", settings.caseIndustry);
  }

  if (settings.caseCalculationStepCount !== undefined) {
    params.set("caseSteps", String(settings.caseCalculationStepCount));
  }

  if (settings.caseRequireEquationSetup !== undefined) {
    params.set("requireEquation", settings.caseRequireEquationSetup ? "1" : "0");
  }

  if (settings.caseRequireInterpretation !== undefined) {
    params.set("requireInterpretation", settings.caseRequireInterpretation ? "1" : "0");
  }

  if (settings.unitPreference !== undefined) {
    params.set("unit", settings.unitPreference);
  }

  if (settings.hintsEnabled !== undefined) {
    params.set("hints", settings.hintsEnabled ? "1" : "0");
  }

  if (settings.questionPackId !== undefined) {
    params.set("source", "question_pack");
    params.set("pack", settings.questionPackId);
  }

  return params.toString();
}
