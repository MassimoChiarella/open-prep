"use client";

import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { BenchmarkHistoryView } from "@/features/benchmarks/BenchmarkHistoryView";
import { buildBenchmarkSessionHref } from "@/features/benchmarks/benchmarkSession";
import type { BenchmarkId, BenchmarkTest } from "@/features/benchmarks/benchmarkTypes";
import { useI18n } from "@/features/i18n/I18nProvider";
import { formatLabel } from "@/lib/format";

interface BenchmarkSelectionViewProps {
  benchmarks: readonly BenchmarkTest[];
  confirmBenchmarkId?: string;
  questionPackId?: string;
  selectedBenchmarkId?: string;
}

export function BenchmarkSelectionView({
  benchmarks,
  questionPackId,
  selectedBenchmarkId
}: BenchmarkSelectionViewProps) {
  const { t } = useI18n();
  const selectedBenchmark =
    benchmarks.find((benchmark) => benchmark.id === selectedBenchmarkId) ?? benchmarks[0];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        description={t("Compare difficulty, time, pace, and focus, then begin one locked run.")}
        eyebrow={t("Benchmark Tests")}
        title={t("Benchmark your performance")}
      />

      <section aria-labelledby="benchmark-options-heading" className="grid gap-4">
        <div className="grid max-w-2xl gap-2 border-b border-ink/15 pb-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="font-mono text-xs font-semibold text-ink/45">02</span>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-coral">{t("Benchmark Tests")}</p>
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.025em] text-ink" id="benchmark-options-heading">
            {t("Choose a benchmark")}
          </h2>
          <p className="mt-1 text-sm text-ink/65">
            {t("Each option uses fixed settings so results remain comparable over time.")}
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          {benchmarks.map((benchmark) => (
            <BenchmarkOptionCard
              benchmark={benchmark}
              isSelected={benchmark.id === selectedBenchmark?.id}
              key={benchmark.id}
              questionPackId={questionPackId}
            />
          ))}
        </div>
      </section>

      {selectedBenchmark === undefined ? null : (
        <BenchmarkConfirmation benchmark={selectedBenchmark} questionPackId={questionPackId} />
      )}

      <details className="group" data-testid="benchmark-history-disclosure">
        <summary className="cursor-pointer border-y border-ink/20 bg-transparent p-4 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 sm:p-5">
          <span className="flex items-start justify-between gap-4">
            <span>
              <span className="block text-base font-semibold text-ink">{t("Saved benchmark history")}</span>
              <span className="mt-1 block text-sm text-ink/65">{t("Open local results, trends, and score labels.")}</span>
            </span>
            <span aria-hidden="true" className="text-xl font-semibold text-teal transition-transform motion-reduce:transition-none group-open:rotate-45">+</span>
          </span>
        </summary>
        <div className="mt-4">
          <BenchmarkHistoryView benchmarks={benchmarks} />
        </div>
      </details>
    </main>
  );
}

