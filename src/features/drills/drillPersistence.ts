import { createSessionSummarySnapshot, type SessionSummarySnapshot } from "@/features/drills/sessionSummary";
import type { DrillSession, DrillSettings, Question } from "@/lib/domain";
import type {
  AppStorage,
  AppStorageMutation,
  MistakeNotebookRecord,
  MistakeNotebookSourceType,
  RetryScheduleRecord,
  StoredDrillSession,
  StoredUserResponse,
} from "@/lib/storage/appStorageTypes";

export const retryScheduleIntervalsDays = [1, 3, 7] as const;

export interface PersistCompletedDrillSessionOptions {
  questions: readonly Question[];
  session: DrillSession;
  storage: AppStorage;
  updatedAt?: string;
}

export interface PersistInProgressDrillSessionOptions {
  draftKey: string;
  questions: readonly Question[];
  session: DrillSession;
  storage: AppStorage;
  updatedAt?: string;
}

export function buildDrillDraftKey(
  route: string,
  settings: DrillSettings,
  scope?: string
): string {
  return `${route}${scope === undefined ? "" : `:${JSON.stringify(scope)}`}:${JSON.stringify(settings)}`;
}

export async function loadInProgressDrillSession(
  storage: AppStorage,
  draftKey: string
): Promise<{ questions: Question[]; session: DrillSession } | undefined> {
  const draft = (await storage.getAll("drill_sessions"))
    .sort(sortStoredSessionsDescending)
    .find(
      (session): session is StoredDrillSession & { questions: Question[] } =>
        session.draftKey === draftKey &&
        session.score === undefined &&
        Array.isArray(session.questions) &&
        session.questions.length > 0
    );

  if (draft === undefined) {
    return undefined;
  }

  return {
    questions: draft.questions,
    session: {
      id: draft.id,
      startedAt: draft.startedAt,
      endedAt: draft.endedAt,
      settings: draft.settings,
      questionIds: draft.questionIds,
      responses: draft.responses,
      score: draft.score
    }
  };
}

export async function persistInProgressDrillSession(
  options: PersistInProgressDrillSessionOptions
): Promise<void> {
  if (options.session.score !== undefined) {
    throw new Error("Completed drill sessions must use completed-session persistence.");
  }

  await options.storage.put("drill_sessions", {
    ...options.session,
    draftKey: options.draftKey,
    questions: options.questions.map((question) => ({ ...question })),
    updatedAt: options.updatedAt ?? new Date().toISOString()
  });
}

export async function persistCompletedDrillSession(options: PersistCompletedDrillSessionOptions): Promise<void> {
  assertCompletedSessionReferences(options.session, options.questions);

  const persistedAt = options.updatedAt ?? new Date().toISOString();
  const storedSession = createStoredDrillSession(options.session, options.questions, persistedAt);
  const storedResponses = createStoredUserResponses(options.session, options.questions);
  const mistakeRecords = createStoredMistakeNotebookRecords(options.session, options.questions);
  const questionById = new Map(options.questions.map((question) => [question.id, question]));
  const responseByQuestionId = new Map(storedResponses.map((response) => [response.questionId, response]));
  const skippedAt = options.session.endedAt ?? persistedAt;
  const reviews = [
    ...storedResponses.flatMap((response) => {
      const mistakeId = retryMistakeId(questionById.get(response.questionId));

      return mistakeId === undefined
        ? []
        : [{ mistakeId, outcome: response.isCorrect ? "correct" as const : "incorrect" as const, reviewedAt: response.submittedAt }];
    }),
    ...options.questions.flatMap((question) => {
      const mistakeId = retryMistakeId(question);

      return mistakeId === undefined || responseByQuestionId.has(question.id)
        ? []
        : [{ mistakeId, outcome: "skipped" as const, reviewedAt: skippedAt }];
    })
  ];
  const reviewRecords = await Promise.all(reviews.map(async (review) => ({
    ...review,
    mistake: await options.storage.get("mistake_notebook", review.mistakeId),
    schedule: await options.storage.get("retry_schedules", buildRetryScheduleId(review.mistakeId))
  })));
  const operations: AppStorageMutation[] = [
    { storeName: "drill_sessions", type: "put", value: storedSession },
    ...storedResponses.map((value) => ({ storeName: "responses" as const, type: "put" as const, value })),
    ...mistakeRecords.flatMap((mistake): AppStorageMutation[] => [
      { storeName: "mistake_notebook", type: "put", value: mistake },
      { storeName: "retry_schedules", type: "put", value: createRetryScheduleRecord(mistake) }
    ])
  ];

  for (const review of reviewRecords) {
    if (review.outcome === "skipped") {
      if (review.schedule !== undefined) {
        operations.push({
          storeName: "retry_schedules",
          type: "put",
          value: createReviewedRetrySchedule(review.schedule, review.outcome, review.reviewedAt)
        });
      }
      continue;
    }

    if (review.mistake === undefined) {
      continue;
    }

    operations.push({
      storeName: "mistake_notebook",
      type: "put",
      value: {
        ...review.mistake,
        lastRetriedAt: review.reviewedAt,
        resolvedAt: review.outcome === "correct" ? review.reviewedAt : review.mistake.resolvedAt,
        retryCount: review.mistake.retryCount + 1,
        status: review.outcome === "correct" ? "resolved" : review.mistake.status
      }
    });

    if (review.schedule !== undefined) {
      operations.push(
        review.outcome === "correct"
          ? { key: review.schedule.id, storeName: "retry_schedules", type: "delete" }
          : {
              storeName: "retry_schedules",
              type: "put",
              value: createReviewedRetrySchedule(review.schedule, review.outcome, review.reviewedAt)
            }
      );
    }
  }

  await options.storage.mutate(operations);
}

