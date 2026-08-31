"use client";

import Link from "next/link";

import { InterviewMathScoreBreakdown } from "@/features/drills/InterviewMathScoreBreakdown";
import { SessionGuidancePanel } from "@/features/drills/SessionGuidancePanel";
import { resolveStrategyTip } from "@/features/drills/strategyTips";
import type { ErrorBreakdown, ErrorType, UnitType } from "@/lib/domain";
import { formatNumber } from "@/lib/format";

import { buildDrillSettingsQuery } from "@/features/drills/drillSettingsOptions";
import { deriveWeaknessDrillSettings, rankWeaknesses } from "@/features/progress/weaknessAnalysis";
import type { SessionSummarySnapshot } from "@/features/drills/sessionSummary";
import { useI18n } from "@/features/i18n/I18nProvider";

interface SessionSummaryViewProps {
  newBestLabels?: readonly string[];
  repeatAction?: {
    href: string;
    label: string;
  };
  snapshot: SessionSummarySnapshot;
}

export function SessionSummaryView({ newBestLabels = [], repeatAction, snapshot }: SessionSummaryViewProps) {
  const { formatDuration, formatNumber: formatLocaleNumber, formatPercent, t } = useI18n();
  const score = snapshot.score;
  const accuracyPercent = Math.round(score.accuracy * 100);
  const errorCount = score.errorBreakdown.reduce((total, item) => total + item.count, 0);
  const repeatHref = repeatAction?.href ?? buildRepeatDrillHref(snapshot);
  const repeatLabel = repeatAction?.label ?? "Repeat Drill";
  const visibleNewBestLabels = score.correctCount === 0 ? [] : Array.from(new Set(newBestLabels));
  const guidance = createSessionGuidance(snapshot);

  return (
    <section className="grid gap-7 border border-ink/15 border-t-2 border-t-coral bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4" data-testid="session-summary-header">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-coral">{t("Complete")}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">{t("Session Results")}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            {t("{correct} correct / {attempted} attempted", {
              attempted: formatLocaleNumber(snapshot.questionResults.length),
              correct: formatLocaleNumber(score.correctCount)
            })}
          </p>
        </div>
      </div>

      {visibleNewBestLabels.length > 0 ? <NewBestNotice labels={visibleNewBestLabels.map((label) => t(label))} /> : null}

      <section className="grid gap-3 border-y border-ink/20 bg-paper/70 py-4" data-testid="session-summary-actions">
        <div>
          <h3 className="text-base font-semibold text-ink">{t("Next Step")}</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <SummaryAction href={repeatHref} label={t(repeatLabel)} tone="primary" />
          <SummaryAction href="/drills" label={t("Adjust Settings")} tone="secondary" />
          <SummaryAction href="/progress" label={t("View Progress")} tone="secondary" />
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]" data-testid="session-summary-score-panel">
        <section className="border border-ink bg-ink p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/65">{t("Total Score")}</p>
          <p className="mt-2 text-4xl font-semibold">{t("{score} pts", { score: formatLocaleNumber(score.totalScore) })}</p>
          <p className="mt-3 text-sm leading-6 text-white/75">{t(summaryOutcomeLabel(accuracyPercent, score.incorrectCount))}</p>
        </section>

        <dl className="grid gap-3 sm:grid-cols-3">
          <ScoreStat
            description={t("{correct} correct / {review} need review", { correct: formatLocaleNumber(score.correctCount), review: formatLocaleNumber(score.incorrectCount) })}
            label={t("Accuracy")}
            value={formatPercent(score.accuracy)}
          />
          <ScoreStat
            description={t("Average solve time")}
            label={t("Time")}
            value={formatDuration(score.averageTimeSeconds)}
          />
          <ScoreStat description={t(errorSummaryLabel(errorCount), { count: formatLocaleNumber(errorCount) })} label={t("Errors")} value={formatLocaleNumber(errorCount)} />
        </dl>
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-testid="session-summary-breakdowns">
        <CategoryBreakdown items={score.categoryBreakdown} />
        <ErrorBreakdownList items={formatErrorBreakdown(score.errorBreakdown)} totalErrors={errorCount} />
      </div>

      <SessionGuidancePanel {...guidance} />

      <section className="grid gap-3">
        <h3 className="text-base font-semibold text-ink">{t("Question Review")}</h3>
        <ol className="grid gap-2">
          {snapshot.questionResults.map((result, index) => (
            <QuestionReviewCard index={index} key={`${result.prompt}-${index}`} result={result} />
          ))}
        </ol>
      </section>
    </section>
  );
}

