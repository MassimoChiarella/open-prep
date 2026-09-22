import { describe, expect, it } from "vitest";

import {
  businessMathTemplates,
  weightedAverageTemplates
} from "@/data/questionTemplates/businessTemplates";
import { generateQuestionFromTemplate } from "@/features/questions/questionGenerator";
import { createSeededRandom } from "@/lib/random/seededRandom";
import { validateAnswer } from "@/lib/validation/validateAnswer";

const requiredVariantIds = [
  "business_revenue_intermediate_price_001",
  "business_revenue_advanced_volume_001",
  "business_cost_intermediate_fixed_001",
  "business_cost_advanced_variable_001",
  "business_cost_expert_units_001",
  "business_contribution_intermediate_price_001",
  "business_contribution_advanced_variable_cost_001",
  "business_roi_intermediate_gain_001",
  "business_roi_advanced_investment_001",
  "business_roi_expert_comparison_001",
  "business_payback_intermediate_cash_flow_001",
  "business_payback_advanced_max_investment_001",
  "weighted_average_intermediate_mix_shift_001",
  "weighted_average_intermediate_missing_value_001",
  "weighted_average_advanced_missing_weight_001"
];

describe("business content coverage", () => {
  it.each(["weighted_average_beginner_003", "weighted_average_beginner_010"])(
    "%s describes coherent relative sales weights for every configured combination", (id) => {
      const template = weightedAverageTemplates.find((candidate) => candidate.id === id)!;
      const combinations = Object.entries(template.variables).reduce<Record<string, number>[]>(
        (rows, [name, spec]) => rows.flatMap((row) => spec.values!.map((value) => ({ ...row, [name]: value }))),
        [{}]
      );
      expect(combinations).toHaveLength(id.endsWith("003") ? 256 : 729);
      for (const variables of combinations) {
        const question = generateQuestionFromTemplate({
          ...template,
          variables: Object.fromEntries(Object.entries(template.variables).map(([name, spec]) =>
            [name, { ...spec, values: [variables[name]] }]))
        }, { difficulty: "beginner", random: createSeededRandom(1) });
        const suffixes = variables.shareC === undefined ? ["A", "B"] : ["A", "B", "C"];
        const weights = suffixes.map((suffix) => variables[`share${suffix}`]);
        const margins = suffixes.map((suffix) => variables[`margin${suffix}`]);
        const expected = weights.reduce((sum, weight, index) => sum + weight * margins[index], 0)
          / weights.reduce((sum, weight) => sum + weight, 0) / 100;

        expect(question.prompt).toContain(`sales in the ratio ${weights.join(":")}`);
        expect(question.prompt).not.toContain("% of sales");
        expect(question.explanation.steps[0]).toContain("sum of the weights");
        expect(question.answer.value).toBeCloseTo(expected, 12);
        expect(question.answer.value).toBeGreaterThanOrEqual(Math.min(...margins) / 100 - 1e-12);
        expect(question.answer.value).toBeLessThanOrEqual(Math.max(...margins) / 100 + 1e-12);
        expect(validateAnswer(`${(expected * 100).toFixed(2)}%`, question.answer, { locale: "en" }).isCorrect).toBe(true);
      }
    }
  );

  it("includes every requested inverse, comparison, mix-shift, and missing-input variant", () => {
    const ids = new Set([...businessMathTemplates, ...weightedAverageTemplates].map((template) => template.id));

    for (const id of requiredVariantIds) {
      expect(ids).toContain(id);
    }
  });
});
