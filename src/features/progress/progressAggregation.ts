import type { ErrorType, SkillCategory, SkillTag } from "@/lib/domain";
import type {
  AppStorage,
  BenchmarkResultRecord,
  ExhibitAttemptRecord,
  MarketSizingAttemptRecord,
  MistakeNotebookRecord,
  RetryScheduleRecord,
  StoredDrillSession,
  StoredUserResponse,
} from "@/lib/storage/appStorageTypes";

import { createPersonalBestRecords, type PersonalBestRecord } from "@/features/progress/personalBests";

export interface CreateProgressSummaryOptions {
  benchmarkResults?: readonly BenchmarkResultRecord[];
  exhibitAttempts?: readonly ExhibitAttemptRecord[];
  marketSizingAttempts?: readonly MarketSizingAttemptRecord[];
  mistakeNotebook?: readonly MistakeNotebookRecord[];
  now?: string;
  recentSessionLimit?: number;
  responses?: readonly StoredUserResponse[];
  retrySchedules?: readonly RetryScheduleRecord[];
  sessions: readonly StoredDrillSession[];
}

export interface ProgressDashboardSummary {
  averageTimeSeconds: number;
  currentStreakDays: number;
  lastSession?: RecentSessionSummary;
  overallAccuracy: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalQuestionsAnswered: number;
  totalSessions: number;
}

export interface ProgressPerformanceSummary {
  accuracy: number;
  averageTimeSeconds: number;
  correctCount: number;
  questionCount: number;
}

export interface CategoryProgressSummary extends ProgressPerformanceSummary {
  category: SkillCategory;
}

export interface SkillProgressSummary extends ProgressPerformanceSummary {
  id: string;
  tag: SkillTag;
}

export interface ErrorProgressSummary {
  count: number;
  errorType: ErrorType;
}

export interface RecentSessionSummary {
  accuracy: number;
  averageTimeSeconds: number;
  categories: SkillCategory[];
  correctCount: number;
  endedAt?: string;
  id: string;
  incorrectCount: number;
  questionCount: number;
  startedAt: string;
  totalScore: number;
}

export interface ReviewQueueSummary {
  dueCount: number;
  nextDueAt?: string;
  scheduledCount: number;
}

export interface PracticeAttemptSummary {
  attemptCount: number;
  averageScorePercent?: number;
  completedCount: number;
}

export interface AdditionalPracticeSummary {
  exhibits: PracticeAttemptSummary;
  marketSizing: PracticeAttemptSummary;
}

export interface ProgressSummary {
  additionalPractice?: AdditionalPracticeSummary;
  categoryPerformance: CategoryProgressSummary[];
  dashboard: ProgressDashboardSummary;
  errorBreakdown: ErrorProgressSummary[];
  isEmpty: boolean;
  magnitudeErrorCount: number;
  mistakeNotebook: MistakeNotebookRecord[];
  personalBests?: PersonalBestRecord[];
  recentSessions: RecentSessionSummary[];
  reviewQueue?: ReviewQueueSummary;
  skillPerformance: SkillProgressSummary[];
  unitErrorCount: number;
}

const defaultRecentSessionLimit = 5;

export async function loadProgressSummary(
  storage: AppStorage,
  options: Omit<CreateProgressSummaryOptions, "responses" | "sessions"> = {}
): Promise<ProgressSummary> {
  const [
    sessions,
    responses,
    mistakeNotebook,
    benchmarkResults,
    retrySchedules,
    exhibitAttempts,
    marketSizingAttempts
  ] = await Promise.all([
    storage.getAll("drill_sessions"),
    storage.getAll("responses"),
    storage.getAll("mistake_notebook"),
    storage.getAll("benchmark_results"),
    storage.getAll("retry_schedules"),
    storage.getAll("exhibit_attempts"),
    storage.getAll("market_sizing_attempts")
  ]);

  return createProgressSummary({
    ...options,
    benchmarkResults,
    exhibitAttempts,
    marketSizingAttempts,
    mistakeNotebook,
    responses,
    retrySchedules,
    sessions
  });
}

