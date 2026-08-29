import { createDrillSettings } from "@/features/drills/drillSettings";
import { categoryOptions, skillTagOptions } from "@/features/drills/drillSettingsOptions";
import { minimumRecommendationQuestionCount } from "@/features/recommendations/recommendationRules";
import type { DrillSettings, SkillCategory, SkillTag } from "@/lib/domain";
import type { StoredUserResponse } from "@/lib/storage/appStorageTypes";

export interface WeaknessStatistics {
  accuracy: number;
  averageTimeSeconds: number;
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
}

export interface WeaknessSignal extends WeaknessStatistics {
  category: SkillCategory;
  focusTag?: SkillTag;
  focusTagStatistics?: WeaknessStatistics;
}

const supportedCategories = new Set(categoryOptions.map((option) => option.value));
const supportedTags = new Set(skillTagOptions.map((option) => option.value));

export function rankWeaknesses(
  responses: readonly StoredUserResponse[],
  limit = 3
): WeaknessSignal[] {
  const responsesByCategory = new Map<SkillCategory, StoredUserResponse[]>();

  for (const response of responses) {
    if (response.category === undefined || !supportedCategories.has(response.category)) {
      continue;
    }

    const categoryResponses = responsesByCategory.get(response.category) ?? [];
    categoryResponses.push(response);
    responsesByCategory.set(response.category, categoryResponses);
  }

  return Array.from(responsesByCategory.entries())
    .map(([category, categoryResponses]) => {
      const focusTag = selectFocusTag(categoryResponses);

      return {
        category,
        ...createStatistics(categoryResponses),
        focusTag: focusTag?.tag,
        focusTagStatistics: focusTag?.statistics
      };
    })
    .sort(compareWeaknesses)
    .slice(0, Math.max(0, Math.floor(limit)));
}

export function deriveWeaknessDrillSettings(
  responses: readonly StoredUserResponse[]
): DrillSettings | undefined {
  const weakness = rankWeaknesses(responses, supportedCategories.size).find(
    (signal) => signal.attemptCount >= minimumRecommendationQuestionCount
  );

  if (weakness === undefined) {
    return undefined;
  }

  return createDrillSettings({
    categories: [weakness.category],
    difficulty: weakness.category === "case_math" ? "intermediate" : "beginner",
    feedbackMode: "instant",
    questionCount: 5,
    tags: weakness.focusTag === undefined ? undefined : [weakness.focusTag],
    timeMode: "untimed"
  });
}

function selectFocusTag(
  responses: readonly StoredUserResponse[]
): { statistics: WeaknessStatistics; tag: SkillTag } | undefined {
  const responsesByTag = new Map<SkillTag, StoredUserResponse[]>();

  for (const response of responses) {
    for (const tag of new Set(response.tags ?? [])) {
      if (!supportedTags.has(tag)) {
        continue;
      }

      const tagResponses = responsesByTag.get(tag) ?? [];
      tagResponses.push(response);
      responsesByTag.set(tag, tagResponses);
    }
  }

  return Array.from(responsesByTag.entries())
    .map(([tag, tagResponses]) => ({ statistics: createStatistics(tagResponses), tag }))
    .sort(
      (first, second) =>
        compareStatistics(first.statistics, second.statistics) || first.tag.localeCompare(second.tag)
    )[0];
}

function createStatistics(responses: readonly StoredUserResponse[]): WeaknessStatistics {
  const correctCount = responses.filter((response) => response.isCorrect).length;
  const totalTimeSeconds = responses.reduce(
    (total, response) =>
      total +
      (Number.isFinite(response.timeTakenSeconds) && response.timeTakenSeconds >= 0
        ? response.timeTakenSeconds
        : 0),
    0
  );

  return {
    accuracy: responses.length === 0 ? 0 : correctCount / responses.length,
    averageTimeSeconds: responses.length === 0 ? 0 : totalTimeSeconds / responses.length,
    attemptCount: responses.length,
    correctCount,
    incorrectCount: responses.length - correctCount
  };
}

function compareWeaknesses(first: WeaknessSignal, second: WeaknessSignal): number {
  return compareStatistics(first, second) || first.category.localeCompare(second.category);
}

function compareStatistics(first: WeaknessStatistics, second: WeaknessStatistics): number {
  return first.accuracy - second.accuracy || second.averageTimeSeconds - first.averageTimeSeconds;
}
