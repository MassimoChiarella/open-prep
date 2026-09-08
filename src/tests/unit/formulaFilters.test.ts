import { describe, expect, it } from "vitest";

import { coreFormulas } from "@/data/formulaLibrary/coreFormulas";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { parseDrillSettingsQuery } from "@/features/drills/drillSessionQuery";
import {
  buildFormulaDrillHref,
  filterFormulas,
  getFormulaCategoryOptions
} from "@/features/formulas/formulaFilters";

describe("formula library filters", () => {
  it("filters formulas by search text", () => {
    const matches = filterFormulas(coreFormulas, { category: "all", searchTerm: "breakeven" });

    expect(matches.map((formula) => formula.id)).toEqual(["breakeven_volume"]);
  });

  it("filters formulas by category", () => {
    const matches = filterFormulas(coreFormulas, { category: "weighted_averages", searchTerm: "" });

    expect(matches.map((formula) => formula.id)).toEqual(["weighted_average"]);
  });

  it("builds deterministic related drill links", () => {
    const revenueFormula = coreFormulas.find((formula) => formula.id === "revenue");
    const cagrFormula = coreFormulas.find((formula) => formula.id === "cagr");

    expect(revenueFormula).toBeDefined();
    expect(cagrFormula).toBeDefined();
    expect(buildFormulaDrillHref(revenueFormula!)).toContain("categories=business_math");
    expect(buildFormulaDrillHref(revenueFormula!)).toContain("tags=revenue");
    expect(buildFormulaDrillHref(cagrFormula!)).toContain("categories=growth_compounding");
    expect(buildFormulaDrillHref(cagrFormula!)).toContain("tags=cagr");
  });

  it.each(["cagr", "rule_of_72"])("generates the requested growth skill from the %s link", (id) => {
    const formula = coreFormulas.find((candidate) => candidate.id === id)!;
    const params = new URL(buildFormulaDrillHref(formula), "https://example.test").searchParams;
    const session = createDrillSession({ settings: parseDrillSettingsQuery(params).settings, seed: `formula-link:${id}` });
    expect(session.questions).toHaveLength(5);
    expect(session.questions.every((question) => question.category === "growth_compounding" && question.tags.includes(id as "cagr" | "rule_of_72"))).toBe(true);
  });

  it("returns only categories represented in formula data", () => {
    expect(getFormulaCategoryOptions(coreFormulas).map((option) => option.value)).toEqual([
      "business_math",
      "growth_compounding",
      "percentages",
      "weighted_averages"
    ]);
  });
});
