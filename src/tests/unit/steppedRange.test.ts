import { describe, expect, it } from "vitest";

import { rangeStepCount, rangeValueAt } from "@/lib/math/steppedRange";

describe("authored decimal range boundaries", () => {
  it("does not inflate capacity when a native bound falls just short of the next decimal step", () => {
    expect(rangeStepCount(-3e-300, 9.999999999999999e-301, 1e-300)).toBe(3);
    expect(rangeValueAt(-3e-300, 1e-300, 3)).toBe(0);
    expect(rangeStepCount(0.1, 0.3, 0.1)).toBe(2);
    expect(rangeStepCount(0.1, 0.29999999999999993, 0.1)).toBe(1);
  });

  it("keeps generated values and distinct capacity within ordinary, fine, subnormal and huge bounds", () => {
    for (const step of [1, 0.1, 0.01, 1e-13, 1e-110, 1e-300, 5e-324, 1e292]) {
      for (const min of [0, step, 2 * step, -3 * step, 1.25 * step, 100 * step]) {
        const max = min + 4 * step;
        const count = rangeStepCount(min, max, step);
        const values = Array.from({ length: count + 1 }, (_, index) => rangeValueAt(min, step, index));
        expect(values[0]).toBe(min);
        expect(new Set(values).size).toBe(count + 1);
        for (const value of values) {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(min);
          expect(value).toBeLessThanOrEqual(max);
        }
      }
    }
  });
});
