"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { badgeClass, buttonClass, cx, panelClass, uiText, type StatusTone } from "@/components/uiStyles";
import { buildDailyWorkoutHref } from "@/features/drills/dailyWorkout";
import { buildDrillSettingsQuery } from "@/features/drills/drillSettingsOptions";
import { createDrillSettings } from "@/features/drills/drillSettings";
import { buildRetryMissedDrillHref, buildReviewDrillHref } from "@/features/drills/mistakeRetry";
import { buildWeaknessModeDrillHref } from "@/features/drills/weaknessMode";
import type { PersonalBestRecord } from "@/features/progress/personalBests";
import { loadProgressSummary, type ProgressSummary } from "@/features/progress/progressAggregation";
import { RecommendationCards } from "@/features/recommendations/RecommendationCards";
import {
  createDeterministicRecommendations,
  minimumRecommendationQuestionCount
} from "@/features/recommendations/recommendationRules";
import { useI18n } from "@/features/i18n/I18nProvider";
import type { ErrorType, SkillCategory, SkillTag } from "@/lib/domain";
import { formatLabel as formatTag } from "@/lib/format";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { MistakeNotebookRecord } from "@/lib/storage/appStorageTypes";

type LoadState =
  | { status: "error" }
  | { status: "loaded"; summary: ProgressSummary }
  | { status: "loading" };

type HeaderAction = { href: string; label: string };

const categoryLabels: Record<SkillCategory, string> = {
  arithmetic: "Arithmetic",
  business_math: "Business Math",
  case_math: "Case Math",
  exhibit_math: "Exhibit Math",
  fractions_decimals_ratios: "Fractions And Decimals",
  growth_compounding: "Growth And Compounding",
  market_sizing: "Market Sizing",
  percentages: "Percentages",
  weighted_averages: "Weighted Averages"
};

const errorTypeCopy: Record<ErrorType, { action: string; description: string; label: string }> = {
  arithmetic_error: {
    action: "Slow down the intermediate calculation and write one clean operation at a time.",
    description: "The setup looked usable, but the numeric calculation landed on the wrong value.",
    label: "Calculation mistake"
  },
  formula_error: {
    action: "Review the formula shape before solving and name each input before substituting values.",
    description: "The selected relationship or equation did not match the question.",
    label: "Formula mismatch"
  },
  interpretation_error: {
    action: "Restate what the final number means before submitting the answer.",
    description: "The math may be present, but the business meaning or conclusion needs work.",
    label: "Interpretation issue"
  },
  magnitude_error: {
    action: "Practice K/M/B conversions and estimate the expected order of magnitude before calculating.",
    description: "The answer was in the wrong size range, often from place value or unit scale drift.",
    label: "Magnitude issue"
  },
  none: {
    action: "Keep the current rhythm.",
    description: "No error was recorded for the response.",
    label: "No error"
  },
  percentage_point_error: {
    action: "Separate percent change from percentage-point change before doing the calculation.",
    description: "The answer mixed up percentage change wording with percentage-point movement.",
    label: "Percentage-point mixup"
  },
  rounding_error: {
    action: "Carry one extra digit through the calculation, then round only at the end.",
    description: "The answer was close, but rounding happened too early or outside the allowed tolerance.",
    label: "Rounding issue"
  },
  setup_error: {
    action: "Translate the prompt into givens, missing value, and equation before calculating.",
    description: "The problem structure was set up incorrectly before the arithmetic began.",
    label: "Setup issue"
  },
  timeout: {
    action: "Use a shorter untimed set to rebuild speed without pressure, then return to timing.",
    description: "The question ran out of time before a recorded answer was completed.",
    label: "Timed out"
  },
  unit_error: {
    action: "Say the unit aloud and include it in the final answer check.",
    description: "The number was close, but the submitted unit did not match the expected unit.",
    label: "Unit mismatch"
  }
};

interface TodaysPracticeSuggestion {
  description: string;
  details: { label: string; value: string }[];
  href: string;
  title: string;
}

const categoryAccuracyTarget = 0.8;
const categoryPaceTargetSeconds = 25;
const categoryMinimumQuestionCount = minimumRecommendationQuestionCount;

export const firstRunQuickStarts = [
  {
    description: "Five untimed addition questions to get comfortable with the answer flow.",
    href: buildQuickStartHref({
      categories: ["arithmetic"],
      feedbackMode: "instant",
      questionCount: 5,
      tags: ["addition"],
      timeMode: "untimed"
    }),
    label: "Arithmetic Warmup",
    meta: "5 questions"
  },
  {
    description: "A short percentage set for common consulting math basics.",
    href: buildQuickStartHref({
      categories: ["percentages"],
      feedbackMode: "instant",
      questionCount: 5,
      tags: ["percentage_of_number", "percentage_change"],
      timeMode: "untimed"
    }),
    label: "Percentage Basics",
    meta: "5 questions"
  },
  {
    description: "Revenue and margin practice with business units and exact answers.",
    href: buildQuickStartHref({
      categories: ["business_math"],
      feedbackMode: "instant",
      questionCount: 5,
      tags: ["revenue", "margin"],
      timeMode: "untimed"
    }),
    label: "Business Math Starter",
    meta: "5 questions"
  }
];

