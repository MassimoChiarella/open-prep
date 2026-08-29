"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { getBenchmarkScoreBand } from "@/features/benchmarks/benchmarkScoring";
import { loadBenchmarkResults } from "@/features/benchmarks/benchmarkPersistence";
import type { BenchmarkTest } from "@/features/benchmarks/benchmarkTypes";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  createPersonalBestRecords,
  findSourcePersonalBests,
  type PersonalBestRecord
} from "@/features/progress/personalBests";
import { formatLabel } from "@/lib/format";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { AppStorage, BenchmarkResultRecord } from "@/lib/storage/appStorageTypes";

interface BenchmarkHistoryViewProps {
  benchmarks: readonly BenchmarkTest[];
  storageFactory?: () => AppStorage;
}

type HistoryState =
  | { status: "error" }
  | { results: BenchmarkResultRecord[]; status: "loaded" }
  | { status: "loading" };

export function BenchmarkHistoryView({
  benchmarks,
  storageFactory = createIndexedDbAppStorage
}: BenchmarkHistoryViewProps) {
  const { formatNumber, t } = useI18n();
  const [state, setState] = useState<HistoryState>({ status: "loading" });
  const benchmarkById = useMemo(() => new Map(benchmarks.map((benchmark) => [benchmark.id, benchmark])), [
    benchmarks
  ]);

  useEffect(() => {
    let cancelled = false;

    try {
      const storage = storageFactory();

      void loadBenchmarkResults(storage)
        .then((results) => {
          if (!cancelled) {
            setState({ results, status: "loaded" });
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
  }, [storageFactory]);

  return (
    <section
      aria-labelledby="benchmark-history-heading"
      className="grid gap-5 border border-ink/15 border-t-2 border-t-coral bg-white p-4 sm:p-6"
      data-testid="benchmark-history"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-coral">{t("Local Results")}</p>
          <h2 className="text-2xl font-semibold text-ink" id="benchmark-history-heading">
            {t("Benchmark History")}
          </h2>
        </div>
        {state.status === "loaded" && state.results.length > 0 ? (
          <span className="border border-teal/20 bg-mint px-3 py-2 text-sm font-semibold text-teal">
            {t("{count} saved", { count: formatNumber(state.results.length) })}
          </span>
        ) : null}
      </div>

      {state.status === "loading" ? (
        <LoadingState
          detail={t("Reading saved benchmark attempts on this device.")}
          label={t("Loading benchmark history...")}
          testId="benchmark-history-loading"
        />
      ) : null}
      {state.status === "error" ? (
        <EmptyState
          action={{ href: "/benchmark", label: t("Choose Benchmark") }}
          description={t("We could not read saved benchmark results on this device. You can still choose a benchmark and save a new result.")}
          title={t("Benchmark history could not load.")}
          tone="error"
        />
      ) : null}
      {state.status === "loaded" && state.results.length === 0 ? (
        <EmptyState
          action={{ href: "/benchmark", label: t("Choose Benchmark") }}
          description={t("Complete one fixed benchmark to start comparing score, accuracy, and result labels.")}
          title={t("No benchmark history yet.")}
        />
      ) : null}
      {state.status === "loaded" && state.results.length > 0 ? (
        <HistoryTable benchmarkById={benchmarkById} results={state.results} />
      ) : null}
    </section>
  );
}

function HistoryTable({
  benchmarkById,
  results
}: {
  benchmarkById: Map<string, BenchmarkTest>;
  results: readonly BenchmarkResultRecord[];
}) {
  const { formatDate, formatNumber, formatPercent, t } = useI18n();
  const latest = results[0];
  const latestBenchmark = benchmarkById.get(latest.benchmarkId);
  const latestBand = latestBenchmark === undefined
    ? undefined
    : getBenchmarkScoreBand(latest.score.accuracy, latestBenchmark.scoreBands);
  const summaries = createBenchmarkSummaries(results, benchmarkById);
  const personalBests = createPersonalBestRecords({ benchmarkResults: results, sessions: [] });
  const latestSummary = summaries.find((summary) => summary.benchmarkId === latest.benchmarkId);
  const bestOverall = summaries
    .flatMap((summary) => summary.results)
    .reduce<BenchmarkResultRecord | undefined>(
      (best, result) => (best === undefined || result.score.accuracy > best.score.accuracy ? result : best),
      undefined
    );
  const bestOverallBenchmark = bestOverall === undefined ? undefined : benchmarkById.get(bestOverall.benchmarkId);

  return (
    <div className="grid gap-4">
      <dl className="grid gap-3 sm:grid-cols-4">
        <HistoryStat label={t("Latest")} value={t(latestBenchmark?.title ?? fallbackBenchmarkTitle(latest.benchmarkId))} />
        <HistoryStat label={t("Score")} value={t("{score} pts", { score: formatNumber(latest.score.totalScore) })} />
        <HistoryStat label={t("Accuracy")} value={formatPercent(latest.score.accuracy)} />
        <HistoryStat label={t("Label")} value={t(latestBand?.title ?? "Recorded")} />
      </dl>

      <section className="grid gap-4 border-y border-ink/20 bg-paper/70 py-4" data-testid="benchmark-history-comparison">
        <div className="grid gap-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-coral">{t("Comparison Snapshot")}</p>
          <h3 className="text-lg font-semibold text-ink">{t("Latest result in context")}</h3>
          {latest.score.correctCount === 0 ? (
            <p className="w-fit bg-paper px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink/70">
              {t("Baseline recorded")}
            </p>
          ) : isNewBenchmarkBest(latest, personalBests) ? (
            <p className="w-fit border border-teal/20 bg-mint px-2 py-1 text-xs font-semibold uppercase tracking-wide text-teal">
              {t("New Best benchmark score")}
            </p>
          ) : null}
        </div>
        <dl className="grid gap-3 sm:grid-cols-4">
          <HistoryStat label={t("Latest Accuracy")} value={formatPercent(latest.score.accuracy)} />
          <HistoryStat
            label={t("Best Accuracy")}
            value={
              bestOverall === undefined
                ? t("No result")
                : `${formatPercent(bestOverall.score.accuracy)} ${t(bestOverallBenchmark?.title ?? fallbackBenchmarkTitle(bestOverall.benchmarkId))}`
            }
          />
          <HistoryStat
            label={t("Change")}
            value={formatAccuracyChange(latest, latestSummary?.previous, formatNumber, t)}
          />
          <HistoryStat label={t("Attempts")} value={t("{count} saved", { count: formatNumber(results.length) })} />
        </dl>
      </section>

      <section className="grid gap-3" data-testid="benchmark-history-by-benchmark">
        <div className="grid gap-1">
          <h3 className="text-lg font-semibold text-ink">{t("By Benchmark")}</h3>
          <p className="text-sm leading-6 text-ink/65">
            {t("Compare the latest and best saved result for each fixed benchmark.")}
          </p>
        </div>
        <div className="grid gap-2">
          {summaries.map((summary) => (
            <article
              className="grid gap-3 border-b border-ink/15 bg-white px-3 py-4 last:border-b-0 sm:grid-cols-[minmax(10rem,1fr)_5rem_5rem_minmax(8rem,1fr)] sm:items-center"
              data-testid={`benchmark-history-summary-${summary.benchmarkId}`}
              key={summary.benchmarkId}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-ink">{t(summary.title)}</h4>
                  {summary.latest.score.correctCount === 0 ? (
                    <span className="bg-paper px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink/70">
                      {t("Baseline recorded")}
                    </span>
                  ) : isNewBenchmarkBest(summary.latest, personalBests) ? (
                    <span className="border border-teal/20 bg-mint px-2 py-1 text-xs font-semibold uppercase tracking-wide text-teal">
                      {t("New Best")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink/65">
                  {t(summary.attempts === 1 ? "{count} attempt" : "{count} attempts", {
                    count: formatNumber(summary.attempts)
                  })}
                </p>
              </div>
              <HistoryInlineStat label={t("Latest")} value={formatPercent(summary.latest.score.accuracy)} />
              <HistoryInlineStat label={t("Best")} value={formatPercent(summary.best.score.accuracy)} />
              <HistoryInlineStat label={t("Change")} value={formatAccuracyChange(summary.latest, summary.previous, formatNumber, t)} />
            </article>
          ))}
        </div>
      </section>

      <div
        className="max-h-[30rem] overflow-auto overscroll-contain border border-ink/15"
        data-testid="benchmark-history-results-table"
      >
        <p className="px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-ink/65 sm:hidden">
          {t("Scroll table sideways to compare all columns.")}
        </p>
        <table className="min-w-[48rem] w-full border-separate border-spacing-y-2 text-start text-sm">
          <caption className="sr-only">{t("Saved benchmark results")}</caption>
          <thead className="text-xs font-semibold uppercase tracking-wide text-ink/65">
            <tr>
              <th className="sticky top-0 bg-white px-3 py-2" scope="col">{t("Benchmark")}</th>
              <th className="sticky top-0 bg-white px-3 py-2" scope="col">{t("Completed")}</th>
              <th className="sticky top-0 bg-white px-3 py-2" scope="col">{t("Accuracy")}</th>
               <th className="sticky top-0 bg-white px-3 py-2" scope="col">{t("Score")}</th>
               <th className="sticky top-0 bg-white px-3 py-2" scope="col">{t("Result")}</th>
               <th className="sticky top-0 bg-white px-3 py-2" scope="col">{t("Review")}</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => {
              const benchmark = benchmarkById.get(result.benchmarkId);
              const band = benchmark === undefined
                ? undefined
                : getBenchmarkScoreBand(result.score.accuracy, benchmark.scoreBands);

              return (
                <tr className="bg-paper text-ink/75" key={result.id}>
                  <th className="px-3 py-2 text-start font-semibold text-ink" scope="row">
                    {t(benchmark?.title ?? fallbackBenchmarkTitle(result.benchmarkId))}
                  </th>
                  <td className="px-3 py-2">{formatDate(result.completedAt, { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="px-3 py-2">{formatPercent(result.score.accuracy)}</td>
                  <td className="px-3 py-2">{t("{score} pts", { score: formatNumber(result.score.totalScore) })}</td>
                  <td className="px-3 py-2">{t(band?.title ?? "Recorded")}</td>
                  <td className="px-3 py-2">
                    <Link
                      className="inline-flex min-h-11 items-center font-semibold text-teal underline decoration-teal/40 underline-offset-4 hover:text-ink"
                      href={`/drills/summary?id=${encodeURIComponent(result.sessionId)}`}
                    >
                      {t("Review")}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function isNewBenchmarkBest(result: BenchmarkResultRecord, personalBests: readonly PersonalBestRecord[]): boolean {
  return findSourcePersonalBests(personalBests, result.id).some((best) => best.scope === "benchmark");
}

interface BenchmarkHistorySummary {
  attempts: number;
  benchmarkId: string;
  best: BenchmarkResultRecord;
  latest: BenchmarkResultRecord;
  previous?: BenchmarkResultRecord;
  results: BenchmarkResultRecord[];
  title: string;
}

function createBenchmarkSummaries(
  results: readonly BenchmarkResultRecord[],
  benchmarkById: Map<string, BenchmarkTest>
): BenchmarkHistorySummary[] {
  const groups = new Map<string, BenchmarkResultRecord[]>();

  for (const result of results) {
    groups.set(result.benchmarkId, [...(groups.get(result.benchmarkId) ?? []), result]);
  }

  return Array.from(groups.entries())
    .map(([benchmarkId, groupedResults]) => {
      const sortedResults = [...groupedResults].sort(
        (first, second) => Date.parse(second.completedAt) - Date.parse(first.completedAt)
      );
      const latest = sortedResults[0];
      const best = sortedResults.reduce((currentBest, result) =>
        result.score.accuracy > currentBest.score.accuracy ? result : currentBest
      );

      return {
        attempts: sortedResults.length,
        benchmarkId,
        best,
        latest,
        previous: sortedResults[1],
        results: sortedResults,
        title: benchmarkById.get(benchmarkId)?.title ?? fallbackBenchmarkTitle(benchmarkId)
      };
    })
    .sort((first, second) => Date.parse(second.latest.completedAt) - Date.parse(first.latest.completedAt));
}

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-s-2 border-ink/15 bg-paper px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}

function HistoryInlineStat({ label, value }: { label: string; value: string }) {
  return (
    <dl className="border-s-2 border-ink/15 bg-paper px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </dl>
  );
}

function formatAccuracyChange(
  latest: BenchmarkResultRecord,
  previous: BenchmarkResultRecord | undefined,
  formatNumber: ReturnType<typeof useI18n>["formatNumber"],
  t: ReturnType<typeof useI18n>["t"]
): string {
  if (previous === undefined) {
    return t("First saved run");
  }

  const percentagePointChange = Math.round((latest.score.accuracy - previous.score.accuracy) * 100);

  if (percentagePointChange === 0) {
    return t("No change");
  }

  return t("{points} pts vs previous", {
    points: `${percentagePointChange > 0 ? "+" : ""}${formatNumber(percentagePointChange)}`
  });
}

function fallbackBenchmarkTitle(benchmarkId: string): string {
  return formatLabel(benchmarkId.split(":").at(-1) ?? benchmarkId);
}
