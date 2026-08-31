export type SkillCategory =
  | "arithmetic"
  | "percentages"
  | "fractions_decimals_ratios"
  | "growth_compounding"
  | "weighted_averages"
  | "business_math"
  | "case_math"
  | "market_sizing"
  | "exhibit_math";

export type SkillTag =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "mixed_operations"
  | "percentage_of_number"
  | "percentage_change"
  | "reverse_percentage"
  | "percentage_points"
  | "margin"
  | "fraction_conversion"
  | "ratio_conversion"
  | "simple_growth"
  | "compound_growth"
  | "cagr"
  | "rule_of_72"
  | "weighted_average"
  | "revenue"
  | "profit"
  | "cost"
  | "contribution_margin"
  | "breakeven"
  | "roi"
  | "payback"
  | "market_share"
  | "capacity_utilization"
  | "k_m_b_conversion"
  | "unit_conversion";

export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";

export type ArithmeticNumberFormat = "integer" | "decimal";

export type ArithmeticOperandSize = "small" | "medium" | "large";

export type ArithmeticMultiplicationStyle =
  | "difficulty_scaled"
  | "single_digit"
  | "double_digit"
  | "triple_digit"
  | "multiple_5"
  | "multiple_10"
  | "multiple_25"
  | "multiple_50";

export type ArithmeticDivisionMode = "exact" | "approximate" | "remainder";

export type ArithmeticDivisionRounding = "nearest_whole" | "nearest_0_1";

export type ArithmeticMixedOperator = "addition" | "subtraction" | "multiplication" | "division";

export type CaseIndustry =
  | "airlines"
  | "banking"
  | "consumer_goods"
  | "healthcare"
  | "insurance"
  | "manufacturing"
  | "marketplaces"
  | "retail"
  | "saas"
  | "telecom";

export type CaseCalculationStepCount = 2 | 3 | 4 | 5 | 6;

export type QuestionType = "numeric" | "exhibit";

export type UnitType =
  | "none"
  | "currency"
  | "percentage"
  | "percentage_points"
  | "units"
  | "customers"
  | "users"
  | "years"
  | "months"
  | "days"
  | "stores"
  | "k"
  | "m"
  | "b";

export type RoundingRule = "exact" | "nearest_whole" | "nearest_0_1" | "nearest_1k" | "nearest_1m";

export interface ToleranceSpec {
  type: "absolute" | "percentage" | "range";
  value?: number;
  min?: number;
  max?: number;
}

export interface AnswerSpec {
  value: number;
  unit?: UnitType;
  tolerance?: ToleranceSpec;
  errorChecks?: AnswerErrorChecks;
  roundingRule?: RoundingRule;
}

export interface AnswerErrorChecks {
  percentagePointValue?: number;
  roundingTolerance?: ToleranceSpec;
}

export interface ExplanationSpec {
  short: string;
  steps: string[];
  shortcut?: string;
}

export interface InterviewMathEquationOption {
  id: string;
  label: string;
  formulaCorrect: boolean;
  setupCorrect: boolean;
}

export interface InterviewMathInterpretationOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface InterviewMathSpec {
  expectedUnit: UnitType;
  equationOptions: InterviewMathEquationOption[];
  interpretationOptions: InterviewMathInterpretationOption[];
}

export interface CaseStyleSpec {
  calculationStepCount: CaseCalculationStepCount;
  industry: CaseIndustry;
  interviewMath: InterviewMathSpec;
}

export interface QuestionMetadata {
  caseStyle?: CaseStyleSpec;
  variables?: Record<string, number | string>;
  expectedTimeSeconds?: number;
  sourcePackId?: string;
  sourceQuestionId?: string;
  sourceType: "generated" | "manual" | "benchmark";
}

export interface Question {
  id: string;
  type: QuestionType;
  category: SkillCategory;
  tags: SkillTag[];
  difficulty: Difficulty;
  prompt: string;
  answer: AnswerSpec;
  explanation: ExplanationSpec;
  metadata?: QuestionMetadata;
}

