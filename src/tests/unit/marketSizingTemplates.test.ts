import { describe, expect, it } from "vitest";

import { marketSizingTemplates } from "@/data/marketSizing/marketSizingTemplates";
import {
  defaultMarketSizingRubric,
  type MarketSizingIndustry,
  type MarketSizingTemplate,
} from "@/features/market-sizing/marketSizingTypes";
import { evaluateFormulaExpression } from "@/lib/math/formulaEvaluator";

const formulaIdentifierPattern = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
const templates: readonly MarketSizingTemplate[] = marketSizingTemplates;

describe("market sizing templates", () => {
  it("bundles at least 15 original guided market sizing prompts across target industries", () => {
    expect(templates.length).toBeGreaterThanOrEqual(15);
    expect(new Set(templates.map((template) => template.id)).size).toBe(templates.length);
    expect(new Set(templates.map((template) => template.industry))).toEqual(
      new Set<MarketSizingIndustry>([
        "airlines",
        "banking",
        "consumer_goods",
        "healthcare",
        "insurance",
        "manufacturing",
        "marketplaces",
        "retail",
        "saas",
        "telecom"
      ])
    );
  });

  it("defines complete deterministic content for every market sizing template", () => {
    for (const template of templates) {
      expect(template.id, `${template.id} id`).toMatch(/^market_[a-z0-9_]+_\d{3}$/);
      expect(template.prompt.trim(), `${template.id} prompt`).not.toHaveLength(0);
      expect(template.description.trim(), `${template.id} description`).not.toHaveLength(0);
      expect(template.inputSteps.length, `${template.id} steps`).toBeGreaterThanOrEqual(4);
      expect(template.inputSteps.some((step) => step.id === "sense_check"), `${template.id} sense-check step`).toBe(
        true
      );
      expect(template.senseCheck.required, `${template.id} required sense-check`).toBe(true);
      expect(template.senseCheck.prompt.trim(), `${template.id} sense-check prompt`).not.toHaveLength(0);
      expect(template.rubric, `${template.id} rubric`).toBe(defaultMarketSizingRubric);
      expect(template.rubric.map((dimension) => dimension.id), `${template.id} rubric dimensions`).toEqual(
        ["structure", "assumptions", "math", "units", "sense_check", "interpretation"]
      );

      const stepIds = template.inputSteps.map((step) => step.id);

      expect(new Set(stepIds).size, `${template.id} step IDs`).toBe(stepIds.length);
    }
  });

  it("keeps formula variables backed by ranged numeric assumption steps", () => {
    for (const template of templates) {
      const variableNames = template.inputSteps.flatMap((step) =>
        step.variableName === undefined ? [] : [step.variableName]
      );
      const formulaIdentifiers = getFormulaIdentifiers(template);

      expect(formulaIdentifiers, `${template.id} formula identifiers`).toEqual(new Set(variableNames));
      expect(new Set(variableNames).size, `${template.id} variable names`).toBe(variableNames.length);

      for (const variableName of variableNames) {
        const step = template.inputSteps.find((inputStep) => inputStep.variableName === variableName);

        expect(step, `${template.id} ${variableName} step`).toBeDefined();
        expect(step?.assumptionRange, `${template.id} ${variableName} assumption range`).toBeDefined();
        expect(step?.assumptionRange?.min, `${template.id} ${variableName} min`).toBeLessThanOrEqual(
          step?.assumptionRange?.max ?? Number.NEGATIVE_INFINITY
        );
      }
    }
  });

  it("evaluates each final formula with midpoint assumptions", () => {
    for (const template of templates) {
      const variables = midpointVariables(template);
      const result = evaluateFormulaExpression(template.finalFormula.expression, variables);

      expect(Number.isFinite(result), `${template.id} formula result`).toBe(true);
      expect(result, `${template.id} positive result`).toBeGreaterThan(0);
    }
  });
});

function midpointVariables(template: MarketSizingTemplate): Record<string, number> {
  return Object.fromEntries(
    template.inputSteps
      .filter((step) => step.variableName !== undefined)
      .map((step) => {
        const range = step.assumptionRange;

        if (range === undefined) {
          throw new Error(`Missing assumption range for ${template.id}:${step.id}.`);
        }

        return [step.variableName as string, (range.min + range.max) / 2];
      })
  );
}

function getFormulaIdentifiers(template: MarketSizingTemplate): Set<string> {
  return new Set(
    Array.from(template.finalFormula.expression.matchAll(formulaIdentifierPattern), (match) => match[0])
  );
}