export function createProgressSummary(options: CreateProgressSummaryOptions): ProgressSummary {
  const sessions = options.sessions.filter((session) => session.score !== undefined);
  const responses = collectStoredResponses(sessions, options.responses ?? []);
  const totalQuestionsAnswered = responses.length;
  const totalCorrect = responses.filter((response) => response.isCorrect).length;
  const totalIncorrect = totalQuestionsAnswered - totalCorrect;
  const recentSessions = createRecentSessionSummaries(sessions, options.recentSessionLimit ?? defaultRecentSessionLimit);
  const errorBreakdown = createErrorBreakdown(responses);
  const mistakeNotebook = [...(options.mistakeNotebook ?? [])].sort(sortMistakes);
  const reviewQueue = createReviewQueueSummary(options.retrySchedules ?? [], mistakeNotebook, options.now ?? new Date().toISOString());
  const additionalPractice = {
    exhibits: summarizePracticeAttempts(options.exhibitAttempts ?? [], (attempt) => attempt.score),
    marketSizing: summarizePracticeAttempts(options.marketSizingAttempts ?? [], (attempt) =>
      attempt.score === undefined || attempt.maxScore === undefined || attempt.maxScore <= 0
        ? undefined
        : (attempt.score / attempt.maxScore) * 100
    )
  };
  const additionalAttemptCount =
    additionalPractice.exhibits.attemptCount + additionalPractice.marketSizing.attemptCount;

  return {
    additionalPractice,
    categoryPerformance: createCategoryPerformance(responses),
    dashboard: {
      averageTimeSeconds: totalQuestionsAnswered === 0 ? 0 : sum(responses.map((response) => response.timeTakenSeconds)) / totalQuestionsAnswered,
      currentStreakDays: calculateCurrentStreakDays(sessions, options.now ?? new Date().toISOString()),
      lastSession: recentSessions[0],
      overallAccuracy: totalQuestionsAnswered === 0 ? 0 : totalCorrect / totalQuestionsAnswered,
      totalCorrect,
      totalIncorrect,
      totalQuestionsAnswered,
      totalSessions: sessions.length
    },
    errorBreakdown,
    isEmpty:
      totalQuestionsAnswered === 0 &&
      sessions.length === 0 &&
      mistakeNotebook.length === 0 &&
      reviewQueue.scheduledCount === 0 &&
      additionalAttemptCount === 0,
    magnitudeErrorCount: countError(errorBreakdown, "magnitude_error"),
    mistakeNotebook,
    personalBests: createPersonalBestRecords({
      benchmarkResults: options.benchmarkResults,
      responses,
      sessions
    }),
    recentSessions,
    reviewQueue,
    skillPerformance: createSkillPerformance(responses),
    unitErrorCount: countError(errorBreakdown, "unit_error")
  };
}

function summarizePracticeAttempts<TAttempt extends { completedAt?: string }>(
  attempts: readonly TAttempt[],
  scorePercent: (attempt: TAttempt) => number | undefined
): PracticeAttemptSummary {
  const completed = attempts.filter((attempt) => attempt.completedAt !== undefined);
  const scores = completed.map(scorePercent).filter((score): score is number => Number.isFinite(score));

  return {
    attemptCount: attempts.length,
    ...(scores.length === 0 ? {} : { averageScorePercent: sum(scores) / scores.length }),
    completedCount: completed.length
  };
}

function collectStoredResponses(
  sessions: readonly StoredDrillSession[],
  storedResponses: readonly StoredUserResponse[]
): StoredUserResponse[] {
  const responsesById = new Map<string, StoredUserResponse>();

  for (const response of storedResponses) {
    responsesById.set(response.id, response);
  }

  for (const session of sessions) {
    const questionById = new Map((session.questions ?? []).map((question) => [question.id, question]));

    for (const response of session.responses) {
      const id = `${session.id}:${response.questionId}`;
      const question = questionById.get(response.questionId);
      const existing = responsesById.get(id);

      responsesById.set(id, {
        ...response,
        ...existing,
        id,
        sessionId: session.id,
        category: existing?.category ?? question?.category,
        tags: existing?.tags ?? question?.tags
      });
    }
  }

  return Array.from(responsesById.values()).sort((first, second) =>
    first.submittedAt.localeCompare(second.submittedAt)
  );
}

function createCategoryPerformance(responses: readonly StoredUserResponse[]): CategoryProgressSummary[] {
  const stats = new Map<SkillCategory, MutablePerformanceStats>();

  for (const response of responses) {
    if (response.category === undefined) {
      continue;
    }

    addResponseToStats(stats, response.category, response);
  }

  return Array.from(stats.entries())
    .map(([category, item]) => ({
      category,
      ...finalizePerformanceStats(item)
    }))
    .sort((first, second) => second.questionCount - first.questionCount || first.category.localeCompare(second.category));
}

function createSkillPerformance(responses: readonly StoredUserResponse[]): SkillProgressSummary[] {
  const stats = new Map<SkillTag, MutablePerformanceStats>();

  for (const response of responses) {
    for (const tag of response.tags ?? []) {
      addResponseToStats(stats, tag, response);
    }
  }

  return Array.from(stats.entries())
    .map(([tag, item]) => ({
      id: tag,
      tag,
      ...finalizePerformanceStats(item)
    }))
    .sort((first, second) => second.questionCount - first.questionCount || first.tag.localeCompare(second.tag));
}

