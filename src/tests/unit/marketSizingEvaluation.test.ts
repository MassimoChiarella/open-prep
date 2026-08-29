import { describe, expect, it } from "vitest";

import { marketSizingTemplates } from "@/data/marketSizing/marketSizingTemplates";
import {
  evaluateMarketSizingDraft,
  evaluateMarketSizingFinalAnswer,
} from "@/features/market-sizing/marketSizingEvaluation";

const coffeeTemplate = marketSizingTemplates[0];

describe("market sizing evaluation", () => {
  it("calculates a deterministic result from parsed in-range assumptions", () => {
    const evaluation = evaluateMarketSizingDraft({
      template: coffeeTemplate,
      stepValues: {
        population: "3000000",
        coffee_drinker_rate: "60%",
        cups_per_day: "1",
        purchase_days_per_year: "365",
        price_per_cup: "$4",
        sense_check: true
      },
      finalAnswer: "$2.628B"
    });

    expect(evaluation.variables).toEqual({
      population: 3_000_000,
      coffeeDrinkerRate: 0.6,
      cupsPerDay: 1,
      purchaseDaysPerYear: 365,
      pricePerCup: 4
    });
    expect(evaluation.calculatedValue).toBe(2_628_000_000);
    expect(evaluation.rangeSummary).toEqual({ inRange: 5, outOfRange: 0, total: 5 });
    expect(evaluation.finalAnswer).toMatchObject({
      normalizedValue: 2_628_000_000,
      status: "match"
    });
  });

  it("flags assumptions outside local ranges while still calculating from the inputs", () => {
    const evaluation = evaluateMarketSizingDraft({
      template: coffeeTemplate,
      stepValues: {
        population: "3000000",
        coffee_drinker_rate: "95%",
        cups_per_day: "1",
        purchase_days_per_year: "365",
        price_per_cup: "$4",
        sense_check: true
      }
    });

    expect(evaluation.calculatedValue).toBe(4_161_000_000);
    expect(evaluation.rangeSummary).toEqual({ inRange: 4, outOfRange: 1, total: 5 });
    expect(evaluation.assumptionEvaluations.find((item) => item.stepId === "coffee_drinker_rate")).toMatchObject({
      normalizedValue: 0.95,
      status: "out_of_range"
    });
  });

  it("withholds calculation until every formula variable parses", () => {
    const evaluation = evaluateMarketSizingDraft({
      template: coffeeTemplate,
      stepValues: {
        population: "city",
        coffee_drinker_rate: "60%"
      },
      finalAnswer: "$1B"
    });

    expect(evaluation.calculatedValue).toBeUndefined();
    expect(evaluation.finalAnswer.status).toBe("not_ready");
    expect(evaluation.assumptionEvaluations.find((item) => item.stepId === "population")).toMatchObject({
      message: "Enter a valid number.",
      status: "invalid"
    });
  });

  it("returns an actionable error when learner assumptions make the formula fail", () => {
    const template = {
      ...coffeeTemplate,
      finalFormula: { ...coffeeTemplate.finalFormula, expression: "population / cupsPerDay" }
    };
    const evaluation = evaluateMarketSizingDraft({
      template,
      stepValues: {
        population: "3000000",
        coffee_drinker_rate: "60%",
        cups_per_day: "0",
        purchase_days_per_year: "365",
        price_per_cup: "$4",
        sense_check: true
      },
      finalAnswer: "$1B"
    });

    expect(evaluation.calculatedValue).toBeUndefined();
    expect(evaluation.calculationError).toContain("Formula cannot divide by zero");
    expect(evaluation.finalAnswer).toMatchObject({
      message: expect.stringContaining("Change the assumptions and try again"),
      status: "not_ready"
    });
  });

  it("compares final answers against the calculated value with template tolerance", () => {
    const match = evaluateMarketSizingFinalAnswer(coffeeTemplate, 1_000_000, "$1.01M");
    const mismatch = evaluateMarketSizingFinalAnswer(coffeeTemplate, 1_000_000, "$500K");

    expect(match.status).toBe("match");
    expect(mismatch.status).toBe("mismatch");
    expect(mismatch.validation?.errorTypes).toContain("arithmetic_error");
  });
});
