import type { Difficulty, RoundingRule, ToleranceSpec, UnitType } from "@/lib/domain";

export type MarketSizingIndustry =
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

export type MarketSizingInputKind =
  | "boolean"
  | "choice"
  | "currency"
  | "integer"
  | "note"
  | "number"
  | "percentage";

export type MarketSizingType = "capacity_based" | "demand_side" | "revenue_pool" | "supply_side";

export type MarketSizingScoreDimension =
  | "assumptions"
  | "interpretation"
  | "math"
  | "sense_check"
  | "structure"
  | "units";

export interface MarketSizingAssumptionRange {
  max: number;
  min: number;
  unit?: UnitType;
}

export interface MarketSizingChoiceOption {
  id: string;
  label: string;
}

export interface MarketSizingInputStep {
  assumptionRange?: MarketSizingAssumptionRange;
  helperText?: string;
  id: string;
  inputKind: MarketSizingInputKind;
  label: string;
  options?: readonly MarketSizingChoiceOption[];
  required: boolean;
  unit?: UnitType;
  variableName?: string;
}

export interface MarketSizingFormulaSpec {
  expression: string;
  outputVariable?: string;
  roundingRule: RoundingRule;
  tolerance: ToleranceSpec;
}

export interface MarketSizingSenseCheckSpec {
  interpretationOptions?: readonly MarketSizingChoiceOption[];
  prompt: string;
  required: boolean;
}

export interface MarketSizingRubricDimension {
  id: MarketSizingScoreDimension;
  label: string;
  maxPoints: number;
}

export interface MarketSizingTemplate {
  description: string;
  difficulty: Difficulty;
  finalFormula: MarketSizingFormulaSpec;
  id: string;
  industry: MarketSizingIndustry;
  inputSteps: readonly MarketSizingInputStep[];
  outputUnit: UnitType;
  prompt: string;
  rubric: readonly MarketSizingRubricDimension[];
  senseCheck: MarketSizingSenseCheckSpec;
  sizingType: MarketSizingType;
  title: string;
}

export const defaultMarketSizingRubric = [
  { id: "structure", label: "Structure", maxPoints: 25 },
  { id: "assumptions", label: "Assumptions", maxPoints: 25 },
  { id: "math", label: "Math", maxPoints: 25 },
  { id: "units", label: "Units", maxPoints: 10 },
  { id: "sense_check", label: "Sense-check", maxPoints: 10 },
  { id: "interpretation", label: "Interpretation", maxPoints: 5 }
] as const satisfies readonly MarketSizingRubricDimension[];
