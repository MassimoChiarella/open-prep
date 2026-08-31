import { describe, expect, it } from "vitest";

import { completeDrillSession } from "@/features/drills/sessionCompletion";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { submitAnswer } from "@/features/drills/answerSubmission";
import { calculateSessionScore, defaultScoringRules, scoreResponse } from "@/features/scoring/scoringEngine";
import type { Question, UserResponse } from "@/lib/domain";

describe("scoreResponse", () => {
  it("scores correct answers with a speed bonus", () => {
    const response = userResponse({
      isCorrect: true,
      errorTypes: ["none"],
      timeTakenSeconds: 15
    });

    expect(scoreResponse(response)).toBe(113);
  });

  it("scores timeout as zero", () => {
    expect(scoreResponse(userResponse({ isCorrect: false, errorTypes: ["timeout"] }))).toBe(0);
  });

  it("applies deterministic error penalties", () => {
    expect(scoreResponse(userResponse({ isCorrect: false, errorTypes: ["unit_error"] }))).toBe(50);
    expect(scoreResponse(userResponse({ isCorrect: false, errorTypes: ["magnitude_error"] }))).toBe(40);
    expect(scoreResponse(userResponse({ isCorrect: false, errorTypes: ["rounding_error"] }))).toBe(65);
    expect(scoreResponse(userResponse({ isCorrect: false, errorTypes: ["arithmetic_error"] }))).toBe(0);
  });

  it("fails closed when an incorrect response contradicts a no-error marker", () => {
    expect(scoreResponse(userResponse({ isCorrect: false, errorTypes: ["none"] }))).toBe(0);
  });

  it("uses the deterministic component total for Interview Math responses", () => {
    const response = userResponse({
      errorTypes: ["setup_error"],
      interviewMath: {
        equationOptionId: "equation-setup",
        score: {
          formulaSelection: 20,
          equationSetup: 0,
          calculationAccuracy: 30,
          unitsMagnitude: 15,
          interpretationSelection: 0,
          total: 65
        }
      },
      isCorrect: false
    });

    expect(scoreResponse(response)).toBe(65);
  });
});

describe("calculateSessionScore", () => {
  it("calculates totals, accuracy, time, category breakdowns, and error breakdowns", () => {
    const questions: Question[] = [
      question({ id: "q1", category: "arithmetic" }),
      question({ id: "q2", category: "percentages" }),
      question({ id: "q3", category: "percentages" })
    ];
    const session = {
      id: "session",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: createDrillSession({ seed: "score-settings", settings: { questionCount: 1 } }).session.settings,
      questionIds: ["q1", "q2", "q3"],
      responses: [
        userResponse({ questionId: "q1", isCorrect: true, errorTypes: ["none"], timeTakenSeconds: 15 }),
        userResponse({ questionId: "q2", isCorrect: false, errorTypes: ["unit_error"], timeTakenSeconds: 20 }),
        userResponse({ questionId: "q3", isCorrect: false, errorTypes: ["rounding_error"], timeTakenSeconds: 25 })
      ]
    };

    expect(calculateSessionScore(session, questions)).toEqual({
      totalScore: 228,
      accuracy: 1 / 3,
      averageTimeSeconds: 20,
      correctCount: 1,
      incorrectCount: 2,
      categoryBreakdown: [
        {
          category: "arithmetic",
          accuracy: 1,
          averageTimeSeconds: 15,
          questionCount: 1
        },
        {
          category: "percentages",
          accuracy: 0,
          averageTimeSeconds: 22.5,
          questionCount: 2
        }
      ],
      errorBreakdown: [
        { errorType: "unit_error", count: 1 },
        { errorType: "rounding_error", count: 1 }
      ]
    });
  });

  it("handles empty sessions", () => {
    const created = createDrillSession({ seed: "empty-score", settings: { questionCount: 1 } });

    expect(calculateSessionScore(created.session, created.questions)).toEqual({
      totalScore: 0,
      accuracy: 0,
      averageTimeSeconds: 0,
      correctCount: 0,
      incorrectCount: 0,
      categoryBreakdown: [],
      errorBreakdown: []
    });
  });

  it("throws when scoring responses without matching questions", () => {
    const created = createDrillSession({ seed: "missing-score", settings: { questionCount: 1 } });
    const session = {
      ...created.session,
      responses: [userResponse({ questionId: "missing-question" })]
    };

    expect(() => calculateSessionScore(session, created.questions)).toThrow(
      'Question "missing-question" is missing from scoring inputs.'
    );
  });
});

describe("completeDrillSession", () => {
  it("attaches endedAt and session score", () => {
    const created = createDrillSession({
      seed: "complete-score",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 1 }
    });
    const submitted = submitAnswer({
      session: created.session,
      question: created.questions[0],
      rawInput: String(created.questions[0].answer.value),
      timeTakenSeconds: 10
    });
    const completed = completeDrillSession({
      session: submitted.session,
      questions: created.questions,
      endedAt: "2026-06-02T00:00:10.000Z"
    });

    expect(completed.endedAt).toBe("2026-06-02T00:00:10.000Z");
    expect(completed.score).toMatchObject({
      totalScore: Math.round(defaultScoringRules.correct + (defaultScoringRules.maxSpeedBonus * 2) / 3),
      accuracy: 1,
      correctCount: 1,
      incorrectCount: 0
    });
  });
});

function userResponse(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    questionId: "q1",
    rawInput: "1",
    normalizedValue: 1,
    isCorrect: true,
    errorTypes: ["none"],
    timeTakenSeconds: 30,
    submittedAt: "2026-06-02T00:00:30.000Z",
    ...overrides
  };
}

function question(overrides: Partial<Question>): Question {
  return {
    id: "q",
    type: "numeric",
    category: "arithmetic",
    tags: ["addition"],
    difficulty: "beginner",
    prompt: "What is 1 + 1?",
    answer: { value: 2 },
    explanation: {
      short: "Add.",
      steps: ["1 + 1 = 2."]
    },
    ...overrides
  };
}
