import type { DrillSettings, QuestionTemplate, SkillTag } from "@/lib/domain";
import type { SeededRandom } from "@/lib/random/seededRandom";

export function getEligibleQuestionTemplates(
  templates: readonly QuestionTemplate[],
  settings: Pick<
    DrillSettings,
    "caseCalculationStepCount" | "caseIndustry" | "categories" | "difficulty" | "tags"
  >
): QuestionTemplate[] {
  return templates.filter((template) => {
    const categoryMatches = settings.categories.includes(template.category);
    const difficultyMatches = template.difficulty.includes(settings.difficulty);
    const tagsMatch = settings.tags === undefined || hasAnyRequestedTag(template.tags, settings.tags);
    const caseIndustryMatches =
      template.category !== "case_math" ||
      settings.caseIndustry === undefined ||
      template.caseStyle?.industry === settings.caseIndustry;
    const caseStepCountMatches =
      template.category !== "case_math" ||
      settings.caseCalculationStepCount === undefined ||
      template.caseStyle?.calculationStepCount === settings.caseCalculationStepCount;

    return categoryMatches && difficultyMatches && tagsMatch && caseIndustryMatches && caseStepCountMatches;
  });
}

export function pickQuestionTemplate(
  templates: readonly QuestionTemplate[],
  settings: Pick<
    DrillSettings,
    "caseCalculationStepCount" | "caseIndustry" | "categories" | "difficulty" | "tags"
  >,
  random: SeededRandom
): QuestionTemplate {
  const eligibleTemplates = getEligibleQuestionTemplates(templates, settings);

  if (eligibleTemplates.length === 0) {
    throw new Error("No question templates match the requested drill settings.");
  }

  return random.pick(eligibleTemplates);
}

function hasAnyRequestedTag(templateTags: readonly SkillTag[], requestedTags: readonly SkillTag[]): boolean {
  return requestedTags.some((tag) => templateTags.includes(tag));
}
