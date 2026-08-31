import { describe, expect, it } from "vitest";

import {
  generateQuestionFromTemplate,
  generateQuestionsFromTemplates,
  generateSimilarQuestionFromTemplates,
  getQuestionGenerationCapacity
} from "@/features/questions/questionGenerator";
import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import type { DrillSettings, QuestionTemplate } from "@/lib/domain";
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

  it("accepts practical two-decimal rounding for generated formulas by default", () => {
    const template: QuestionTemplate = {
      id: "generated-repeating-decimal",
      category: "arithmetic",
      tags: ["division"],
      difficulty: ["beginner"],
      promptTemplate: "What is {numerator} / {denominator}?",
      variables: {
        numerator: { type: "integer", values: [2] },
        denominator: { type: "integer", values: [3] }
      },
      formula: { expression: "numerator / denominator" },
      answerUnit: "none",
      explanationTemplate: { steps: ["Divide {numerator} by {denominator} to get {answer}."] }
    };
    const question = generateQuestionFromTemplate(template, {
      difficulty: "beginner",
      random: createSeededRandom("rounded-generated-answer")
    });

    expect(question.answer.tolerance).toEqual({ type: "absolute", value: 0.005 });
    expect(validateAnswer("0.67", question.answer).isCorrect).toBe(true);
    expect(validateAnswer("0.68", question.answer).isCorrect).toBe(false);
  });

  it("applies the two-decimal default in displayed percentage points", () => {
    const template: QuestionTemplate = {
      id: "generated-percentage-rounding",
      category: "percentages",
      tags: ["percentage_change"],
      difficulty: ["beginner"],
      promptTemplate: "What percentage is {numerator} / {denominator}?",
      variables: {
        numerator: { type: "integer", values: [1] },
        denominator: { type: "integer", values: [3] }
      },
      formula: { expression: "numerator / denominator" },
      answerUnit: "percentage",
      explanationTemplate: { steps: ["Divide {numerator} by {denominator} to get {answer}."] }
    };
    const question = generateQuestionFromTemplate(template, {
      difficulty: "beginner",
      random: createSeededRandom("rounded-generated-percentage")
    });

    expect(question.answer.tolerance).toEqual({ type: "absolute", value: 0.00005 });
    expect(validateAnswer("33.33%", question.answer).isCorrect).toBe(true);
    expect(validateAnswer("33.34%", question.answer).isCorrect).toBe(false);
  });

  it("keeps bundled percentage-output templates canonical and documents both entry forms", () => {
    const templates = starterQuestionTemplates.filter((template) =>
      template.promptTemplate.includes("Enter the percentage as a number or with %.")
    );

    expect(templates).toHaveLength(29);
    for (const template of templates) {
      const question = generateQuestionFromTemplate(template, {
        difficulty: template.difficulty[0],
        random: createSeededRandom(`canonical-percentage:${template.id}`)
      });
      const displayedValue = question.answer.value * 100;

      expect(question.answer.unit, template.id).toBe("percentage");
      expect(validateAnswer(String(displayedValue), question.answer, { selectedUnit: "percentage" }).isCorrect, template.id).toBe(true);
      expect(validateAnswer(`${displayedValue}%`, question.answer).isCorrect, template.id).toBe(true);
      expect(validateAnswer(`${question.answer.value}%`, question.answer).isCorrect, template.id).toBe(false);
    }
  });

  it.each([
    ["200 / 3", "66.67"],
    ["391900 / 32", "12246.88"],
    ["1 / 3", "0.33"]
  ])("accepts audited generated rounding example %s as %s", (expression, learnerAnswer) => {
    const template: QuestionTemplate = {
      id: `generated-audit-${learnerAnswer}`,
      category: "arithmetic",
      tags: ["division"],
      difficulty: ["beginner"],
      promptTemplate: "Calculate {value}.",
      variables: { value: { type: "integer", values: [1] } },
      formula: { expression },
      explanationTemplate: { steps: ["The answer is {answer}."] }
    };
    const question = generateQuestionFromTemplate(template, {
      difficulty: "beginner",
      random: createSeededRandom(`audit:${learnerAnswer}`)
    });

    expect(validateAnswer(learnerAnswer, question.answer).isCorrect).toBe(true);
  });

  it("honors an explicit generated comparison policy", () => {
    const template: QuestionTemplate = {
      id: "generated-explicit-tolerance",
      category: "arithmetic",
      tags: ["division"],
      difficulty: ["beginner"],
      promptTemplate: "What is {numerator} / {denominator}?",
      variables: {
        numerator: { type: "integer", values: [2] },
        denominator: { type: "integer", values: [3] }
      },
      formula: { expression: "numerator / denominator" },
      tolerance: { type: "absolute", value: 0.0001 },
      roundingRule: "exact",
      explanationTemplate: { steps: ["Divide {numerator} by {denominator} to get {answer}."] }
    };
    const question = generateQuestionFromTemplate(template, {
      difficulty: "beginner",
      random: createSeededRandom("explicit-generated-answer")
    });

    expect(question.answer).toMatchObject({
      roundingRule: "exact",
      tolerance: { type: "absolute", value: 0.0001 }
    });
    expect(validateAnswer("0.67", question.answer).isCorrect).toBe(false);
  });

  it("accepts two-decimal learner answers across a 7,680-question generated corpus", () => {
    const supportedTemplates = starterQuestionTemplates.flatMap((template) =>
      template.difficulty.map((difficulty) => ({ difficulty, template }))
    );

    for (let index = 0; index < 7_680; index += 1) {
      const { difficulty, template } = supportedTemplates[index % supportedTemplates.length];
      const question = generateQuestionFromTemplate(template, {
        difficulty,
        random: createSeededRandom(`rounding-corpus:${index}`)
      });
      const displayValue = question.answer.unit === "percentage"
        ? question.answer.value * 100
        : question.answer.value;
      const rawInput = question.answer.unit === "percentage"
        ? `${displayValue.toFixed(2)}%`
        : question.answer.unit === "currency"
          ? `$${displayValue.toFixed(2)}`
          : displayValue.toFixed(2);

      expect(validateAnswer(rawInput, question.answer).isCorrect, `${template.id}: ${rawInput}`).toBe(true);
    }
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

  it("reports the audited 24-item filtered capacity and never exposes 30", () => {
    const settings = drillSettings({
      categories: ["growth_compounding"],
      difficulty: "expert",
      questionCount: 30,
      tags: ["compound_growth"]
    });

    expect(getQuestionGenerationCapacity(starterQuestionTemplates, settings)).toBe(24);
    expect(
      generateQuestionsFromTemplates(
        starterQuestionTemplates,
        { ...settings, questionCount: 24 },
        "audited-capacity-24"
      )
    ).toHaveLength(24);
  });

  it("keeps all enabled counts constructible across the 216-filter capacity matrix", () => {
    const profiles = [
      ["arithmetic", ["addition"], ["division"]],
      ["percentages", ["percentage_of_number"], ["percentage_change"]],
      ["fractions_decimals_ratios", ["fraction_conversion"], ["ratio_conversion"]],
      ["growth_compounding", ["simple_growth"], ["compound_growth"]],
      ["business_math", ["revenue"], ["margin"]],
      ["weighted_averages", ["weighted_average"], ["weighted_average", "revenue"]]
    ] as const;
    const difficulties = ["beginner", "intermediate", "advanced", "expert"] as const;
    const requestedCounts = [5, 10, 30] as const;
    let combinations = 0;

    for (const [category, firstTags, secondTags] of profiles) {
      for (const difficulty of difficulties) {
        for (const tags of [undefined, firstTags, secondTags] as const) {
          for (const questionCount of requestedCounts) {
            combinations += 1;
            const settings = drillSettings({
              categories: [category],
              difficulty,
              questionCount,
              tags: tags === undefined ? undefined : [...tags]
            });
            const capacity = getQuestionGenerationCapacity(starterQuestionTemplates, settings);

            if (questionCount <= capacity) {
              expect(() =>
                generateQuestionsFromTemplates(
                  starterQuestionTemplates,
                  settings,
                  `capacity-matrix:${combinations}`
                )
              ).not.toThrow();
            } else {
              expect(capacity).toBeLessThan(questionCount);
            }
          }
        }
      }
    }

    expect(combinations).toBe(216);
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
