import { describe, expect, it } from "vitest";

import {
  buildReviewDrillHref,
  buildRetryMissedDrillHref,
  createReviewDrillSession,
  createRetryMissedDrillSession
} from "@/features/drills/mistakeRetry";
import type { MistakeNotebookRecord, RetryScheduleRecord } from "@/lib/storage/appStorageTypes";

describe("mistake retry drills", () => {
  it("builds a capped retry-missed drill link", () => {
    const url = new URL(buildRetryMissedDrillHref(25), "http://localhost");

    expect(url.pathname).toBe("/drills/session");
    expect(url.searchParams.get("count")).toBe("10");
    expect(url.searchParams.get("source")).toBe("mistake_notebook");
  });

  it("builds a capped review drill link", () => {
    const url = new URL(buildReviewDrillHref(25), "http://localhost");

    expect(url.pathname).toBe("/drills/session");
    expect(url.searchParams.get("count")).toBe("10");
    expect(url.searchParams.get("source")).toBe("review_queue");
  });

  it("creates a deterministic retry queue from unresolved missed questions", () => {
    const created = createRetryMissedDrillSession(
      [
        mistake({ id: "mistake-newer", missedAt: "2026-06-03T12:00:00.000Z" }),
        mistake({ id: "mistake-2", missedAt: "2026-06-02T12:00:00.000Z", tags: ["margin"] }),
        mistake({ id: "mistake-resolved", missedAt: "2026-06-01T12:00:00.000Z", status: "resolved" }),
        mistake({ category: "arithmetic", id: "mistake-1", missedAt: "2026-06-02T12:00:00.000Z", tags: ["addition"] })
      ],
      {
        questionCount: 2,
        sessionId: "retry-session",
        startedAt: "2026-06-04T12:00:00.000Z"
      }
    );

    expect(created.questions.map((question) => question.id)).toEqual(["retry-mistake-1", "retry-mistake-2"]);
    expect(created.questions[0]).toMatchObject({
      category: "arithmetic",
      metadata: { sourceType: "manual", variables: { mistakeId: "mistake-1" } },
      prompt: "Missed prompt"
    });
    expect(created.session).toMatchObject({
      id: "retry-session",
      questionIds: ["retry-mistake-1", "retry-mistake-2"],
      settings: {
        categories: ["arithmetic", "business_math"],
        feedbackMode: "instant",
        questionCount: 2,
        tags: ["addition", "margin"],
        timeMode: "untimed"
      },
      startedAt: "2026-06-04T12:00:00.000Z"
    });
  });

  it("rejects retry sessions without unresolved mistakes", () => {
    expect(() =>
      createRetryMissedDrillSession([mistake({ status: "resolved" })], {
        questionCount: 5
      })
    ).toThrow("No unresolved missed questions");
  });

  it("restores imported Interview Math metadata while retaining the retry link", () => {
    const created = createRetryMissedDrillSession(
      [
        mistake({
          category: "case_math",
          metadata: {
            caseStyle: {
              calculationStepCount: 2,
              industry: "retail",
              interviewMath: {
                equationOptions: [
                  { formulaCorrect: true, id: "correct-equation", label: "Revenue / stores", setupCorrect: true }
                ],
                expectedUnit: "m",
                interpretationOptions: [
                  { id: "correct-interpretation", isCorrect: true, label: "Revenue per store" }
                ]
              }
            },
            sourcePackId: "imported-interview-pack",
            sourceQuestionId: "imported-template-1",
            sourceType: "generated",
            variables: { revenue: 25 }
          },
          tags: ["revenue"]
        })
      ],
      { questionCount: 1 }
    );

    expect(created.questions[0].metadata).toMatchObject({
      caseStyle: { industry: "retail" },
      sourcePackId: "imported-interview-pack",
      sourceQuestionId: "imported-template-1",
      sourceType: "generated",
      variables: { mistakeId: "mistake", revenue: 25 }
    });
  });

  it("creates a due-first review queue and fills with matching generated questions", () => {
    const due = mistake({
      category: "arithmetic",
      id: "mistake-due",
      missedAt: "2026-06-01T12:00:00.000Z",
      tags: ["addition"]
    });
    const future = mistake({ id: "mistake-future", missedAt: "2026-06-01T11:00:00.000Z" });
    const created = createReviewDrillSession([future, due], {
      now: "2026-06-03T12:00:00.000Z",
      questionCount: 3,
      retrySchedules: [
        retrySchedule({ dueAt: "2026-06-02T12:00:00.000Z", id: "schedule-due", sourceId: due.id }),
        retrySchedule({ dueAt: "2026-06-05T12:00:00.000Z", id: "schedule-future", sourceId: future.id })
      ],
      sessionId: "review-session",
      startedAt: "2026-06-03T12:00:00.000Z"
    });

    expect(created.questions).toHaveLength(3);
    expect(created.questions[0]).toMatchObject({
      id: "retry-mistake-due",
      metadata: { variables: { mistakeId: "mistake-due" } }
    });
    expect(created.questions.slice(1).map((question) => question.metadata?.sourceType)).toEqual(["generated", "generated"]);
    expect(created.questions.slice(1).every((question) => question.category === "arithmetic")).toBe(true);
    expect(created.session).toMatchObject({
      id: "review-session",
      questionIds: created.questions.map((question) => question.id),
      settings: {
        categories: ["arithmetic"],
        feedbackMode: "instant",
        questionCount: 3,
        tags: ["addition"],
        timeMode: "untimed"
      }
    });
  });

  it("orders due reviews by due date, attempt count, then schedule ID", () => {
    const mistakes = [
      mistake({ id: "mistake-earliest" }),
      mistake({ id: "mistake-a" }),
      mistake({ id: "mistake-b" }),
      mistake({ id: "mistake-lower-attempt" })
    ];
    const created = createReviewDrillSession(mistakes, {
      now: "2026-06-03T12:00:00.000Z",
      questionCount: 4,
      retrySchedules: [
        retrySchedule({
          attemptCount: 1,
          dueAt: "2026-06-01T12:00:00.000Z",
          id: "schedule-earliest",
          sourceId: "mistake-earliest"
        }),
        retrySchedule({
          attemptCount: 2,
          dueAt: "2026-06-02T12:00:00.000Z",
          id: "schedule-b",
          sourceId: "mistake-b"
        }),
        retrySchedule({
          attemptCount: 2,
          dueAt: "2026-06-02T12:00:00.000Z",
          id: "schedule-a",
          sourceId: "mistake-a"
        }),
        retrySchedule({
          attemptCount: 1,
          dueAt: "2026-06-02T12:00:00.000Z",
          id: "schedule-lower-attempt",
          sourceId: "mistake-lower-attempt"
        })
      ],
      startedAt: "2026-06-03T12:00:00.000Z"
    });

    expect(created.questions.map((question) => question.id)).toEqual([
      "retry-mistake-earliest",
      "retry-mistake-a",
      "retry-mistake-b",
      "retry-mistake-lower-attempt"
    ]);
  });

  it("includes the exact due boundary and ignores future, resolved, and orphaned schedules", () => {
    const created = createReviewDrillSession(
      [
        mistake({ id: "mistake-due" }),
        mistake({ id: "mistake-future" }),
        mistake({ id: "mistake-resolved", status: "resolved" })
      ],
      {
        now: "2026-06-03T12:00:00.000Z",
        questionCount: 5,
        retrySchedules: [
          retrySchedule({
            dueAt: "2026-06-03T12:00:00.000Z",
            id: "schedule-due",
            sourceId: "mistake-due"
          }),
          retrySchedule({
            dueAt: "2026-06-03T12:00:00.001Z",
            id: "schedule-future",
            sourceId: "mistake-future"
          }),
          retrySchedule({
            dueAt: "2026-06-02T12:00:00.000Z",
            id: "schedule-resolved",
            sourceId: "mistake-resolved"
          }),
          retrySchedule({
            dueAt: "2026-06-02T12:00:00.000Z",
            id: "schedule-orphan",
            sourceId: "mistake-missing"
          })
        ],
        startedAt: "2026-06-03T12:00:00.000Z"
      }
    );

    expect(created.questions[0].id).toBe("retry-mistake-due");
    expect(created.questions.filter((question) => question.id.startsWith("retry-"))).toHaveLength(1);
  });

  it("rejects review sessions without due missed questions", () => {
    expect(() =>
      createReviewDrillSession([mistake({ id: "mistake-future" })], {
        now: "2026-06-03T12:00:00.000Z",
        questionCount: 3,
        retrySchedules: [
          retrySchedule({
            dueAt: "2026-06-05T12:00:00.000Z",
            id: "schedule-future",
            sourceId: "mistake-future"
          })
        ]
      })
    ).toThrow("No due missed questions");
  });
});

function mistake(overrides: Partial<MistakeNotebookRecord> = {}): MistakeNotebookRecord {
  return {
    answer: { value: 25 },
    category: "business_math",
    difficulty: "beginner",
    errorTypes: ["arithmetic_error"],
    explanation: { short: "Use the formula.", steps: ["Divide profit by revenue."] },
    id: "mistake",
    missedAt: "2026-06-02T12:00:00.000Z",
    normalizedValue: 20,
    prompt: "Missed prompt",
    rawInput: "20",
    retryCount: 0,
    sourceQuestionId: "question-1",
    sourceType: "drill",
    status: "unresolved",
    tags: ["margin"],
    ...overrides
  };
}

function retrySchedule(overrides: Partial<RetryScheduleRecord> & Pick<RetryScheduleRecord, "dueAt" | "id" | "sourceId">): RetryScheduleRecord {
  return {
    attemptCount: 0,
    createdAt: "2026-06-01T12:00:00.000Z",
    intervalDays: 1,
    sourceType: "mistake_notebook",
    updatedAt: "2026-06-01T12:00:00.000Z",
    ...overrides
  };
}
