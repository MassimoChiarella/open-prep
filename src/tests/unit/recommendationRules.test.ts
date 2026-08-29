import { describe, expect, it } from "vitest";

import { createDrillSession } from "@/features/drills/sessionFactory";
import type { ProgressSummary } from "@/features/progress/progressAggregation";
import { createDeterministicRecommendations } from "@/features/recommendations/recommendationRules";

const generatedAt = "2026-06-10T12:00:00.000Z";

describe("createDeterministicRecommendations", () => {
  it("turns each actionable signal into a usable prioritized drill", () => {
    const recommendations = createDeterministicRecommendations(
      summary({
        categoryPerformance: [
          category("arithmetic", 0.6, 24),
          category("percentages", 0.9, 45)
        ],
        errorBreakdown: [
          { count: 4, errorType: "magnitude_error" },
          { count: 3, errorType: "percentage_point_error" }
        ],
        magnitudeErrorCount: 4,
        recentSessions: [recentSession("2026-06-03T10:00:00.000Z")],
        skillPerformance: [skill("reverse_percentage", 0.5)]
      }),
      generatedAt
    );

    expect(recommendations.map(({ id }) => id)).toEqual([
      "weak-category-arithmetic",
      "magnitude-error-business-math",
      "percentage-point-errors",
      "reverse-percentage-weakness",
      "slow-category-percentages",
      "inactivity-warm-up"
    ]);
    expect(recommendations).toMatchObject([
      { priority: "high", suggestedSettings: { categories: ["arithmetic"], feedbackMode: "retry_first" } },
      { priority: "high", suggestedSettings: { categories: ["business_math"], tags: ["revenue", "market_share"] } },
      { priority: "high", suggestedSettings: { tags: ["percentage_points"] } },
      { priority: "high", suggestedSettings: { tags: ["reverse_percentage"] } },
      { priority: "medium", suggestedSettings: { secondsPerQuestion: 20, timeMode: "per_question" } },
      { priority: "low", suggestedSettings: { questionCount: 3, tags: ["addition", "subtraction"] } }
    ]);

    for (const recommendation of recommendations) {
      expect(
        createDrillSession({
          seed: recommendation.id,
          settings: recommendation.suggestedSettings,
          startedAt: generatedAt
        }).questions
      ).toHaveLength(recommendation.suggestedSettings.questionCount);
    }
  });

  it("requires meaningful history and filters categories without generated drills", () => {
    const recommendations = createDeterministicRecommendations(
      summary({
        categoryPerformance: [
          category("market_sizing", 0.5, 20),
          category("arithmetic", 0.5, 20, 9),
          category("percentages", 0.85, 29.9),
          category("case_math", 0.9, 30)
        ],
        errorBreakdown: [{ count: 2, errorType: "percentage_point_error" }],
        magnitudeErrorCount: 3,
        recentSessions: [recentSession("2026-06-04T10:00:00.000Z")],
        skillPerformance: [skill("reverse_percentage", 0.5, 9)]
      }),
      generatedAt
    );

    expect(recommendations).toMatchObject([
      {
        id: "slow-category-case_math",
        suggestedSettings: { categories: ["case_math"], difficulty: "intermediate" }
      }
    ]);
    expect(createDeterministicRecommendations(summary(), generatedAt)).toEqual([]);
  });
});

function summary(overrides: Partial<ProgressSummary> = {}): ProgressSummary {
  const empty: ProgressSummary = {
    categoryPerformance: [],
    dashboard: {
      averageTimeSeconds: 0,
      currentStreakDays: 0,
      overallAccuracy: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      totalQuestionsAnswered: 0,
      totalSessions: 0
    },
    errorBreakdown: [],
    isEmpty: true,
    magnitudeErrorCount: 0,
    mistakeNotebook: [],
    recentSessions: [],
    skillPerformance: [],
    unitErrorCount: 0
  };

  return { ...empty, ...overrides };
}

function category(
  name: ProgressSummary["categoryPerformance"][number]["category"],
  accuracy: number,
  averageTimeSeconds: number,
  questionCount = 10
): ProgressSummary["categoryPerformance"][number] {
  return {
    accuracy,
    averageTimeSeconds,
    category: name,
    correctCount: Math.round(accuracy * questionCount),
    questionCount
  };
}

function skill(
  tag: ProgressSummary["skillPerformance"][number]["tag"],
  accuracy: number,
  questionCount = 10
): ProgressSummary["skillPerformance"][number] {
  return {
    accuracy,
    averageTimeSeconds: 20,
    correctCount: Math.round(accuracy * questionCount),
    id: tag,
    questionCount,
    tag
  };
}

function recentSession(endedAt: string): ProgressSummary["recentSessions"][number] {
  return {
    accuracy: 1,
    averageTimeSeconds: 12,
    categories: ["arithmetic"],
    correctCount: 3,
    endedAt,
    id: "recent",
    incorrectCount: 0,
    questionCount: 3,
    startedAt: endedAt,
    totalScore: 300
  };
}
