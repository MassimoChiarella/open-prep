import { describe, expect, it } from "vitest";

import {
  businessMathTemplates,
  weightedAverageTemplates
} from "@/data/questionTemplates/businessTemplates";

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
  it("includes every requested inverse, comparison, mix-shift, and missing-input variant", () => {
    const ids = new Set([...businessMathTemplates, ...weightedAverageTemplates].map((template) => template.id));

    for (const id of requiredVariantIds) {
      expect(ids).toContain(id);
    }
  });
});
