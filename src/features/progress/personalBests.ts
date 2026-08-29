import type { BenchmarkId } from "@/features/benchmarks/benchmarkTypes";
import type { Difficulty, DrillSettings, SkillCategory, SkillTag } from "@/lib/domain";
import { formatLabel } from "@/lib/format";
import type { BenchmarkResultRecord, StoredDrillSession, StoredUserResponse } from "@/lib/storage/appStorageTypes";

export type PersonalBestMetric = "accuracy" | "average_time" | "score" | "streak";
export type PersonalBestTimeMode = DrillSettings["timeMode"];

interface BasePersonalBestRecord {
  achievedAt: string;
  id: string;
  label: string;
  metric: PersonalBestMetric;
  sourceId: string;
  value: number;
}

export type PersonalBestRecord = BasePersonalBestRecord &
  (
    | {
        category: SkillCategory;
        difficulty: Difficulty;
        scope: "drill_category";
        timeMode: PersonalBestTimeMode;
      }
    | {
        difficulty: Difficulty;
        scope: "drill_skill";
        tag: SkillTag;
        timeMode: PersonalBestTimeMode;
      }
    | {
        benchmarkId: BenchmarkId;
        difficulty: Difficulty;
        scope: "benchmark";
      }
    | {
        difficulty: Difficulty;
        scope: "drill_streak";
        timeMode: PersonalBestTimeMode;
      }
  );

export interface CreatePersonalBestRecordsOptions {
  benchmarkResults?: readonly BenchmarkResultRecord[];
  responses?: readonly StoredUserResponse[];
  sessions: readonly StoredDrillSession[];
}

export function createPersonalBestRecords(options: CreatePersonalBestRecordsOptions): PersonalBestRecord[] {
  const bests = new Map<string, PersonalBestRecord>();
  const responsesById = new Map((options.responses ?? []).map((response) => [response.id, response]));
  const completedSessions = options.sessions.filter((session) => session.score !== undefined);

  for (const session of completedSessions) {
    addDrillBests(bests, session, collectSessionResponses(session, responsesById));
  }

  for (const best of createStreakBests(completedSessions)) {
    addBest(bests, best);
  }

  for (const result of options.benchmarkResults ?? []) {
    addBest(bests, {
      achievedAt: result.completedAt,
      benchmarkId: result.benchmarkId as BenchmarkId,
      difficulty: result.difficulty,
      id: `benchmark:${result.benchmarkId}:score`,
      label: "Best benchmark score",
      metric: "score",
      scope: "benchmark",
      sourceId: result.id,
      value: result.score.totalScore
    });
  }

  return Array.from(bests.values()).sort((first, second) => first.id.localeCompare(second.id));
}

export function findSourcePersonalBests(
  records: readonly PersonalBestRecord[],
  sourceIds: string | readonly string[]
): PersonalBestRecord[] {
  const ids = new Set(Array.isArray(sourceIds) ? sourceIds : [sourceIds]);

  return records.filter((record) => ids.has(record.sourceId));
}

function addDrillBests(
  bests: Map<string, PersonalBestRecord>,
  session: StoredDrillSession,
  responses: readonly StoredUserResponse[]
): void {
  for (const category of unique(responses.flatMap((response) => response.category ?? []))) {
    const categoryResponses = responses.filter((response) => response.category === category);

    addPerformanceBests(bests, categoryResponses, {
      achievedAt: completedAt(session),
      category,
      difficulty: session.settings.difficulty,
      idPrefix: `drill_category:${category}:${session.settings.difficulty}:${session.settings.timeMode}`,
      label: formatLabel(category),
      scope: "drill_category",
      sourceId: session.id,
      timeMode: session.settings.timeMode
    });
  }

  for (const tag of unique(responses.flatMap((response) => response.tags ?? []))) {
    const tagResponses = responses.filter((response) => response.tags?.includes(tag));

    addPerformanceBests(bests, tagResponses, {
      achievedAt: completedAt(session),
      difficulty: session.settings.difficulty,
      idPrefix: `drill_skill:${tag}:${session.settings.difficulty}:${session.settings.timeMode}`,
      label: formatLabel(tag),
      scope: "drill_skill",
      sourceId: session.id,
      tag,
      timeMode: session.settings.timeMode
    });
  }
}

type PerformanceBestBase = {
  achievedAt: string;
  difficulty: Difficulty;
  idPrefix: string;
  label: string;
  sourceId: string;
  timeMode: PersonalBestTimeMode;
} & (
  | { category: SkillCategory; scope: "drill_category" }
  | { scope: "drill_skill"; tag: SkillTag }
);

