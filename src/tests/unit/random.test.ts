import { describe, expect, it } from "vitest";

import { createSeededRandom } from "@/lib/random/seededRandom";

describe("createSeededRandom", () => {
  it("produces the same sequence for the same seed", () => {
    const first = createSeededRandom("session-1");
    const second = createSeededRandom("session-1");

    expect([first.next(), first.next(), first.next()]).toEqual([second.next(), second.next(), second.next()]);
  });

  it("produces bounded inclusive integers", () => {
    const random = createSeededRandom("bounded");

    for (let count = 0; count < 25; count += 1) {
      const value = random.integer(2, 5);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(5);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("picks and shuffles deterministically without mutating input", () => {
    const items = ["a", "b", "c", "d"];
    const first = createSeededRandom(123);
    const second = createSeededRandom(123);

    expect(first.pick(items)).toBe(second.pick(items));
    expect(first.shuffle(items)).toEqual(second.shuffle(items));
    expect(items).toEqual(["a", "b", "c", "d"]);
  });

  it("throws on invalid random operations", () => {
    const random = createSeededRandom("errors");

    expect(() => random.integer(3.2, 5)).toThrow("Seeded integer bounds must be whole numbers.");
    expect(() => random.integer(5, 3)).toThrow("Seeded integer max must be greater than or equal to min.");
    expect(() => random.pick([])).toThrow("Cannot pick from an empty list.");
  });
});