function NewBestNotice({ labels }: { labels: readonly string[] }) {
  const { t } = useI18n();

  return (
    <section
      aria-live="polite"
      className="border-s-2 border-teal bg-mint px-3 py-3 text-sm leading-6 text-ink"
      data-testid="session-summary-new-bests"
      role="status"
    >
      <p className="font-semibold text-teal">{t("New Best")}</p>
      <p>{labels.join(", ")}</p>
    </section>
  );
}

function QuestionReviewCard({
  index,
  result
}: {
  index: number;
  result: SessionSummarySnapshot["questionResults"][number];
}) {
  const { formatDuration, formatNumber: formatLocaleNumber, t } = useI18n();
  const status = questionReviewStatus(result);
  const strategyTip =
    !result.isCorrect || (result.interviewMath !== undefined && result.interviewMath.score.total < 100)
      ? resolveStrategyTip({ errorTypes: result.errorTypes, tags: result.tags ?? [] })
      : undefined;

  return (
    <li
      className={[
        "min-w-0 border border-s-2 px-3 py-4 text-sm leading-6",
        status.tone === "success" ? "border-teal/20 bg-mint/60" : "border-coral/25 bg-coral/10"
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-0 flex-1 font-medium text-ink [overflow-wrap:anywhere]">
          <span className="font-semibold text-teal">{formatLocaleNumber(index + 1)}.</span> {result.prompt}
        </p>
        <span
          className={[
            "rounded px-2 py-1 text-xs font-semibold",
            status.tone === "success" ? "bg-teal text-white" : "bg-coral text-white"
          ].join(" ")}
        >
          {t(status.label)}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 sm:grid-cols-3">
        <ReviewStat label={t("Your Answer")} value={formatRawAnswer(result.rawInput, result.selectedUnit)} />
        <ReviewStat
          label={t("Correct Answer")}
          value={formatAnswerWithUnit(
            result.correctValue,
            result.interviewMath?.expectedUnit ?? result.answerUnit
          )}
        />
        <ReviewStat label={t("Time")} value={formatDuration(result.timeTakenSeconds)} />
      </dl>

      {result.interviewMath !== undefined ? (
        <div className="mt-3 grid gap-3">
          <dl className="grid gap-3 border-t border-ink/10 pt-3 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Selected Equation")}</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-ink">
                {result.interviewMath.equationLabel ?? t("No equation selected")}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Interpretation")}</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-ink">
                {result.interviewMath.interpretationLabel ?? t("Skipped")}
              </dd>
            </div>
          </dl>
          <InterviewMathScoreBreakdown score={result.interviewMath.score} />
        </div>
      ) : null}

      <p className="mt-3 text-sm leading-6 text-ink/75">{t(status.description)}</p>
      <details className="group mt-3 border-y border-ink/15 bg-white/80 px-3 py-2">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink marker:content-none">
          {t("Worked solution")}
          <span aria-hidden="true" className="text-lg text-teal transition-transform motion-reduce:transition-none group-open:rotate-45">+</span>
        </summary>
        <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 text-sm leading-6 text-ink/75 [overflow-wrap:anywhere]">
          <p>{result.explanation.short}</p>
          {result.explanation.steps.map((step) => (
            <p key={step}>{step}</p>
          ))}
          {result.explanation.shortcut !== undefined ? (
            <p className="rounded bg-saffron/15 px-3 py-2">
              <span className="font-semibold text-ink">{t("Shortcut:")}</span> {result.explanation.shortcut}
            </p>
          ) : null}
        </div>
      </details>
      {!result.isCorrect ? (
        <p className="mt-2 rounded bg-white/80 px-3 py-2 text-xs font-semibold capitalize text-ink/70">
          {t("Errors:")} {t(formatErrorTypes(result.errorTypes))}
        </p>
      ) : null}
      {strategyTip !== undefined ? (
        <aside className="mt-2 rounded border border-teal/20 bg-white/80 px-3 py-2 text-sm leading-6 text-ink/75">
          <span className="font-semibold text-teal">{t("Strategy tip:")} {t(strategyTip.title)}.</span> {t(strategyTip.body)}
        </aside>
      ) : null}
    </li>
  );
}

