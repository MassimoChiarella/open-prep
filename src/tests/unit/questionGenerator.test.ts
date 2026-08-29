import { describe, expect, it } from "vitest";

import {
  generateQuestionFromTemplate,
  generateQuestionsFromTemplates,
  generateSimilarQuestionFromTemplates
} from "@/features/questions/questionGenerator";
import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import type { DrillSettings } from "@/lib/domain";
import { createSeededRandom } from "@/lib/random/seededRandom";
import { validateAnswer } from "@/lib/validation/validateAnswer";

describe("question generation", () => {
  it("generates a numeric question from a template", () => {
    const question = generateQuestionFromTemplate(starterQuestionTemplates[0], {
      difficulty: "beginner",
      random: createSeededRandom("one-question")
    });

    expect(question).toMatchObject({
      type: "numeric",
      category: "arithmetic",
      tags: ["addition"],
      difficulty: "beginner",
      answer: {
        unit: "none"
      },
      metadata: {
        sourceType: "generated"
      }
    });
    expect(question.prompt).toMatch(/^What is \d+ \+ \d+\?$/);
    expect(question.explanation.steps[1]).toContain(String(question.answer.value));
  });

  it("generates deterministic question sets from starter templates", () => {
    const settings = drillSettings({
      categories: ["arithmetic", "percentages"],
      difficulty: "beginner",
      questionCount: 4
    });

    const first = generateQuestionsFromTemplates(starterQuestionTemplates, settings, "session-seed");
    const second = generateQuestionsFromTemplates(starterQuestionTemplates, settings, "session-seed");

    expect(first).toEqual(second);
    expect(new Set(first.map((question) => question.id)).size).toBe(first.length);
  });

  it("applies granular arithmetic settings to deterministic generated questions", () => {
    const settings = drillSettings({
      arithmeticAllowNegatives: true,
      arithmeticNumberFormat: "decimal",
      arithmeticOperandSize: "large",
      arithmeticTermCount: 4,
      categories: ["arithmetic"],
      difficulty: "beginner",
      questionCount: 3,
      tags: ["addition"],
      unitPreference: "m"
    });
    const questions = generateQuestionsFromTemplates(starterQuestionTemplates, settings, "custom-arithmetic");

    expect(questions).toHaveLength(3);
    for (const question of questions) {
      const variables = Object.values(question.metadata?.variables ?? {}).filter(
        (value): value is number => typeof value === "number"
      );

      expect(question).toMatchObject({ answer: { unit: "m" }, category: "arithmetic", tags: ["addition"] });
      expect(question.prompt).toContain("Answer in millions (M).");
      expect(question.explanation.shortcut).toBeDefined();
      expect(variables).toHaveLength(4);
      expect(variables.some((value) => value < 0)).toBe(true);
      expect(variables.every((value) => !Number.isInteger(value))).toBe(true);
      expect(variables.every((value) => Math.abs(value) >= 200)).toBe(true);
    }
  });

  it("stores percentage arithmetic in fractional form and accepts natural input", () => {
    const question = generateQuestionsFromTemplates(
      starterQuestionTemplates,
      drillSettings({
        arithmeticTermCount: 2,
        categories: ["arithmetic"],
        difficulty: "beginner",
        questionCount: 1,
        tags: ["addition"],
        unitPreference: "percentage"
      }),
      "percentage-arithmetic"
    )[0];

    expect(question.answer.unit).toBe("percentage");
    expect(validateAnswer(`${question.answer.value * 100}%`, question.answer)).toMatchObject({ isCorrect: true });
  });

  it("throws when a template difficulty does not match generation options", () => {
    expect(() =>
      generateQuestionFromTemplate(starterQuestionTemplates[0], {
        difficulty: "expert",
        random: createSeededRandom("wrong-difficulty")
      })
    ).toThrow('Template "addition_beginner_001" does not support difficulty "expert".');
  });

  it("throws when enough unique questions cannot be generated", () => {
    const settings = drillSettings({
      categories: ["arithmetic"],
      difficulty: "beginner",
      tags: ["addition"],
      questionCount: 500
    });

    expect(() => generateQuestionsFromTemplates(starterQuestionTemplates, settings, "too-many")).toThrow(
      "Unable to generate enough unique questions for the requested settings."
    );
  });

  it("generates a deterministic fresh variant for a similar-question retry", () => {
    const settings = drillSettings({
      categories: ["arithmetic"],
      difficulty: "beginner",
      questionCount: 2,
      tags: ["addition"]
    });
    const source = generateQuestionsFromTemplates(starterQuestionTemplates, settings, "similar-source")[0];
    const first = generateSimilarQuestionFromTemplates(
      starterQuestionTemplates,
      source,
      settings,
      "similar-retry",
      [source.id]
    );
    const second = generateSimilarQuestionFromTemplates(
      starterQuestionTemplates,
      source,
      settings,
      "similar-retry",
      [source.id]
    );

    expect(first).toBeDefined();
    expect(first).toEqual(second);
    expect(first).toMatchObject({ category: source.category, difficulty: source.difficulty });
    expect(first?.tags).toContain("addition");
    expect(first?.id).not.toBe(source.id);
    expect(
      first?.prompt !== source.prompt ||
        JSON.stringify(first?.metadata?.variables) !== JSON.stringify(source.metadata?.variables)
    ).toBe(true);
  });
});

function drillSettings(
  overrides: Pick<DrillSettings, "categories" | "difficulty" | "questionCount"> & Partial<DrillSettings>
): DrillSettings {
  return {
    ...overrides,
    categories: overrides.categories,
    difficulty: overrides.difficulty,
    questionCount: overrides.questionCount,
    tags: overrides.tags,
    timeMode: "untimed",
    feedbackMode: overrides.feedbackMode ?? "instant",
  };
}
