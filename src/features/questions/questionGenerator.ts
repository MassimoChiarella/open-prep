import type { CaseStyleSpec, Difficulty, DrillSettings, ExplanationSpec, Question, QuestionTemplate } from "@/lib/domain";
import { evaluateFormulaExpression } from "@/lib/math/formulaEvaluator";
import { createSeededRandom, type SeededRandom } from "@/lib/random/seededRandom";

import { getEligibleQuestionTemplates, pickQuestionTemplate } from "@/features/questions/templateSelection";
import {
  generateCustomArithmeticQuestion,
  hasCustomArithmeticSettings
} from "@/features/questions/arithmeticQuestionGenerator";
import { renderTemplateText, type TemplateRenderValues } from "@/features/questions/templateRenderer";
import { resolveTemplateVariables } from "@/features/questions/variableResolver";

export interface GenerateQuestionOptions {
  difficulty: Difficulty;
  random: SeededRandom;
  settings?: DrillSettings;
}

export function generateQuestionFromTemplate(
  template: QuestionTemplate,
  options: GenerateQuestionOptions
): Question {
  if (!template.difficulty.includes(options.difficulty)) {
    throw new Error(`Template "${template.id}" does not support difficulty "${options.difficulty}".`);
  }

  if (
    template.category === "arithmetic" &&
    options.settings !== undefined &&
    hasCustomArithmeticSettings(options.settings)
  ) {
    return generateCustomArithmeticQuestion(template, options.settings, options.random);
  }

  const variables = resolveTemplateVariables(template.variables, options.random);
  const answerValue = evaluateFormulaExpression(template.formula.expression, variables);
  const renderValues = buildRenderValues(variables, answerValue, template.formula.outputVariable);
  const caseStyle = renderCaseStyle(template.caseStyle, renderValues, options.random);

  return {
    id: buildGeneratedQuestionId(template.id, variables),
    type: "numeric",
    category: template.category,
    tags: template.tags,
    difficulty: options.difficulty,
    prompt: renderTemplateText(template.promptTemplate, renderValues),
    answer: {
      value: answerValue,
      unit: template.answerUnit
    },
    explanation: renderExplanation(template, renderValues),
    metadata: {
      ...(caseStyle === undefined ? {} : { caseStyle }),
      variables,
      sourceType: "generated"
    }
  };
}

export function generateQuestionsFromTemplates(
  templates: readonly QuestionTemplate[],
  settings: DrillSettings,
  seed: string | number,
  allowFewerQuestions = false
): Question[] {
  const random = createSeededRandom(seed);
  const questions: Question[] = [];
  const usedQuestionIds = new Set<string>();
  const maxAttempts = Math.max(settings.questionCount * 25, 25);

  for (let attempts = 0; questions.length < settings.questionCount && attempts < maxAttempts; attempts += 1) {
    const template = pickQuestionTemplate(templates, settings, random);
    const question = generateQuestionFromTemplate(template, {
      difficulty: settings.difficulty,
      random,
      settings
    });

    if (usedQuestionIds.has(question.id)) {
      continue;
    }

    usedQuestionIds.add(question.id);
    questions.push(question);
  }

  if (questions.length === 0 || (!allowFewerQuestions && questions.length < settings.questionCount)) {
    throw new Error("Unable to generate enough unique questions for the requested settings.");
  }

  return questions;
}

export function generateSimilarQuestionFromTemplates(
  templates: readonly QuestionTemplate[],
  sourceQuestion: Question,
  settings: DrillSettings,
  seed: string | number,
  excludedQuestionIds: readonly string[] = []
): Question | undefined {
  const variantSettings: DrillSettings = {
    ...settings,
    categories: [sourceQuestion.category],
    difficulty: sourceQuestion.difficulty,
    questionCount: 1,
    tags: sourceQuestion.tags.length > 0 ? [sourceQuestion.tags[0]] : undefined
  };
  const eligibleTemplates = getEligibleQuestionTemplates(templates, variantSettings);

  if (eligibleTemplates.length === 0) {
    return undefined;
  }

  const excludedIds = new Set([sourceQuestion.id, ...excludedQuestionIds]);

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = generateQuestionsFromTemplates(eligibleTemplates, variantSettings, `${seed}:${attempt}`)[0];

    if (!excludedIds.has(candidate.id) && hasDifferentQuestionContent(sourceQuestion, candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function hasDifferentQuestionContent(source: Question, candidate: Question): boolean {
  return (
    source.prompt !== candidate.prompt ||
    source.answer.value !== candidate.answer.value ||
    JSON.stringify(source.metadata?.variables) !== JSON.stringify(candidate.metadata?.variables)
  );
}

function buildRenderValues(
  variables: Record<string, number>,
  answerValue: number,
  outputVariable: string | undefined
): TemplateRenderValues {
  return {
    ...variables,
    answer: answerValue,
    ...(outputVariable ? { [outputVariable]: answerValue } : {})
  };
}

function renderExplanation(template: QuestionTemplate, values: TemplateRenderValues): ExplanationSpec {
  const steps = template.explanationTemplate.steps.map((step) => renderTemplateText(step, values));

  return {
    short: steps[0] ?? "Use the given formula and calculate the answer.",
    steps,
    shortcut:
      template.explanationTemplate.shortcut !== undefined
        ? renderTemplateText(template.explanationTemplate.shortcut, values)
        : undefined
  };
}

function renderCaseStyle(
  caseStyle: CaseStyleSpec | undefined,
  values: TemplateRenderValues,
  random: SeededRandom
): CaseStyleSpec | undefined {
  if (caseStyle === undefined) {
    return undefined;
  }

  return {
    calculationStepCount: caseStyle.calculationStepCount,
    industry: caseStyle.industry,
    interviewMath: {
      expectedUnit: caseStyle.interviewMath.expectedUnit,
      equationOptions: random.shuffle(
        caseStyle.interviewMath.equationOptions.map((option) => ({
          ...option,
          label: renderTemplateText(option.label, values)
        }))
      ),
      interpretationOptions: random.shuffle(
        caseStyle.interviewMath.interpretationOptions.map((option) => ({
          ...option,
          label: renderTemplateText(option.label, values)
        }))
      )
    }
  };
}

function buildGeneratedQuestionId(templateId: string, variables: Record<string, number>): string {
  const variableKey = Object.entries(variables)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}-${String(value).replace(".", "_")}`)
    .join("-");

  return `${templateId}-${variableKey}`;
}
