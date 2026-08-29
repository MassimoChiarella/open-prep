import { describe, expect, it } from "vitest";

import { completeDrillSession } from "@/features/drills/sessionCompletion";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { submitAnswer } from "@/features/drills/answerSubmission";
import { createSessionSummarySnapshot } from "@/features/drills/sessionSummary";
import type { DrillSettings } from "@/lib/domain";

describe("session summary handoff", () => {
  it("creates a compact completed-session snapshot", () => {
    const completed = createCompletedSession();
    const snapshot = createSessionSummarySnapshot(completed.session, completed.questions);

    expect(snapshot).toMatchObject({
      id: completed.session.id,
      startedAt: "2026-06-02T00:00:00.000Z",
      endedAt: "2026-06-02T00:00:10.000Z",
      settings: {
        categories: ["arithmetic"],
        questionCount: 1,
        timeMode: "untimed"
      },
      score: {
        accuracy: 1,
        correctCount: 1,
        incorrectCount: 0
      },
      questionResults: [
        {
          answerUnit: completed.questions[0].answer.unit,
          prompt: completed.questions[0].prompt,
          category: completed.questions[0].category,
          rawInput: String(completed.questions[0].answer.value),
          correctValue: completed.questions[0].answer.value,
          explanation: completed.questions[0].explanation,
          isCorrect: true,
          errorTypes: ["none"],
          tags: completed.questions[0].tags,
          timeTakenSeconds: 10
        }
      ]
    });
  });

  it("preserves the complete original drill settings", () => {
    const completed = createCompletedSession({
      arithmeticAllowNegatives: true,
      arithmeticMixedOperators: ["addition", "division"],
      arithmeticNumberFormat: "decimal",
      arithmeticTermCount: 4,
      feedbackMode: "retry_first",
      hintsEnabled: true,
      tags: ["mixed_operations"],
      unitPreference: "m"
    });
    const snapshot = createSessionSummarySnapshot(completed.session, completed.questions);

    expect(snapshot.settings).toEqual(completed.session.settings);
  });

  it("rejects incomplete sessions", () => {
    const created = createDrillSession({
      seed: "summary-incomplete",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 1 }
    });

    expect(() => createSessionSummarySnapshot(created.session, created.questions)).toThrow(
      "A session summary requires a completed session score."
    );
  });

  it("carries Interview Math choices and component scores into review", () => {
    const created = createDrillSession({
      seed: "summary-interview",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: {
        categories: ["case_math"],
        difficulty: "intermediate",
        questionCount: 1
      }
    });
    const question = created.questions[0];
    const submitted = submitAnswer({
      interviewMath: {
        equationOptionId: "equation-correct",
        interpretationOptionId: "interpretation-correct"
      },
      question,
      rawInput: String(question.answer.value),
      selectedUnit: "m",
      session: created.session,
      timeTakenSeconds: 20
    });
    const session = completeDrillSession({
      endedAt: "2026-06-02T00:00:20.000Z",
      questions: created.questions,
      session: submitted.session
    });
    const snapshot = createSessionSummarySnapshot(session, created.questions);

    expect(snapshot.settings.interviewMathMode).toBe(true);
    expect(snapshot.questionResults[0]).toMatchObject({
      interviewMath: {
        equationLabel: expect.any(String),
        expectedUnit: "m",
        interpretationLabel: expect.any(String),
        score: { total: 100 }
      },
      selectedUnit: "m"
    });
  });
});

function createCompletedSession(settings: Partial<DrillSettings> = {}) {
  const created = createDrillSession({
    seed: "summary-complete",
    startedAt: "2026-06-02T00:00:00.000Z",
    settings: { ...settings, questionCount: 1 }
  });
  const submitted = submitAnswer({
    session: created.session,
    question: created.questions[0],
    rawInput: String(created.questions[0].answer.value),
    timeTakenSeconds: 10
  });

  return {
    questions: created.questions,
    session: completeDrillSession({
      session: submitted.session,
      questions: created.questions,
      endedAt: "2026-06-02T00:00:10.000Z"
    })
  };
}
