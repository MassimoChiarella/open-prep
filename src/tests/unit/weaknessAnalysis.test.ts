import { describe, expect, it } from "vitest";

import {
  deriveWeaknessDrillSettings,
  rankWeaknesses
} from "@/features/progress/weaknessAnalysis";
import type { SkillCategory, SkillTag } from "@/lib/domain";
import type { StoredUserResponse } from "@/lib/storage/appStorageTypes";

describe("weakness analysis", () => {
  it("ranks categories by accuracy and limits the result", () => {
    const weaknesses = rankWeaknesses(
      [
        response("percent-1", "percentages", false, 12, ["percentage_change"]),
        response("arithmetic-1", "arithmetic", true, 10, ["addition"]),
        response("arithmetic-2", "arithmetic", false, 20, ["addition"]),
        response("business-1", "business_math", true, 15, ["revenue"])
      ],
      2
    );

    expect(weaknesses.map((item) => item.category)).toEqual(["percentages", "arithmetic"]);
    expect(weaknesses[1]).toMatchObject({
      accuracy: 0.5,
      attemptCount: 2,
      averageTimeSeconds: 15,
      correctCount: 1,
      incorrectCount: 1
    });
  });

  it("uses slower average time and then category name to break accuracy ties", () => {
    const weaknesses = rankWeaknesses([
      response("arithmetic-1", "arithmetic", true, 10, ["addition"]),
      response("arithmetic-2", "arithmetic", false, 20, ["addition"]),
      response("percent-1", "percentages", true, 30, ["percentage_change"]),
      response("percent-2", "percentages", false, 40, ["percentage_change"]),
      response("business-1", "business_math", true, 10, ["revenue"]),
      response("business-2", "business_math", false, 20, ["revenue"])
    ]);

    expect(weaknesses.map((item) => item.category)).toEqual([
      "percentages",
      "arithmetic",
      "business_math"
    ]);
  });

  it("selects the weakest supported tag within each category", () => {
    const [weakness] = rankWeaknesses([
      response("revenue-1", "business_math", false, 30, ["revenue", "revenue"]),
      response("cost-1", "business_math", false, 10, ["cost"]),
      response("margin-1", "business_math", true, 10, ["margin"]),
      response("margin-2", "business_math", false, 30, ["margin"])
    ]);

    expect(weakness.focusTag).toBe("revenue");
    expect(weakness.focusTagStatistics).toEqual({
      accuracy: 0,
      attemptCount: 1,
      averageTimeSeconds: 30,
      correctCount: 0,
      incorrectCount: 1
    });
  });

  it("handles empty records and missing category or tag data", () => {
    const missingCategory = { ...response("missing", "arithmetic", false, 10), category: undefined };
    const noTag = response("no-tag", "arithmetic", false, 10);

    expect(rankWeaknesses([])).toEqual([]);
    expect(rankWeaknesses([missingCategory])).toEqual([]);
    expect(rankWeaknesses([noTag], 0)).toEqual([]);
    expect(rankWeaknesses([noTag])).toEqual([
      {
        accuracy: 0,
        attemptCount: 1,
        averageTimeSeconds: 10,
        category: "arithmetic",
        correctCount: 0,
        focusTag: undefined,
        focusTagStatistics: undefined,
        incorrectCount: 1
      }
    ]);
    expect(deriveWeaknessDrillSettings([])).toBeUndefined();
    expect(deriveWeaknessDrillSettings([noTag])).toBeUndefined();
  });

  it("derives settings only after a category reaches the shared evidence floor", () => {
    const settings = deriveWeaknessDrillSettings([
      response("unsupported", "exhibit_math", false, 60),
      ...Array.from({ length: 10 }, (_, index) =>
        response(`case-${index + 1}`, "case_math", false, 40, ["margin"])
      ),
      response("arithmetic-1", "arithmetic", true, 10, ["addition"])
    ]);

    expect(settings).toEqual({
      categories: ["case_math"],
      difficulty: "intermediate",
      feedbackMode: "instant",
      questionCount: 5,
      tags: ["margin"],
      timeMode: "untimed"
    });
  });
});

function response(
  id: string,
  category: SkillCategory,
  isCorrect: boolean,
  timeTakenSeconds: number,
  tags?: SkillTag[]
): StoredUserResponse {
  return {
    category,
    errorTypes: isCorrect ? ["none"] : ["arithmetic_error"],
    id,
    isCorrect,
    questionId: id,
    rawInput: isCorrect ? "10" : "9",
    sessionId: "session-1",
    submittedAt: "2026-08-09T12:00:00.000Z",
    tags,
    timeTakenSeconds
  };
}
