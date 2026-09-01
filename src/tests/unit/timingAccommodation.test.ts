import { describe, expect, it } from "vitest";

import {
  getEffectiveDurationSeconds,
  isStandardComparisonEligible,
  isStandardPersonalBestEligible,
  normalizeTimingAccommodation,
  timingAccommodationIds,
  timingAccommodationMultipliers
} from "@/features/timing/timingAccommodation";

describe("timing accommodation", () => {
  it("exposes immutable functional policy data without UI labels", () => {
    expect(timingAccommodationIds).toEqual([
      "standard",
      "time_and_a_half",
      "double_time",
      "untimed"
    ]);
    expect(timingAccommodationMultipliers).toEqual({
      standard: 1,
      time_and_a_half: 1.5,
      double_time: 2,
      untimed: null
    });
    expect(Object.isFrozen(timingAccommodationIds)).toBe(true);
    expect(Object.isFrozen(timingAccommodationMultipliers)).toBe(true);
  });

  it.each([
    [undefined, "standard"],
    [null, "standard"],
    ["", "standard"],
    ["invalid", "standard"],
    [1.5, "standard"],
    ["time_and_a_half", "time_and_a_half"],
    ["double_time", "double_time"],
    ["untimed", "untimed"]
  ] as const)("normalizes legacy value %j to %s", (value, expected) => {
    expect(normalizeTimingAccommodation(value)).toBe(expected);
  });

  it("applies exact multipliers and rounds adjusted limits up to whole seconds", () => {
    expect(getEffectiveDurationSeconds(61, "standard")).toBe(61);
    expect(getEffectiveDurationSeconds(61, "time_and_a_half")).toBe(92);
    expect(getEffectiveDurationSeconds(61, "double_time")).toBe(122);
    expect(getEffectiveDurationSeconds(60.1, "standard")).toBe(61);
    expect(getEffectiveDurationSeconds(60.1, "time_and_a_half")).toBe(91);
  });

  it("uses Standard for missing or invalid legacy input", () => {
    expect(getEffectiveDurationSeconds(90, undefined)).toBe(90);
    expect(getEffectiveDurationSeconds(90, "legacy_other")).toBe(90);
  });

  it("represents Untimed as no effective duration", () => {
    expect(getEffectiveDurationSeconds(90, "untimed")).toBeNull();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid standard duration %s",
    (duration) => {
      expect(() => getEffectiveDurationSeconds(duration, "standard")).toThrow(RangeError);
    }
  );

  it("rejects adjusted durations outside the safe integer range", () => {
    expect(() => getEffectiveDurationSeconds(Number.MAX_SAFE_INTEGER, "double_time")).toThrow(
      RangeError
    );
  });

  it.each([
    [undefined, true],
    ["invalid", true],
    ["standard", true],
    ["time_and_a_half", false],
    ["double_time", false],
    ["untimed", false]
  ] as const)("sets Standard comparison and personal-best eligibility for %j", (value, eligible) => {
    expect(isStandardComparisonEligible(value)).toBe(eligible);
    expect(isStandardPersonalBestEligible(value)).toBe(eligible);
  });
});
