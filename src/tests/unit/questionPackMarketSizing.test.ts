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
});
