export function rangeStepCount(min: number, max: number, step: number): number {
  if (![min, max, step].every(Number.isFinite) || step <= 0 || max < min) {
    return Math.floor((max - min) / step);
  }
  const places = Math.max(decimalPrecision(min), decimalPrecision(max), decimalPrecision(step));
  return Number((decimalInteger(max, places) - decimalInteger(min, places)) / decimalInteger(step, places));
}

export function rangeValueAt(min: number, step: number, index: number): number {
  if (index === 0) return min;
  const places = Math.max(decimalPrecision(min), decimalPrecision(step));
  // Exact decimal integers avoid losing the bound or step while scaling native numbers.
  const value = decimalInteger(min, places) + BigInt(index) * decimalInteger(step, places);
  return Number(`${value}e${-places}`);
}

function decimalPrecision(value: number): number {
  const [coefficient, exponent = "0"] = String(value).toLowerCase().split("e");
  const fractionalDigits = coefficient.split(".")[1]?.length ?? 0;
  return Math.max(0, fractionalDigits - Number(exponent));
}

function decimalInteger(value: number, places: number): bigint {
  const [coefficient, exponent = "0"] = String(value).toLowerCase().split("e");
  const fractionLength = coefficient.split(".")[1]?.length ?? 0;
  return BigInt(coefficient.replace(".", "")) * 10n ** BigInt(Number(exponent) + places - fractionLength);
}
