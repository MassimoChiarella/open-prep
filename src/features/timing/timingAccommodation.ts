export const timingAccommodationIds = Object.freeze([
  "standard",
  "time_and_a_half",
  "double_time",
  "untimed"
] as const);

export type TimingAccommodation = (typeof timingAccommodationIds)[number];
export type TimingAccommodationMultiplier = 1 | 1.5 | 2 | null;

export const timingAccommodationMultipliers = Object.freeze({
  standard: 1,
  time_and_a_half: 1.5,
  double_time: 2,
  untimed: null
} as const satisfies Readonly<Record<TimingAccommodation, TimingAccommodationMultiplier>>);

export function normalizeTimingAccommodation(value: unknown): TimingAccommodation {
  return typeof value === "string" && (timingAccommodationIds as readonly string[]).includes(value)
    ? (value as TimingAccommodation)
    : "standard";
}

export function getEffectiveDurationSeconds(
  standardDurationSeconds: number,
  accommodation: unknown
): number | null {
  if (!Number.isFinite(standardDurationSeconds) || standardDurationSeconds <= 0) {
    throw new RangeError("Standard duration must be a positive finite number of seconds.");
  }

  const multiplier = timingAccommodationMultipliers[normalizeTimingAccommodation(accommodation)];
  if (multiplier === null) return null;

  // Existing countdowns operate in whole seconds and expire at zero.
  const effectiveDurationSeconds = Math.ceil(standardDurationSeconds * multiplier);
  if (!Number.isSafeInteger(effectiveDurationSeconds)) {
    throw new RangeError("Effective duration must be a safe whole number of seconds.");
  }

  return effectiveDurationSeconds;
}

export function isStandardComparisonEligible(accommodation: unknown): boolean {
  return normalizeTimingAccommodation(accommodation) === "standard";
}

export function isStandardPersonalBestEligible(accommodation: unknown): boolean {
  return isStandardComparisonEligible(accommodation);
}
