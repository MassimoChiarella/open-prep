import { describe, expect, it } from "vitest";

import { growthQuestionTemplates } from "@/data/questionTemplates/growthTemplates";
import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import { generateQuestionFromTemplate } from "@/features/questions/questionGenerator";
import { createSeededRandom } from "@/lib/random/seededRandom";
import { validateAnswer } from "@/lib/validation/validateAnswer";

describe("growth question templates", () => {
  it("registers standalone growth templates with their teaching metadata", () => {
    const starterIds = new Set(starterQuestionTemplates.map((template) => template.id));

    for (const template of growthQuestionTemplates) {
      expect(starterIds, `${template.id} starter registration`).toContain(template.id);
      expect(template.category).toBe("growth_compounding");
      expect(template.answerUnit, `${template.id} unit`).not.toBe("none");
      expect(template.explanationTemplate.steps, `${template.id} explanation steps`).toHaveLength(3);
      expect(template.explanationTemplate.shortcut, `${template.id} shortcut`).toBeDefined();
    }
  });

  it("accepts naturally formatted percentage answers", () => {
    const percentageTemplates = growthQuestionTemplates.filter((template) => template.answerUnit === "percentage");

    for (const template of percentageTemplates) {
      const question = generateQuestionFromTemplate(template, {
        difficulty: template.difficulty[0],
        random: createSeededRandom(`percentage-answer:${template.id}`)
      });
      const percentInput = `${question.answer.value * 100}%`;

      expect(validateAnswer(percentInput, question.answer), template.id).toMatchObject({ isCorrect: true });
    }
  });
});