function createErrorBreakdown(responses: readonly StoredUserResponse[]): ErrorProgressSummary[] {
  const counts = new Map<ErrorType, number>();

  for (const response of responses) {
    for (const errorType of response.errorTypes) {
      if (errorType === "none") {
        continue;
      }

      counts.set(errorType, (counts.get(errorType) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([errorType, count]) => ({
      count,
      errorType
    }))
    .sort((first, second) => second.count - first.count || first.errorType.localeCompare(second.errorType));
}

function createRecentSessionSummaries(
  sessions: readonly StoredDrillSession[],
  limit: number
): RecentSessionSummary[] {
  return [...sessions]
    .sort((first, second) => sortableSessionTime(second) - sortableSessionTime(first))
    .slice(0, Math.max(0, limit))
    .map((session) => ({
      accuracy: session.score?.accuracy ?? 0,
      averageTimeSeconds: session.score?.averageTimeSeconds ?? 0,
      categories: session.settings.categories,
      correctCount: session.score?.correctCount ?? 0,
      endedAt: session.endedAt,
      id: session.id,
      incorrectCount: session.score?.incorrectCount ?? 0,
      questionCount: session.responses.length,
      startedAt: session.startedAt,
      totalScore: session.score?.totalScore ?? 0
    }));
}

function calculateCurrentStreakDays(sessions: readonly StoredDrillSession[], now: string): number {
  const activityDates = new Set(
    sessions
      .map((session) => dateKey(session.endedAt ?? session.updatedAt ?? session.startedAt))
      .filter((date): date is string => date !== undefined)
  );

  if (activityDates.size === 0) {
    return 0;
  }

  const today = parseDateKey(dateKey(now));
  if (today === undefined) {
    return 0;
  }

  let cursor = activityDates.has(formatDateKey(today)) ? today : shiftDate(today, -1);

  if (!activityDates.has(formatDateKey(cursor))) {
    return 0;
  }

  let streak = 0;

  while (activityDates.has(formatDateKey(cursor))) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}

interface MutablePerformanceStats {
  correctCount: number;
  questionCount: number;
  totalTimeSeconds: number;
}

function addResponseToStats<TKey>(stats: Map<TKey, MutablePerformanceStats>, key: TKey, response: StoredUserResponse): void {
  const current = stats.get(key) ?? {
    correctCount: 0,
    questionCount: 0,
    totalTimeSeconds: 0
  };

  current.correctCount += response.isCorrect ? 1 : 0;
  current.questionCount += 1;
  current.totalTimeSeconds += response.timeTakenSeconds;
  stats.set(key, current);
}

function finalizePerformanceStats(stats: MutablePerformanceStats): ProgressPerformanceSummary {
  return {
    accuracy: stats.questionCount === 0 ? 0 : stats.correctCount / stats.questionCount,
    averageTimeSeconds: stats.questionCount === 0 ? 0 : stats.totalTimeSeconds / stats.questionCount,
    correctCount: stats.correctCount,
    questionCount: stats.questionCount
  };
}

function countError(errorBreakdown: readonly ErrorProgressSummary[], errorType: ErrorType): number {
  return errorBreakdown.find((item) => item.errorType === errorType)?.count ?? 0;
}

function createReviewQueueSummary(
  retrySchedules: readonly RetryScheduleRecord[],
  mistakeNotebook: readonly MistakeNotebookRecord[],
  now: string
): ReviewQueueSummary {
  const unresolvedMistakeIds = new Set(
    mistakeNotebook.filter((mistake) => mistake.status === "unresolved").map((mistake) => mistake.id)
  );
  const nowTime = Date.parse(now);
  const activeSchedules = retrySchedules
    .filter((schedule) => schedule.sourceType !== "mistake_notebook" || unresolvedMistakeIds.has(schedule.sourceId))
    .filter((schedule) => !Number.isNaN(Date.parse(schedule.dueAt)))
    .sort((first, second) => Date.parse(first.dueAt) - Date.parse(second.dueAt) || first.id.localeCompare(second.id));

  return {
    dueCount: Number.isNaN(nowTime) ? 0 : activeSchedules.filter((schedule) => Date.parse(schedule.dueAt) <= nowTime).length,
    nextDueAt: activeSchedules[0]?.dueAt,
    scheduledCount: activeSchedules.length
  };
}

function sortableSessionTime(session: StoredDrillSession): number {
  return Date.parse(session.endedAt ?? session.updatedAt ?? session.startedAt);
}

function sortMistakes(first: MistakeNotebookRecord, second: MistakeNotebookRecord): number {
  if (first.status !== second.status) {
    return first.status === "unresolved" ? -1 : 1;
  }

  return second.missedAt.localeCompare(first.missedAt) || first.id.localeCompare(second.id);
}

function dateKey(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return formatDateKey(date);
}

function parseDateKey(value: string | undefined): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function shiftDate(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);

  return shifted;
}

function formatDateKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
