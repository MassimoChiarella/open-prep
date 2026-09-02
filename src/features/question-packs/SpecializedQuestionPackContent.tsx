"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { ActiveDrillSession } from "@/features/drills/ActiveDrillSession";
import { BenchmarkSelectionView } from "@/features/benchmarks/BenchmarkSelectionView";
import { createBenchmarkSession, findBenchmarkTest } from "@/features/benchmarks/benchmarkSession";
import type { BenchmarkTest } from "@/features/benchmarks/benchmarkTypes";
import { ExhibitQuestionFlow } from "@/features/exhibits/ExhibitQuestionFlow";
import { ExhibitSprint } from "@/features/exhibits/ExhibitSprint";
import type { ExhibitDataset } from "@/features/exhibits/exhibitTypes";
import { MarketSizingGuidedForm } from "@/features/market-sizing/MarketSizingGuidedForm";
import type { MarketSizingTemplate } from "@/features/market-sizing/marketSizingTypes";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  getEffectiveDurationSeconds,
  type TimingAccommodation
} from "@/features/timing/timingAccommodation";
import {
  toQuestionPackBenchmarkTests,
  toQuestionPackExhibitDatasets,
  toQuestionPackMarketSizingTemplates
} from "@/features/question-packs/questionPack";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import {
  QuestionPackContentBoundary,
  SpecializedPackState,
  useInstalledPack,
  type InstalledPackKind,
  type PackForKind,
  type PackLoadState
} from "@/features/question-packs/InstalledPackContent";

interface LocalPackProps {
  packId?: string;
  storageFactory?: () => AppStorage;
}

export function QuestionPackExhibitContent({
  builtInDatasets,
  packId,
  storageFactory = createIndexedDbAppStorage
}: LocalPackProps & { builtInDatasets: readonly ExhibitDataset[] }) {
  const { t } = useI18n();
  const state = useInstalledPack(packId, "exhibit", storageFactory);

  if (state.status === "loading" || state.status === "error") {
    return <SpecializedPackState kindLabel="exhibit" packId={packId} state={state} />;
  }

  const datasets = [
    ...(state.includeBuiltIns ? builtInDatasets : []),
    ...state.packs.flatMap(toQuestionPackExhibitDatasets)
  ];
  const singleSourcePack = getSingleSourcePack(state);
  const customTitle = singleSourcePack?.title;
  const hasSelectedPacks = state.packs.length > 0;
  const sprintHref = state.source === "direct" && singleSourcePack !== undefined
    ? `/exhibits/sprint?pack=${encodeURIComponent(singleSourcePack.id)}`
    : "/exhibits/sprint";

  return (
    <QuestionPackContentBoundary pack={singleSourcePack}>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          action={{ href: sprintHref, label: t("Start Exhibit Sprint") }}
          description={
            customTitle !== undefined
              ? t("Practice the locally installed “{title}” exhibit pack.", { title: customTitle })
              : state.includeBuiltIns && hasSelectedPacks
                ? t("Practice built-in and selected locally installed exhibit packs together.")
                : hasSelectedPacks
                  ? t("Practice only the selected locally installed exhibit packs.")
                  : t("Read built-in consulting-style tables and charts, then answer the exhibit question.")
          }
          eyebrow={t(hasSelectedPacks ? "Custom Content" : "Advanced Practice")}
          title={customTitle === undefined ? t("Exhibit Drills") : customTitle}
        />
        {state.packs.length > 0 ? (
          <Link className="w-fit text-sm font-semibold text-teal underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal" href="/content-packs/?view=installed">
            {t("Manage Content Packs")}
          </Link>
        ) : null}
        <ExhibitQuestionFlow datasets={datasets} />
      </main>
    </QuestionPackContentBoundary>
  );
}

