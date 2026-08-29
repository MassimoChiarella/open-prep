import { describe, expect, it } from "vitest";

import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import { generateCustomArithmeticQuestion } from "@/features/questions/arithmeticQuestionGenerator";
import type { DrillSettings, Question, SkillTag } from "@/lib/domain";
import { createSeededRandom } from "@/lib/random/seededRandom";

describe("operation-specific arithmetic controls", () => {
  it("generates deterministic multiplication factors with the selected friendly multiple", () => {
    const drill = settings({
      arithmeticMultiplicationStyle: "multiple_25",
      tags: ["multiplication"]
    });
    const first = generate("multiplication", drill, "friendly-multiple");
    const second = generate("multiplication", drill, "friendly-multiple");

    expect(first).toEqual(second);
    expect(numericTerms(first).every((value) => value % 25 === 0)).toBe(true);
  });

  it("generates approximate division with the requested rounding rule", () => {
    const question = generate(
      "division",
      settings({
        arithmeticDivisionMode: "approximate",
        arithmeticDivisionRounding: "nearest_whole",
        tags: ["division"]
      }),
      "approximate-division"
    );
    const [dividend, divisor] = numericTerms(question);

    expect(question.prompt).toContain("Round to the nearest whole number.");
    expect(question.answer.roundingRule).toBe("nearest_whole");
    expect(question.answer.value).toBe(Math.round(dividend / divisor));
    expect(dividend % divisor).not.toBe(0);
  });

  it("asks for and scores a numeric remainder", () => {
    const question = generate(
      "division",
      settings({ arithmeticDivisionMode: "remainder", tags: ["division"], unitPreference: "m" }),
      "remainder-division"
    );
    const [dividend, divisor] = numericTerms(question);

    expect(question.prompt).toMatch(/^What is the remainder when .+ is divided by .+\?$/);
    expect(question.answer).toMatchObject({ unit: "none", value: dividend % divisor });
    expect(question.explanation.steps[1]).toContain("so the remainder is");
  });

  it("uses the selected mixed operators and standard precedence without parentheses", () => {
    const drill = settings({
      arithmeticMixedOperators: ["addition", "multiplication"],
      arithmeticTermCount: 5,
      arithmeticUseParentheses: false,
      tags: ["mixed_operations"]
    });
    const question = Array.from({ length: 20 }, (_, index) =>
      generate("mixed_operations", drill, `mixed-${index}`)
    ).find((candidate) => {
      const operators = operatorValues(candidate);
      return operators.includes("+") && operators.includes("*");
    });

    expect(question).toBeDefined();
    expect(question?.prompt).not.toContain("(");
    expect(new Set(operatorValues(question as Question))).toEqual(new Set(["+", "*"]));
    expect(question?.answer.value).toBe(evaluateWithPrecedence(numericTerms(question as Question), operatorValues(question as Question)));
  });

  it("makes generated arithmetic meaningfully harder as difficulty rises", () => {
    const beginner = generate("addition", settings({ difficulty: "beginner", tags: ["addition"] }), "difficulty");
    const expert = generate("addition", settings({ difficulty: "expert", tags: ["addition"] }), "difficulty");

    expect(Math.min(...numericTerms(expert))).toBeGreaterThan(Math.min(...numericTerms(beginner)));
    expect(expert.answer.value).toBeGreaterThan(beginner.answer.value);
  });
});

function generate(tag: SkillTag, drill: DrillSettings, seed: string): Question {
  const template = starterQuestionTemplates.find((candidate) => candidate.tags.includes(tag));

  if (template === undefined) {
    throw new Error(`Missing arithmetic template for ${tag}.`);
  }

  return generateCustomArithmeticQuestion(template, drill, createSeededRandom(seed));
}

function settings(overrides: Partial<DrillSettings>): DrillSettings {
  return {
    categories: ["arithmetic"],
    difficulty: "beginner",
    feedbackMode: "instant",
    questionCount: 1,
    timeMode: "untimed",
    ...overrides
  };
}

function numericTerms(question: Question): number[] {
  return Object.entries(question.metadata?.variables ?? {})
    .filter(([key, value]) => key.startsWith("term") && typeof value === "number")
    .map(([, value]) => value as number);
}

function operatorValues(question: Question): string[] {
  return Object.entries(question.metadata?.variables ?? {})
    .filter(([key, value]) => key.startsWith("operator") && typeof value === "string")
    .map(([, value]) => value as string);
}

function evaluateWithPrecedence(values: number[], operators: string[]): number {
  const products: number[] = [values[0]];
  const additions: string[] = [];

  operators.forEach((operator, index) => {
    const next = values[index + 1];

    if (operator === "*") {
      products[products.length - 1] *= next;
    } else {
      additions.push(operator);
      products.push(next);
    }
  });

  return Number(
    additions
      .reduce((total, operator, index) => (operator === "+" ? total + products[index + 1] : total - products[index + 1]), products[0])
      .toFixed(4)
  );
}
