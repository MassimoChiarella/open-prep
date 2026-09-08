export function rangeStepCount(min: number, max: number, step: number): number {
  const count = (max - min) / step;
  const nearest = Math.round(count);
  const floatingPointError = Number.EPSILON * Math.max(1, Math.abs(count)) * 4;
  return Math.floor(Math.abs(count - nearest) <= floatingPointError ? nearest : count);
}
