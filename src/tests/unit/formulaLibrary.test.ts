import { describe, expect, it } from "vitest";

import { coreFormulas } from "@/data/formulaLibrary/coreFormulas";

const requiredFormulaIds = [
  "revenue",
  "profit",
  "margin",
  "total_cost",
  "contribution_margin",
  "breakeven_volume",
  "roi",
  "payback_period",
  "percentage_change",
  "weighted_average",
  "cagr",
  "rule_of_72",
  "market_share",
  "capacity_utilization"
] as const;

describe("core formula library", () => {
  it("contains all required MVP formulas", () => {
    expect(coreFormulas.map((formula) => formula.id)).toEqual(requiredFormulaIds);
  });

  it("uses unique ids and complete card content", () => {
    const ids = new Set(coreFormulas.map((formula) => formula.id));

    expect(ids.size).toBe(coreFormulas.length);
    expect(coreFormulas).toHaveLength(14);

    for (const formula of coreFormulas) {
      expect(formula.name).not.toHaveLength(0);
      expect(formula.formulaText).toContain("=");
      expect(formula.explanation.length).toBeGreaterThan(24);
      expect(formula.example.length).toBeGreaterThan(24);
      expect(formula.tags.length).toBeGreaterThan(0);
    }
  });
});
