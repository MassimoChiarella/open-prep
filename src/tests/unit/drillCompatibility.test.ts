import { describe, expect, it } from "vitest";

import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import { categoryOptions, difficultyOptions, skillTagOptions } from "@/features/drills/drillSettingsOptions";
import { generateQuestionsFromTemplates } from "@/features/questions/questionGenerator";
import type { DrillSettings, SkillCategory, SkillTag } from "@/lib/domain";

describe("drill category and difficulty compatibility", () => {
  it("builds category and skill queues at every supported difficulty", () => {
    for (const { value: difficulty } of difficultyOptions) {
      for (const { value: category } of categoryOptions) {
        expectCompatibleQueue({ categories: [category], difficulty }, category);
      }

      for (const { value: tag } of skillTagOptions) {
        if (tag === "simple_growth" && difficulty === "beginner") continue;
        expectCompatibleQueue({ categories: categoriesForTag(tag), difficulty, tags: [tag] }, tag, 5);
      }
    }
  });
});

function expectCompatibleQueue(
  filters: Pick<DrillSettings, "categories" | "difficulty" | "tags">,
  label: SkillCategory | SkillTag,
  questionCount = 10
): void {
  const settings: DrillSettings = {
    ...filters,
    feedbackMode: "instant",
    questionCount,
    timeMode: "untimed"
  };
  const questions = generateQuestionsFromTemplates(
    starterQuestionTemplates,
    settings,
    `compatibility:${label}:${filters.difficulty}`
  );

  expect(questions, `${label} ${filters.difficulty}`).toHaveLength(questionCount);
  expect(new Set(questions.map((question) => question.id)).size).toBe(questionCount);
  expect(questions.every((question) => question.difficulty === filters.difficulty)).toBe(true);
  const tag = filters.tags?.[0];
  if (tag !== undefined) {
    expect(questions.every((question) => question.tags.includes(tag))).toBe(true);
  }
}

function categoriesForTag(tag: SkillTag): SkillCategory[] {
  return Array.from(
    new Set(
      starterQuestionTemplates
        .filter((template) => template.tags.includes(tag))
        .map((template) => template.category)
    )
  );
}
