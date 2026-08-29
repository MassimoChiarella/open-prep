import { describe, expect, it } from "vitest";

import { caseStyleQuestionTemplates } from "@/data/questionTemplates/caseStyleTemplates";
import { generateQuestionFromTemplate, generateQuestionsFromTemplates } from "@/features/questions/questionGenerator";
import type { CaseIndustry, DrillSettings, SkillTag } from "@/lib/domain";
import { createSeededRandom } from "@/lib/random/seededRandom";

const renderedPlaceholderPattern = /\{[A-Za-z_][A-Za-z0-9_]*\}/;
const requiredCaseTags = [
  "market_share",
  "revenue",
  "margin",
  "simple_growth",
  "capacity_utilization",
  "unit_conversion"
] satisfies SkillTag[];
const requiredIndustries = [
  "airlines",
  "banking",
  "consumer_goods",
  "healthcare",
  "insurance",
  "manufacturing",
  "marketplaces",
  "retail",
  "saas",
  "telecom"
] satisfies CaseIndustry[];

describe("case-style question templates", () => {
  it("covers every industry and calculation depth from two through six steps", () => {
    expect(caseStyleQuestionTemplates.length).toBeGreaterThanOrEqual(16);
    expect(new Set(caseStyleQuestionTemplates.map((template) => template.id)).size).toBe(
      caseStyleQuestionTemplates.length
    );
    expect(new Set(caseStyleQuestionTemplates.map((template) => template.caseStyle.industry))).toEqual(
      new Set(requiredIndustries)
    );
    expect(new Set(caseStyleQuestionTemplates.map((template) => template.caseStyle.calculationStepCount))).toEqual(
      new Set([2, 3, 4, 5, 6])
    );

    const availableTags = new Set(caseStyleQuestionTemplates.flatMap((template) => template.tags));
    for (const tag of requiredCaseTags) {
      expect(availableTags, `${tag} case coverage`).toContain(tag);
    }

    for (const template of caseStyleQuestionTemplates) {
      const interviewMath = template.caseStyle.interviewMath;

      expect(interviewMath.expectedUnit, `${template.id} expected unit`).toBe("m");
      expect(interviewMath.equationOptions, `${template.id} equation options`).toHaveLength(3);
      expect(interviewMath.interpretationOptions, `${template.id} interpretation options`).toHaveLength(3);
      expect(interviewMath.equationOptions.filter((option) => option.formulaCorrect)).toHaveLength(2);
      expect(interviewMath.equationOptions.filter((option) => option.setupCorrect)).toHaveLength(1);
      expect(interviewMath.interpretationOptions.filter((option) => option.isCorrect)).toHaveLength(1);
      expect(new Set(interviewMath.equationOptions.map((option) => option.id))).toHaveProperty("size", 3);
      expect(new Set(interviewMath.interpretationOptions.map((option) => option.id))).toHaveProperty("size", 3);
    }
  });

  it("enforces concise prompts and setup-calculation-interpretation explanations", () => {
    for (const template of caseStyleQuestionTemplates) {
      const { calculationStepCount } = template.caseStyle;

      expect(template.category).toBe("case_math");
      expect(template.promptTemplate.length, `${template.id} prompt length`).toBeLessThanOrEqual(260);
      expect(template.tags.length, `${template.id} mixed tags`).toBeGreaterThanOrEqual(2);
      expect(template.explanationTemplate.steps, `${template.id} explanation length`).toHaveLength(
        calculationStepCount + 2
      );
      expect(template.explanationTemplate.steps[0], `${template.id} setup`).toMatch(/^Setup:/);

      for (let step = 1; step <= calculationStepCount; step += 1) {
        expect(template.explanationTemplate.steps[step], `${template.id} calculation ${step}`).toMatch(
          new RegExp(`^Calculate ${step}:`)
        );
      }

      expect(template.explanationTemplate.steps.at(-1), `${template.id} interpretation`).toMatch(/^Interpret:/);
    }
  });

  it("renders Interview Math choices without placeholders", () => {
    for (const template of caseStyleQuestionTemplates) {
      const question = generateQuestionFromTemplate(template, {
        difficulty: template.difficulty[0],
        random: createSeededRandom(template.id)
      });
      const interviewMath = question.metadata?.caseStyle?.interviewMath;
      const choiceLabels = [
        ...(interviewMath?.equationOptions.map((option) => option.label) ?? []),
        ...(interviewMath?.interpretationOptions.map((option) => option.label) ?? [])
      ].join(" ");

      expect(interviewMath).toBeDefined();
      expect(choiceLabels, `${template.id} choice placeholders`).not.toMatch(renderedPlaceholderPattern);
    }
  });

  it("filters case queues by industry and calculation step count", () => {
    for (const template of caseStyleQuestionTemplates) {
      const difficulty = template.difficulty[0];
      const settings: DrillSettings = {
        caseCalculationStepCount: template.caseStyle.calculationStepCount,
        caseIndustry: template.caseStyle.industry,
        categories: ["case_math"],
        difficulty,
        feedbackMode: "instant",
        questionCount: 1,
        timeMode: "untimed"
      };
      const [question] = generateQuestionsFromTemplates(
        caseStyleQuestionTemplates,
        settings,
        `case-filter-${template.id}`
      );

      expect(question.metadata?.caseStyle).toMatchObject({
        calculationStepCount: template.caseStyle.calculationStepCount,
        industry: template.caseStyle.industry
      });
    }
  });
});
