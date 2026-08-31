"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { getBenchmarkScoreBand } from "@/features/benchmarks/benchmarkScoring";
import {
  loadBenchmarkHistorySnapshot,
  loadBenchmarkResultPage,
  type BenchmarkHistoryAggregate,
  type BenchmarkHistorySnapshot
} from "@/features/benchmarks/benchmarkPersistence";
import type { BenchmarkTest } from "@/features/benchmarks/benchmarkTypes";
import { useI18n } from "@/features/i18n/I18nProvider";
import { formatLabel } from "@/lib/format";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { AppStorage, BenchmarkResultRecord } from "@/lib/storage/appStorageTypes";

interface BenchmarkHistoryViewProps {
  benchmarks: readonly BenchmarkTest[];
  storageFactory?: () => AppStorage;
}

type HistoryState =
  | { status: "error" }
  | (BenchmarkHistorySnapshot & { loadingMore: boolean; pageError: boolean; status: "loaded" })
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

      void loadBenchmarkHistorySnapshot(storage)
        .then((snapshot) => {
          if (!cancelled) {
            setState({ ...snapshot, loadingMore: false, pageError: false, status: "loaded" });
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

  async function handleLoadMore(): Promise<void> {
    if (state.status !== "loaded" || state.continuationKey === undefined || state.loadingMore) {
      return;
    }

    const afterKey = state.continuationKey;
    setState({ ...state, loadingMore: true, pageError: false });

    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      const page = await loadBenchmarkResultPage(storage, afterKey);

      setState((current) => current.status !== "loaded"
        ? current
        : {
            ...current,
            ...(page.continuationKey === undefined
              ? { continuationKey: undefined }
              : { continuationKey: page.continuationKey }),
            loadingMore: false,
            pageError: false,
            results: [...current.results, ...page.results]
          });
    } catch {
      setState((current) => current.status === "loaded"
        ? { ...current, loadingMore: false, pageError: true }
        : current);
    } finally {
      storage?.close();
    }
  }

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
            {t("{count} saved", { count: formatNumber(state.totalCount) })}
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
        <HistoryTable
          aggregates={state.aggregates}
          benchmarkById={benchmarkById}
          hasMore={state.continuationKey !== undefined}
          loadingMore={state.loadingMore}
          onLoadMore={() => void handleLoadMore()}
          pageError={state.pageError}
          results={state.results}
          totalCount={state.totalCount}
        />
      ) : null}
    </section>
  );
}

function HistoryTable({
  aggregates,
  benchmarkById,
  hasMore,
  loadingMore,
  onLoadMore,
  pageError,
  results,
  totalCount
}: {
  aggregates: readonly BenchmarkHistoryAggregate[];
  benchmarkById: Map<string, BenchmarkTest>;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  pageError: boolean;
  results: readonly BenchmarkResultRecord[];
  totalCount: number;
}) {
  const { formatDate, formatNumber, formatPercent, t } = useI18n();
  const latest = results[0];
  const latestBenchmark = benchmarkById.get(latest.benchmarkId);
  const latestBand = latestBenchmark === undefined
    ? undefined
    : getBenchmarkScoreBand(latest.score.accuracy, latestBenchmark.scoreBands);
  const summaries = createBenchmarkSummaries(aggregates, benchmarkById);
  const latestSummary = summaries.find((summary) => summary.benchmarkId === latest.benchmarkId);
  const bestOverall = aggregates.reduce<BenchmarkResultRecord | undefined>(
    (best, summary) => best === undefined || summary.best.score.accuracy > best.score.accuracy
      ? summary.best
      : best,
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
          ) : isNewBenchmarkBest(latest, latestSummary) ? (
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
          <HistoryStat label={t("Attempts")} value={t("{count} saved", { count: formatNumber(totalCount) })} />
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
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="min-w-0 text-sm font-semibold text-ink [overflow-wrap:anywhere]">{t(summary.title)}</h4>
                  {summary.latest.score.correctCount === 0 ? (
                    <span className="bg-paper px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink/70">
                      {t("Baseline recorded")}
                    </span>
                  ) : isNewBenchmarkBest(summary.latest, summary) ? (
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
        id="benchmark-history-results"
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
      {pageError ? (
        <p className="text-sm font-medium text-coral" role="alert">
          {t("Benchmark history could not load.")}
        </p>
      ) : null}
      {hasMore ? (
        <button
          aria-controls="benchmark-history-results"
          aria-label={`${t("More")}: ${t("Saved benchmark results")}`}
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-md border border-ink/30 px-5 text-sm font-semibold text-ink transition hover:border-teal hover:bg-paper"
          disabled={loadingMore}
          onClick={onLoadMore}
          type="button"
        >
          {t(loadingMore ? "Loading..." : "More")}
        </button>
      ) : null}
    </div>
  );
}

function isNewBenchmarkBest(
  result: BenchmarkResultRecord,
  summary: BenchmarkHistorySummary | undefined
): boolean {
  return summary?.bestScore.id === result.id;
}

interface BenchmarkHistorySummary {
  attempts: number;
  benchmarkId: string;
  best: BenchmarkResultRecord;
  bestScore: BenchmarkResultRecord;
  latest: BenchmarkResultRecord;
  previous?: BenchmarkResultRecord;
  title: string;
}

function createBenchmarkSummaries(
  aggregates: readonly BenchmarkHistoryAggregate[],
  benchmarkById: Map<string, BenchmarkTest>
): BenchmarkHistorySummary[] {
  return aggregates
    .map((summary) => ({
      ...summary,
      title: benchmarkById.get(summary.benchmarkId)?.title ?? fallbackBenchmarkTitle(summary.benchmarkId)
    }));
}

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-s-2 border-ink/15 bg-paper px-3 py-2 [overflow-wrap:anywhere]">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}

function HistoryInlineStat({ label, value }: { label: string; value: string }) {
  return (
    <dl className="min-w-0 border-s-2 border-ink/15 bg-paper px-3 py-2 [overflow-wrap:anywhere]">
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
