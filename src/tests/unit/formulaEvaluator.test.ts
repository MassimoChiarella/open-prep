import { describe, expect, it } from "vitest";

import {
  compileFormulaExpression,
  evaluateFormulaExpression
} from "@/lib/math/formulaEvaluator";

describe("evaluateFormulaExpression", () => {
  it("evaluates arithmetic with variables and precedence", () => {
    expect(evaluateFormulaExpression("price * volume - cost", { price: 12, volume: 5, cost: 10 })).toBe(50);
    expect(evaluateFormulaExpression("(next - old) / old", { old: 80, next: 100 })).toBe(0.25);
  });

  it("supports unary signs and exponentiation", () => {
    expect(evaluateFormulaExpression("-a + +b", { a: 4, b: 10 })).toBe(6);
    expect(evaluateFormulaExpression("growth ^ years", { growth: 1.1, years: 2 })).toBeCloseTo(1.21);
  });

  it("reuses one compiled expression across representative variable sets", () => {
    const evaluate = compileFormulaExpression("price * volume - cost");

    expect([
      { cost: 10, price: 12, volume: 5 },
      { cost: 25, price: 20, volume: 4 },
      { cost: 0, price: 3, volume: 7 }
    ].map(evaluate)).toEqual([50, 55, 21]);
    expect(() => evaluate({ price: 12, volume: 5 })).toThrow(
      'Missing formula variable "cost".'
    );
  });

  it("keeps the maximum representative-validation batch bounded", () => {
    const expression = Array.from({ length: 20 }, (_, index) => `v${index}`).join(" + ");
    const variables = Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [`v${index}`, index + 1])
    );
    const startedAt = performance.now();
    let total = 0;

    for (let template = 0; template < 500; template += 1) {
      const evaluate = compileFormulaExpression(expression);
      for (let sample = 0; sample < 256; sample += 1) total += evaluate(variables);
    }

    expect(total).toBe(26_880_000);
    expect(performance.now() - startedAt).toBeLessThan(2_500);
  });

  it("throws on invalid or unsafe expressions", () => {
    expect(() => evaluateFormulaExpression("price * missing", { price: 12 })).toThrow(
      'Missing formula variable "missing".'
    );
    expect(() => evaluateFormulaExpression("10 / 0", {})).toThrow("Formula cannot divide by zero.");
    expect(() => evaluateFormulaExpression("Math.max(a, b)", { a: 1, b: 2 })).toThrow(
      'Unsupported character "." in formula.'
    );
    expect(() => evaluateFormulaExpression("", {})).toThrow("Formula expression cannot be empty.");
  });
});
