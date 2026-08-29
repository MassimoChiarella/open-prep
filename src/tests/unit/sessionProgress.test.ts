import { describe, expect, it } from "vitest";

import { createDrillSession } from "@/features/drills/sessionFactory";
import {
  getAnsweredQuestionIds,
  getCurrentQuestion,
  getDrillProgressSummary,
  getNextUnansweredQuestionId,
  isDrillSessionComplete,
} from "@/features/drills/sessionProgress";
import { submitAnswer } from "@/features/drills/answerSubmission";

describe("session progress helpers", () => {
  it("returns the first unanswered question for a new session", () => {
    const created = createDrillSession({
      seed: "progress-new",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 3 }
    });

    expect(getAnsweredQuestionIds(created.session)).toEqual(new Set());
    expect(getNextUnansweredQuestionId(created.session)).toBe(created.questions[0].id);
    expect(getCurrentQuestion(created.session, created.questions)).toBe(created.questions[0]);
    expect(isDrillSessionComplete(created.session)).toBe(false);
    expect(getDrillProgressSummary(created.session)).toEqual({
      totalQuestions: 3,
      answeredCount: 0,
      remainingCount: 3,
      currentIndex: 0,
      isComplete: false
    });
  });

  it("advances after submitted responses", () => {
    const created = createDrillSession({
      seed: "progress-advance",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 3 }
    });

    const firstSubmission = submitAnswer({
      session: created.session,
      question: created.questions[0],
      rawInput: String(created.questions[0].answer.value),
      timeTakenSeconds: 2
    });

    expect(getAnsweredQuestionIds(firstSubmission.session)).toEqual(new Set([created.questions[0].id]));
    expect(getNextUnansweredQuestionId(firstSubmission.session)).toBe(created.questions[1].id);
    expect(getCurrentQuestion(firstSubmission.session, created.questions)).toBe(created.questions[1]);
    expect(getDrillProgressSummary(firstSubmission.session)).toMatchObject({
      totalQuestions: 3,
      answeredCount: 1,
      remainingCount: 2,
      currentIndex: 1,
      isComplete: false
    });
  });

  it("detects completion after all session questions have responses", () => {
    const created = createDrillSession({
      seed: "progress-complete",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 2 }
    });

    const firstSubmission = submitAnswer({
      session: created.session,
      question: created.questions[0],
      rawInput: String(created.questions[0].answer.value),
      timeTakenSeconds: 2
    });
    const secondSubmission = submitAnswer({
      session: firstSubmission.session,
      question: created.questions[1],
      rawInput: String(created.questions[1].answer.value),
      timeTakenSeconds: 3
    });

    expect(getNextUnansweredQuestionId(secondSubmission.session)).toBeUndefined();
    expect(getCurrentQuestion(secondSubmission.session, created.questions)).toBeUndefined();
    expect(isDrillSessionComplete(secondSubmission.session)).toBe(true);
    expect(getDrillProgressSummary(secondSubmission.session)).toEqual({
      totalQuestions: 2,
      answeredCount: 2,
      remainingCount: 0,
      currentIndex: 2,
      isComplete: true
    });
  });

  it("ignores duplicate responses when calculating answered progress", () => {
    const created = createDrillSession({
      seed: "progress-duplicate",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 2 }
    });

    const firstSubmission = submitAnswer({
      session: created.session,
      question: created.questions[0],
      rawInput: String(created.questions[0].answer.value),
      timeTakenSeconds: 2
    });
    const duplicateSubmission = submitAnswer({
      session: firstSubmission.session,
      question: created.questions[0],
      rawInput: String(created.questions[0].answer.value),
      timeTakenSeconds: 2
    });

    expect(getDrillProgressSummary(duplicateSubmission.session)).toMatchObject({
      answeredCount: 1,
      remainingCount: 1,
      currentIndex: 1,
      isComplete: false
    });
  });

  it("throws when the generated queue is missing the current question", () => {
    const created = createDrillSession({
      seed: "progress-missing",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 1 }
    });

    expect(() => getCurrentQuestion(created.session, [])).toThrow(
      `Question "${created.questions[0].id}" is missing from the generated question queue.`
    );
  });
});