export async function loadLatestStoredSessionSummarySnapshot(
  storage: AppStorage
): Promise<SessionSummarySnapshot | undefined> {
  const completedSessions = (await storage.getAll("drill_sessions"))
    .filter(hasCompletedSessionData)
    .sort((first, second) => sortStoredSessionsDescending(first, second));

  for (const session of completedSessions) {
    try {
      return createSessionSummarySnapshot(session, session.questions);
    } catch {
      continue;
    }
  }

  return undefined;
}

export async function loadStoredSessionSummarySnapshotById(
  storage: AppStorage,
  sessionId: string
): Promise<SessionSummarySnapshot | undefined> {
  const session = await storage.get("drill_sessions", sessionId);

  if (!hasCompletedSessionData(session)) {
    return undefined;
  }

  try {
    return createSessionSummarySnapshot(session, session.questions);
  } catch {
    return undefined;
  }
}

export function createStoredDrillSession(
  session: DrillSession,
  questions: readonly Question[],
  updatedAt = new Date().toISOString()
): StoredDrillSession {
  if (session.score === undefined) {
    throw new Error("Only completed drill sessions can be persisted.");
  }

  return {
    ...session,
    questions: questions.map((question) => ({ ...question })),
    updatedAt
  };
}

export function createStoredUserResponses(
  session: DrillSession,
  questions: readonly Question[]
): StoredUserResponse[] {
  const questionById = new Map(questions.map((question) => [question.id, question]));

  return session.responses.map((response) => {
    const question = questionById.get(response.questionId);

    return {
      ...response,
      id: buildStoredResponseId(session.id, response.questionId),
      sessionId: session.id,
      category: question?.category,
      tags: question?.tags
    };
  });
}

export function createStoredMistakeNotebookRecords(
  session: DrillSession,
  questions: readonly Question[]
): MistakeNotebookRecord[] {
  const questionById = new Map(questions.map((question) => [question.id, question]));

  return createStoredUserResponses(session, questions).flatMap((response) => {
    const question = questionById.get(response.questionId);

    if (response.isCorrect || question?.type !== "numeric" || retryMistakeId(question) !== undefined) {
      return [];
    }

    return [
      {
        id: buildMistakeNotebookId(response),
        sourceQuestionId: response.questionId,
        sourceResponseId: response.id,
        sourceSessionId: session.id,
        sourceType: mistakeSourceType(question),
        prompt: question.prompt,
        answer: { ...question.answer },
        category: question.category,
        tags: [...question.tags],
        difficulty: question.difficulty,
        explanation: {
          ...question.explanation,
          steps: [...question.explanation.steps]
        },
        ...(question.metadata === undefined ? {} : { metadata: cloneQuestionMetadata(question.metadata) }),
        rawInput: response.rawInput,
        normalizedValue: response.normalizedValue,
        errorTypes: [...response.errorTypes],
        missedAt: response.submittedAt,
        retryCount: 0,
        status: "unresolved"
      }
    ];
  });
}

