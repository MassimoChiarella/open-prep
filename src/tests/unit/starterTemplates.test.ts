import { describe, expect, it } from "vitest";

import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import type { DrillSettings, SkillTag } from "@/lib/domain";

describe("starter question template pack", () => {
  it("keeps the required starter content volume", () => {
    expect(starterQuestionTemplates.length).toBeGreaterThanOrEqual(100);

    for (const [tag, minimum] of [
      ["addition", 5],
      ["subtraction", 5],
      ["multiplication", 8],
      ["division", 8],
      ["mixed_operations", 12],
      ["percentage_change", 3],
      ["reverse_percentage", 2],
      ["percentage_points", 2],
      ["fraction_conversion", 6],
      ["ratio_conversion", 2],
      ["revenue", 5],
      ["profit", 5],
      ["cost", 4],
      ["margin", 6],
      ["contribution_margin", 3],
      ["breakeven", 3],
      ["roi", 2],
      ["weighted_average", 12]
    ] as const satisfies readonly (readonly [SkillTag, number])[]) {
      expect(countByTag(tag), tag).toBeGreaterThanOrEqual(minimum);
    }

    for (const [category, minimum] of [
      ["percentages", 12],
      ["fractions_decimals_ratios", 8],
      ["business_math", 30],
      ["weighted_averages", 12]
    ] as const satisfies readonly (readonly [DrillSettings["categories"][number], number])[]) {
      expect(countByCategory(category), category).toBeGreaterThanOrEqual(minimum);
    }
  });

  it("keeps template IDs unique", () => {
    const ids = starterQuestionTemplates.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

function countByTag(tag: SkillTag): number {
  return starterQuestionTemplates.filter((template) => template.tags.includes(tag)).length;
}

function countByCategory(category: DrillSettings["categories"][number]): number {
  return starterQuestionTemplates.filter((template) => template.category === category).length;
}