export function DashboardProgressView() {
  const { t } = useI18n();
  return (
    <ProgressDataLoader
      render={(summary) => <DashboardContent summary={summary} />}
      action={{ href: "/drills", label: t("Start Practice") }}
      description={t("Review local practice progress and choose the next useful drill.")}
      eyebrow={t("Practice Home")}
      title={t("Dashboard")}
    />
  );
}

export function ProgressPageView() {
  const { t } = useI18n();
  return (
    <ProgressDataLoader
      render={(summary) => <ProgressContent summary={summary} />}
      action={(summary) =>
        summary?.categoryPerformance.some(
          (category) => category.questionCount >= minimumRecommendationQuestionCount
        )
          ? { href: buildWeaknessModeDrillHref(), label: t("Start Weakness Mode") }
          : { href: "/drills", label: t("Start Baseline Drill") }
      }
      description={t("Compare categories, skills, errors, and recent sessions stored on this device.")}
      eyebrow={t("Review")}
      title={t("Progress Dashboard")}
    />
  );
}

function ProgressDataLoader({
  action,
  description,
  eyebrow,
  render,
  title
}: {
  action?: HeaderAction | ((summary?: ProgressSummary) => HeaderAction | undefined);
  description: string;
  eyebrow: string;
  render: (summary: ProgressSummary) => React.ReactNode;
  title: string;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const resolvedAction =
    typeof action === "function" ? action(state.status === "loaded" ? state.summary : undefined) : action;

  useEffect(() => {
    let cancelled = false;

    try {
      const storage = createIndexedDbAppStorage();

      void loadProgressSummary(storage)
        .then((summary) => {
          if (!cancelled) {
            setState({ status: "loaded", summary });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setState({ status: "error" });
          }
        })
        .finally(() => storage.close());
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setState({ status: "error" });
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <PageHeader action={resolvedAction} description={description} eyebrow={eyebrow} title={title} />

      {state.status === "loading" ? (
        <LoadingState
          detail={t("Reading saved drill sessions and preparing dashboard panels.")}
          label={t("Loading saved progress...")}
          testId="progress-loading-state"
        />
      ) : null}
      {state.status === "error" ? (
        <StatusPanel tone="error" text={t("Local progress is unavailable.")} />
      ) : null}
      {state.status === "loaded" ? render(state.summary) : null}
    </main>
  );
}

export function DashboardContent({ summary }: { summary: ProgressSummary }) {
  const recommendations = useMemo(() => createDeterministicRecommendations(summary), [summary]);
  const recentSessions = useMemo(() => summary.recentSessions.slice(0, 3), [summary.recentSessions]);

  if (summary.isEmpty) {
    return <FirstRunDashboardState />;
  }

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]" data-testid="dashboard-priority-panel">
        <RecommendationCards limit={1} recommendations={recommendations} />
        <LastSessionPanel summary={summary} />
      </section>

      <DueReviewPanel summary={summary} />

      <RecentSessionsList sessions={recentSessions} />
    </>
  );
}

export function ProgressContent({ summary }: { summary: ProgressSummary }) {
  const { t } = useI18n();
  const recommendations = useMemo(() => createDeterministicRecommendations(summary), [summary]);

  if (summary.isEmpty) {
    return <EmptyProgressState />;
  }

  return (
    <>
      <section className="grid gap-4" data-testid="progress-what-changed">
        <SectionIntro
          description={t("Cumulative practice volume, accuracy, pace, streak, and bests saved locally on this device.")}
          eyebrow={t("Local History")}
          title={t("Lifetime Progress Snapshot")}
        />
        <MetricGrid summary={summary} />
        <PersonalBestsPanel bests={summary.personalBests ?? []} />
      </section>

      <section className="grid gap-4" data-testid="progress-next-practice">
        <SectionIntro
          description={t("Suggested drills based on saved progress.")}
          eyebrow={t("Next Action")}
          title={t("What to practice next?")}
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <RecommendationCards limit={1} recommendations={recommendations} />
          <TodaysPracticePanel summary={summary} />
        </div>
      </section>

      <section className="grid gap-4" data-testid="progress-details">
        <SectionIntro
          description={t("Categories, skills, errors, and recent sessions.")}
          eyebrow={t("Details")}
          title={t("Detailed progress")}
        />

        <section className="grid gap-4 lg:grid-cols-2">
          <CategoryPerformancePanel items={summary.categoryPerformance} />
          <PerformanceList
            emptyLabel={t("No skill results.")}
            items={summary.skillPerformance.slice(0, 8).map((item) => ({
              label: formatTag(item.tag),
              meta: `${item.questionCount} questions`,
              value: `${formatCorrectRate(item.accuracy)} - ${formatSecondsPerQuestion(item.averageTimeSeconds)}`
            }))}
            title={t("Skills")}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <ErrorBreakdownPanel items={summary.errorBreakdown} />
          <TrackedErrorSignals summary={summary} />
        </section>

        <AdditionalPracticePanel summary={summary.additionalPractice} />

        <MistakeNotebookPanel mistakes={summary.mistakeNotebook} />

        <RecentSessionsList sessions={summary.recentSessions} />
      </section>
    </>
  );
}

function AdditionalPracticePanel({
  summary
}: {
  summary: ProgressSummary["additionalPractice"];
}) {
  const { formatNumber, formatPercent, t } = useI18n();

  if (
    summary === undefined ||
    (summary.exhibits.attemptCount === 0 && summary.marketSizing.attemptCount === 0)
  ) {
    return null;
  }

  const items = [
    { label: t("Exhibit practice"), summary: summary.exhibits },
    { label: t("Market sizing"), summary: summary.marketSizing }
  ];

  return (
    <section
      className={panelClass("default", "grid gap-4")}
      data-testid="additional-practice"
    >
      <div className="grid gap-1">
        <h2 className={cx(uiText.sectionTitle, "min-w-0 break-words [overflow-wrap:anywhere]")}>
          {t("Additional Practice")}
        </h2>
        <p className="text-sm leading-6 text-ink/65">
          {t("Saved exhibit and market-sizing activity on this device.")}
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li className="min-w-0 border border-ink/15 border-t-2 border-t-teal bg-paper/70 px-4 py-4" key={item.label}>
            <h3 className="break-words font-semibold text-ink [overflow-wrap:anywhere]">{item.label}</h3>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <MiniStat label={t("Started")} value={formatNumber(item.summary.attemptCount)} />
              <MiniStat label={t("Completed")} value={formatNumber(item.summary.completedCount)} />
              <MiniStat
                label={t("Avg Score")}
                value={
                  item.summary.averageScorePercent === undefined
                    ? t("Not scored")
                    : formatPercent(item.summary.averageScorePercent / 100)
                }
              />
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionIntro({ description, eyebrow, title }: { description: string; eyebrow: string; title: string }) {
  return (
    <div className="grid max-w-4xl gap-2">
      <p className={cx(uiText.eyebrow, "text-coral")}>{eyebrow}</p>
      <h2 className="min-w-0 break-words text-3xl font-semibold leading-tight tracking-[-0.03em] text-ink [overflow-wrap:anywhere]">
        {title}
      </h2>
      <p className="max-w-3xl text-sm leading-6 text-ink/70">{description}</p>
    </div>
  );
}

function MetricGrid({ summary }: { summary: ProgressSummary }) {
  const { formatNumber, formatPercent, t } = useI18n();
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="dashboard-metrics">
      <MetricCard
        description={t("Completed local drill questions")}
        label={t("Questions Practiced")}
        value={t("{count} answered", { count: formatNumber(summary.dashboard.totalQuestionsAnswered) })}
      />
      <MetricCard
        description={t("{correct} correct / {total} attempted", { correct: formatNumber(summary.dashboard.totalCorrect), total: formatNumber(summary.dashboard.totalQuestionsAnswered) })}
        label={t("Correct Answer Rate")}
        value={formatPercent(summary.dashboard.overallAccuracy)}
      />
      <MetricCard
        description={t("Average solve time across answered drill questions")}
        label={t("Avg Time Per Question")}
        value={t("{seconds}s/question", {
          seconds: formatNumber(summary.dashboard.averageTimeSeconds, {
            maximumFractionDigits: 1,
            minimumFractionDigits: 1
          })
        })}
      />
      <MetricCard
        description={t("Consecutive calendar days with saved drill activity")}
        label={t("Practice Streak")}
        value={t(summary.dashboard.currentStreakDays === 1 ? "1 day" : "{count} days", {
          count: formatNumber(summary.dashboard.currentStreakDays)
        })}
      />
    </dl>
  );
}

function LastSessionPanel({ summary }: { summary: ProgressSummary }) {
  const { formatNumber, formatPercent, t } = useI18n();
  const lastSession = summary.dashboard.lastSession;

  return (
    <section className="grid content-start gap-5 border border-ink/15 border-t-2 border-t-coral bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-coral">{t("Recent Performance")}</p>
          <h2 className="mt-2 min-w-0 break-words text-2xl font-semibold tracking-[-0.025em] text-ink [overflow-wrap:anywhere]">
            {t("Last Session")}
          </h2>
        </div>
        {lastSession !== undefined ? (
          <Link
            className={buttonClass("secondary", "min-h-10 px-3")}
            href={`/drills/summary?id=${encodeURIComponent(lastSession.id)}`}
          >
            {t("Summary")}
          </Link>
        ) : null}
      </div>

      {lastSession !== undefined ? (
        <>
          <p className="font-mono text-3xl font-semibold text-ink">{t("{score} pts", { score: formatNumber(lastSession.totalScore) })}</p>
          <dl className="grid gap-3">
            <MiniStat label={t("Correct Rate")} value={formatPercent(lastSession.accuracy)} />
            <MiniStat
              label={t("Avg Time Per Question")}
              value={t("{seconds}s/question", {
                seconds: formatNumber(lastSession.averageTimeSeconds, {
                  maximumFractionDigits: 1,
                  minimumFractionDigits: 1
                })
              })}
            />
            <MiniStat label={t("Questions")} value={formatNumber(lastSession.questionCount)} />
          </dl>
        </>
      ) : (
        <p className="rounded-md bg-paper px-3 py-2 text-sm leading-6 text-ink/70">
          {t("No completed drill yet.")}
        </p>
      )}
    </section>
  );
}

function TodaysPracticePanel({ summary }: { summary: ProgressSummary }) {
  const { t } = useI18n();
  const practice = createTodaysPractice(summary);

  return (
    <section
      className={panelClass(
        "highlight",
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      )}
      data-testid="todays-practice-panel"
    >
      <div className="grid gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal">{t("Today's Practice")}</p>
        <h2 className="min-w-0 break-words text-xl font-semibold text-ink [overflow-wrap:anywhere]">
          {t(practice.title)}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-ink/70">{t(practice.description)}</p>
        <dl className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-ink/65">
          {practice.details.map((detail) => (
            <div className="rounded-md bg-white px-2.5 py-1" key={detail.label}>
              <dt className="sr-only">{t(detail.label)}</dt>
              <dd>{t(detail.value)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <Link
        className={buttonClass("primary", "shrink-0")}
        href={practice.href}
      >
        {t("Start Daily Workout")}
      </Link>
    </section>
  );
}

function DueReviewPanel({ summary }: { summary: ProgressSummary }) {
  const { formatDate, formatNumber, t } = useI18n();
  const reviewQueue = summary.reviewQueue ?? { dueCount: 0, scheduledCount: 0 };
  const hasDueReviews = reviewQueue.dueCount > 0;
  const reviewDetail = hasDueReviews
    ? t("Review scheduled misses now, then continue normal practice.")
    : reviewQueue.nextDueAt !== undefined
      ? t("Next review: {date}.", { date: formatDate(new Date(reviewQueue.nextDueAt)) })
      : t("No scheduled reviews yet.");

  return (
    <section
      className="grid gap-5 border-y border-ink/20 bg-transparent py-6 md:grid-cols-12 md:items-end"
      data-testid="due-review-card"
    >
      <div className="grid gap-1 md:col-span-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-coral">{t("Spaced Review")}</p>
        <h2 className="min-w-0 break-words text-xl font-semibold text-ink [overflow-wrap:anywhere]">
          {t("Due for review")}
        </h2>
      </div>
      <p className="font-mono text-3xl font-semibold text-ink md:col-span-3">
        {t(reviewQueue.dueCount === 1 ? "1 question" : "{count} questions", {
          count: formatNumber(reviewQueue.dueCount)
        })}
      </p>
      <p className="text-sm leading-6 text-ink/70 md:col-span-4">{reviewDetail}</p>
      {hasDueReviews ? (
        <Link
          className={buttonClass("primary", "md:col-span-2 md:justify-self-end")}
          href={buildReviewDrillHref(Math.max(5, reviewQueue.dueCount))}
        >
          {t("Review Due Items")}
        </Link>
      ) : null}
    </section>
  );
}

export function createTodaysPractice(summary: ProgressSummary): TodaysPracticeSuggestion {
  const dueCount = summary.reviewQueue?.dueCount ?? 0;

  return {
    description:
      dueCount > 0
        ? `Starts with ${formatQuestionCount(Math.min(10, dueCount))} due for review, then targets weak skills and balanced practice.`
        : "Targets weak skills first, then rounds out the set with balanced local practice.",
    details: [
      { label: "Order", value: "Due - weak - balanced" },
      { label: "Length", value: "10 questions" },
      { label: "Timing", value: "Untimed" },
      { label: "Feedback", value: "Instant feedback" }
    ],
    href: buildDailyWorkoutHref(),
    title: "Daily Workout"
  };
}

function CategoryPerformancePanel({ items }: { items: readonly ProgressSummary["categoryPerformance"][number][] }) {
  const { t } = useI18n();
  return (
    <section className={panelClass("default", "grid gap-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={cx(uiText.sectionTitle, "min-w-0 break-words [overflow-wrap:anywhere]")}>
            {t("Categories")}
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink/65">
            {t("Compared against {accuracy} and {pace}.", { accuracy: formatCorrectRate(categoryAccuracyTarget), pace: formatSecondsPerQuestion(categoryPaceTargetSeconds) })}
          </p>
        </div>
        <span className="rounded-md bg-paper px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-ink/65">
          {t("Target Comparisons")}
        </span>
      </div>

      {items.length > 0 ? (
        <ul className="grid gap-3">
          {items.map((item) => (
            <CategoryPerformanceCard item={item} key={item.category} />
          ))}
        </ul>
      ) : (
        <p className="rounded-md bg-paper px-3 py-2 text-sm text-ink/70">
          {t("Answer a drill question to create category results.")}
        </p>
      )}
    </section>
  );
}

function CategoryPerformanceCard({ item }: { item: ProgressSummary["categoryPerformance"][number] }) {
  const { t } = useI18n();
  const status = categoryStatus(item);

  return (
    <li
      className="grid gap-3 rounded-md border border-ink/10 bg-paper px-3 py-3 text-sm"
      data-testid={`category-card-${item.category}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-ink">{t(categoryLabels[item.category])}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink/65">{formatQuestionCount(item.questionCount)}</p>
        </div>
        <span className={categoryStatusClass(status.tone)}>{t(status.label)}</span>
      </div>

      <dl className="grid gap-2 sm:grid-cols-3">
        <CategoryComparisonStat
          comparison={formatAccuracyTargetComparison(item.accuracy)}
          label={t("Accuracy")}
          value={formatCorrectRate(item.accuracy)}
        />
        <CategoryComparisonStat
          comparison={formatPaceTargetComparison(item.averageTimeSeconds)}
          label={t("Pace")}
          value={formatSecondsPerQuestion(item.averageTimeSeconds)}
        />
        <CategoryComparisonStat
          comparison={formatVolumeTargetComparison(item.questionCount)}
          label={t("Volume")}
          value={formatQuestionCount(item.questionCount)}
        />
      </dl>
    </li>
  );
}

function CategoryComparisonStat({ comparison, label, value }: { comparison: string; label: string; value: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-md bg-white px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t(label)}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
      <p className="mt-1 text-xs leading-5 text-ink/65">{t(comparison)}</p>
    </div>
  );
}

function ErrorBreakdownPanel({ items }: { items: readonly ProgressSummary["errorBreakdown"][number][] }) {
  const { t } = useI18n();
  return (
    <section className={panelClass("default", "grid gap-4")}>
      <div className="grid gap-1">
        <h2 className={cx(uiText.sectionTitle, "min-w-0 break-words [overflow-wrap:anywhere]")}>
          {t("Errors")}
        </h2>
        <p className="text-sm leading-6 text-ink/65">{t("Each saved error includes what it usually means and how to practice it next.")}</p>
      </div>

      {items.length > 0 ? (
        <ul className="grid gap-3">
          {items.map((item) => (
            <ErrorBreakdownCard item={item} key={item.errorType} />
          ))}
        </ul>
      ) : (
        <p className="rounded-md bg-paper px-3 py-2 text-sm text-ink/70">
          {t("No saved mistakes yet. Missed answers will appear here with practice guidance.")}
        </p>
      )}
    </section>
  );
}

function ErrorBreakdownCard({ item }: { item: ProgressSummary["errorBreakdown"][number] }) {
  const { t } = useI18n();
  const copy = errorTypeCopy[item.errorType];

  return (
    <li
      className="grid gap-3 rounded-md border border-ink/10 bg-paper px-3 py-3 text-sm"
      data-testid={`error-card-${item.errorType}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-ink">{t(copy.label)}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink/65">{formatErrorCount(item.count)}</p>
        </div>
        <span className={errorFrequencyClass(item.count)}>{t(errorFrequencyLabel(item.count))}</span>
      </div>
      <p className="text-sm leading-6 text-ink/70">{t(copy.description)}</p>
      <div className="rounded-md bg-white px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Practice next")}</p>
        <p className="mt-1 text-sm leading-6 text-ink/75">{t(copy.action)}</p>
      </div>
    </li>
  );
}

function TrackedErrorSignals({ summary }: { summary: ProgressSummary }) {
  const { t } = useI18n();
  return (
    <section className={panelClass("default", "grid content-start gap-4")}>
      <div className="grid gap-1">
        <h2 className={cx(uiText.sectionTitle, "min-w-0 break-words [overflow-wrap:anywhere]")}>
          {t("Tracked Signals")}
        </h2>
        <p className="text-sm leading-6 text-ink/65">{t("These two patterns most often point to unit discipline and order-of-magnitude checks.")}</p>
      </div>
      <dl className="grid gap-3">
        <MiniStat label={t("Magnitude Issues")} value={formatErrorCount(summary.magnitudeErrorCount)} />
        <MiniStat label={t("Unit Mismatches")} value={formatErrorCount(summary.unitErrorCount)} />
      </dl>
    </section>
  );
}

function PersonalBestsPanel({ bests, limit = 8 }: { bests: readonly PersonalBestRecord[]; limit?: number }) {
  const { formatDate, t } = useI18n();
  const visibleBests = bests.slice(0, limit);

  return (
    <section className={panelClass("default", "grid gap-4")} data-testid="personal-bests">
      <div className="grid gap-1">
        <h2 className={cx(uiText.sectionTitle, "min-w-0 break-words [overflow-wrap:anywhere]")}>
          {t("Personal Bests")}
        </h2>
        <p className="text-sm leading-6 text-ink/65">{t("Local milestones from completed drills and benchmarks.")}</p>
      </div>
      {visibleBests.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visibleBests.map((best) => (
            <li className="rounded-md bg-paper px-3 py-3 text-sm" key={best.id}>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{personalBestMeta(best)}</p>
              <p className="mt-1 break-words font-semibold text-ink [overflow-wrap:anywhere]">{best.label}</p>
              <p className="mt-2 text-xl font-semibold text-teal">{formatPersonalBestValue(best)}</p>
              <p className="mt-1 text-xs text-ink/65">{formatDate(new Date(best.achievedAt))}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md bg-paper px-3 py-2 text-sm text-ink/70">
          {t("Complete drills or benchmarks to create local personal bests.")}
        </p>
      )}
    </section>
  );
}

function MistakeNotebookPanel({ mistakes }: { mistakes: readonly MistakeNotebookRecord[] }) {
  const { formatDate, t } = useI18n();
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [errorType, setErrorType] = useState("");
  const [missedDate, setMissedDate] = useState("");
  const categoryOptions = uniqueSorted(mistakes.map((mistake) => mistake.category));
  const tagOptions = uniqueSorted(mistakes.flatMap((mistake) => mistake.tags));
  const errorOptions = uniqueSorted(mistakes.flatMap((mistake) => mistake.errorTypes));
  const unresolvedCount = mistakes.filter((mistake) => mistake.status === "unresolved").length;
  const filteredMistakes = mistakes.filter(
    (mistake) =>
      (category === "" || mistake.category === category) &&
      (tag === "" || mistake.tags.includes(tag as SkillTag)) &&
      (errorType === "" || mistake.errorTypes.includes(errorType as ErrorType)) &&
      (missedDate === "" || mistake.missedAt.startsWith(missedDate))
  );

  return (
    <section className={panelClass("default", "grid gap-4")} data-testid="mistake-notebook">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className={cx(uiText.sectionTitle, "min-w-0 break-words [overflow-wrap:anywhere]")}>
            {t("Mistake Notebook")}
          </h2>
          <p className="text-sm leading-6 text-ink/65">{t("{count} saved for review.", { count: formatQuestionCount(mistakes.length) })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={badgeClass(filteredMistakes.length > 0 ? "warning" : "success")}>
            {formatQuestionCount(filteredMistakes.length)}
          </span>
          {unresolvedCount > 0 ? (
            <Link
              className={buttonClass("primary", "min-h-10 px-3")}
              href={buildRetryMissedDrillHref(unresolvedCount)}
            >
              {t("Retry Missed")}
            </Link>
          ) : null}
        </div>
      </div>

      {mistakes.length > 0 ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <NotebookSelect label={t("Category")} onChange={setCategory} options={categoryOptions.map((value) => [value, t(categoryLabels[value])])} value={category} />
            <NotebookSelect label={t("Skill")} onChange={setTag} options={tagOptions.map((value) => [value, formatTag(value)])} value={tag} />
            <NotebookSelect
              label={t("Error")}
              onChange={setErrorType}
              options={errorOptions.map((value) => [value, errorTypeCopy[value].label])}
              value={errorType}
            />
            <label className="grid gap-1 text-sm font-semibold text-ink/75">
              {t("Date")}
              <input
                className="h-11 rounded-md border border-ink/15 bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-teal focus:ring-2 focus:ring-mint"
                onChange={(event) => setMissedDate(event.currentTarget.value)}
                type="date"
                value={missedDate}
              />
            </label>
          </div>

          {filteredMistakes.length > 0 ? (
            <ul className="grid gap-3">
              {filteredMistakes.slice(0, 6).map((mistake) => (
                <li className="grid gap-2 rounded-md border border-ink/10 bg-paper px-3 py-3 text-sm" key={mistake.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 break-words font-semibold leading-6 text-ink [overflow-wrap:anywhere]">
                      {mistake.prompt}
                    </p>
                    <span className={badgeClass(mistake.status === "resolved" ? "success" : "warning")}>{t(mistake.status)}</span>
                  </div>
                  <dl className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-ink/65">
                    <dd className="rounded bg-white px-2 py-1">{t(categoryLabels[mistake.category])}</dd>
                    <dd className="rounded bg-white px-2 py-1">{mistake.tags.map(formatTag).join(", ")}</dd>
                    <dd className="rounded bg-white px-2 py-1">{mistake.errorTypes.map((item) => t(errorTypeCopy[item].label)).join(", ")}</dd>
                    <dd className="rounded bg-white px-2 py-1">{formatDate(new Date(mistake.missedAt))}</dd>
                  </dl>
                  <p className="text-sm leading-6 text-ink/70">
                    {t("Your answer:")} <span className="font-semibold text-ink">{mistake.rawInput || t("blank")}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md bg-paper px-3 py-2 text-sm text-ink/70">{t("No saved mistakes match these filters.")}</p>
          )}
        </>
      ) : (
        <p className="rounded-md bg-paper px-3 py-2 text-sm text-ink/70">
          {t("Missed numeric drill questions will appear here after a completed session.")}
        </p>
      )}
    </section>
  );
}

function NotebookSelect({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: [string, string][];
  value: string;
}) {
  const { t } = useI18n();
  return (
    <label className="grid gap-1 text-sm font-semibold text-ink/75">
      {label}
      <select
        className="h-11 rounded-md border border-ink/15 bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-teal focus:ring-2 focus:ring-mint"
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      >
        <option value="">{t("All")}</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function RecentSessionsList({ sessions }: { sessions: readonly ProgressSummary["recentSessions"][number][] }) {
  const { formatDate, formatNumber, formatPercent, t } = useI18n();
  return (
    <section className={panelClass("default", "grid gap-4")}>
      <div className="grid gap-1">
        <h2 className={cx(uiText.sectionTitle, "min-w-0 break-words [overflow-wrap:anywhere]")}>
          {t("Recent Sessions")}
        </h2>
        <p className="text-sm leading-6 text-ink/65">{t("Recent saved drills with focus area, volume, result, pace, and score.")}</p>
      </div>
      {sessions.length > 0 ? (
        <div className="max-h-[28rem] overflow-auto overscroll-contain rounded-md border border-ink/10" data-testid="recent-sessions-table">
          <table className="min-w-[48rem] w-full border-collapse text-left text-sm">
            <thead className="bg-paper text-xs font-semibold uppercase tracking-wide text-ink/65">
              <tr>
                <th className="sticky top-0 bg-paper px-3 py-2" scope="col">{t("Date")}</th>
                <th className="sticky top-0 bg-paper px-3 py-2" scope="col">{t("Focus")}</th>
                <th className="sticky top-0 bg-paper px-3 py-2" scope="col">{t("Questions")}</th>
                <th className="sticky top-0 bg-paper px-3 py-2" scope="col">{t("Result")}</th>
                <th className="sticky top-0 bg-paper px-3 py-2" scope="col">{t("Pace")}</th>
                <th className="sticky top-0 bg-paper px-3 py-2" scope="col">{t("Score")}</th>
                <th className="sticky top-0 bg-paper px-3 py-2" scope="col">{t("Action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 bg-white">
              {sessions.map((session) => (
                <tr className="align-top text-ink/75" key={session.id}>
                  <th className="px-3 py-3 font-semibold text-ink" scope="row">
                    {formatDate(new Date(session.endedAt ?? session.startedAt))}
                  </th>
                  <td className="px-3 py-3">
                    {session.categories.length === 0
                      ? t("Mixed focus")
                      : session.categories.map((category) => t(categoryLabels[category])).join(", ")}
                  </td>
                  <td className="px-3 py-3">{formatNumber(session.questionCount)}</td>
                  <td className="px-3 py-3">
                    <span className="block font-semibold text-ink">{formatPercent(session.accuracy)}</span>
                    <span className="mt-1 block text-xs text-ink/65">
                      {t("{correct} correct / {total} attempted", {
                        correct: formatNumber(session.correctCount),
                        total: formatNumber(session.questionCount)
                      })}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {t("{seconds}s/question", {
                      seconds: formatNumber(session.averageTimeSeconds, {
                        maximumFractionDigits: 1,
                        minimumFractionDigits: 1
                      })
                    })}
                  </td>
                  <td className="px-3 py-3 font-semibold text-ink">{t("{score} pts", { score: formatNumber(session.totalScore) })}</td>
                  <td className="px-3 py-3">
                    <Link
                      className="font-semibold text-teal underline-offset-4 hover:underline"
                      href={`/drills/summary?id=${encodeURIComponent(session.id)}`}
                    >
                      {t("View Summary")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-md bg-paper px-3 py-2 text-sm text-ink/70">
          {t("Complete a drill to add your first recent session.")}
        </p>
      )}
    </section>
  );
}

function PerformanceList({
  emptyLabel,
  items,
  title
}: {
  emptyLabel: string;
  items: { label: string; meta: string; value: string }[];
  title: string;
}) {
  const { t } = useI18n();
  return (
    <section className={panelClass("default", "grid gap-4")}>
      <h2 className={cx(uiText.sectionTitle, "min-w-0 break-words [overflow-wrap:anywhere]")}>{t(title)}</h2>
      {items.length > 0 ? (
        <ul className="grid gap-2">
          {items.map((item) => (
            <li className="flex items-center justify-between gap-3 rounded-md bg-paper px-3 py-2 text-sm" key={item.label}>
              <span>
                <span className="font-semibold text-ink">{item.label}</span>
                {item.meta !== "" ? <span className="ml-2 text-ink/65">{item.meta}</span> : null}
              </span>
              <span className="font-semibold text-ink">{item.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={cx(uiText.body, "rounded-md bg-paper px-3 py-2")}>{t(emptyLabel)}</p>
      )}
    </section>
  );
}

function EmptyProgressState() {
  const { t } = useI18n();
  return (
    <EmptyState
      action={{ href: "/drills", label: t("Start Drill") }}
      description={t("Complete one short drill to unlock accuracy, timing, recent sessions, and recommended next practice.")}
      secondaryAction={{ href: "/formulas", label: t("Review Formulas") }}
      title={t("No drill history yet.")}
    />
  );
}

function FirstRunDashboardState() {
  const { t } = useI18n();
  return (
    <section className="grid gap-7">
      <div className="grid max-w-3xl gap-2">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="font-mono text-xs font-semibold text-ink/45">02</span>
          <p className={cx(uiText.eyebrow, "text-coral")}>{t("First Run")}</p>
        </div>
        <h2 className="min-w-0 break-words text-2xl font-semibold tracking-[-0.025em] text-ink [overflow-wrap:anywhere]">
          {t("Start with a focused drill")}
        </h2>
        <p className={cx(uiText.body, "max-w-2xl")}>
          {t("Complete a quick start to unlock accuracy, timing, recent sessions, and a recommended next drill.")}
        </p>
      </div>

      <div
        className="grid border-y border-ink/20 md:grid-cols-3"
        data-testid="first-run-quick-starts"
      >
        {firstRunQuickStarts.map((quickStart, index) => (
          <Link
            className={cx(
              "group grid min-w-0 gap-4 border-b border-ink/15 bg-transparent px-4 py-6 text-left transition-colors last:border-b-0 hover:bg-mint/45 focus-visible:z-10 focus-visible:bg-mint/45 md:border-b-0 md:px-6",
              index < firstRunQuickStarts.length - 1 && "md:border-e"
            )}
            href={quickStart.href}
            key={quickStart.label}
          >
            <span aria-hidden="true" className="flex items-center justify-between font-mono text-xs font-semibold text-ink/65">
              0{index + 1}
              <span
                className="inline-flex h-7 w-7 items-center justify-center border border-teal/30 bg-mint/70 text-base text-teal transition-colors group-hover:border-teal group-hover:bg-white"
              >
                <span className="rtl:hidden">→</span>
                <span className="hidden rtl:inline">←</span>
              </span>
            </span>
            <span className={cx(uiText.subsectionTitle, "break-words [overflow-wrap:anywhere]")}>
              {t(quickStart.label)}
            </span>
            <span className={uiText.body}>{t(quickStart.description)}</span>
            <span className={cx(uiText.eyebrow, "text-xs text-teal")}>{t(quickStart.meta)}</span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          className={buttonClass("primary")}
          href="/drills"
        >
          {t("Customize Drill")}
        </Link>
        <Link
          className={buttonClass("secondary")}
          href="/formulas"
        >
          {t("Review Formulas")}
        </Link>
      </div>
    </section>
  );
}

function StatusPanel({ text, tone = "neutral" }: { text: string; tone?: "error" | "neutral" }) {
  const { t } = useI18n();
  return (
    <section
      aria-atomic="true"
      aria-live="polite"
      className={panelClass(tone === "error" ? "danger" : "default")}
      role="status"
    >
      <span className={uiText.bodyStrong}>{t(text)}</span>
    </section>
  );
}

function MetricCard({ description, label, value }: { description: string; label: string; value: string }) {
  const { t } = useI18n();
  return (
    <div
      className={panelClass("default", "p-4 sm:p-5")}
      data-testid={metricTestId(label)}
    >
      <dt className={cx(uiText.eyebrow, "text-xs text-ink/65")}>{t(label)}</dt>
      <dd className={cx(uiText.metric, "mt-2")}>{value}</dd>
      <p className={cx(uiText.dense, "mt-2")}>{t(description)}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-md bg-paper px-3 py-2">
      <dt className={cx(uiText.eyebrow, "text-xs text-ink/65")}>{t(label)}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}

function formatCorrectRate(value: number): string {
  return `${Math.round(value * 100)}% correct`;
}

function formatSecondsPerQuestion(value: number): string {
  return `${value.toFixed(1)}s/question`;
}

function formatQuestionCount(value: number): string {
  return value === 1 ? "1 question" : `${value} questions`;
}

function formatErrorCount(value: number): string {
  return value === 1 ? "1 error" : `${value} errors`;
}

function errorFrequencyLabel(count: number): string {
  return count >= 3 ? "Frequent pattern" : "Observed";
}

function errorFrequencyClass(count: number): string {
  return badgeClass(count >= 3 ? "error" : "warning");
}

function formatAccuracyTargetComparison(value: number): string {
  const percentagePointDelta = Math.round((value - categoryAccuracyTarget) * 100);

  if (percentagePointDelta === 0) {
    return "At accuracy target";
  }

  return percentagePointDelta > 0
    ? `${percentagePointDelta} pts above accuracy target`
    : `${Math.abs(percentagePointDelta)} pts below accuracy target`;
}

function formatPaceTargetComparison(value: number): string {
  const secondsDelta = value - categoryPaceTargetSeconds;

  if (Math.abs(secondsDelta) < 0.05) {
    return "At pace target";
  }

  return secondsDelta < 0
    ? `${Math.abs(secondsDelta).toFixed(1)}s faster than pace target`
    : `${secondsDelta.toFixed(1)}s slower than pace target`;
}

function formatVolumeTargetComparison(value: number): string {
  const remaining = categoryMinimumQuestionCount - value;

  if (remaining <= 0) {
    return "Enough data for a read";
  }

  return `${remaining} more ${remaining === 1 ? "question" : "questions"} for a read`;
}

function categoryStatus(item: ProgressSummary["categoryPerformance"][number]): { label: string; tone: "good" | "mixed" | "review" } {
  if (item.questionCount < categoryMinimumQuestionCount) {
    return { label: "More data needed", tone: "mixed" };
  }

  const meetsAccuracy = item.accuracy >= categoryAccuracyTarget;
  const meetsPace = item.averageTimeSeconds <= categoryPaceTargetSeconds;

  if (meetsAccuracy && meetsPace) {
    return { label: "On target", tone: "good" };
  }

  if (!meetsAccuracy && !meetsPace) {
    return { label: "Accuracy and pace", tone: "review" };
  }

  if (!meetsAccuracy) {
    return { label: "Accuracy focus", tone: "review" };
  }

  return { label: "Pace focus", tone: "mixed" };
}

function categoryStatusClass(tone: "good" | "mixed" | "review"): string {
  const statusToneByCategoryStatus = {
    good: "success",
    mixed: "warning",
    review: "error"
  } satisfies Record<typeof tone, StatusTone>;

  return badgeClass(statusToneByCategoryStatus[tone]);
}

function formatDayCount(value: number): string {
  return value === 1 ? "1 day" : `${value} days`;
}

function formatPersonalBestValue(best: PersonalBestRecord): string {
  if (best.metric === "accuracy") {
    return formatCorrectRate(best.value);
  }

  if (best.metric === "average_time") {
    return formatSecondsPerQuestion(best.value);
  }

  if (best.metric === "streak") {
    return formatDayCount(best.value);
  }

  return `${best.value} pts`;
}

function personalBestMeta(best: PersonalBestRecord): string {
  if (best.scope === "benchmark") {
    return `${formatTag(best.benchmarkId)} benchmark`;
  }

  if (best.scope === "drill_category") {
    return `${categoryLabels[best.category]} - ${formatTag(best.timeMode)}`;
  }

  if (best.scope === "drill_skill") {
    return `${formatTag(best.tag)} - ${formatTag(best.timeMode)}`;
  }

  return `${formatTag(best.difficulty)} - ${formatTag(best.timeMode)}`;
}

function uniqueSorted<TValue extends string>(values: readonly TValue[]): TValue[] {
  return Array.from(new Set(values)).sort((first, second) => first.localeCompare(second));
}

function metricTestId(label: string): string {
  return `metric-${label.toLowerCase().replaceAll(" ", "-")}`;
}

function buildQuickStartHref(settings: Parameters<typeof createDrillSettings>[0]): string {
  return `/drills/session?${buildDrillSettingsQuery(createDrillSettings(settings))}`;
}
