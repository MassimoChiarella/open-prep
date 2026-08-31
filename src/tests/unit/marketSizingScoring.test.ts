import { describe, expect, it } from "vitest";

import { marketSizingTemplates } from "@/data/marketSizing/marketSizingTemplates";
import { evaluateMarketSizingDraft } from "@/features/market-sizing/marketSizingEvaluation";
import { scoreMarketSizingAttempt } from "@/features/market-sizing/marketSizingScoring";

const coffeeTemplate = marketSizingTemplates[0];

describe("market sizing scoring", () => {
  it("awards full rubric points for a complete valid attempt", () => {
    const stepValues = validCoffeeStepValues();
    const evaluation = evaluateMarketSizingDraft({
      template: coffeeTemplate,
      stepValues,
      finalAnswer: "$2.628B"
    });
    const score = scoreMarketSizingAttempt({
      evaluation,
      interpretationId: "plausible",
      stepValues,
      template: coffeeTemplate
    });

    expect(score.totalScore).toBe(100);
    expect(score.maxScore).toBe(100);
    expect(score.errorTypes).toEqual(["none"]);
    expect(score.breakdown.map((dimension) => [dimension.id, dimension.awardedPoints])).toEqual([
      ["structure", 25],
      ["assumptions", 25],
      ["math", 25],
      ["units", 10],
      ["sense_check", 10],
      ["interpretation", 5]
    ]);
  });

  it("scores partial attempts deterministically by dimension", () => {
    const stepValues = {
      ...validCoffeeStepValues(),
      coffee_drinker_rate: "95%",
      sense_check: false
    };
    const evaluation = evaluateMarketSizingDraft({
      template: coffeeTemplate,
      stepValues,
      finalAnswer: "$1"
    });
    const score = scoreMarketSizingAttempt({
      evaluation,
      stepValues,
      template: coffeeTemplate
    });

    expect(score.totalScore).toBe(51);
    expect(score.errorTypes).toEqual(["setup_error", "arithmetic_error", "interpretation_error"]);
    expect(score.breakdown.map((dimension) => [dimension.id, dimension.awardedPoints])).toEqual([
      ["structure", 21],
      ["assumptions", 20],
      ["math", 0],
      ["units", 10],
      ["sense_check", 0],
      ["interpretation", 0]
    ]);
  });

  it("awards unit credit only for an explicit compatible final-answer unit", () => {
    const stepValues = validCoffeeStepValues();
    const bareEvaluation = evaluateMarketSizingDraft({
      template: coffeeTemplate,
      stepValues,
      finalAnswer: "2.628B"
    });
    const explicitEvaluation = evaluateMarketSizingDraft({
      template: coffeeTemplate,
      stepValues,
      finalAnswer: "$2.628B"
    });

    const bare = scoreMarketSizingAttempt({
      evaluation: bareEvaluation,
      interpretationId: "plausible",
      stepValues,
      template: coffeeTemplate
    });
    const explicit = scoreMarketSizingAttempt({
      evaluation: explicitEvaluation,
      interpretationId: "plausible",
      stepValues,
      template: coffeeTemplate
    });

    expect(bareEvaluation.finalAnswer.validation?.unitStatus).toBe("omitted");
    expect(pointsFor(bare, "math")).toBe(25);
    expect(pointsFor(bare, "units")).toBe(0);
    expect(explicitEvaluation.finalAnswer.validation?.unitStatus).toBe("compatible");
    expect(pointsFor(explicit, "units")).toBe(10);
  });

  it("keeps numeric credit independent from an incompatible explicit unit", () => {
    const stepValues = validCoffeeStepValues();
    const evaluation = evaluateMarketSizingDraft({
      template: coffeeTemplate,
      stepValues,
      finalAnswer: "262800000000%"
    });
    const score = scoreMarketSizingAttempt({
      evaluation,
      interpretationId: "plausible",
      stepValues,
      template: coffeeTemplate
    });

    expect(evaluation.finalAnswer.validation).toMatchObject({
      numericMatch: true,
      unitStatus: "incompatible"
    });
    expect(pointsFor(score, "math")).toBe(25);
    expect(pointsFor(score, "units")).toBe(0);
    expect(score.errorTypes).toContain("unit_error");
    expect(score.errorTypes).not.toContain("arithmetic_error");
  });

  it("does not award interpretation credit to an unknown option ID", () => {
    const stepValues = validCoffeeStepValues();
    const evaluation = evaluateMarketSizingDraft({
      template: coffeeTemplate,
      stepValues,
      finalAnswer: "$2.628B"
    });
    const score = scoreMarketSizingAttempt({
      evaluation,
      interpretationId: "not-a-template-option",
      stepValues,
      template: coffeeTemplate
    });

    expect(pointsFor(score, "interpretation")).toBe(0);
    expect(score.errorTypes).toContain("interpretation_error");
  });

  it("uses review content when a required sense check has no explicit boolean step", () => {
    const template = templateWithoutExplicitSenseCheck(true);
    const stepValues = validCoffeeAssumptions();
    const evaluation = evaluateMarketSizingDraft({ template, stepValues, finalAnswer: "$2.628B" });

    const interpreted = scoreMarketSizingAttempt({
      evaluation,
      interpretationId: "plausible",
      stepValues,
      template
    });
    const noted = scoreMarketSizingAttempt({
      evaluation,
      note: "The spend per coffee drinker is plausible.",
      stepValues,
      template
    });
    const missing = scoreMarketSizingAttempt({ evaluation, stepValues, template });

    expect(pointsFor(interpreted, "sense_check")).toBe(10);
    expect(interpreted.errorTypes).toEqual(["none"]);
    expect(pointsFor(noted, "sense_check")).toBe(10);
    expect(noted.errorTypes).toEqual(["none"]);
    expect(pointsFor(missing, "sense_check")).toBe(0);
    expect(missing.errorTypes).toContain("interpretation_error");
  });

  it("makes the sense-check required flag authoritative while preserving the explicit checkbox", () => {
    const optionalTemplate = templateWithoutExplicitSenseCheck(false);
    const optionalStepValues = validCoffeeAssumptions();
    const optionalEvaluation = evaluateMarketSizingDraft({
      template: optionalTemplate,
      stepValues: optionalStepValues,
      finalAnswer: "$2.628B"
    });
    const optional = scoreMarketSizingAttempt({
      evaluation: optionalEvaluation,
      stepValues: optionalStepValues,
      template: optionalTemplate
    });

    const explicitStepValues = { ...validCoffeeStepValues(), sense_check: false };
    const explicitEvaluation = evaluateMarketSizingDraft({
      template: coffeeTemplate,
      stepValues: explicitStepValues,
      finalAnswer: "$2.628B"
    });
    const explicit = scoreMarketSizingAttempt({
      evaluation: explicitEvaluation,
      interpretationId: "plausible",
      stepValues: explicitStepValues,
      template: coffeeTemplate
    });
    const explicitWithoutInterpretation = scoreMarketSizingAttempt({
      evaluation: evaluateMarketSizingDraft({
        template: coffeeTemplate,
        stepValues: validCoffeeStepValues(),
        finalAnswer: "$2.628B"
      }),
      stepValues: validCoffeeStepValues(),
      template: coffeeTemplate
    });

    expect(pointsFor(optional, "sense_check")).toBe(10);
    expect(optional.errorTypes).toContain("interpretation_error");
    expect(pointsFor(explicit, "sense_check")).toBe(0);
    expect(explicit.errorTypes).toContain("interpretation_error");
    expect(pointsFor(explicitWithoutInterpretation, "sense_check")).toBe(10);
    expect(pointsFor(explicitWithoutInterpretation, "interpretation")).toBe(0);
    expect(explicitWithoutInterpretation.errorTypes).toContain("interpretation_error");
  });
});

function validCoffeeStepValues() {
  return {
    population: "3000000",
    coffee_drinker_rate: "60%",
    cups_per_day: "1",
    purchase_days_per_year: "365",
    price_per_cup: "$4",
    sense_check: true
  };
}

function validCoffeeAssumptions() {
  return {
    population: "3000000",
    coffee_drinker_rate: "60%",
    cups_per_day: "1",
    purchase_days_per_year: "365",
    price_per_cup: "$4"
  };
}

function templateWithoutExplicitSenseCheck(required: boolean) {
  return {
    ...coffeeTemplate,
    inputSteps: coffeeTemplate.inputSteps.filter((step) => step.id !== "sense_check"),
    senseCheck: { ...coffeeTemplate.senseCheck, required }
  };
}

function pointsFor(
  score: ReturnType<typeof scoreMarketSizingAttempt>,
  id: ReturnType<typeof scoreMarketSizingAttempt>["breakdown"][number]["id"]
): number | undefined {
  return score.breakdown.find((dimension) => dimension.id === id)?.awardedPoints;
}
