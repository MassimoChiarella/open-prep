import { describe, expect, it } from "vitest";

import { completeDrillSession } from "@/features/drills/sessionCompletion";
import { createDrillSession } from "@/features/drills/sessionFactory";
import {
  buildDrillDraftKey,
  createRetryScheduleRecord,
  createStoredMistakeNotebookRecords,
  createStoredDrillSession,
  createStoredUserResponses,
  loadInProgressDrillSession,
  loadLatestStoredSessionSummarySnapshot,
  loadStoredSessionSummarySnapshotById,
  persistCompletedDrillSession,
  persistInProgressDrillSession,
  retryScheduleIntervalForAttempt,
  retryScheduleIntervalsDays,
} from "@/features/drills/drillPersistence";
import { createRetryMissedDrillSession } from "@/features/drills/mistakeRetry";
import { submitAnswer } from "@/features/drills/answerSubmission";
import type { MistakeNotebookRecord } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("drill persistence", () => {
  it("restores only the matching in-progress drill draft", async () => {
    const storage = new MemoryAppStorage();
    const created = createDrillSession({
      seed: "persist-draft",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 2, tags: ["addition"] }
    });
    const submitted = submitAnswer({
      question: created.questions[0],
      rawInput: String(created.questions[0].answer.value),
      session: created.session,
      submittedAt: "2026-06-02T00:00:05.000Z",
      timeTakenSeconds: 5
    });
    const draftKey = buildDrillDraftKey("/drills/session?count=2", submitted.session.settings);

    await persistInProgressDrillSession({
      draftKey,
      questions: created.questions,
      session: submitted.session,
      storage,
      updatedAt: "2026-06-02T00:00:06.000Z"
    });

    expect(await loadInProgressDrillSession(storage, "another-route")).toBeUndefined();
    expect(await loadInProgressDrillSession(storage, draftKey)).toEqual({
      questions: created.questions,
      session: submitted.session
    });
  });

  it("persists completed sessions and individual responses", async () => {
    const storage = new MemoryAppStorage();
    const completed = createCompletedSession();

    await persistCompletedDrillSession({
      questions: completed.questions,
      session: completed.session,
      storage,
      updatedAt: "2026-06-02T00:00:11.000Z"
    });

    const storedSession = await storage.get("drill_sessions", completed.session.id);
    const storedResponses = await storage.getAll("responses");

    expect(storedSession).toMatchObject({
      id: completed.session.id,
      score: completed.session.score,
      updatedAt: "2026-06-02T00:00:11.000Z"
    });
    expect(storedSession?.questions).toHaveLength(1);
    expect(storedResponses).toEqual(createStoredUserResponses(completed.session, completed.questions));
    expect(await storage.getAll("mistake_notebook")).toEqual([]);
    expect(await storage.getAll("retry_schedules")).toEqual([]);
  });

  it("persists Interview Math choices and component scores", async () => {
    const storage = new MemoryAppStorage();
    const created = createDrillSession({
      seed: "persist-interview",
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
      timeTakenSeconds: 10
    });
    const session = completeDrillSession({
      questions: created.questions,
      session: submitted.session
    });

    await persistCompletedDrillSession({ questions: created.questions, session, storage });

    expect(await storage.getAll("responses")).toEqual([
      expect.objectContaining({
        interviewMath: expect.objectContaining({ score: expect.objectContaining({ total: 100 }) }),
        selectedUnit: "m"
      })
    ]);
  });

  it("captures missed numeric questions and schedules spaced review", async () => {
    const storage = new MemoryAppStorage();
    const completed = createCompletedSession("persist-missed", undefined, undefined, "0");

    await persistCompletedDrillSession({
      questions: completed.questions,
      session: completed.session,
      storage
    });

    const mistakes = await storage.getAll("mistake_notebook");
    const schedules = await storage.getAll("retry_schedules");

    expect(mistakes).toEqual(createStoredMistakeNotebookRecords(completed.session, completed.questions));
    expect(mistakes).toHaveLength(1);
    expect(retryScheduleIntervalsDays).toEqual([1, 3, 7]);
    expect(mistakes[0]).toMatchObject({
      category: completed.questions[0].category,
      difficulty: completed.questions[0].difficulty,
      errorTypes: completed.session.responses[0].errorTypes,
      missedAt: "2026-06-02T00:00:05.000Z",
      prompt: completed.questions[0].prompt,
      rawInput: "0",
      retryCount: 0,
      sourceQuestionId: completed.questions[0].id,
      sourceResponseId: `${completed.session.id}:${completed.questions[0].id}`,
      sourceSessionId: completed.session.id,
      sourceType: "drill",
      status: "unresolved",
      tags: completed.questions[0].tags
    });
    expect(schedules).toEqual([createRetryScheduleRecord(mistakes[0])]);
    expect(schedules[0]).toMatchObject({
      attemptCount: 0,
      dueAt: "2026-06-03T00:00:05.000Z",
      intervalDays: 1,
      sourceId: mistakes[0].id,
      sourceType: "mistake_notebook"
    });
    expect([0, 1, 2, 3].map(retryScheduleIntervalForAttempt)).toEqual([1, 3, 7, 7]);
    expect(createRetryScheduleRecord(mistakes[0], 1)).toMatchObject({
      attemptCount: 1,
      dueAt: "2026-06-05T00:00:05.000Z",
      intervalDays: 3
    });
  });

  it("preserves imported Interview Math metadata in the mistake notebook", () => {
    const created = createDrillSession({
      seed: "persist-imported-interview-mistake",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { categories: ["case_math"], difficulty: "intermediate", questionCount: 1 }
    });
    const question = {
      ...created.questions[0],
      metadata: {
        ...created.questions[0].metadata!,
        sourcePackId: "imported-interview-pack",
        sourceQuestionId: "imported-template-1",
        sourceType: "generated" as const
      }
    };
    const submitted = submitAnswer({
      question,
      rawInput: "not-a-number",
      session: created.session,
      submittedAt: "2026-06-02T00:00:05.000Z",
      timeTakenSeconds: 5
    });
    const session = completeDrillSession({ questions: [question], session: submitted.session });

    expect(createStoredMistakeNotebookRecords(session, [question])).toEqual([
      expect.objectContaining({ metadata: question.metadata })
    ]);
  });

  it("calculates UTC due dates across month and year boundaries", () => {
    const mistake = mistakeNotebookRecord();
    const scheduledAt = "2026-12-31T23:30:00.000Z";

    expect([0, 1, 2, 99].map((attemptCount) => createRetryScheduleRecord(mistake, attemptCount, scheduledAt).dueAt)).toEqual([
      "2027-01-01T23:30:00.000Z",
      "2027-01-03T23:30:00.000Z",
      "2027-01-07T23:30:00.000Z",
      "2027-01-07T23:30:00.000Z"
    ]);
  });

  it("updates the original notebook item after retrying a missed question", async () => {
    const storage = new MemoryAppStorage();
    const mistake = mistakeNotebookRecord();
    const schedule = createRetryScheduleRecord(mistake);

    await storage.put("mistake_notebook", mistake);
    await storage.put("retry_schedules", schedule);
    const retry = createRetryCompletedSession(mistake, String(mistake.answer.value));

    await persistCompletedDrillSession({
      questions: retry.questions,
      session: retry.session,
      storage
    });

    expect(await storage.getAll("mistake_notebook")).toEqual([
      {
        ...mistake,
        lastRetriedAt: "2026-06-02T00:00:05.000Z",
        resolvedAt: "2026-06-02T00:00:05.000Z",
        retryCount: 1,
        status: "resolved"
      }
    ]);
    expect(await storage.getAll("retry_schedules")).toEqual([]);
  });

  it("leaves incorrect retry attempts unresolved without duplicating notebook items", async () => {
    const storage = new MemoryAppStorage();
    const mistake = mistakeNotebookRecord();
    const schedule = createRetryScheduleRecord(mistake);

    await storage.put("mistake_notebook", mistake);
    await storage.put("retry_schedules", schedule);
    const retry = createRetryCompletedSession(mistake, "0");

    await persistCompletedDrillSession({
      questions: retry.questions,
      session: retry.session,
      storage
    });

    expect(await storage.getAll("mistake_notebook")).toEqual([
      {
        ...mistake,
        lastRetriedAt: "2026-06-02T00:00:05.000Z",
        retryCount: 1
      }
    ]);
    expect(await storage.getAll("retry_schedules")).toEqual([
      {
        ...schedule,
        attemptCount: 1,
        dueAt: "2026-06-05T00:00:05.000Z",
        intervalDays: 3,
        lastReviewedAt: "2026-06-02T00:00:05.000Z",
        updatedAt: "2026-06-02T00:00:05.000Z"
      }
    ]);
  });

  it("keeps skipped review items scheduled without advancing attempts", async () => {
    const storage = new MemoryAppStorage();
    const mistake = mistakeNotebookRecord();
    const schedule = createRetryScheduleRecord(mistake);
    const retry = createSkippedRetryCompletedSession(mistake);

    await storage.put("mistake_notebook", mistake);
    await storage.put("retry_schedules", schedule);

    await persistCompletedDrillSession({
      questions: retry.questions,
      session: retry.session,
      storage
    });

    expect(await storage.getAll("mistake_notebook")).toEqual([mistake]);
    expect(await storage.getAll("retry_schedules")).toEqual([
      {
        ...schedule,
        dueAt: "2026-06-03T00:00:10.000Z",
        lastReviewedAt: "2026-06-02T00:00:10.000Z",
        updatedAt: "2026-06-02T00:00:10.000Z"
      }
    ]);
  });

  it("atomically persists a 50-question all-wrong session", async () => {
    const storage = new MemoryAppStorage();
    const completed = createFiftyQuestionAllWrongSession();

    await persistCompletedDrillSession({
      questions: completed.questions,
      session: completed.session,
      storage,
      updatedAt: "2026-06-02T00:01:00.000Z"
    });

    expect(await storage.getAll("drill_sessions")).toHaveLength(1);
    expect(await storage.getAll("responses")).toHaveLength(50);
    expect(await storage.getAll("mistake_notebook")).toHaveLength(50);
    expect(await storage.getAll("retry_schedules")).toHaveLength(50);
  });

  it("rejects duplicate completed-session question references before writing", async () => {
    const storage = new MemoryAppStorage();
    const completed = createFiftyQuestionAllWrongSession();
    completed.session.questionIds[1] = completed.session.questionIds[0];

    await expect(
      persistCompletedDrillSession({ questions: completed.questions, session: completed.session, storage })
    ).rejects.toThrow("Completed drill session questions are inconsistent.");

    expect(await storage.getAll("drill_sessions")).toEqual([]);
    expect(await storage.getAll("responses")).toEqual([]);
  });

  it.each([0, 1, 51, 52, 150])("leaves no partial 50-question session when atomic operation %i fails", async (failAt) => {
    const storage = new MemoryAppStorage(failAt);
    const completed = createFiftyQuestionAllWrongSession();

    await expect(
      persistCompletedDrillSession({ questions: completed.questions, session: completed.session, storage })
    ).rejects.toThrow("Injected atomic mutation failure");

    expect(await storage.getAll("drill_sessions")).toEqual([]);
    expect(await storage.getAll("responses")).toEqual([]);
    expect(await storage.getAll("mistake_notebook")).toEqual([]);
    expect(await storage.getAll("retry_schedules")).toEqual([]);
  });

  it("loads the latest completed stored session as a summary snapshot", async () => {
    const storage = new MemoryAppStorage();
    const older = createCompletedSession("older", "2026-06-02T00:00:00.000Z", "2026-06-02T00:00:10.000Z");
    const newer = createCompletedSession("newer", "2026-06-02T01:00:00.000Z", "2026-06-02T01:00:10.000Z");

    await storage.put("drill_sessions", createStoredDrillSession(older.session, older.questions));
    await storage.put("drill_sessions", createStoredDrillSession(newer.session, newer.questions));

    expect(await loadLatestStoredSessionSummarySnapshot(storage)).toMatchObject({
      id: newer.session.id,
      score: newer.session.score,
      questionResults: [
        {
          prompt: newer.questions[0].prompt,
          rawInput: String(newer.questions[0].answer.value)
        }
      ]
    });
  });

  it("loads an exact completed session by id without returning drafts or another session", async () => {
    const storage = new MemoryAppStorage();
    const requested = createCompletedSession("requested", "2026-06-02T00:00:00.000Z", "2026-06-02T00:00:10.000Z");
    const newer = createCompletedSession("newer", "2026-06-02T01:00:00.000Z", "2026-06-02T01:00:10.000Z");
    const draft = createDrillSession({
      seed: "history-draft",
      startedAt: "2026-06-02T02:00:00.000Z",
      settings: { questionCount: 1 }
    });

    await storage.put("drill_sessions", createStoredDrillSession(requested.session, requested.questions));
    await storage.put("drill_sessions", createStoredDrillSession(newer.session, newer.questions));
    await storage.put("drill_sessions", {
      ...draft.session,
      draftKey: "draft",
      questions: draft.questions,
      updatedAt: "2026-06-02T02:00:05.000Z"
    });

    expect(await loadStoredSessionSummarySnapshotById(storage, requested.session.id)).toMatchObject({
      id: requested.session.id,
      questionResults: [{ prompt: requested.questions[0].prompt }]
    });
    expect(await loadStoredSessionSummarySnapshotById(storage, draft.session.id)).toBeUndefined();
    expect(await loadStoredSessionSummarySnapshotById(storage, "unknown-session")).toBeUndefined();
  });

  it("rejects incomplete sessions before persistence", () => {
    const created = createDrillSession({
      seed: "incomplete-persistence",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 1 }
    });

    expect(() => createStoredDrillSession(created.session, created.questions)).toThrow(
      "Only completed drill sessions can be persisted."
    );
  });
});

