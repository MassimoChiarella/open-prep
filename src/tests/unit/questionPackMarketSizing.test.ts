import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { marketSizingTemplates } from "@/data/marketSizing/marketSizingTemplates";
import { validateMarketSizingQuestionPackPayload } from "@/features/question-packs/questionPackMarketSizing";

function validPayload(): Record<string, unknown> {
  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "market_sizing",
    id: "market-sizing-starter",
    packVersion: "1.0.0",
    title: "Market Sizing Starter",
    publisher: "Original classroom material",
    license: "Use with permission",
    templates: [structuredClone(marketSizingTemplates[0])]
  };
}

describe("market-sizing question packs", () => {
  it("sanitizes an existing market-sizing template shape", () => {
    const result = validateMarketSizingQuestionPackPayload(validPayload(), "2026-08-10T12:00:00.000Z");

    expect(result.status).toBe("valid");
    if (result.status !== "valid") return;
    expect(result.pack).toMatchObject({
      id: "market-sizing-starter",
      importedAt: "2026-08-10T12:00:00.000Z",
      kind: "market_sizing",
      schemaVersion: 2
    });
    expect(result.pack.templates[0]?.title).toBe("City Coffee Spend");
  });

  it("rejects unknown fields and undeclared formula identifiers", () => {
    const payload = validPayload();
    const template = (payload.templates as Record<string, unknown>[])[0];
    template.remoteUrl = "https://example.test/content";
    (template.finalFormula as Record<string, unknown>).expression = "population * secretMultiplier";

    const result = validateMarketSizingQuestionPackPayload(payload);

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("remoteUrl is not an allowed property"),
        expect.stringContaining('undeclared variable "secretMultiplier"')
      ])
    );
  });

  it("rejects malformed assumption ranges, duplicate variables, and incomplete rubrics", () => {
    const payload = validPayload();
    const template = (payload.templates as Record<string, unknown>[])[0];
    const steps = template.inputSteps as Record<string, unknown>[];
    (steps[0].assumptionRange as Record<string, unknown>).min = 10;
    (steps[0].assumptionRange as Record<string, unknown>).max = 5;
    steps[2].variableName = steps[1].variableName;
    (template.rubric as unknown[]).pop();

    const result = validateMarketSizingQuestionPackPayload(payload);

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("min must be <= max"),
        expect.stringContaining("variableName duplicates"),
        expect.stringContaining("must define all 6 score dimensions")
      ])
    );
  });

  it("rejects optional numeric inputs while allowing an optional boolean sense-check step", () => {
    const invalidPayload = validPayload();
    const invalidTemplate = (invalidPayload.templates as Record<string, unknown>[])[0];
    const invalidSteps = invalidTemplate.inputSteps as Record<string, unknown>[];
    invalidSteps[0].required = false;

    const invalid = validateMarketSizingQuestionPackPayload(invalidPayload);

    expect(invalid.status).toBe("invalid");
    if (invalid.status !== "invalid") return;
    expect(invalid.errors).toContain("$.templates[0].inputSteps[0].required must be true for numeric inputs.");

    const validOptionalPayload = validPayload();
    const validOptionalTemplate = (validOptionalPayload.templates as Record<string, unknown>[])[0];
    const validOptionalSteps = validOptionalTemplate.inputSteps as Record<string, unknown>[];
    const booleanSenseCheck = validOptionalSteps.find((step) => step.id === "sense_check");
    if (booleanSenseCheck === undefined) throw new Error("Expected the built-in boolean sense-check step.");
    booleanSenseCheck.required = false;

    expect(validateMarketSizingQuestionPackPayload(validOptionalPayload).status).toBe("valid");
  });

  it("requires whole-number ranges for integer inputs", () => {
    const payload = validPayload();
    const steps = ((payload.templates as Record<string, unknown>[])[0].inputSteps as Record<string, unknown>[]);
    (steps[0].assumptionRange as Record<string, unknown>).min = 2_000_000.5;
    (steps[3].assumptionRange as Record<string, unknown>).max = 365.5;

    const result = validateMarketSizingQuestionPackPayload(payload);

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.errors).toEqual(expect.arrayContaining([
      "$.templates[0].inputSteps[0].assumptionRange.min must be a whole number for integer inputs.",
      "$.templates[0].inputSteps[3].assumptionRange.max must be a whole number for integer inputs."
    ]));
  });

  it("keeps the canonical schema aligned with whole-number integer ranges", () => {
    const schema = JSON.parse(
      readFileSync(resolve(process.cwd(), "public", "question-pack-v2.schema.json"), "utf8")
    ) as { $defs: { marketSizingNumericInputStep: unknown } };

    expect(schema.$defs.marketSizingNumericInputStep).toMatchObject({
      allOf: [{
        if: { properties: { inputKind: { const: "integer" } }, required: ["inputKind"] },
        then: {
          properties: {
            assumptionRange: {
              properties: { min: { type: "integer" }, max: { type: "integer" } }
            }
          }
        }
      }]
    });
  });

  it.each([
    ["minimum", "population * coffeeDrinkerRate * purchaseDaysPerYear * pricePerCup / (cupsPerDay + 2)", "cupsPerDay=-2"],
    ["maximum", "population * coffeeDrinkerRate * purchaseDaysPerYear * pricePerCup / (cupsPerDay - 4)", "cupsPerDay=4"],
    ["midpoint", "population * coffeeDrinkerRate * purchaseDaysPerYear * pricePerCup / (cupsPerDay - 1)", "cupsPerDay=1"],
    ["closest zero", "population * coffeeDrinkerRate * purchaseDaysPerYear * pricePerCup / cupsPerDay", "cupsPerDay=0"]
  ])("rejects a formula that fails at the representative %s", (_label, expression, expectedSample) => {
    const payload = validPayload();
    const template = (payload.templates as Record<string, unknown>[])[0];
    const steps = template.inputSteps as Record<string, unknown>[];
    (steps[2].assumptionRange as Record<string, unknown>).min = -2;
    (steps[2].assumptionRange as Record<string, unknown>).max = 4;
    (template.finalFormula as Record<string, unknown>).expression = expression;

    const result = validateMarketSizingQuestionPackPayload(payload);

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("$.templates[0].finalFormula.expression fails for representative values"),
      expect.stringContaining(expectedSample),
      expect.stringContaining("Formula cannot divide by zero")
    ]));
  });

  it("checks pairwise range variations while keeping high-dimensional validation bounded", () => {
    const payload = validPayload();
    const template = (payload.templates as Record<string, unknown>[])[0];
    const steps = template.inputSteps as Record<string, unknown>[];
    (steps[2].assumptionRange as Record<string, unknown>).min = 1;
    (steps[2].assumptionRange as Record<string, unknown>).max = 5;
    (steps[4].assumptionRange as Record<string, unknown>).min = 2;
    (steps[4].assumptionRange as Record<string, unknown>).max = 8;
    (template.finalFormula as Record<string, unknown>).expression =
      "population * coffeeDrinkerRate * purchaseDaysPerYear / (cupsPerDay - pricePerCup)";

    const result = validateMarketSizingQuestionPackPayload(payload);

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("cupsPerDay=5"),
      expect.stringContaining("pricePerCup=5"),
      expect.stringContaining("Formula cannot divide by zero")
    ]));
  });

  it("checks a mixed three-variable corner that single and pairwise probes cannot reach", () => {
    const payload = validPayload();
    const template = (payload.templates as Record<string, unknown>[])[0];
    const steps = template.inputSteps as Record<string, unknown>[];
    for (const step of steps.filter(({ variableName }) => variableName !== undefined)) {
      step.assumptionRange = { min: 0, max: 1, unit: step.unit };
    }
    (template.finalFormula as Record<string, unknown>).expression = [
      "1 / ((population - 1)^2",
      "+ (coffeeDrinkerRate - 1)^2",
      "+ (cupsPerDay - 1)^2",
      "+ purchaseDaysPerYear^2",
      "+ pricePerCup^2)"
    ].join(" ");

    const result = validateMarketSizingQuestionPackPayload(payload);

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("population=1"),
      expect.stringContaining("coffeeDrinkerRate=1"),
      expect.stringContaining("cupsPerDay=1"),
      expect.stringContaining("purchaseDaysPerYear=0"),
      expect.stringContaining("pricePerCup=0"),
      expect.stringContaining("Formula cannot divide by zero")
    ]));
  });

  it("rejects a failing constant formula when a template has no numeric variables", () => {
    const payload = validPayload();
    const template = (payload.templates as Record<string, unknown>[])[0];
    template.inputSteps = [{
      id: "planning-note",
      inputKind: "note",
      label: "Planning note",
      required: true
    }];
    (template.finalFormula as Record<string, unknown>).expression = "1 / 0";

    const result = validateMarketSizingQuestionPackPayload(payload);

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringMatching(/\.expression fails for representative values \(\).*Formula cannot divide by zero/)
    ]));
  });

  it("samples same-sign extreme ranges with a finite midpoint", () => {
    const payload = validPayload();
    const template = (payload.templates as Record<string, unknown>[])[0];
    const steps = template.inputSteps as Record<string, unknown>[];
    (steps[0].assumptionRange as Record<string, unknown>).min = Number.MAX_VALUE * 0.75;
    (steps[0].assumptionRange as Record<string, unknown>).max = Number.MAX_VALUE;
    (template.finalFormula as Record<string, unknown>).expression = [
      "population / population",
      "coffeeDrinkerRate / coffeeDrinkerRate",
      "cupsPerDay / cupsPerDay",
      "purchaseDaysPerYear / purchaseDaysPerYear",
      "pricePerCup / pricePerCup"
    ].join(" + ");

    expect(validateMarketSizingQuestionPackPayload(payload).status).toBe("valid");
  });
});
