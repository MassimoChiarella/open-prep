import { describe, expect, it } from "vitest";

import { synthesisPrompts } from "@/data/casePractice/synthesisPrompts";
import {
  SYNTHESIS_DIMENSIONS,
  scoreSynthesisResponse
} from "@/features/case-practice/synthesis/synthesisScoring";

describe("scoreSynthesisResponse", () => {
  const prompt = synthesisPrompts[0];

  it("awards one point for each correct component", () => {
    const score = scoreSynthesisResponse(prompt, prompt.correctResponse);

    expect(score).toEqual({
      criteria: SYNTHESIS_DIMENSIONS.map((dimension) => ({
        correctOptionId: prompt.correctResponse[dimension],
        dimension,
        earnedPoints: 1,
        maxPoints: 1,
        selectedOptionId: prompt.correctResponse[dimension]
      })),
      maxScore: 4,
      totalScore: 4
    });
  });

  it("scores incorrect and missing components without partial credit", () => {
    const score = scoreSynthesisResponse(prompt, {
      recommendation: prompt.correctResponse.recommendation,
      evidence: "not-an-answer",
      risk: prompt.correctResponse.risk
    });

    expect(score.totalScore).toBe(2);
    expect(score.maxScore).toBe(4);
    expect(score.criteria.map(({ dimension, earnedPoints }) => [dimension, earnedPoints])).toEqual([
      ["recommendation", 1],
      ["evidence", 0],
      ["risk", 1],
      ["nextStep", 0]
    ]);
  });

  it("provides valid answer keys for every bundled prompt", () => {
    expect(synthesisPrompts).toHaveLength(3);

    for (const candidate of synthesisPrompts) {
      for (const dimension of SYNTHESIS_DIMENSIONS) {
        expect(candidate.options[dimension]).toHaveLength(3);
        expect(candidate.options[dimension].some(({ id }) => id === candidate.correctResponse[dimension])).toBe(true);
      }

      expect(scoreSynthesisResponse(candidate, candidate.correctResponse).totalScore).toBe(4);
      expect(candidate.modelClose.length).toBeGreaterThan(100);
    }
  });
});
