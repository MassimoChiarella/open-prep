import type {
  PracticeModuleId,
  PracticeRecord
} from "@/features/case-practice/practiceTypes";
import { localDateKey } from "@/features/progress/localCalendar";
import type {
  BenchmarkResultRecord,
  ExhibitAttemptRecord,
  MarketSizingAttemptRecord,
  MistakeNotebookRecord,
  RetryScheduleRecord,
  StoredDrillSession
} from "@/lib/storage/appStorageTypes";

export const wholeProductRecentActivityLimit = 5;

export type WholeProductActivityKind =
  | "benchmark"
  | "case_practice"
  | "drill"
  | "exhibit"
  | "market_sizing"
  | "prep_plan";

export interface WholeProductRecentActivity {
  href: string;
  id: string;
  kind: WholeProductActivityKind;
  label: string;
  timestamp: string;
}

export interface MathActivitySummary {
  accuracy?: number;
  averageTimeSeconds?: number;
  completedSessionCount: number;
  correctCount: number;
  incorrectCount: number;
  questionCount: number;
}

export interface BenchmarkActivitySummary {
  accuracy?: number;
  completedResultCount: number;
  correctCount: number;
  incorrectCount: number;
  questionCount: number;
}

export interface ExhibitActivitySummary {
  accuracy?: number;
  averageScorePercent?: number;
  completedAttemptCount: number;
  correctCount: number;
  evaluatedAttemptCount: number;
  scoredAttemptCount: number;
}

export interface MarketSizingActivitySummary {
  averageScorePercent?: number;
  completedAttemptCount: number;
  scoredAttemptCount: number;
}

export interface CaseModuleActivitySummary {
  averageScorePercent?: number;
  completedAttemptCount: number;
  href: string;
  label: string;
  module: PracticeModuleId;
  scoredAttemptCount: number;
}

export interface CasePracticeActivitySummary {
  completedAttemptCount: number;
  modules: CaseModuleActivitySummary[];
}

export interface PrepPlanActivitySummary {
  saved: boolean;
  updatedAt?: string;
}

export interface WholeProductActivitySummary {
  activityCount: number;
  activityDates: string[];
  benchmarks: BenchmarkActivitySummary;
  casePractice: CasePracticeActivitySummary;
  exhibits: ExhibitActivitySummary;
  hasQualifyingActivity: boolean;
  hasReturningHistory: boolean;
  isEmpty: boolean;
  marketSizing: MarketSizingActivitySummary;
  math: MathActivitySummary;
  prepPlan: PrepPlanActivitySummary;
  recentActivities: WholeProductRecentActivity[];
}

export interface WholeProductActivityInput {
  benchmarkResults?: Iterable<BenchmarkResultRecord>;
  exhibitAttempts?: Iterable<ExhibitAttemptRecord>;
  marketSizingAttempts?: Iterable<MarketSizingAttemptRecord>;
  mistakeNotebook?: Iterable<MistakeNotebookRecord>;
  practiceRecords?: Iterable<PracticeRecord>;
  retrySchedules?: Iterable<RetryScheduleRecord>;
  sessions?: Iterable<StoredDrillSession>;
  timeZone?: string;
}

export interface WholeProductActivityAccumulator {
  addBenchmarkResult(result: BenchmarkResultRecord): void;
  addDrillSession(session: StoredDrillSession): void;
  addExhibitAttempt(attempt: ExhibitAttemptRecord): void;
  addMarketSizingAttempt(attempt: MarketSizingAttemptRecord): void;
  addMistakeNotebookRecord(record: MistakeNotebookRecord): void;
  addPracticeRecord(record: PracticeRecord): void;
  addRetrySchedule(record: RetryScheduleRecord): void;
  finalize(): WholeProductActivitySummary;
}

interface NormalizedTimestamp {
  iso: string;
  time: number;
}

interface PendingSessionActivity {
  activity: WholeProductRecentActivity;
}

interface PendingBenchmarkResult {
  record: BenchmarkResultRecord;
  timestamp: NormalizedTimestamp;
}

interface MutableMathStats {
  completedSessionCount: number;
  correctCount: number;
  incorrectCount: number;
  questionCount: number;
  totalTimeSeconds: number;
}

interface MutableScoreStats {
  completedCount: number;
  scoredCount: number;
  totalScorePercent: number;
}

interface MutableExhibitStats extends MutableScoreStats {
  correctCount: number;
  evaluatedCount: number;
}

const caseModuleDetails = {
  brainstorming: { href: "/case-practice/brainstorming", label: "Brainstorming" },
  fit: { href: "/case-practice/fit", label: "Fit practice" },
  full_case: { href: "/case-practice/simulation", label: "Full case" },
  lessons: { href: "/case-practice/lessons", label: "Concept lessons" },
  questioning: { href: "/case-practice/questioning", label: "Questioning" },
  structuring: { href: "/case-practice/structuring", label: "Structuring" },
  synthesis: { href: "/case-practice/synthesis", label: "Synthesis" }
} as const satisfies Record<PracticeModuleId, { href: string; label: string }>;