function cloneQuestionMetadata(metadata: NonNullable<Question["metadata"]>): NonNullable<Question["metadata"]> {
  return {
    ...metadata,
    ...(metadata.variables === undefined ? {} : { variables: { ...metadata.variables } }),
    ...(metadata.caseStyle === undefined
      ? {}
      : {
          caseStyle: {
            ...metadata.caseStyle,
            interviewMath: {
              ...metadata.caseStyle.interviewMath,
              equationOptions: metadata.caseStyle.interviewMath.equationOptions.map((option) => ({ ...option })),
              interpretationOptions: metadata.caseStyle.interviewMath.interpretationOptions.map((option) => ({
                ...option
              }))
            }
          }
        })
  };
}

export function createRetryScheduleRecord(
  mistake: MistakeNotebookRecord,
  attemptCount = 0,
  scheduledAt = mistake.missedAt
): RetryScheduleRecord {
  const intervalDays = retryScheduleIntervalForAttempt(attemptCount);

  return {
    id: buildRetryScheduleId(mistake.id),
    sourceId: mistake.id,
    sourceType: "mistake_notebook",
    dueAt: addDays(scheduledAt, intervalDays),
    intervalDays,
    attemptCount,
    createdAt: mistake.missedAt,
    updatedAt: scheduledAt
  };
}

export function retryScheduleIntervalForAttempt(
  attemptCount: number
): (typeof retryScheduleIntervalsDays)[number] {
  const index = Math.max(0, Math.min(Math.floor(attemptCount), retryScheduleIntervalsDays.length - 1));

  return retryScheduleIntervalsDays[index];
}

function hasCompletedSessionData(session: StoredDrillSession | undefined): session is StoredDrillSession & {
  questions: Question[];
} {
  return session?.score !== undefined && Array.isArray(session.questions) && session.questions.length > 0;
}

function sortStoredSessionsDescending(first: StoredDrillSession, second: StoredDrillSession): number {
  return sortableTime(second) - sortableTime(first);
}

function sortableTime(session: StoredDrillSession): number {
  return Date.parse(session.endedAt ?? session.updatedAt ?? session.startedAt);
}

function buildStoredResponseId(sessionId: string, questionId: string): string {
  return `${sessionId}:${questionId}`;
}

function buildMistakeNotebookId(response: StoredUserResponse): string {
  return `mistake-${response.id}:${response.submittedAt}`;
}

function buildRetryScheduleId(mistakeId: string): string {
  return `retry-schedule-${mistakeId}`;
}

function createReviewedRetrySchedule(
  schedule: RetryScheduleRecord,
  outcome: "correct" | "incorrect" | "skipped",
  reviewedAt: string
): RetryScheduleRecord {
  const attemptCount = outcome === "incorrect" ? schedule.attemptCount + 1 : schedule.attemptCount;
  const intervalDays = retryScheduleIntervalForAttempt(attemptCount);

  return {
    ...schedule,
    attemptCount,
    dueAt: addDays(reviewedAt, intervalDays),
    intervalDays,
    lastReviewedAt: reviewedAt,
    updatedAt: reviewedAt
  };
}

function assertCompletedSessionReferences(session: DrillSession, questions: readonly Question[]): void {
  const questionIds = new Set(questions.map((question) => question.id));
  const sessionQuestionIds = new Set(session.questionIds);

  if (
    questionIds.size !== questions.length ||
    sessionQuestionIds.size !== questionIds.size ||
    session.questionIds.length !== questions.length ||
    session.questionIds.some((questionId) => !questionIds.has(questionId))
  ) {
    throw new Error("Completed drill session questions are inconsistent.");
  }

  const responseQuestionIds = new Set<string>();

  for (const response of session.responses) {
    if (!questionIds.has(response.questionId) || responseQuestionIds.has(response.questionId)) {
      throw new Error("Completed drill session responses are inconsistent.");
    }
    responseQuestionIds.add(response.questionId);
  }
}

function addDays(value: string, days: number): string {
  const date = new Date(value);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString();
}

function mistakeSourceType(question: Question): MistakeNotebookSourceType {
  return question.metadata?.sourceType === "benchmark" ? "benchmark" : "drill";
}

function retryMistakeId(question: Question | undefined): string | undefined {
  const value = question?.metadata?.variables?.mistakeId;

  return typeof value === "string" && value.length > 0 ? value : undefined;
}
