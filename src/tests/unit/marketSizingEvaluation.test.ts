import { describe, expect, it } from "vitest";

import { marketSizingTemplates } from "@/data/marketSizing/marketSizingTemplates";
import {
  evaluateMarketSizingDraft,
  evaluateMarketSizingFinalAnswer,
} from "@/features/market-sizing/marketSizingEvaluation";
import type { MarketSizingInputStep } from "@/features/market-sizing/marketSizingTypes";

const coffeeTemplate = marketSizingTemplates[0];

describe("market sizing evaluation", () => {
  it.each([
    ["coffee_drinker_rate", "$0.6", "coffeeDrinkerRate"],
    ["coffee_drinker_rate", "0.6 users", "coffeeDrinkerRate"],
    ["coffee_drinker_rate", "0.6pp", "coffeeDrinkerRate"],
    ["price_per_cup", "400%", "pricePerCup"],
    ["price_per_cup", "4 units", "pricePerCup"],
    ["cups_per_day", "$1", "cupsPerDay"]
  ])("rejects an explicit incompatible unit in %s", (stepId, value, variableName) => {
    const evaluation = evaluateMarketSizingDraft({
      template: coffeeTemplate,
      stepValues: { ...coffeeStepValues(), [stepId]: value },
      finalAnswer: "$2.628B"
    });
    expect(evaluation.assumptionEvaluations.find((step) => step.stepId === stepId)).toMatchObject({
      status: "invalid", message: "Check both the number and the unit."
    });
    expect(evaluation.variables).not.toHaveProperty(variableName);
    expect(evaluation.rangeSummary).toEqual({ inRange: 4, outOfRange: 0, total: 5 });
    expect(evaluation.calculatedValue).toBeUndefined();
    expect(evaluation.finalAnswer.status).toBe("not_ready");
  });

  it.each([
    ["en", "0.6", "4"], ["en", "60%", "$4"], ["en", "3/5", "4 dollars"],
    ["en", "60 percent", "0.004K"], ["de", "0,6", "4,00 €"]
  ])("preserves legitimate assumption notation in %s: %s and %s", (locale, rate, price) => {
    const evaluation = evaluateMarketSizingDraft({
      locale, template: coffeeTemplate,
      stepValues: { ...coffeeStepValues(), coffee_drinker_rate: rate, price_per_cup: price }
    });
    expect(evaluation.variables).toMatchObject({ coffeeDrinkerRate: 0.6, pricePerCup: 4 });
    expect(evaluation.rangeSummary).toEqual({ inRange: 5, outOfRange: 0, total: 5 });
    expect(evaluation.calculatedValue).toBe(2_628_000_000);
  });

  it("checks percentage and currency input kinds even without optional unit metadata", () => {
    const template = {
      ...coffeeTemplate,
      inputSteps: coffeeTemplate.inputSteps.map(({ unit: _unit, ...step }: MarketSizingInputStep) => step)
    };
    const evaluation = evaluateMarketSizingDraft({
      template, stepValues: { ...coffeeStepValues(), coffee_drinker_rate: "$0.6", price_per_cup: "400%" }
    });
    expect(evaluation.assumptionEvaluations.filter((step) => step.status === "invalid").map((step) => step.stepId))
      .toEqual(["coffee_drinker_rate", "price_per_cup"]);
    expect(evaluation.calculatedValue).toBeUndefined();
  });

  it("explicitly validates a no-unit output while rejecting conflicting typed units", () => {
    const template = { ...coffeeTemplate, outputUnit: "none" as const };
    expect(evaluateMarketSizingFinalAnswer(template, 5, "5")).toMatchObject({
      status: "match", validation: { numericMatch: true, unitStatus: "compatible", errorTypes: ["none"] }
    });
    expect(evaluateMarketSizingFinalAnswer(template, 5, "$5")).toMatchObject({
      status: "mismatch", validation: { numericMatch: true, unitStatus: "incompatible", errorTypes: ["unit_error"] }
    });
    expect(evaluateMarketSizingFinalAnswer(coffeeTemplate, 5, "5").validation?.unitStatus).toBe("omitted");
  });

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

  it("propagates locale separators while keeping number-input values standardized", () => {
    const evaluation = evaluateMarketSizingDraft({
      locale: "de",
      template: coffeeTemplate,
      stepValues: {
        population: "3000000",
        coffee_drinker_rate: "60%",
        cups_per_day: "1.0",
        purchase_days_per_year: "365",
        price_per_cup: "4,00 €",
        sense_check: true
      },
      finalAnswer: "2,628B €"
    });

    expect(evaluation.variables).toMatchObject({ coffeeDrinkerRate: 0.6, cupsPerDay: 1, pricePerCup: 4 });
    expect(evaluation.finalAnswer.status).toBe("match");
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

  it("rejects fractional integer assumptions and excludes them from formula variables", () => {
    const decimal = evaluateMarketSizingDraft({
      template: coffeeTemplate,
      stepValues: {
        population: "3,000,000.5",
        coffee_drinker_rate: "60%",
        cups_per_day: "1",
        purchase_days_per_year: "365",
        price_per_cup: "$4",
        sense_check: true
      }
    });

    expect(decimal.assumptionEvaluations.find((item) => item.stepId === "population")).toMatchObject({
      message: "Enter a whole number.",
      status: "invalid"
    });
    expect(decimal.variables).not.toHaveProperty("population");
    expect(decimal.calculatedValue).toBeUndefined();

    const negativeInteger = evaluateMarketSizingDraft({
      template: coffeeTemplate,
      stepValues: {
        population: "-3000000",
        coffee_drinker_rate: "60%",
        cups_per_day: "1",
        purchase_days_per_year: "365",
        price_per_cup: "$4",
        sense_check: true
      }
    });

    expect(negativeInteger.assumptionEvaluations.find((item) => item.stepId === "population")).toMatchObject({
      normalizedValue: -3_000_000,
      status: "out_of_range"
    });
    expect(negativeInteger.variables.population).toBe(-3_000_000);
    expect(negativeInteger.calculatedValue).toBe(-2_628_000_000);
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
    const interviewMarginMatch = evaluateMarketSizingFinalAnswer(
      coffeeTemplate,
      1_000_000,
      "$1.09M",
      undefined,
      true
    );
    const interviewMarginMiss = evaluateMarketSizingFinalAnswer(
      coffeeTemplate,
      1_000_000,
      "$1.101M",
      undefined,
      true
    );

    expect(match.status).toBe("match");
    expect(mismatch.status).toBe("mismatch");
    expect(interviewMarginMatch.status).toBe("match");
    expect(interviewMarginMiss.status).toBe("mismatch");
    expect(mismatch.validation?.errorTypes).toContain("arithmetic_error");
  });
});

function coffeeStepValues() {
  return {
    population: "3000000", coffee_drinker_rate: "60%", cups_per_day: "1",
    purchase_days_per_year: "365", price_per_cup: "$4", sense_check: true
  };
}
