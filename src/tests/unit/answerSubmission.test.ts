import { describe, expect, it } from "vitest";

import { createDrillSession } from "@/features/drills/sessionFactory";
import { submitAnswer } from "@/features/drills/answerSubmission";
import type { Question } from "@/lib/domain";

describe("submitAnswer", () => {
  it("validates an answer and appends a typed response immutably", () => {
    const created = createDrillSession({
      seed: "submit-correct",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 1 }
    });
    const question = created.questions[0];

    const result = submitAnswer({
      session: created.session,
      question,
      rawInput: String(question.answer.value),
      timeTakenSeconds: 4.2,
      submittedAt: "2026-06-02T00:00:04.200Z"
    });

    expect(created.session.responses).toEqual([]);
    expect(result.response).toMatchObject({
      questionId: question.id,
      rawInput: String(question.answer.value),
      normalizedValue: question.answer.value,
      isCorrect: true,
      errorTypes: ["none"],
      timeTakenSeconds: 4.2,
      submittedAt: "2026-06-02T00:00:04.200Z"
    });
    expect(result.session.responses).toEqual([result.response]);
    expect(result.validation.isCorrect).toBe(true);
  });

  it("records incorrect validation details", () => {
    const created = createDrillSession({
      seed: "submit-wrong",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 1 }
    });
    const question = created.questions[0];

    const result = submitAnswer({
      session: created.session,
      question,
      rawInput: String(question.answer.value + 1),
      timeTakenSeconds: 7
    });

    expect(result.response).toMatchObject({
      questionId: question.id,
      isCorrect: false,
      errorTypes: ["arithmetic_error"],
      timeTakenSeconds: 7
    });
    expect(result.validation.feedbackMessage).toBe("Check the calculation and try again.");
  });

  it("never normalizes malformed numeric fragments into a persisted response value", () => {
    const created = createDrillSession({
      seed: "submit-malformed",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 1 }
    });

    for (const rawInput of ["1 2", "1 usd 2", "$1$2", "1%2", "15%%", "1M%"]) {
      const result = submitAnswer({
        session: created.session,
        question: created.questions[0],
        rawInput,
        timeTakenSeconds: 1
      });

      expect(result.response.isCorrect, rawInput).toBe(false);
      expect(result.response.normalizedValue, rawInput).toBeUndefined();
      expect(result.response.errorTypes, rawInput).toEqual(["arithmetic_error"]);
    }
  });

  it("records timeout responses without normalized values", () => {
    const created = createDrillSession({
      seed: "submit-timeout",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 1 }
    });
    const question = created.questions[0];

    const result = submitAnswer({
      session: created.session,
      question,
      rawInput: "",
      timeTakenSeconds: 30,
      timedOut: true
    });

    expect(result.response).toMatchObject({
      questionId: question.id,
      rawInput: "",
      isCorrect: false,
      errorTypes: ["timeout"]
    });
    expect(result.response.normalizedValue).toBeUndefined();
  });

  it("passes selected units into validation", () => {
    const created = createDrillSession({
      seed: "submit-unit",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 1 }
    });
    const question: Question = {
      ...created.questions[0],
      answer: {
        value: 10,
        unit: "units"
      }
    };

    const result = submitAnswer({
      session: created.session,
      question,
      rawInput: "10",
      selectedUnit: "currency",
      timeTakenSeconds: 2
    });

    expect(result.response).toMatchObject({
      selectedUnit: "currency",
      isCorrect: false,
      errorTypes: ["unit_error"]
    });
  });

  it("records deterministic Interview Math component scoring", () => {
    const created = createDrillSession({
      seed: "submit-interview-math",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: {
        categories: ["case_math"],
        difficulty: "intermediate",
        questionCount: 1
      }
    });
    const question = created.questions[0];

    const result = submitAnswer({
      interviewMath: {
        equationOptionId: "equation-correct",
        interpretationOptionId: "interpretation-correct"
      },
      question,
      rawInput: String(question.answer.value),
      selectedUnit: "m",
      session: created.session,
      timeTakenSeconds: 12
    });

    expect(result.response).toMatchObject({
      errorTypes: ["none"],
      interviewMath: {
        equationOptionId: "equation-correct",
        interpretationOptionId: "interpretation-correct",
        score: { total: 100 }
      },
      isCorrect: true,
      selectedUnit: "m"
    });
  });

  it("rejects questions outside the session and invalid timing", () => {
    const created = createDrillSession({
      seed: "submit-invalid",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 1 }
    });
    const question = {
      ...created.questions[0],
      id: "outside-session"
    };

    expect(() =>
      submitAnswer({
        session: created.session,
        question,
        rawInput: "1",
        timeTakenSeconds: 1
      })
    ).toThrow('Question "outside-session" does not belong to session "drill-submit-invalid-20260602T000000000Z".');

    expect(() =>
      submitAnswer({
        session: created.session,
        question: created.questions[0],
        rawInput: "1",
        timeTakenSeconds: Number.NaN
      })
    ).toThrow("Answer submission requires a non-negative finite timeTakenSeconds value.");
  });
});
