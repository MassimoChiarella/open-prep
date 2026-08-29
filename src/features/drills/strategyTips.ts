import type { ErrorType, SkillTag } from "@/lib/domain";

export interface StrategyTip {
  id: string;
  title: string;
  body: string;
}

interface StrategyTipDefinition extends StrategyTip {
  errorTypes?: readonly ErrorType[];
  tags?: readonly SkillTag[];
}

export interface ResolveStrategyTipInput {
  errorTypes: readonly ErrorType[];
  tags: readonly SkillTag[];
}

export const strategyTipCatalog: readonly StrategyTipDefinition[] = [
  {
    id: "percentage-points",
    title: "Separate points from percent",
    body: "Subtract the rates for a percentage-point move. Divide by the starting rate only when the prompt asks for percent change.",
    errorTypes: ["percentage_point_error"],
    tags: ["percentage_points"]
  },
  {
    id: "magnitude",
    title: "Estimate the scale first",
    body: "Write K, M, or B beside each input and predict the answer's order of magnitude before calculating.",
    errorTypes: ["magnitude_error"],
    tags: ["k_m_b_conversion"]
  },
  {
    id: "rounding",
    title: "Round once, at the end",
    body: "Carry one extra digit through each step, then apply the requested rounding to the final value.",
    errorTypes: ["rounding_error"]
  },
  {
    id: "weighted-average",
    title: "Check the weights first",
    body: "Make the weights total 100%, multiply each value by its weight, then add the contributions.",
    tags: ["weighted_average"]
  },
  {
    id: "margin",
    title: "Use revenue as the base",
    body: "Label profit and revenue before dividing. Margin and contribution margin both use revenue as the denominator.",
    tags: ["margin", "contribution_margin"]
  },
  {
    id: "breakeven",
    title: "Find contribution per unit first",
    body: "Subtract variable cost from price, then divide fixed costs by that contribution per unit.",
    tags: ["breakeven"]
  },
  {
    id: "unit-conversion",
    title: "Convert before combining",
    body: "Put every input in one unit, write that unit beside each step, and convert only once.",
    errorTypes: ["unit_error"],
    tags: ["unit_conversion"]
  },
  {
    id: "formula",
    title: "Name the relationship first",
    body: "State what the answer depends on in words, then choose the formula before substituting numbers.",
    errorTypes: ["formula_error"]
  },
  {
    id: "setup",
    title: "Map the givens to the equation",
    body: "Label each given, identify the missing value, and place each number into the equation before calculating.",
    errorTypes: ["setup_error"]
  },
  {
    id: "interpretation",
    title: "Answer the business question",
    body: "Restate the result with its unit, direction, and implication for the decision in one sentence.",
    errorTypes: ["interpretation_error"]
  }
];

export const fallbackStrategyTip: StrategyTip = {
  id: "check-structure",
  title: "Make the structure visible",
  body: "Write the givens, the target, and one equation before calculating. Finish with a unit and a reasonableness check."
};

export function resolveStrategyTip({ errorTypes, tags }: ResolveStrategyTipInput): StrategyTip {
  for (const errorType of errorTypes) {
    const tip = strategyTipCatalog.find((candidate) => candidate.errorTypes?.includes(errorType));

    if (tip) {
      return tip;
    }
  }

  for (const tag of tags) {
    const tip = strategyTipCatalog.find((candidate) => candidate.tags?.includes(tag));

    if (tip) {
      return tip;
    }
  }

  return fallbackStrategyTip;
}
