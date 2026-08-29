import { describe, expect, it } from "vitest";

import { conceptLessons } from "@/data/casePractice/conceptLessons";
import { scoreConceptKnowledgeCheck } from "@/features/case-practice/lessons/conceptLessonScoring";

describe("concept lesson scoring", () => {
  const check = conceptLessons[0].knowledgeCheck;

  it("awards one point for the exact answer", () => {
    expect(scoreConceptKnowledgeCheck(check, check.correctOptionId)).toEqual({
      answerId: check.correctOptionId,
      feedback: `Correct. ${check.explanation}`,
      isCorrect: true,
      maxScore: 1,
      score: 1
    });
  });

  it.each(["a", "unknown", undefined])("scores an incorrect or missing answer as zero", (answerId) => {
    const result = scoreConceptKnowledgeCheck(check, answerId);

    expect(result).toMatchObject({ answerId, isCorrect: false, maxScore: 1, score: 0 });
    expect(result.feedback).toBe(`Not quite. ${check.explanation}`);
  });
});

describe("concept lesson catalog", () => {
  it("contains one valid knowledge check for every required topic", () => {
    expect(conceptLessons.map((lesson) => lesson.topic)).toEqual([
      "mental_math",
      "issue_tree",
      "exhibit_reading",
      "business_economics",
      "brainstorming",
      "synthesis"
    ]);

    for (const lesson of conceptLessons) {
      expect(lesson.workedExample.steps.length).toBeGreaterThan(0);
      expect(lesson.knowledgeCheck.options).toHaveLength(3);
      expect(
        lesson.knowledgeCheck.options.some(
          (option) => option.id === lesson.knowledgeCheck.correctOptionId
        )
      ).toBe(true);
    }
  });

  it("uses unique lesson and option identifiers", () => {
    expect(new Set(conceptLessons.map((lesson) => lesson.id)).size).toBe(conceptLessons.length);

    for (const lesson of conceptLessons) {
      const optionIds = lesson.knowledgeCheck.options.map((option) => option.id);
      expect(new Set(optionIds).size).toBe(optionIds.length);
    }
  });
});