function addPerformanceBests(
  bests: Map<string, PersonalBestRecord>,
  responses: readonly StoredUserResponse[],
  base: PerformanceBestBase
): void {
  const correctResponses = responses.filter((response) => response.isCorrect);

  addBest(bests, {
    ...base,
    id: `${base.idPrefix}:accuracy`,
    label: `${base.label} accuracy`,
    metric: "accuracy",
    value: responses.length === 0 ? 0 : correctResponses.length / responses.length
  });

  if (correctResponses.length > 0) {
    addBest(bests, {
      ...base,
      id: `${base.idPrefix}:average_time`,
      label: `${base.label} fastest correct pace`,
      metric: "average_time",
      value: average(correctResponses.map((response) => response.timeTakenSeconds))
    });
  }
}

function createStreakBests(sessions: readonly StoredDrillSession[]): PersonalBestRecord[] {
  const sessionsByScope = new Map<string, StoredDrillSession[]>();

  for (const session of sessions) {
    const key = `${session.settings.difficulty}:${session.settings.timeMode}`;
    sessionsByScope.set(key, [...(sessionsByScope.get(key) ?? []), session]);
  }

  return Array.from(sessionsByScope.values()).flatMap((scopeSessions) => {
    const best = longestStreak(scopeSessions);

    if (best === undefined) {
      return [];
    }

    return [
      {
        achievedAt: completedAt(best.session),
        difficulty: best.session.settings.difficulty,
        id: `drill_streak:${best.session.settings.difficulty}:${best.session.settings.timeMode}:streak`,
        label: "Longest practice streak",
        metric: "streak",
        scope: "drill_streak",
        sourceId: best.session.id,
        timeMode: best.session.settings.timeMode,
        value: best.days
      }
    ];
  });
}

function collectSessionResponses(
  session: StoredDrillSession,
  responsesById: Map<string, StoredUserResponse>
): StoredUserResponse[] {
  const questionById = new Map((session.questions ?? []).map((question) => [question.id, question]));

  return session.responses.map((response) => {
    const id = `${session.id}:${response.questionId}`;
    const stored = responsesById.get(id);
    const question = questionById.get(response.questionId);

    return {
      ...response,
      ...stored,
      category: stored?.category ?? question?.category,
      id,
      sessionId: session.id,
      tags: stored?.tags ?? question?.tags
    };
  });
}

function addBest(bests: Map<string, PersonalBestRecord>, candidate: PersonalBestRecord): void {
  const current = bests.get(candidate.id);

  if (current === undefined || isBetterBest(candidate, current)) {
    bests.set(candidate.id, candidate);
  }
}

function isBetterBest(candidate: PersonalBestRecord, current: PersonalBestRecord): boolean {
  if (candidate.metric === "average_time") {
    return (
      candidate.value < current.value ||
      (candidate.value === current.value &&
        (candidate.achievedAt < current.achievedAt ||
          (candidate.achievedAt === current.achievedAt && candidate.sourceId < current.sourceId)))
    );
  }

  return (
    candidate.value > current.value ||
    (candidate.value === current.value &&
      (candidate.achievedAt > current.achievedAt ||
        (candidate.achievedAt === current.achievedAt && candidate.sourceId < current.sourceId)))
  );
}

function longestStreak(sessions: readonly StoredDrillSession[]): { days: number; session: StoredDrillSession } | undefined {
  const latestSessionByDate = new Map<string, StoredDrillSession>();

  for (const session of sessions) {
    const key = dateKey(completedAt(session));
    const current = key === undefined ? undefined : latestSessionByDate.get(key);

    if (key !== undefined && (current === undefined || isLaterSessionTieBreaker(session, current))) {
      latestSessionByDate.set(key, session);
    }
  }

  const dates = Array.from(latestSessionByDate.keys()).sort();
  let best: { days: number; session: StoredDrillSession } | undefined;
  let currentDays = 0;

  for (let index = 0; index < dates.length; index += 1) {
    const previous = parseDateKey(dates[index - 1]);
    const current = parseDateKey(dates[index]);

    currentDays = current !== undefined && previous !== undefined && daysBetween(previous, current) === 1 ? currentDays + 1 : 1;

    const session = latestSessionByDate.get(dates[index]);

    if (
      session !== undefined &&
      (best === undefined ||
        currentDays > best.days ||
        (currentDays === best.days && isLaterSessionTieBreaker(session, best.session)))
    ) {
      best = { days: currentDays, session };
    }
  }

  return best;
}

function isLaterSessionTieBreaker(candidate: StoredDrillSession, current: StoredDrillSession): boolean {
  return completedAt(candidate) > completedAt(current) || (completedAt(candidate) === completedAt(current) && candidate.id < current.id);
}

function completedAt(session: StoredDrillSession): string {
  return session.endedAt ?? session.updatedAt ?? session.startedAt;
}

function dateKey(value: string): string | undefined {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function parseDateKey(value: string | undefined): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function daysBetween(first: Date, second: Date): number {
  return Math.round((second.getTime() - first.getTime()) / 86_400_000);
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function unique<TValue extends string>(values: readonly TValue[]): TValue[] {
  return Array.from(new Set(values));
}
