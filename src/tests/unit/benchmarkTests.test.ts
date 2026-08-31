import { describe, expect, it } from "vitest";

import { benchmarkScoreBands, benchmarkTests } from "@/data/questionBank/benchmarkTests";
import {
  analyzeBenchmarkReachability,
  getBenchmarkScoreBand
} from "@/features/benchmarks/benchmarkScoring";
import type { BenchmarkScoreBand } from "@/features/benchmarks/benchmarkTypes";
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

  it.each([
    {
      expectedSelectable: ["needs_work", "excellent"],
      expectedThresholds: ["needs_work", "excellent"],
      questionCount: 1,
      scoreBands: scoreBandsAt(0.25, 0.5, 1)
    },
    {
      expectedSelectable: ["needs_work", "developing", "excellent"],
      expectedThresholds: ["needs_work", "developing", "excellent"],
      questionCount: 2,
      scoreBands: scoreBandsAt(0.5, 0.75, 1)
    },
    {
      expectedSelectable: ["needs_work", "developing", "strong", "excellent"],
      expectedThresholds: ["needs_work", "developing"],
      questionCount: 6,
      scoreBands: scoreBandsAt(0.5, 0.75, 0.9)
    },
    {
      expectedSelectable: ["needs_work", "developing", "strong", "excellent"],
      expectedThresholds: ["needs_work", "developing", "strong", "excellent"],
      questionCount: 50,
      scoreBands: scoreBandsAt(0.02, 0.98, 1)
    }
  ])(
    "enumerates all outcomes and reports score-band reachability for $questionCount questions",
    ({ expectedSelectable, expectedThresholds, questionCount, scoreBands }) => {
      const result = analyzeBenchmarkReachability(questionCount, scoreBands);

      expect(result.outcomes).toHaveLength(questionCount + 1);
      expect(result.outcomes.map((outcome) => outcome.correctCount)).toEqual(
        Array.from({ length: questionCount + 1 }, (_, correctCount) => correctCount)
      );
      expect(result.outcomes[0]).toMatchObject({ accuracy: 0, correctCount: 0 });
      expect(result.outcomes.at(-1)).toMatchObject({ accuracy: 1, correctCount: questionCount });
      expect(result.scoreBands.filter((band) => band.isThresholdAttainable).map((band) => band.label)).toEqual(
        expectedThresholds
      );
      expect(result.scoreBands.filter((band) => band.isSelectable).map((band) => band.label)).toEqual(
        expectedSelectable
      );
      expect(result.areAllBandsSelectable).toBe(expectedSelectable.length === scoreBands.length);
    }
  );

  it("keeps exact threshold attainability separate from runtime band selection", () => {
    const result = analyzeBenchmarkReachability(6, scoreBandsAt(0.5, 0.75, 0.9));

    expect(result.scoreBands.find((band) => band.label === "strong")).toMatchObject({
      isSelectable: true,
      isThresholdAttainable: false
    });
    expect(result.outcomes.find((outcome) => outcome.correctCount === 5)).toMatchObject({
      accuracy: 5 / 6,
      scoreBandLabel: "strong"
    });
  });

  it("requires a positive whole-number question count", () => {
    expect(() => analyzeBenchmarkReachability(0, benchmarkScoreBands)).toThrow(
      "Benchmark question count must be a positive integer."
    );
    expect(() => analyzeBenchmarkReachability(1.5, benchmarkScoreBands)).toThrow(
      "Benchmark question count must be a positive integer."
    );
  });
});

function scoreBandsAt(
  developing: number,
  strong: number,
  excellent: number
): readonly BenchmarkScoreBand[] {
  return [
    { label: "needs_work", minAccuracy: 0, title: "Needs work" },
    { label: "developing", minAccuracy: developing, title: "Developing" },
    { label: "strong", minAccuracy: strong, title: "Strong" },
    { label: "excellent", minAccuracy: excellent, title: "Excellent" }
  ];
}

function correctInputFor(question: Question): string {
  if (question.answer.unit === "percentage") {
    return `${question.answer.value * 100}%`;
  }

  if (question.answer.unit === "currency") {
    return `$${question.answer.value}`;
  }

  return String(question.answer.value);
}
