import { describe, expect, it } from "vitest";

import { evaluateFormulaExpression } from "@/lib/math/formulaEvaluator";

describe("evaluateFormulaExpression", () => {
  it("evaluates arithmetic with variables and precedence", () => {
    expect(evaluateFormulaExpression("price * volume - cost", { price: 12, volume: 5, cost: 10 })).toBe(50);
    expect(evaluateFormulaExpression("(next - old) / old", { old: 80, next: 100 })).toBe(0.25);
  });

  it("supports unary signs and exponentiation", () => {
    expect(evaluateFormulaExpression("-a + +b", { a: 4, b: 10 })).toBe(6);
    expect(evaluateFormulaExpression("growth ^ years", { growth: 1.1, years: 2 })).toBeCloseTo(1.21);
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
