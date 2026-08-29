import { createDrillSettings } from "@/features/drills/drillSettings";
import { categoryOptions } from "@/features/drills/drillSettingsOptions";
import type { ProgressSummary } from "@/features/progress/progressAggregation";
import type { Recommendation, SkillCategory } from "@/lib/domain";
import { formatPercent } from "@/lib/format";

export const minimumRecommendationQuestionCount = 10;
const supportedDrillCategories = new Set(categoryOptions.map((option) => option.value));

const categoryLabels: Record<SkillCategory, string> = {
  arithmetic: "Arithmetic",
  business_math: "Business math",
  case_math: "Case math",
  exhibit_math: "Exhibit math",
  fractions_decimals_ratios: "Fractions and decimals",
  growth_compounding: "Growth and compounding",
  market_sizing: "Market sizing",
  percentages: "Percentages",
  weighted_averages: "Weighted averages"
};

export function createDeterministicRecommendations(
  summary: ProgressSummary,
  generatedAt = new Date().toISOString()
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const category of summary.categoryPerformance) {
    if (
      category.questionCount < minimumRecommendationQuestionCount ||
      !supportedDrillCategories.has(category.category)
    ) {
      continue;
    }

    if (category.accuracy < 0.75) {
      recommendations.push({
        id: `weak-category-${category.category}`,
        priority: "high",
        reason: `${categoryLabels[category.category]} accuracy is ${formatPercent(category.accuracy)} over ${category.questionCount} questions.`,
        signal: {
          label: "Accuracy signal",
          value: `${formatPercent(category.accuracy)} over ${category.questionCount} questions`
        },
        suggestedSettings: createDrillSettings({
          categories: [category.category],
          difficulty: recommendationDifficulty(category.category),
          feedbackMode: "retry_first",
          questionCount: 5,
          timeMode: "untimed"
        }),
        title: `Rebuild ${categoryLabels[category.category]} accuracy`
      });
    } else if (category.accuracy >= 0.85 && category.averageTimeSeconds >= 30) {
      recommendations.push({
        id: `slow-category-${category.category}`,
        priority: "medium",
        reason: `${categoryLabels[category.category]} accuracy is strong, but average time is ${formatSeconds(category.averageTimeSeconds)}.`,
        signal: {
          label: "Pace signal",
          value: `${formatSeconds(category.averageTimeSeconds)} average solve time`
        },
        suggestedSettings: createDrillSettings({
          categories: [category.category],
          difficulty: recommendationDifficulty(category.category),
          feedbackMode: "instant",
          questionCount: 5,
          secondsPerQuestion: 20,
          timeMode: "per_question"
        }),
        title: `Speed up ${categoryLabels[category.category]}`
      });
    }
  }

  if (summary.magnitudeErrorCount > 3) {
    recommendations.push({
      id: "magnitude-error-business-math",
      priority: "high",
      reason: `${summary.magnitudeErrorCount} magnitude errors suggest place-value or K/M/B conversion risk.`,
      signal: { label: "Error signal", value: `${summary.magnitudeErrorCount} magnitude errors` },
      suggestedSettings: createDrillSettings({
        categories: ["business_math"],
        feedbackMode: "retry_first",
        questionCount: 5,
        tags: ["revenue", "market_share"],
        timeMode: "untimed"
      }),
      title: "Practice magnitude control"
    });
  }

  const percentagePointErrors =
    summary.errorBreakdown.find((item) => item.errorType === "percentage_point_error")?.count ?? 0;

  if (percentagePointErrors > 2) {
    recommendations.push({
      id: "percentage-point-errors",
      priority: "high",
      reason: `${percentagePointErrors} percentage-point errors indicate percent change wording needs reinforcement.`,
      signal: { label: "Error signal", value: `${percentagePointErrors} percentage-point errors` },
      suggestedSettings: createDrillSettings({
        categories: ["percentages"],
        feedbackMode: "retry_first",
        questionCount: 5,
        tags: ["percentage_points"],
        timeMode: "untimed"
      }),
      title: "Review percentage points"
    });
  }

  const reversePercentage = summary.skillPerformance.find((skill) => skill.tag === "reverse_percentage");

  if (
    reversePercentage !== undefined &&
    reversePercentage.questionCount >= minimumRecommendationQuestionCount &&
    reversePercentage.accuracy < 0.75
  ) {
    recommendations.push({
      id: "reverse-percentage-weakness",
      priority: "high",
      reason: `Reverse percentage accuracy is ${formatPercent(reversePercentage.accuracy)} over ${reversePercentage.questionCount} questions.`,
      signal: {
        label: "Skill signal",
        value: `${formatPercent(reversePercentage.accuracy)} reverse percentage accuracy`
      },
      suggestedSettings: createDrillSettings({
        categories: ["percentages"],
        feedbackMode: "retry_first",
        questionCount: 5,
        tags: ["reverse_percentage"],
        timeMode: "untimed"
      }),
      title: "Strengthen reverse percentages"
    });
  }

  const daysSinceLastSession = daysBetween(
    summary.recentSessions[0]?.endedAt ?? summary.recentSessions[0]?.startedAt,
    generatedAt
  );

  if (daysSinceLastSession !== undefined && daysSinceLastSession >= 7) {
    recommendations.push({
      id: "inactivity-warm-up",
      priority: "low",
      reason: `Last completed session was ${daysSinceLastSession} days ago.`,
      signal: { label: "Activity signal", value: `${daysSinceLastSession} days since last session` },
      suggestedSettings: createDrillSettings({
        categories: ["arithmetic"],
        feedbackMode: "instant",
        questionCount: 3,
        tags: ["addition", "subtraction"],
        timeMode: "untimed"
      }),
      title: "Restart with a short warm-up"
    });
  }

  const priority = { high: 3, low: 1, medium: 2 } satisfies Record<Recommendation["priority"], number>;
  return recommendations.sort((first, second) => priority[second.priority] - priority[first.priority]);
}

function recommendationDifficulty(category: SkillCategory): "beginner" | "intermediate" {
  return category === "case_math" ? "intermediate" : "beginner";
}

function formatSeconds(value: number): string {
  return `${value.toFixed(1)}s`;
}

function daysBetween(start: string | undefined, end: string): number | undefined {
  const startTime = dateOnlyTime(start);
  const endTime = dateOnlyTime(end);

  return startTime === undefined || endTime === undefined
    ? undefined
    : Math.max(0, Math.floor((endTime - startTime) / 86_400_000));
}

function dateOnlyTime(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? undefined
    : Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
