import type { DrillSession, Question, SkillCategory, SkillTag } from "@/lib/domain";
import type { MistakeNotebookRecord, RetryScheduleRecord } from "@/lib/storage/appStorageTypes";

import { createDrillSettings } from "@/features/drills/drillSettings";
import { createDrillSession } from "@/features/drills/sessionFactory";

export const retryMissedSourceParam = "mistake_notebook";
export const reviewQueueSourceParam = "review_queue";

export interface CreateRetryMissedDrillSessionOptions {
  questionCount: number;
  sessionId?: string;
  startedAt?: string;
}

export interface RetryMissedDrillSession {
  questions: Question[];
  session: DrillSession;
}

export interface CreateReviewDrillSessionOptions extends CreateRetryMissedDrillSessionOptions {
  now?: string;
  retrySchedules: readonly RetryScheduleRecord[];
}

export function buildRetryMissedDrillHref(questionCount: number): string {
  const params = new URLSearchParams({
    count: String(Math.max(1, Math.min(10, questionCount))),
    source: retryMissedSourceParam
  });

  return `/drills/session?${params.toString()}`;
}

export function buildReviewDrillHref(questionCount: number): string {
  const params = new URLSearchParams({
    count: String(Math.max(1, Math.min(10, questionCount))),
    source: reviewQueueSourceParam
  });

  return `/drills/session?${params.toString()}`;
}

export function createRetryMissedDrillSession(
  mistakes: readonly MistakeNotebookRecord[],
  options: CreateRetryMissedDrillSessionOptions
): RetryMissedDrillSession {
  const questions = mistakes
    .filter((mistake) => mistake.status === "unresolved")
    .sort((first, second) => first.missedAt.localeCompare(second.missedAt) || first.id.localeCompare(second.id))
    .slice(0, Math.max(1, options.questionCount))
    .map(createRetryQuestionFromMistake);

  if (questions.length === 0) {
    throw new Error("No unresolved missed questions are available to retry.");
  }

  const startedAt = options.startedAt ?? new Date().toISOString();
  const settings = createDrillSettings({
    categories: unique(questions.map((question) => question.category)),
    feedbackMode: "instant",
    questionCount: questions.length,
    tags: unique(questions.flatMap((question) => question.tags)),
    timeMode: "untimed"
  });

  return {
    questions,
    session: {
      id: options.sessionId ?? `retry-missed-${startedAt.replace(/[^A-Za-z0-9]/g, "")}`,
      questionIds: questions.map((question) => question.id),
      responses: [],
      settings,
      startedAt
    }
  };
}

export function createReviewDrillSession(
  mistakes: readonly MistakeNotebookRecord[],
  options: CreateReviewDrillSessionOptions
): RetryMissedDrillSession {
  const startedAt = options.startedAt ?? new Date().toISOString();
  const dueQuestions = selectDueMistakes(mistakes, options.retrySchedules, options.now ?? startedAt)
    .slice(0, Math.max(1, options.questionCount))
    .map(createRetryQuestionFromMistake);

  if (dueQuestions.length === 0) {
    throw new Error("No due missed questions are available to review.");
  }

  const fillCount = Math.max(0, options.questionCount - dueQuestions.length);
  const questions = [...dueQuestions, ...createGeneratedFillQuestions(dueQuestions, fillCount)];
  const settings = createDrillSettings({
    categories: unique(questions.map((question) => question.category)),
    difficulty: dueQuestions[0].difficulty,
    feedbackMode: "instant",
    questionCount: questions.length,
    tags: unique(questions.flatMap((question) => question.tags)),
    timeMode: "untimed"
  });

  return {
    questions,
    session: {
      id: options.sessionId ?? `review-queue-${startedAt.replace(/[^A-Za-z0-9]/g, "")}`,
      questionIds: questions.map((question) => question.id),
      responses: [],
      settings,
      startedAt
    }
  };
}

export function createRetryQuestionFromMistake(mistake: MistakeNotebookRecord): Question {
  return {
    answer: { ...mistake.answer },
    category: mistake.category,
    difficulty: mistake.difficulty,
    explanation: {
      ...mistake.explanation,
      steps: [...mistake.explanation.steps]
    },
    id: `retry-${mistake.id}`,
    metadata: {
      ...mistake.metadata,
      sourceType: mistake.metadata?.sourceType ?? "manual",
      variables: {
        ...mistake.metadata?.variables,
        mistakeId: mistake.id
      }
    },
    prompt: mistake.prompt,
    tags: [...mistake.tags],
    type: "numeric"
  };
}

export function selectDueMistakes(
  mistakes: readonly MistakeNotebookRecord[],
  retrySchedules: readonly RetryScheduleRecord[],
  now: string
): MistakeNotebookRecord[] {
  const unresolvedMistakes = new Map(
    mistakes.filter((mistake) => mistake.status === "unresolved").map((mistake) => [mistake.id, mistake])
  );
  const nowTime = Date.parse(now);
  const seen = new Set<string>();

  if (Number.isNaN(nowTime)) {
    return [];
  }

  return retrySchedules
    .filter((schedule) => schedule.sourceType === "mistake_notebook" && Date.parse(schedule.dueAt) <= nowTime)
    .sort(
      (first, second) =>
        Date.parse(first.dueAt) - Date.parse(second.dueAt) ||
        second.attemptCount - first.attemptCount ||
        first.id.localeCompare(second.id)
    )
    .flatMap((schedule) => {
      const mistake = unresolvedMistakes.get(schedule.sourceId);

      if (mistake === undefined || seen.has(mistake.id)) {
        return [];
      }

      seen.add(mistake.id);
      return [mistake];
    });
}

function createGeneratedFillQuestions(dueQuestions: readonly Question[], questionCount: number): Question[] {
  if (questionCount <= 0) {
    return [];
  }

  try {
    return createDrillSession({
      seed: `review-fill:${dueQuestions.map((question) => question.id).join("|")}:${questionCount}`,
      settings: {
        categories: unique(dueQuestions.map((question) => question.category)),
        difficulty: dueQuestions[0].difficulty,
        questionCount,
        tags: unique(dueQuestions.flatMap((question) => question.tags))
      }
    }).questions;
  } catch {
    return [];
  }
}

function unique<TValue extends SkillCategory | SkillTag>(values: readonly TValue[]): TValue[] {
  return Array.from(new Set(values));
}