function createCompletedSession(
  seed = "persist-complete",
  startedAt = "2026-06-02T00:00:00.000Z",
  endedAt = "2026-06-02T00:00:10.000Z",
  rawInput?: string
) {
  const created = createDrillSession({
    seed,
    startedAt,
    settings: { questionCount: 1 }
  });
  const submitted = submitAnswer({
    session: created.session,
    question: created.questions[0],
    rawInput: rawInput ?? String(created.questions[0].answer.value),
    submittedAt: "2026-06-02T00:00:05.000Z",
    timeTakenSeconds: 5
  });

  return {
    questions: created.questions,
    session: completeDrillSession({
      session: submitted.session,
      questions: created.questions,
      endedAt
    })
  };
}

function createFiftyQuestionAllWrongSession() {
  const one = createCompletedSession("persist-fifty", undefined, undefined, "0");
  const baseQuestion = one.questions[0];
  const baseResponse = one.session.responses[0];
  const questions = Array.from({ length: 50 }, (_, index) => ({
    ...baseQuestion,
    id: `question-${index + 1}`
  }));
  const responses = questions.map((question, index) => ({
    ...baseResponse,
    questionId: question.id,
    submittedAt: `2026-06-02T00:00:${String(index).padStart(2, "0")}.000Z`
  }));

  return {
    questions,
    session: {
      ...one.session,
      questionIds: questions.map((question) => question.id),
      responses,
      score: {
        ...one.session.score!,
        accuracy: 0,
        averageTimeSeconds: 5,
        categoryBreakdown: one.session.score!.categoryBreakdown.map((category) => ({
          ...category,
          accuracy: 0,
          averageTimeSeconds: 5,
          questionCount: 50
        })),
        correctCount: 0,
        errorBreakdown: one.session.score!.errorBreakdown.map((error) => ({ ...error, count: 50 })),
        incorrectCount: 50,
        totalScore: 0
      },
      settings: { ...one.session.settings, questionCount: 50 }
    }
  };
}