const caseModuleIds = Object.keys(caseModuleDetails) as PracticeModuleId[];

export function createWholeProductActivityAccumulator(
  options: Pick<WholeProductActivityInput, "timeZone"> = {}
): WholeProductActivityAccumulator {
  const recentActivities: WholeProductRecentActivity[] = [];
  const activityDates = new Set<string>();
  const sessionsById = new Map<string, PendingSessionActivity>();
  const benchmarkResultsByRelationship = new Map<string, PendingBenchmarkResult>();
  const caseStats = new Map<PracticeModuleId, MutableScoreStats>(
    caseModuleIds.map((module) => [module, emptyScoreStats()])
  );
  const mathStats: MutableMathStats = {
    completedSessionCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    questionCount: 0,
    totalTimeSeconds: 0
  };
  const exhibitStats: MutableExhibitStats = {
    ...emptyScoreStats(),
    correctCount: 0,
    evaluatedCount: 0
  };
  const marketSizingStats = emptyScoreStats();
  let baseActivityCount = 0;
  let hasLegacyReturningHistory = false;
  let prepProfile: { activity: WholeProductRecentActivity; timestamp: NormalizedTimestamp } | undefined;

  function addBaseActivity(activity: WholeProductRecentActivity): void {
    baseActivityCount += 1;
    addActivityDate(activityDates, activity.timestamp, options.timeZone);
    addBoundedRecent(recentActivities, activity);
  }

  function addDrillSession(session: StoredDrillSession): void {
    if (session.score === undefined) return;

    const timestamp = normalizeTimestamp(session.endedAt, session.updatedAt);
    if (timestamp === undefined) return;

    const correctCount = nonNegativeNumber(session.score.correctCount);
    const incorrectCount = nonNegativeNumber(session.score.incorrectCount);
    const questionCount = correctCount + incorrectCount;
    const averageTimeSeconds = nonNegativeNumber(session.score.averageTimeSeconds);

    mathStats.completedSessionCount += 1;
    mathStats.correctCount += correctCount;
    mathStats.incorrectCount += incorrectCount;
    mathStats.questionCount += questionCount;
    mathStats.totalTimeSeconds += averageTimeSeconds * questionCount;
    sessionsById.set(session.id, {
      activity: {
        href: `/drills/summary?id=${encodeURIComponent(session.id)}`,
        id: `drill:${session.id}`,
        kind: "drill",
        label: "Math drill",
        timestamp: timestamp.iso
      }
    });
  }

  function addBenchmarkResult(result: BenchmarkResultRecord): void {
    const timestamp = normalizeTimestamp(result.completedAt);
    if (timestamp === undefined) return;

    const relationship = benchmarkRelationshipKey(result);
    const current = benchmarkResultsByRelationship.get(relationship);

    if (current === undefined || prefersBenchmarkResult(result, timestamp, current)) {
      benchmarkResultsByRelationship.set(relationship, { record: result, timestamp });
    }
  }

  function addExhibitAttempt(attempt: ExhibitAttemptRecord): void {
    const timestamp = normalizeTimestamp(attempt.completedAt);
    if (timestamp === undefined) return;

    exhibitStats.completedCount += 1;
    if (typeof attempt.isCorrect === "boolean") {
      exhibitStats.evaluatedCount += 1;
      exhibitStats.correctCount += attempt.isCorrect ? 1 : 0;
    }

    const scorePercent = finiteNumber(attempt.score) ??
      (typeof attempt.isCorrect === "boolean" ? (attempt.isCorrect ? 100 : 0) : undefined);
    addScorePercent(exhibitStats, scorePercent);
    addBaseActivity({
      href: "/exhibits",
      id: `exhibit:${attempt.id}`,
      kind: "exhibit",
      label: "Exhibit practice",
      timestamp: timestamp.iso
    });
  }

  function addMarketSizingAttempt(attempt: MarketSizingAttemptRecord): void {
    const timestamp = normalizeTimestamp(attempt.completedAt);
    if (timestamp === undefined) return;

    marketSizingStats.completedCount += 1;
    addScoreRatio(marketSizingStats, attempt.score, attempt.maxScore);
    addBaseActivity({
      href: "/market-sizing",
      id: `market-sizing:${attempt.id}`,
      kind: "market_sizing",
      label: "Market sizing",
      timestamp: timestamp.iso
    });
  }

  function addPracticeRecord(record: PracticeRecord): void {
    if (record.kind === "fit_story") return;

    if (record.kind === "prep_profile") {
      const timestamp = normalizeTimestamp(record.updatedAt);
      if (timestamp === undefined) return;

      if (
        prepProfile === undefined ||
        timestamp.time > prepProfile.timestamp.time ||
        (timestamp.time === prepProfile.timestamp.time && `prep-plan:${record.id}` < prepProfile.activity.id)
      ) {
        prepProfile = {
          activity: {
            href: "/case-practice/plan",
            id: `prep-plan:${record.id}`,
            kind: "prep_plan",
            label: "Prep plan",
            timestamp: timestamp.iso
          },
          timestamp
        };
      }
      return;
    }

    const details = caseModuleDetails[record.module];
    const timestamp = normalizeTimestamp(record.completedAt);
    if (details === undefined || timestamp === undefined) return;

    const stats = caseStats.get(record.module);
    if (stats === undefined) return;

    stats.completedCount += 1;
    addScoreRatio(stats, record.score, record.maxScore);
    addBaseActivity({
      href: details.href,
      id: `case:${record.module}:${record.id}`,
      kind: "case_practice",
      label: details.label,
      timestamp: timestamp.iso
    });
  }

  function finalize(): WholeProductActivitySummary {
    const finalRecent = [...recentActivities];
    const finalActivityDates = new Set(activityDates);
    let activityCount = baseActivityCount;
    let benchmarkCorrectCount = 0;
    let benchmarkIncorrectCount = 0;

    for (const [sessionId, session] of sessionsById) {
      if (benchmarkResultsByRelationship.has(`session:${sessionId}`)) continue;

      activityCount += 1;
      addActivityDate(finalActivityDates, session.activity.timestamp, options.timeZone);
      addBoundedRecent(finalRecent, session.activity);
    }

    for (const [relationship, result] of benchmarkResultsByRelationship) {
      const correctCount = nonNegativeNumber(result.record.score.correctCount);
      const incorrectCount = nonNegativeNumber(result.record.score.incorrectCount);
      benchmarkCorrectCount += correctCount;
      benchmarkIncorrectCount += incorrectCount;
      activityCount += 1;

      const activity: WholeProductRecentActivity = {
        href: "/benchmark",
        id: relationship.startsWith("session:")
          ? `benchmark-session:${relationship.slice("session:".length)}`
          : `benchmark:${result.record.id}`,
        kind: "benchmark",
        label: "Benchmark",
        timestamp: result.timestamp.iso
      };
      addActivityDate(finalActivityDates, activity.timestamp, options.timeZone);
      addBoundedRecent(finalRecent, activity);
    }

    if (prepProfile !== undefined) {
      activityCount += 1;
      addActivityDate(finalActivityDates, prepProfile.activity.timestamp, options.timeZone);
      addBoundedRecent(finalRecent, prepProfile.activity);
    }

    const benchmarkQuestionCount = benchmarkCorrectCount + benchmarkIncorrectCount;
    const caseModules = caseModuleIds.map((module) => {
      const details = caseModuleDetails[module];
      const stats = caseStats.get(module) ?? emptyScoreStats();

      return {
        ...finalizeScoreStats(stats),
        href: details.href,
        label: details.label,
        module
      };
    });
    const hasQualifyingActivity = activityCount > 0;
    const hasReturningHistory = hasQualifyingActivity || hasLegacyReturningHistory;

    return {
      activityCount,
      activityDates: Array.from(finalActivityDates).sort((first, second) =>
        compareStableIds(second, first)
      ),
      benchmarks: {
        ...(benchmarkQuestionCount === 0
          ? {}
          : { accuracy: benchmarkCorrectCount / benchmarkQuestionCount }),
        completedResultCount: benchmarkResultsByRelationship.size,
        correctCount: benchmarkCorrectCount,
        incorrectCount: benchmarkIncorrectCount,
        questionCount: benchmarkQuestionCount
      },
      casePractice: {
        completedAttemptCount: caseModules.reduce(
          (total, module) => total + module.completedAttemptCount,
          0
        ),
        modules: caseModules
      },
      exhibits: {
        ...(exhibitStats.evaluatedCount === 0
          ? {}
          : { accuracy: exhibitStats.correctCount / exhibitStats.evaluatedCount }),
        ...finalizeScoreStats(exhibitStats),
        correctCount: exhibitStats.correctCount,
        evaluatedAttemptCount: exhibitStats.evaluatedCount
      },
      hasQualifyingActivity,
      hasReturningHistory,
      isEmpty: !hasReturningHistory,
      marketSizing: finalizeScoreStats(marketSizingStats),
      math: {
        ...(mathStats.questionCount === 0
          ? {}
          : {
              accuracy: mathStats.correctCount / mathStats.questionCount,
              averageTimeSeconds: mathStats.totalTimeSeconds / mathStats.questionCount
            }),
        completedSessionCount: mathStats.completedSessionCount,
        correctCount: mathStats.correctCount,
        incorrectCount: mathStats.incorrectCount,
        questionCount: mathStats.questionCount
      },
      prepPlan: {
        saved: prepProfile !== undefined,
        ...(prepProfile === undefined ? {} : { updatedAt: prepProfile.timestamp.iso })
      },
      recentActivities: finalRecent
    };
  }

  return {
    addBenchmarkResult,
    addDrillSession,
    addExhibitAttempt,
    addMarketSizingAttempt,
    addMistakeNotebookRecord: () => {
      hasLegacyReturningHistory = true;
    },
    addPracticeRecord,
    addRetrySchedule: () => {
      hasLegacyReturningHistory = true;
    },
    finalize
  };
}

