import { describe, expect, it } from "vitest";

import { getEligibleQuestionTemplates, pickQuestionTemplate } from "@/features/questions/templateSelection";
import type { DrillSettings, QuestionTemplate } from "@/lib/domain";
import { createSeededRandom } from "@/lib/random/seededRandom";

const templates: QuestionTemplate[] = [
  {
    id: "addition_beginner_001",
    category: "arithmetic",
    tags: ["addition"],
    difficulty: ["beginner"],
    promptTemplate: "{a} + {b}",
    variables: {},
    formula: { expression: "a + b" },
    explanationTemplate: { steps: ["Add the two numbers."] }
  },
  {
    id: "percentage_intermediate_001",
    category: "percentages",
    tags: ["percentage_change"],
    difficulty: ["intermediate"],
    promptTemplate: "Revenue rises from {old} to {next}. What is growth?",
    variables: {},
    formula: { expression: "(next - old) / old" },
    answerUnit: "percentage",
    explanationTemplate: { steps: ["Use percentage change."] }
  },
  {
    id: "business_beginner_001",
    category: "business_math",
    tags: ["revenue", "multiplication"],
    difficulty: ["beginner", "intermediate"],
    promptTemplate: "{price} x {volume}",
    variables: {},
    formula: { expression: "price * volume" },
    answerUnit: "currency",
    explanationTemplate: { steps: ["Revenue = price x volume."] }
  }
];

describe("question template selection", () => {
  it("filters templates by category and difficulty", () => {
    const settings = drillSettings({
      categories: ["arithmetic", "business_math"],
      difficulty: "beginner"
    });

    expect(getEligibleQuestionTemplates(templates, settings).map((template) => template.id)).toEqual([
      "addition_beginner_001",
      "business_beginner_001"
    ]);
  });

  it("filters templates by requested tags when provided", () => {
    const settings = drillSettings({
      categories: ["business_math", "arithmetic"],
      difficulty: "beginner",
      tags: ["revenue"]
    });

    expect(getEligibleQuestionTemplates(templates, settings).map((template) => template.id)).toEqual([
      "business_beginner_001"
    ]);
  });

  it("picks a deterministic eligible template", () => {
    const settings = drillSettings({
      categories: ["arithmetic", "business_math"],
      difficulty: "beginner"
    });

    const first = pickQuestionTemplate(templates, settings, createSeededRandom("pick"));
    const second = pickQuestionTemplate(templates, settings, createSeededRandom("pick"));

    expect(first.id).toBe(second.id);
  });

  it("throws when no templates match settings", () => {
    const settings = drillSettings({
      categories: ["exhibit_math"],
      difficulty: "beginner"
    });

    expect(() => pickQuestionTemplate(templates, settings, createSeededRandom("empty"))).toThrow(
      "No question templates match the requested drill settings."
    );
  });
});

function drillSettings(settings: Pick<DrillSettings, "categories" | "difficulty" | "tags">) {
  return settings;
}
