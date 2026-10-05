export function rangeStepCount(min: number, max: number, step: number): number {
  const count = (max - min) / step;
  const nearest = Math.round(count);
  const floatingPointError = Number.EPSILON * Math.max(1, Math.abs(count)) * 4;
  return Math.floor(Math.abs(count - nearest) <= floatingPointError ? nearest : count);
}

export function rangeValueAt(min: number, step: number, index: number): number {
  const decimalPlaces = Math.max(decimalPrecision(min), decimalPrecision(step));
  const scaledMin = shiftDecimal(min, decimalPlaces);
  const scaledStep = shiftDecimal(step, decimalPlaces);
  const scaledValue = scaledMin + index * scaledStep;
  // Calculate the authored decimal grid as integers, including scientific notation.
  return Number.isFinite(scaledValue)
    ? shiftDecimal(Math.round(scaledValue), -decimalPlaces)
    : min + index * step;
}

function decimalPrecision(value: number): number {
  const [coefficient, exponent = "0"] = String(value).toLowerCase().split("e");
  const fractionalDigits = coefficient.split(".")[1]?.length ?? 0;
  return Math.max(0, fractionalDigits - Number(exponent));
}

function shiftDecimal(value: number, places: number): number {
  const [coefficient, exponent = "0"] = String(value).toLowerCase().split("e");
  return Number(`${coefficient}e${Number(exponent) + places}`);
}