function createSessionGuidance(snapshot: SessionSummarySnapshot) {
  const responses = snapshot.questionResults.flatMap((result, index) =>
    result.category === undefined
      ? []
      : [
          {
            category: result.category,
            errorTypes: result.errorTypes,
            id: `${snapshot.id}:${index}`,
            isCorrect: result.isCorrect,
            questionId: `${snapshot.id}:${index}`,
            rawInput: result.rawInput,
            sessionId: snapshot.id,
            submittedAt: snapshot.endedAt ?? snapshot.startedAt,
            tags: result.tags,
            timeTakenSeconds: result.timeTakenSeconds
          }
        ]
  );
  const ranked = rankWeaknesses(responses);
  const weaknesses = ranked
    .filter((item) => item.accuracy < 0.85 || item.averageTimeSeconds > 25)
    .map((item) => ({
      accuracy: item.accuracy,
      averageTimeSeconds: item.averageTimeSeconds,
      label: formatLabel(item.category),
      reason:
        item.accuracy < 0.85
          ? `${item.correctCount} of ${item.attemptCount} answers were correct in this session.`
          : `Accuracy was strong, but the ${item.averageTimeSeconds.toFixed(1)}s average pace can improve.`
    }));
  const settings = deriveWeaknessDrillSettings(responses);
  const focusLabel = ranked[0] === undefined ? "Practice" : formatLabel(ranked[0].category);

  return {
    recommendationHref: settings === undefined ? "/drills" : `/drills/session?${buildDrillSettingsQuery(settings)}`,
    recommendationText: weaknesses.length === 0 ? `Reinforce ${focusLabel}` : `Practice ${focusLabel}`,
    weaknesses
  };
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-s-2 border-ink/15 bg-white/80 px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}

function SummaryAction({ href, label, tone }: { href: string; label: string; tone: "primary" | "secondary" }) {
  return (
    <Link
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2",
        tone === "primary"
          ? "bg-ink text-white hover:bg-ink/85"
          : "border border-ink/30 bg-white text-ink hover:border-ink hover:bg-paper"
      ].join(" ")}
      href={href}
    >
      {label}
    </Link>
  );
}

function ScoreStat({ description, label, value }: { description: string; label: string; value: string }) {
  return (
    <div className="border-s-2 border-ink/15 bg-paper px-3 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-ink">{value}</dd>
      <dd className="mt-1 text-xs font-semibold text-ink/65">{description}</dd>
    </div>
  );
}