function createRetryCompletedSession(mistake: MistakeNotebookRecord, rawInput: string) {
  const created = createRetryMissedDrillSession([mistake], {
    questionCount: 1,
    sessionId: "retry-session",
    startedAt: "2026-06-02T00:00:00.000Z"
  });
  const submitted = submitAnswer({
    session: created.session,
    question: created.questions[0],
    rawInput,
    submittedAt: "2026-06-02T00:00:05.000Z",
    timeTakenSeconds: 5
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

function createSkippedRetryCompletedSession(mistake: MistakeNotebookRecord) {
  const created = createRetryMissedDrillSession([mistake], {
    questionCount: 1,
    sessionId: "retry-session",
    startedAt: "2026-06-02T00:00:00.000Z"
  });

  return {
    questions: created.questions,
    session: completeDrillSession({
      session: created.session,
      questions: created.questions,
      endedAt: "2026-06-02T00:00:10.000Z"
    })
  };
}

function mistakeNotebookRecord(): MistakeNotebookRecord {
  return {
    answer: { value: 25 },
    category: "business_math",
    difficulty: "beginner",
    errorTypes: ["arithmetic_error"],
    explanation: { short: "Use margin.", steps: ["Profit / revenue."] },
    id: "mistake-business",
    missedAt: "2026-06-01T00:00:05.000Z",
    normalizedValue: 20,
    prompt: "Margin miss",
    rawInput: "20",
    retryCount: 0,
    sourceQuestionId: "q-business",
    sourceType: "drill",
    status: "unresolved",
    tags: ["margin"]
  };
}