function BenchmarkOptionCard({
  benchmark,
  isSelected,
  questionPackId
}: {
  benchmark: BenchmarkTest;
  isSelected: boolean;
  questionPackId?: string;
}) {
  const { formatDuration, formatNumber, t } = useI18n();
  const primaryCategory = getPrimaryCategory(benchmark);

  return (
    <article
      className={[
        "flex h-full min-w-0 flex-col border border-t-2 bg-white p-5 transition-colors",
        isSelected ? "border-teal border-t-teal" : "border-ink/15 border-t-ink/25 hover:border-ink/30"
      ].join(" ")}
      data-testid={`benchmark-card-${benchmark.id}`}
    >
      <h2 className="min-w-0 text-xl font-semibold text-ink [overflow-wrap:anywhere]">{t(benchmark.title)}</h2>
      <p className="mt-2 min-w-0 text-sm leading-6 text-ink/65 [overflow-wrap:anywhere] xl:min-h-[4.5rem]">{t(benchmark.description)}</p>

      <dl className="mb-5 mt-5 grid grid-cols-1 gap-3 text-sm min-[360px]:grid-cols-2">
        <BenchmarkStat label={t("Difficulty")} value={t(formatLabel(benchmark.difficulty))} />
        <BenchmarkStat label={t("Time")} value={formatDuration(benchmark.settings.totalSessionSeconds ?? 0)} />
        <BenchmarkStat
          label={t("Pace")}
          value={t("{seconds} sec/question", { seconds: formatNumber(getBenchmarkPace(benchmark)) })}
        />
        <BenchmarkStat label={t("Focus")} value={t(formatLabel(primaryCategory))} />
      </dl>

      <Link
        aria-current={isSelected ? "true" : undefined}
        aria-label={
          isSelected
            ? t("{title} selected", { title: t(benchmark.title) })
            : t("Select {title}", { title: t(benchmark.title) })
        }
        className={[
          "mt-auto inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2",
          isSelected ? "bg-ink text-white" : "border border-ink/30 text-ink hover:border-ink hover:bg-paper"
        ].join(" ")}
        href={buildBenchmarkSelectionHref(benchmark.id, questionPackId)}
      >
        {isSelected ? t("Selected") : t("Select")}
      </Link>
    </article>
  );
}

function BenchmarkStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-s-2 border-ink/15 bg-paper px-2 py-2">
      <dt className="min-w-0 text-xs font-semibold uppercase tracking-wide text-ink/65 [overflow-wrap:anywhere]">{label}</dt>
      <dd className="mt-1 min-w-0 text-[13px] font-semibold leading-5 text-ink [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

function BenchmarkConfirmation({
  benchmark,
  questionPackId
}: {
  benchmark: BenchmarkTest;
  questionPackId?: string;
}) {
  const { formatDuration, formatNumber, t } = useI18n();

  return (
    <section
      aria-labelledby="benchmark-confirmation-heading"
      className="border-y border-teal/40 bg-mint/40 py-5 sm:flex sm:items-center sm:justify-between sm:gap-6"
      data-testid="benchmark-confirmation"
      id="benchmark-confirmation"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal">{t("Selected benchmark")}</p>
        <h2 className="mt-1 text-xl font-semibold text-ink" id="benchmark-confirmation-heading">
          {t("Ready to begin?")}
        </h2>
        <p className="mt-2 min-w-0 max-w-3xl text-sm leading-6 text-ink/65 [overflow-wrap:anywhere]">
          {t("{title} is a locked {duration} run with {count} questions. Hints stay off and feedback appears after the final question.", {
            count: formatNumber(benchmark.questions.length),
            duration: formatDuration(benchmark.settings.totalSessionSeconds ?? 0),
            title: t(benchmark.title)
          })}
        </p>
      </div>

      <Link
        className="mt-4 inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 sm:mt-0"
        href={buildBenchmarkSessionHref(benchmark.id, questionPackId)}
      >
        {t("Begin Benchmark")}
      </Link>
    </section>
  );
}

export function buildBenchmarkSelectionHref(benchmarkId: BenchmarkId, questionPackId?: string): string {
  const params = new URLSearchParams({ benchmark: benchmarkId });
  if (questionPackId?.trim()) params.set("pack", questionPackId);
  return `/benchmark?${params.toString()}`;
}

function getBenchmarkPace(benchmark: BenchmarkTest): number {
  const seconds = benchmark.settings.totalSessionSeconds ?? 0;
  return benchmark.questions.length === 0 ? 0 : Math.round(seconds / benchmark.questions.length);
}

function getPrimaryCategory(benchmark: BenchmarkTest): string {
  const counts = new Map<string, number>();
  for (const question of benchmark.questions) {
    counts.set(question.category, (counts.get(question.category) ?? 0) + 1);
  }
  return [...counts].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? "mixed";
}
