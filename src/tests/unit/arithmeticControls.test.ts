import { describe, expect, it } from "vitest";

import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import { generateCustomArithmeticQuestion } from "@/features/questions/arithmeticQuestionGenerator";
import type { DrillSettings, Question, SkillTag } from "@/lib/domain";
import { createSeededRandom } from "@/lib/random/seededRandom";
import { validateAnswer } from "@/lib/validation/validateAnswer";

describe("operation-specific arithmetic controls", () => {
  it.each([[false, 8.36], [true, 10.89]] as const)("keeps decimal mixed-operation precedence with parentheses=%s", (parentheses, expected) => {
    let termIndex = 0;
    let operatorIndex = 0;
    const template = starterQuestionTemplates.find((candidate) => candidate.tags.includes("mixed_operations"))!;
    const question = generateCustomArithmeticQuestion(template, settings({
      tags: ["mixed_operations"], arithmeticMixedOperators: ["addition", "multiplication"],
      arithmeticUseParentheses: parentheses, arithmeticTermCount: 3, arithmeticNumberFormat: "decimal"
    }), {
      ...createSeededRandom("mixed-decimal"),
      integer: () => [11, 22, 33][termIndex++],
      pick: <T>(items: readonly T[]) => items.length === 1 ? items[0] : items[operatorIndex++]
    });
    expect(question.answer.value).toBe(expected);
    expect(validateAnswer(String(expected), question.answer).isCorrect).toBe(true);
  });

  it.each([
    [[6.2, 9.9, 2.4, 8.3, 7.4], "9047.90304"],
    [[1.01, 1.01, 1.01, 1.01, 1.01], "1.0510100501"],
    [[9.99, 9.99, 9.99, 9.99, 9.99], "99500.9990004999"],
    [[99.99, 99.99, 99.99, 99.99, 99.99], "9995000999.9000049999"],
    [[-1.01, 1.01, 1.01, 1.01, 1.01], "-1.0510100501"]
  ] as const)("retains decimal multiplication precision for %s", (operands, exactProduct) => {
    let index = 0;
    const template = starterQuestionTemplates.find((candidate) => candidate.tags.includes("multiplication"))!;
    const question = generateCustomArithmeticQuestion(template, settings({
      tags: ["multiplication"], difficulty: "advanced", arithmeticTermCount: 5,
      arithmeticNumberFormat: "decimal", arithmeticOperandSize: "small"
    }), { ...createSeededRandom("decimal-audit-1"), integer: () => Math.round(operands[index++] * 100) });
    expect(question.answer.value).toBe(Number(exactProduct));
    expect(validateAnswer(exactProduct, question.answer).isCorrect).toBe(true);
    const displayed = question.explanation.steps[1].split(" = ")[1].replace(/\.$/u, "");
    expect(validateAnswer(displayed, question.answer).isCorrect).toBe(true);
    expect(validateAnswer(String(Number(exactProduct) + 1), question.answer).isCorrect).toBe(false);
  });

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
