import { describe, expect, it } from "vitest";

import { resolveTemplateVariables } from "@/features/questions/variableResolver";
import { createSeededRandom } from "@/lib/random/seededRandom";

describe("resolveTemplateVariables", () => {
  it.each([
    [0.1, 0.3, 0.1, 0.3], [-0.3, -0.1, 0.1, -0.1], [0.1, 0.29, 0.1, 0.2]
  ])("includes only valid range endpoints %s to %s by %s", (min, max, step, expected) => {
    const random = { ...createSeededRandom("audit-variable-range"), integer: (_minimum: number, maximum: number) => maximum };
    expect(resolveTemplateVariables({ value: { type: "decimal", min, max, step } }, random).value).toBe(expected);
  });

  it("resolves fixed value lists deterministically", () => {
    const variables = {
      volume: { type: "integer" as const, values: [10, 20, 30] },
      price: { type: "currency" as const, values: [5, 10] }
    };

    expect(resolveTemplateVariables(variables, createSeededRandom("vars"))).toEqual(
      resolveTemplateVariables(variables, createSeededRandom("vars"))
    );
  });

  it("resolves integer and decimal ranges using steps", () => {
    const resolved = resolveTemplateVariables(
      {
        integerValue: { type: "integer", min: 10, max: 12 },
        decimalValue: { type: "decimal", min: 1.5, max: 2.5, step: 0.5 }
      },
      createSeededRandom("ranges")
    );

    expect(resolved.integerValue).toBeGreaterThanOrEqual(10);
    expect(resolved.integerValue).toBeLessThanOrEqual(12);
    expect(Number.isInteger(resolved.integerValue)).toBe(true);
    expect([1.5, 2, 2.5]).toContain(resolved.decimalValue);
  });

  it("throws on invalid variable specs", () => {
    const random = createSeededRandom("invalid");

    expect(() => resolveTemplateVariables({ value: { type: "integer", values: [] } }, random)).toThrow(
      'Variable "value" must define at least one value.'
    );
    expect(() => resolveTemplateVariables({ value: { type: "integer", min: 5 } }, random)).toThrow(
      'Variable "value" must define values or a min/max range.'
    );
    expect(() => resolveTemplateVariables({ value: { type: "integer", min: 5, max: 1 } }, random)).toThrow(
      'Variable "value" max must be greater than or equal to min.'
    );
    expect(() => resolveTemplateVariables({ value: { type: "integer", min: 1, max: 5, step: 0 } }, random)).toThrow(
      'Variable "value" step must be greater than zero.'
    );
  });
});