function CategoryBreakdown({ items }: { items: SessionSummarySnapshot["score"]["categoryBreakdown"] }) {
  const { formatDuration, formatNumber: formatLocaleNumber, formatPercent, t } = useI18n();

  return (
    <section className="grid gap-2">
      <h3 className="text-base font-semibold text-ink">{t("Categories")}</h3>
      {items.length > 0 ? (
        <ul className="grid gap-2">
          {items.map((item) => (
            <li className="grid gap-2 border-b border-ink/15 bg-paper/70 px-3 py-3 text-sm last:border-b-0" key={item.category}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold capitalize text-ink">{t(formatLabel(item.category))}</span>
                <span className="font-semibold text-ink">{formatPercent(item.accuracy)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white" aria-hidden="true">
                <div className="h-full rounded-full bg-teal" style={{ width: `${Math.round(item.accuracy * 100)}%` }} />
              </div>
              <p className="text-xs font-semibold text-ink/65">
                {t("{count} questions / {duration} avg", { count: formatLocaleNumber(item.questionCount), duration: formatDuration(item.averageTimeSeconds) })}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-y border-ink/15 bg-paper px-3 py-2 text-sm text-ink/70">{t("No category breakdown available.")}</p>
      )}
    </section>
  );
}

function ErrorBreakdownList({ items, totalErrors }: { items: ErrorBreakdown[]; totalErrors: number }) {
  const { formatNumber: formatLocaleNumber, t } = useI18n();

  return (
    <section className="grid gap-2">
      <h3 className="text-base font-semibold text-ink">{t("Errors")}</h3>
      {items.length > 0 ? (
        <ul className="grid gap-2">
          {items.map((item) => {
            const percent = totalErrors === 0 ? 0 : Math.round((item.count / totalErrors) * 100);

            return (
              <li className="grid gap-2 border-b border-ink/15 bg-paper/70 px-3 py-3 text-sm last:border-b-0" key={item.errorType}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-semibold capitalize text-ink">{t(formatLabel(item.errorType))}</span>
                  <span className="font-semibold text-ink">{formatLocaleNumber(item.count)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white" aria-hidden="true">
                  <div className="h-full rounded-full bg-coral" style={{ width: `${percent}%` }} />
                </div>
                <p className="text-xs font-semibold text-ink/65">{t(errorTypeDescription(item.errorType))}</p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="border-y border-ink/15 bg-paper px-3 py-2 text-sm text-ink/70">{t("No missed-answer errors recorded.")}</p>
      )}
    </section>
  );
}

function formatErrorBreakdown(errorBreakdown: ErrorBreakdown[]): ErrorBreakdown[] {
  return errorBreakdown.filter((item) => item.errorType !== "none");
}

function summaryOutcomeLabel(accuracyPercent: number, incorrectCount: number): string {
  if (incorrectCount === 0) {
    return "Clean session with no items needing review.";
  }

  if (accuracyPercent >= 80) {
    return "Strong session with a few items to review.";
  }

  return "Review the missed questions before starting another drill.";
}

function errorSummaryLabel(errorCount: number): string {
  return errorCount === 0 ? "No errors recorded" : "{count} need review";
}

function questionReviewStatus(result: SessionSummarySnapshot["questionResults"][number]): {
  description: string;
  label: string;
  tone: "review" | "success";
} {
  if (result.isCorrect) {
    return {
      description: "Answer saved as correct.",
      label: "Correct",
      tone: "success"
    };
  }

  if (result.errorTypes.includes("timeout")) {
    return {
      description: "No answer was saved before the timer expired.",
      label: "Timed out",
      tone: "review"
    };
  }

  if (result.rawInput.trim() === "") {
    return {
      description: "No answer was submitted for this question.",
      label: "No answer",
      tone: "review"
    };
  }

  return {
      description: "Answer saved for review after the final attempt.",
    label: "Needs review",
    tone: "review"
  };
}

function errorTypeDescription(errorType: ErrorType): string {
  const descriptions: Record<ErrorType, string> = {
    arithmetic_error: "Calculation mistake",
    formula_error: "Formula setup needs review",
    interpretation_error: "Interpretation needs review",
    magnitude_error: "Order of magnitude issue",
    none: "No error",
    percentage_point_error: "Percentage point mix-up",
    rounding_error: "Rounding outside tolerance",
    setup_error: "Setup needs review",
    timeout: "Timer expired",
    unit_error: "Unit mismatch"
  };

  return descriptions[errorType];
}

function buildRepeatDrillHref(snapshot: SessionSummarySnapshot): string {
  const mode = snapshot.settings.interviewMathMode ? "&mode=interview" : "";

  return `/drills/session?${buildDrillSettingsQuery(snapshot.settings)}${mode}`;
}

function formatRawAnswer(rawInput: string, unit?: UnitType): string {
  if (rawInput.trim() === "") {
    return "nothing";
  }

  return `"${rawInput}"${unit === undefined || unit === "none" ? "" : ` ${formatUnit(unit)}`}`;
}

function formatAnswerWithUnit(value: number, unit?: UnitType): string {
  if (unit === undefined || unit === "none") {
    return formatNumber(value);
  }

  if (unit === "currency") {
    return `$${formatNumber(value)}`;
  }

  if (unit === "percentage") {
    return `${formatNumber(value * 100)}%`;
  }

  return `${formatNumber(value)} ${formatUnit(unit)}`;
}

function formatUnit(unit: UnitType): string {
  const labels: Partial<Record<UnitType, string>> = {
    b: "B",
    k: "K",
    m: "M",
    percentage: "%"
  };

  return labels[unit] ?? unit.replaceAll("_", " ");
}

function formatErrorTypes(errorTypes: ErrorType[]): string {
  const visibleErrors = errorTypes.filter((errorType) => errorType !== "none");

  return visibleErrors.length === 0 ? "none" : visibleErrors.map(formatLabel).join(", ");
}

function formatLabel(value: string): string {
  return value.replaceAll("_", " ");
}