export function createWholeProductActivitySummary(
  input: WholeProductActivityInput = {}
): WholeProductActivitySummary {
  const accumulator = createWholeProductActivityAccumulator({ timeZone: input.timeZone });

  for (const session of input.sessions ?? []) accumulator.addDrillSession(session);
  for (const result of input.benchmarkResults ?? []) accumulator.addBenchmarkResult(result);
  for (const attempt of input.exhibitAttempts ?? []) accumulator.addExhibitAttempt(attempt);
  for (const attempt of input.marketSizingAttempts ?? []) accumulator.addMarketSizingAttempt(attempt);
  for (const record of input.practiceRecords ?? []) accumulator.addPracticeRecord(record);
  for (const record of input.mistakeNotebook ?? []) accumulator.addMistakeNotebookRecord(record);
  for (const record of input.retrySchedules ?? []) accumulator.addRetrySchedule(record);

  return accumulator.finalize();
}

function addBoundedRecent(
  activities: WholeProductRecentActivity[],
  candidate: WholeProductRecentActivity
): void {
  const index = activities.findIndex((activity) => compareActivity(candidate, activity) < 0);
  if (index === -1) activities.push(candidate);
  else activities.splice(index, 0, candidate);

  if (activities.length > wholeProductRecentActivityLimit) activities.pop();
}