export interface DrillSettings {
  categories: SkillCategory[];
  tags?: SkillTag[];
  difficulty: Difficulty;
  questionCount: number;
  arithmeticTermCount?: 2 | 3 | 4 | 5;
  arithmeticNumberFormat?: ArithmeticNumberFormat;
  arithmeticOperandSize?: ArithmeticOperandSize;
  arithmeticAllowNegatives?: boolean;
  arithmeticMultiplicationStyle?: ArithmeticMultiplicationStyle;
  arithmeticDivisionMode?: ArithmeticDivisionMode;
  arithmeticDivisionRounding?: ArithmeticDivisionRounding;
  arithmeticMixedOperators?: ArithmeticMixedOperator[];
  arithmeticUseParentheses?: boolean;
  caseIndustry?: CaseIndustry;
  caseCalculationStepCount?: CaseCalculationStepCount;
  caseRequireEquationSetup?: boolean;
  caseRequireInterpretation?: boolean;
  unitPreference?: UnitType;
  hintsEnabled?: boolean;
  questionPackId?: string;
  timeMode: "untimed" | "per_question" | "session";
  secondsPerQuestion?: number;
  totalSessionSeconds?: number;
  feedbackMode: "instant" | "end_of_session" | "retry_first";
}

export type ErrorType =
  | "none"
  | "arithmetic_error"
  | "magnitude_error"
  | "unit_error"
  | "percentage_point_error"
  | "formula_error"
  | "rounding_error"
  | "timeout"
  | "setup_error"
  | "interpretation_error";

export interface UserResponse {
  questionId: string;
  rawInput: string;
  normalizedValue?: number;
  selectedUnit?: UnitType;
  interviewMath?: InterviewMathResponse;
  isCorrect: boolean;
  errorTypes: ErrorType[];
  timeTakenSeconds: number;
  submittedAt: string;
}

export interface InterviewMathScore {
  formulaSelection: number;
  equationSetup: number;
  calculationAccuracy: number;
  unitsMagnitude: number;
  interpretationSelection: number;
  total: number;
}

export interface InterviewMathResponse {
  equationOptionId?: string;
  interpretationOptionId?: string;
  score: InterviewMathScore;
}

export interface CategoryScore {
  category: SkillCategory;
  accuracy: number;
  averageTimeSeconds: number;
  questionCount: number;
}

export interface ErrorBreakdown {
  errorType: ErrorType;
  count: number;
}

export interface SessionScore {
  totalScore: number;
  accuracy: number;
  averageTimeSeconds: number;
  correctCount: number;
  incorrectCount: number;
  categoryBreakdown: CategoryScore[];
  errorBreakdown: ErrorBreakdown[];
}

export interface DrillSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  settings: DrillSettings;
  questionIds: string[];
  responses: UserResponse[];
  score?: SessionScore;
}

export interface VariableSpec {
  type: "integer" | "decimal" | "percentage" | "currency";
  values?: number[];
  min?: number;
  max?: number;
  step?: number;
  unit?: UnitType;
}

export interface FormulaSpec {
  expression: string;
  outputVariable?: string;
}

export interface ExplanationTemplate {
  steps: string[];
  shortcut?: string;
}

export interface QuestionTemplate {
  id: string;
  category: SkillCategory;
  tags: SkillTag[];
  difficulty: Difficulty[];
  caseStyle?: CaseStyleSpec;
  promptTemplate: string;
  variables: Record<string, VariableSpec>;
  formula: FormulaSpec;
  answerUnit?: UnitType;
  tolerance?: ToleranceSpec;
  roundingRule?: RoundingRule;
  explanationTemplate: ExplanationTemplate;
}

export interface CaseStyleQuestionTemplate extends QuestionTemplate {
  category: "case_math";
  caseStyle: CaseStyleSpec;
}

export interface Formula {
  id: string;
  name: string;
  category: SkillCategory;
  formulaText: string;
  explanation: string;
  example: string;
  tags: SkillTag[];
}

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  signal?: {
    label: string;
    value: string;
  };
  suggestedSettings: DrillSettings;
  priority: "low" | "medium" | "high";
}