export function QuestionPackExhibitSprintContent({
  builtInDatasets,
  packId,
  storageFactory = createIndexedDbAppStorage
}: LocalPackProps & { builtInDatasets: readonly ExhibitDataset[] }) {
  const { t } = useI18n();
  const state = useInstalledPack(packId, "exhibit", storageFactory);

  if (state.status === "loading" || state.status === "error") {
    return <SpecializedPackState kindLabel="exhibit" packId={packId} state={state} />;
  }

  const datasets = [
    ...(state.includeBuiltIns ? builtInDatasets : []),
    ...state.packs.flatMap(toQuestionPackExhibitDatasets)
  ];
  const singleSourcePack = getSingleSourcePack(state);
  const backHref = state.source === "direct" && singleSourcePack !== undefined
    ? `/exhibits?pack=${encodeURIComponent(singleSourcePack.id)}`
    : "/exhibits";

  return (
    <QuestionPackContentBoundary pack={singleSourcePack}>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          action={{ href: backHref, label: t("Practice Individual Exhibits") }}
          description={t("Complete three to five exhibit questions with a timing choice for each sprint.")}
          eyebrow={t("Timed Practice")}
          title={t("Exhibit Sprint")}
        />
        <ExhibitSprint backHref={backHref} datasets={datasets} storageFactory={storageFactory} />
      </main>
    </QuestionPackContentBoundary>
  );
}

export function QuestionPackMarketSizingContent({
  builtInTemplates,
  packId,
  storageFactory = createIndexedDbAppStorage
}: LocalPackProps & { builtInTemplates: readonly MarketSizingTemplate[] }) {
  const state = useInstalledPack(packId, "market_sizing", storageFactory);

  if (state.status === "loading" || state.status === "error") {
    return <SpecializedPackState kindLabel="market-sizing" packId={packId} state={state} />;
  }

  const templates = [
    ...(state.includeBuiltIns ? builtInTemplates : []),
    ...state.packs.flatMap(toQuestionPackMarketSizingTemplates)
  ];
  return (
    <QuestionPackContentBoundary pack={getSingleSourcePack(state)}>
      <MarketSizingGuidedForm templates={templates} />
    </QuestionPackContentBoundary>
  );
}

export function QuestionPackBenchmarkSelection({
  builtInBenchmarks,
  confirmBenchmarkId,
  packId,
  selectedBenchmarkId,
  storageFactory = createIndexedDbAppStorage
}: LocalPackProps & {
  builtInBenchmarks: readonly BenchmarkTest[];
  confirmBenchmarkId?: string;
  selectedBenchmarkId?: string;
}) {
  const state = useInstalledPack(packId, "benchmark", storageFactory);

  if (state.status === "loading" || state.status === "error") {
    return <SpecializedPackState kindLabel="benchmark" packId={packId} state={state} />;
  }

  const benchmarks = [
    ...(state.includeBuiltIns ? builtInBenchmarks : []),
    ...state.packs.flatMap(toQuestionPackBenchmarkTests)
  ];
  const directPack = state.source === "direct" ? state.packs[0] : undefined;
  return (
    <QuestionPackContentBoundary pack={getSingleSourcePack(state)}>
      <BenchmarkSelectionView
        benchmarks={benchmarks}
        confirmBenchmarkId={confirmBenchmarkId}
        questionPackId={directPack?.id}
        selectedBenchmarkId={selectedBenchmarkId}
      />
    </QuestionPackContentBoundary>
  );
}