function compareActivity(
  first: WholeProductRecentActivity,
  second: WholeProductRecentActivity
): number {
  const timeDifference = Date.parse(second.timestamp) - Date.parse(first.timestamp);
  return timeDifference !== 0 ? timeDifference : compareStableIds(first.id, second.id);
}

function compareStableIds(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function addActivityDate(dates: Set<string>, timestamp: string, timeZone: string | undefined): void {
  const date = localDateKey(timestamp, timeZone);
  if (date !== undefined) dates.add(date);
}

function benchmarkRelationshipKey(result: BenchmarkResultRecord): string {
  return result.sessionId.length === 0 ? `record:${result.id}` : `session:${result.sessionId}`;
}

function prefersBenchmarkResult(
  candidate: BenchmarkResultRecord,
  candidateTimestamp: NormalizedTimestamp,
  current: PendingBenchmarkResult
): boolean {
  return candidateTimestamp.time > current.timestamp.time ||
    (candidateTimestamp.time === current.timestamp.time && candidate.id < current.record.id);
}

function normalizeTimestamp(...values: Array<string | undefined>): NormalizedTimestamp | undefined {
  for (const value of values) {
    if (value === undefined) continue;

    const time = Date.parse(value);
    if (!Number.isNaN(time)) return { iso: new Date(time).toISOString(), time };
  }

  return undefined;
}

function emptyScoreStats(): MutableScoreStats {
  return { completedCount: 0, scoredCount: 0, totalScorePercent: 0 };
}

function addScoreRatio(stats: MutableScoreStats, score: number | undefined, maxScore: number | undefined): void {
  const normalizedScore = finiteNumber(score);
  const normalizedMax = finiteNumber(maxScore);
  if (normalizedScore === undefined || normalizedMax === undefined || normalizedMax <= 0) return;

  addScorePercent(stats, (normalizedScore / normalizedMax) * 100);
}

function addScorePercent(stats: MutableScoreStats, scorePercent: number | undefined): void {
  if (scorePercent === undefined || !Number.isFinite(scorePercent)) return;

  stats.scoredCount += 1;
  stats.totalScorePercent += Math.max(0, Math.min(100, scorePercent));
}

function finalizeScoreStats(stats: MutableScoreStats): {
  averageScorePercent?: number;
  completedAttemptCount: number;
  scoredAttemptCount: number;
} {
  return {
    ...(stats.scoredCount === 0
      ? {}
      : { averageScorePercent: stats.totalScorePercent / stats.scoredCount }),
    completedAttemptCount: stats.completedCount,
    scoredAttemptCount: stats.scoredCount
  };
}

function finiteNumber(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) ? value : undefined;
}

function nonNegativeNumber(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
