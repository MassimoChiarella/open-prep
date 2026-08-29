import { describe, expect, it } from "vitest";

import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import type { Difficulty, SkillTag } from "@/lib/domain";

const difficulties = ["beginner", "intermediate", "advanced", "expert"] satisfies Difficulty[];
const higherDifficulties = ["intermediate", "advanced", "expert"] satisfies Difficulty[];
const coreTags = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "mixed_operations",
  "percentage_of_number",
  "percentage_change",
  "reverse_percentage",
  "percentage_points",
  "fraction_conversion",
  "ratio_conversion"
] satisfies SkillTag[];

describe("core difficulty coverage", () => {
  it("uses dedicated templates for each higher difficulty", () => {
    for (const tag of coreTags) {
      for (const difficulty of higherDifficulties) {
        const dedicatedTemplate = starterQuestionTemplates.find(
          (template) =>
            template.tags.includes(tag) &&
            template.difficulty.length === 1 &&
            template.difficulty[0] === difficulty &&
            template.id.includes(`_${difficulty}_`)
        );

        expect(dedicatedTemplate, `${tag} ${difficulty}`).toBeDefined();
      }
    }
  });

  it("includes thirds, sixths, and ratio-simplification anchors", () => {
    expect(starterQuestionTemplates.some((template) => template.id === "fraction_conversion_beginner_007")).toBe(true);
    expect(starterQuestionTemplates.some((template) => template.id === "fraction_conversion_beginner_008")).toBe(true);

    const simplificationDifficulties = new Set(
      starterQuestionTemplates
        .filter((template) => template.id.startsWith("ratio_simplification_"))
        .flatMap((template) => template.difficulty)
    );

    expect(simplificationDifficulties).toEqual(new Set(difficulties));
  });
});
