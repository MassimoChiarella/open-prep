import { describe, expect, it } from "vitest";

import { benchmarkScoreBands, benchmarkTests } from "@/data/questionBank/benchmarkTests";
import { getBenchmarkScoreBand } from "@/features/benchmarks/benchmarkScoring";
import type { Question } from "@/lib/domain";
import { validateAnswer } from "@/lib/validation/validateAnswer";

describe("benchmark tests", () => {
  it("defines the four fixed benchmark levels", () => {
    expect(benchmarkTests.map((benchmark) => benchmark.id)).toEqual([
      "beginner",
      "intermediate",
      "advanced",
      "expert-pressure"
    ]);
    expect(benchmarkTests.map((benchmark) => benchmark.difficulty)).toEqual([
      "beginner",
      "intermediate",
      "advanced",
      "expert"
    ]);
  });

  it("locks benchmark settings to timed end-of-session mode", () => {
    for (const benchmark of benchmarkTests) {
      expect(benchmark.questions).toHaveLength(20);
      expect(benchmark.settings).toMatchObject({
        difficulty: benchmark.difficulty,
        feedbackMode: "end_of_session",
        questionCount: benchmark.questions.length,
        timeMode: "session"
      });
      expect(benchmark.settings.totalSessionSeconds, `${benchmark.id} total time`).toBeGreaterThan(0);
      expect(benchmark.scoreBands).toEqual(benchmarkScoreBands);
    }
  });

  it("keeps fixed question IDs, metadata, explanations, and answers valid", () => {
    const allQuestionIds = new Set<string>();

    for (const benchmark of benchmarkTests) {
      const benchmarkQuestionIds = new Set<string>();

      for (const question of benchmark.questions) {
        expect(question.id, `${benchmark.id} id`).toMatch(new RegExp(`^${benchmark.id}-q\\d{2}$`));
        expect(benchmarkQuestionIds.has(question.id), `${question.id} repeated inside benchmark`).toBe(false);
        expect(allQuestionIds.has(question.id), `${question.id} repeated globally`).toBe(false);
        benchmarkQuestionIds.add(question.id);
        allQuestionIds.add(question.id);

        expect(question.difficulty, `${question.id} difficulty`).toBe(benchmark.difficulty);
        expect(question.type, `${question.id} type`).toBe("numeric");
        expect(question.metadata?.sourceType, `${question.id} source type`).toBe("benchmark");
        expect(question.prompt.trim(), `${question.id} prompt`).not.toHaveLength(0);
        expect(question.tags.length, `${question.id} tags`).toBeGreaterThan(0);
        expect(question.explanation.steps.length, `${question.id} explanation`).toBeGreaterThanOrEqual(2);
        expect(Number.isFinite(question.answer.value), `${question.id} answer`).toBe(true);
        expect(validateAnswer(correctInputFor(question), question.answer).isCorrect, `${question.id} validates`).toBe(
          true
        );
      }
    }

    expect(allQuestionIds.size).toBe(80);
  });

  it("classifies benchmark score labels by deterministic accuracy thresholds", () => {
    expect(getBenchmarkScoreBand(0.59, benchmarkScoreBands)).toMatchObject({
      label: "needs_work",
      title: "Needs work"
    });
    expect(getBenchmarkScoreBand(0.6, benchmarkScoreBands)).toMatchObject({
      label: "developing",
      title: "Developing"
    });
    expect(getBenchmarkScoreBand(0.75, benchmarkScoreBands)).toMatchObject({
      label: "strong",
      title: "Strong"
    });
    expect(getBenchmarkScoreBand(0.9, benchmarkScoreBands)).toMatchObject({
      label: "excellent",
      title: "Excellent"
    });
  });
});

function correctInputFor(question: Question): string {
  if (question.answer.unit === "percentage") {
    return `${question.answer.value * 100}%`;
  }

  if (question.answer.unit === "currency") {
    return `$${question.answer.value}`;
  }

  return String(question.answer.value);
}