export function QuestionPackBenchmarkSession({
  benchmarkId,
  builtInBenchmarks,
  packId,
  storageFactory = createIndexedDbAppStorage,
  timingAccommodation = "standard"
}: LocalPackProps & {
  benchmarkId?: string;
  builtInBenchmarks: readonly BenchmarkTest[];
  timingAccommodation?: TimingAccommodation;
}) {
  const { formatDuration: formatLocaleDuration, formatNumber, t } = useI18n();
  const state = useInstalledPack(packId, "benchmark", storageFactory);

  if (state.status === "loading" || state.status === "error") {
    return <SpecializedPackState kindLabel="benchmark" packId={packId} state={state} />;
  }

  const benchmarks = [
    ...(state.includeBuiltIns ? builtInBenchmarks : []),
    ...state.packs.flatMap(toQuestionPackBenchmarkTests)
  ];
  const benchmark = findBenchmarkTest(benchmarks, benchmarkId);
  const directPack = state.source === "direct" ? state.packs[0] : undefined;
  const backHref = directPack === undefined ? "/benchmark" : `/benchmark?pack=${encodeURIComponent(directPack.id)}`;
  const boundaryPack = getSingleSourcePack(state);

  if (benchmark === undefined) {
    return (
      <QuestionPackContentBoundary pack={boundaryPack}>
        <BenchmarkSessionError
          backHref={backHref}
          message={
            benchmarkId === undefined
              ? t("Choose a benchmark before starting a locked session.")
              : t("Benchmark “{id}” is not available.", { id: benchmarkId })
          }
        />
      </QuestionPackContentBoundary>
    );
  }

  const created = createBenchmarkSessionResult(benchmark, timingAccommodation);
  if (created.status === "error") {
    return (
      <QuestionPackContentBoundary pack={boundaryPack}>
        <BenchmarkSessionError
          backHref={backHref}
          message={created.message}
        />
      </QuestionPackContentBoundary>
    );
  }

  const standardDurationSeconds = benchmark.settings.totalSessionSeconds ?? 0;
  const effectiveDurationSeconds = getEffectiveDurationSeconds(
    standardDurationSeconds,
    created.session.settings.timingAccommodation
  );
  const timingLabel = t(timingAccommodationLabels[timingAccommodation]);
  const activeLimit = effectiveDurationSeconds === null
    ? t("No automatic expiry")
    : formatLocaleDuration(effectiveDurationSeconds);
  const accommodatedWarning = timingAccommodation === "standard"
    ? []
    : [t("This accommodated practice result is saved but excluded from Standard comparisons and personal bests.")];

  return (
    <QuestionPackContentBoundary pack={boundaryPack}>
      <ActiveDrillSession
        benchmarkId={benchmark.id}
        initialSession={created.session}
        lockedModeSummary={[
          {
            label: t("Standard limit"),
            value: formatLocaleDuration(standardDurationSeconds)
          },
          {
            label: t("Active timing"),
            value: t("{timing}: {duration}", { duration: activeLimit, timing: timingLabel })
          },
          { label: t("Feedback"), value: t("After final question") }
        ]}
        queueTitle={t("Fixed Benchmark Questions")}
        questions={created.questions}
        sessionEyebrow={t(benchmark.settings.questionPackId === undefined ? "Benchmark" : "Custom Benchmark")}
        sessionTimerDescription={effectiveDurationSeconds === null
          ? t("Standard benchmark limit: {standard} for {count} questions. Untimed practice does not expire automatically.", {
              count: formatNumber(benchmark.settings.questionCount),
              standard: formatLocaleDuration(standardDurationSeconds)
            })
          : t("Standard benchmark limit: {standard}. Active limit: {active} for {count} questions.", {
              active: formatLocaleDuration(effectiveDurationSeconds),
              count: formatNumber(benchmark.settings.questionCount),
              standard: formatLocaleDuration(standardDurationSeconds)
            })}
        sessionTitle={benchmark.title}
        warnings={[
          t("Benchmark mode is locked with end-of-session feedback."),
          ...accommodatedWarning
        ]}
      />
    </QuestionPackContentBoundary>
  );
}

const timingAccommodationLabels: Record<TimingAccommodation, string> = {
  double_time: "Double time",
  standard: "Standard time",
  time_and_a_half: "Time and a half",
  untimed: "Untimed practice"
};

function createBenchmarkSessionResult(
  benchmark: BenchmarkTest,
  timingAccommodation: TimingAccommodation
) {
  try {
    return {
      status: "ready" as const,
      ...createBenchmarkSession(benchmark, { timingAccommodation })
    };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Unable to create a benchmark session."
    };
  }
}

function getSingleSourcePack<TKind extends InstalledPackKind>(
  state: Extract<PackLoadState<TKind>, { status: "ready" }>
): PackForKind<TKind> | undefined {
  return !state.includeBuiltIns && state.packs.length === 1 ? state.packs[0] : undefined;
}

function BenchmarkSessionError({ backHref, message }: { backHref: string; message: string }) {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: backHref, label: t("Back to Benchmarks") }}
        description={t("Start a locked benchmark after choosing a fixed local test.")}
        eyebrow={t("Benchmark")}
        title={t("Benchmark Session")}
      />
      <p className="border border-coral/30 border-s-2 border-s-coral bg-coral/10 p-4 text-sm leading-6 text-ink">{t(message)}</p>
      <Link
        className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-teal motion-reduce:transform-none active:scale-[0.98]"
        href={backHref}
      >
        {t("Choose Benchmark")}
      </Link>
    </main>
  );
}
