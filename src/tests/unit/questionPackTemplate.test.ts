import { describe, expect, it } from "vitest";

import { validateGeneratedTemplateQuestionPackPayload } from "@/features/question-packs/questionPackTemplate";
import { representativeValues } from "@/features/question-packs/questionPackValidation";
import type { VariableSpec } from "@/lib/domain";

describe("generated-template formula domain validation", () => {
  it("retains the middle representative when the nearest-zero value duplicates a bound", () => {
    expect(representativeValues([1, 10, 5, 1])).toEqual([1, 10, 5]);
    expect(representativeValues([-10, -1, -6, -1])).toEqual([-10, -1, -6]);
  });

  it.each([
    [{ a: { type: "integer", min: 1, max: 10 } }, "1 / (a - 5)", "a=5"],
    [{ a: { type: "integer", min: 1, max: 256 } }, "1 / (a - 129)", "a=129"],
    [{ a: { type: "integer", values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } }, "1 / (a - 7)", "a=7"],
    [
      { a: { type: "integer", min: 1, max: 16 }, b: { type: "integer", min: 1, max: 16 } },
      "1 / ((a - 7)^2 + (b - 11)^2)", "a=7, b=11"
    ],
    [
      { a: { type: "decimal", min: 0.1, max: 0.4, step: 0.1 }, b: { type: "integer", values: [10, 20, 30] } },
      "1 / ((a - 0.2)^2 + (b - 20)^2)", "a=0.2, b=20"
    ]
  ] satisfies Array<[Record<string, VariableSpec>, string, string]>)(
    "rejects an interior singularity for %j", (variables, expression, invalidValues) => {
      const result = validateGeneratedTemplateQuestionPackPayload(payload(variables, expression));
      expect(result.status).toBe("invalid");
      if (result.status === "valid") throw new Error("Expected an invalid formula domain.");
      expect(result.errors).toContain(
        `$.templates[0].formula.expression fails for representative values (${invalidValues}): Formula cannot divide by zero.`
      );
    }
  );

  it("accepts complete small domains and bounded large domains with safe formulas", () => {
    for (const maximum of [256, 10_001]) {
      expect(validateGeneratedTemplateQuestionPackPayload(payload(
        { a: { type: "integer", min: 1, max: maximum } }, "1 / (a + 1)"
      )).status).toBe("valid");
    }
  });
});

function payload(variables: Record<string, VariableSpec>, expression: string) {
  return {
    format: "math-drill-question-pack", schemaVersion: 2, kind: "generated_template",
    id: "safe-domain", packVersion: "1", title: "Safe domain",
    templates: [{
      id: "domain", category: "arithmetic", tags: ["division"], difficulty: ["beginner"],
      promptTemplate: "Calculate the answer.", variables, formula: { expression }, answerUnit: "none",
      explanationTemplate: { steps: ["The answer is {answer}."] }
    }]
  };
}
