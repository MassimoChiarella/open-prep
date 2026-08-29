import { describe, expect, it } from "vitest";

import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import { categoryOptions, skillTagOptions } from "@/features/drills/drillSettingsOptions";
import { generateQuestionFromTemplate } from "@/features/questions/questionGenerator";
import type { QuestionTemplate } from "@/lib/domain";
import { createSeededRandom } from "@/lib/random/seededRandom";

const placeholderPattern = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const formulaIdentifierPattern = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
const renderedPlaceholderPattern = /\{[A-Za-z_][A-Za-z0-9_]*\}/;

describe("starter template coverage", () => {
  it("keeps every template selectable from exposed drill settings", () => {
    const exposedCategories = new Set(categoryOptions.map((option) => option.value));
    const exposedTags = new Set(skillTagOptions.map((option) => option.value));

    for (const template of starterQuestionTemplates) {
      expect(exposedCategories, `${template.id} category is not exposed`).toContain(template.category);

      for (const tag of template.tags) {
        expect(exposedTags, `${template.id} tag is not exposed`).toContain(tag);
      }
    }
  });

  it("defines complete metadata and renderable placeholders for every template", () => {
    for (const template of starterQuestionTemplates) {
      expect(template.id, "template id").toMatch(/^[a-z0-9_]+$/);
      expect(template.tags.length, `${template.id} tags`).toBeGreaterThan(0);
      expect(new Set(template.tags).size, `${template.id} duplicate tags`).toBe(template.tags.length);
      expect(template.difficulty.length, `${template.id} difficulty`).toBeGreaterThan(0);
      expect(new Set(template.difficulty).size, `${template.id} duplicate difficulties`).toBe(template.difficulty.length);
      expect(template.promptTemplate.trim(), `${template.id} prompt`).not.toHaveLength(0);
      expect(template.formula.expression.trim(), `${template.id} formula`).not.toHaveLength(0);
      expect(template.answerUnit, `${template.id} answer unit`).toBeDefined();
      expect(template.explanationTemplate.steps.length, `${template.id} explanation steps`).toBeGreaterThanOrEqual(2);

      const renderKeys = getRenderKeys(template);
      const textPlaceholders = getTextPlaceholders(template);
      const formulaIdentifiers = getFormulaIdentifiers(template);

      for (const placeholder of textPlaceholders) {
        expect(renderKeys, `${template.id} missing render value for {${placeholder}}`).toContain(placeholder);
      }

      for (const identifier of formulaIdentifiers) {
        expect(Object.keys(template.variables), `${template.id} missing formula variable ${identifier}`).toContain(
          identifier
        );
      }
    }
  });

  it("generates clean finite questions from every starter template across sampled seeds", () => {
    for (const template of starterQuestionTemplates) {
      for (const seed of sampledSeedsFor(template)) {
        const question = generateQuestionFromTemplate(template, {
          difficulty: template.difficulty[0],
          random: createSeededRandom(seed)
        });

        expect(question.prompt, `${template.id} prompt has an unrendered placeholder`).not.toMatch(
          renderedPlaceholderPattern
        );
        expect(Number.isFinite(question.answer.value), `${template.id} answer`).toBe(true);
        expect(question.tags, `${template.id} generated tags`).toEqual(template.tags);
        expect(question.category, `${template.id} generated category`).toBe(template.category);
        expect(question.answer.unit, `${template.id} generated answer unit`).toBe(template.answerUnit);
        expect(Object.keys(question.metadata?.variables ?? {}).sort(), `${template.id} generated variables`).toEqual(
          Object.keys(template.variables).sort()
        );

        const explanationText = [
          question.explanation.short,
          ...question.explanation.steps,
          question.explanation.shortcut ?? ""
        ].join(" ");

        expect(explanationText, `${template.id} explanation has an unrendered placeholder`).not.toMatch(
          renderedPlaceholderPattern
        );
        expect(question.explanation.steps.length, `${template.id} generated explanation`).toBeGreaterThanOrEqual(2);
        expect(explanationText, `${template.id} generated explanation answer`).toContain(String(question.answer.value));
      }
    }
  });
});

function getRenderKeys(template: QuestionTemplate): Set<string> {
  return new Set(["answer", template.formula.outputVariable, ...Object.keys(template.variables)].filter(isString));
}

function getTextPlaceholders(template: QuestionTemplate): Set<string> {
  return new Set(
    [
      ...getPlaceholders(template.promptTemplate),
      ...template.explanationTemplate.steps.flatMap((step) => getPlaceholders(step)),
      ...(template.explanationTemplate.shortcut !== undefined
        ? getPlaceholders(template.explanationTemplate.shortcut)
        : [])
    ]
  );
}

function getPlaceholders(value: string): string[] {
  return Array.from(value.matchAll(placeholderPattern), (match) => match[1]);
}

function getFormulaIdentifiers(template: QuestionTemplate): Set<string> {
  return new Set(Array.from(template.formula.expression.matchAll(formulaIdentifierPattern), (match) => match[0]));
}

function sampledSeedsFor(template: QuestionTemplate): string[] {
  return [0, 1, 2].map((sample) => `${template.id}:${sample}`);
}

function isString(value: string | undefined): value is string {
  return value !== undefined;
}
