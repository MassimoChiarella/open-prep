import type { VariableSpec } from "@/lib/domain";
import type { SeededRandom } from "@/lib/random/seededRandom";

export type ResolvedVariables = Record<string, number>;

export function resolveTemplateVariables(
  variables: Record<string, VariableSpec>,
  random: SeededRandom
): ResolvedVariables {
  return Object.fromEntries(
    Object.entries(variables).map(([name, spec]) => [name, resolveVariable(name, spec, random)])
  );
}

function resolveVariable(name: string, spec: VariableSpec, random: SeededRandom): number {
  if (spec.values !== undefined) {
    if (spec.values.length === 0) {
      throw new Error(`Variable "${name}" must define at least one value.`);
    }

    return random.pick(spec.values);
  }

  if (spec.min === undefined || spec.max === undefined) {
    throw new Error(`Variable "${name}" must define values or a min/max range.`);
  }

  if (spec.max < spec.min) {
    throw new Error(`Variable "${name}" max must be greater than or equal to min.`);
  }

  const step = spec.step ?? defaultStepForVariable(spec);
  if (step <= 0) {
    throw new Error(`Variable "${name}" step must be greater than zero.`);
  }

  const stepCount = Math.floor((spec.max - spec.min) / step);
  const value = spec.min + random.integer(0, stepCount) * step;

  return roundResolvedValue(value);
}

function defaultStepForVariable(spec: VariableSpec): number {
  return spec.type === "integer" ? 1 : 0.1;
}

function roundResolvedValue(value: number): number {
  return Number(value.toFixed(12));
}
