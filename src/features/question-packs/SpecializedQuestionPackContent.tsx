"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LoadingState } from "@/components/LoadingState";
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
  toQuestionPackBenchmarkTests,
  toQuestionPackExhibitDatasets,
  toQuestionPackMarketSizingTemplates
} from "@/features/question-packs/questionPack";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { AppStorage, QuestionPackRecord } from "@/lib/storage/appStorageTypes";

export type InstalledPackKind = "benchmark" | "case_practice" | "exhibit" | "market_sizing";
type PackForKind<TKind extends InstalledPackKind> = Extract<QuestionPackRecord, { kind: TKind }>;
export type PackLoadState<TKind extends InstalledPackKind> =
  | { status: "built_in" }
  | { message: string; status: "error" }
  | { status: "loading" }
  | { pack: PackForKind<TKind>; status: "ready" };

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

  const datasets = state.status === "ready" ? toQuestionPackExhibitDatasets(state.pack) : builtInDatasets;
  const customTitle = state.status === "ready" ? state.pack.title : undefined;
  const sprintHref = state.status === "ready"
    ? `/exhibits/sprint?pack=${encodeURIComponent(state.pack.id)}`
    : "/exhibits/sprint";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: sprintHref, label: t("Start Exhibit Sprint") }}
        description={
          customTitle === undefined
            ? t("Read built-in consulting-style tables and charts, then answer the exhibit question.")
            : t("Practice the locally installed “{title}” exhibit pack.", { title: customTitle })
        }
        eyebrow={t(customTitle === undefined ? "Advanced Practice" : "Custom Content")}
        title={customTitle === undefined ? t("Exhibit Drills") : customTitle}
      />
      {state.status === "ready" ? (
        <Link className="w-fit text-sm font-semibold text-teal underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal" href="/settings">
          {t("Manage Content Packs")}
        </Link>
      ) : null}
      <ExhibitQuestionFlow datasets={datasets} />
    </main>
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

  const datasets = state.status === "ready" ? toQuestionPackExhibitDatasets(state.pack) : builtInDatasets;
  const backHref = state.status === "ready"
    ? `/exhibits?pack=${encodeURIComponent(state.pack.id)}`
    : "/exhibits";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: backHref, label: t("Practice Individual Exhibits") }}
        description={t("Complete three to five exhibit questions against a per-question countdown.")}
        eyebrow={t("Timed Practice")}
        title={t("Exhibit Sprint")}
      />
      <ExhibitSprint backHref={backHref} datasets={datasets} storageFactory={storageFactory} />
    </main>
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

  const templates = state.status === "ready" ? toQuestionPackMarketSizingTemplates(state.pack) : builtInTemplates;
  return <MarketSizingGuidedForm templates={templates} />;
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

  const benchmarks = state.status === "ready" ? toQuestionPackBenchmarkTests(state.pack) : builtInBenchmarks;
  return (
    <BenchmarkSelectionView
      benchmarks={benchmarks}
      confirmBenchmarkId={confirmBenchmarkId}
      questionPackId={state.status === "ready" ? state.pack.id : undefined}
      selectedBenchmarkId={selectedBenchmarkId}
    />
  );
}

export function QuestionPackBenchmarkSession({
  benchmarkId,
  builtInBenchmarks,
  packId,
  storageFactory = createIndexedDbAppStorage
}: LocalPackProps & { benchmarkId?: string; builtInBenchmarks: readonly BenchmarkTest[] }) {
  const { formatDuration: formatLocaleDuration, formatNumber, t } = useI18n();
  const state = useInstalledPack(packId, "benchmark", storageFactory);

  if (state.status === "loading" || state.status === "error") {
    return <SpecializedPackState kindLabel="benchmark" packId={packId} state={state} />;
  }

  const benchmarks = state.status === "ready" ? toQuestionPackBenchmarkTests(state.pack) : builtInBenchmarks;
  const benchmark = findBenchmarkTest(benchmarks, benchmarkId);
  const backHref = state.status === "ready" ? `/benchmark?pack=${encodeURIComponent(state.pack.id)}` : "/benchmark";

  if (benchmark === undefined) {
    return (
      <BenchmarkSessionError
        backHref={backHref}
        message={
          benchmarkId === undefined
            ? t("Choose a benchmark before starting a locked session.")
            : t("Benchmark “{id}” is not available.", { id: benchmarkId })
        }
      />
    );
  }

  const created = createBenchmarkSessionResult(benchmark);
  if (created.status === "error") {
    return (
      <BenchmarkSessionError
        backHref={backHref}
        message={created.message}
      />
    );
  }

  return (
    <ActiveDrillSession
      benchmarkId={benchmark.id}
      initialSession={created.session}
      lockedModeSummary={[
        {
          label: t("Timer"),
          value: t("{duration} session clock", { duration: formatLocaleDuration(benchmark.settings.totalSessionSeconds ?? 0) })
        },
        { label: t("Feedback"), value: t("After final question") }
      ]}
      queueTitle={t("Fixed Benchmark Questions")}
      questions={created.questions}
      sessionEyebrow={t(state.status === "ready" ? "Custom Benchmark" : "Benchmark")}
      sessionTimerDescription={t("Benchmark clock: {duration} for {count} questions. It keeps running until the test ends.", {
        count: formatNumber(benchmark.settings.questionCount),
        duration: formatLocaleDuration(benchmark.settings.totalSessionSeconds ?? 0)
      })}
      sessionTitle={benchmark.title}
      warnings={[t("Benchmark mode is locked: timed session with end-of-session feedback.")]}
    />
  );
}

function createBenchmarkSessionResult(benchmark: BenchmarkTest) {
  try {
    return { status: "ready" as const, ...createBenchmarkSession(benchmark) };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Unable to create a benchmark session."
    };
  }
}

export function useInstalledPack<TKind extends InstalledPackKind>(
  packId: string | undefined,
  kind: TKind,
  storageFactory: () => AppStorage
): PackLoadState<TKind> {
  const [state, setState] = useState<PackLoadState<TKind>>(
    packId === undefined ? { status: "built_in" } : { status: "loading" }
  );

  useEffect(() => {
    let cancelled = false;
    let storage: AppStorage | undefined;

    if (packId === undefined || packId.trim() === "") {
      void Promise.resolve().then(() => {
        if (!cancelled) setState({ status: "built_in" });
      });
      return () => {
        cancelled = true;
      };
    }

    void Promise.resolve().then(() => {
      if (!cancelled) setState({ status: "loading" });
    });

    try {
      storage = storageFactory();
      void storage
        .get("question_packs", packId)
        .then((pack) => {
          if (pack === undefined) throw new Error("This content pack is not installed on this device.");
          if (
            pack.kind !== kind ||
            (pack.schemaVersion !== 2 && !(kind === "case_practice" && pack.schemaVersion === 3))
          ) {
            throw new Error(`This pack does not contain ${kind.replace("_", "-")} content.`);
          }
          if (!cancelled) setState({ pack: pack as PackForKind<TKind>, status: "ready" });
        })
        .catch((error) => {
          if (!cancelled) {
            setState({
              message: error instanceof Error ? error.message : "Unable to load this content pack.",
              status: "error"
            });
          }
        })
        .finally(() => storage?.close());
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) setState({ message: "Installed content packs are unavailable.", status: "error" });
      });
    }

    return () => {
      cancelled = true;
      storage?.close();
    };
  }, [kind, packId, storageFactory]);

  return state;
}

export function SpecializedPackState({
  kindLabel,
  packId,
  state
}: {
  kindLabel: string;
  packId?: string;
  state: { message: string; status: "error" } | { status: "loading" };
}) {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: "/settings", label: t("Manage Content Packs") }}
        description={t("Load a locally installed {kind} pack.", { kind: t(kindLabel) })}
        eyebrow={t("Custom Content")}
        title={t("Content Pack")}
      />
      {state.status === "loading" ? (
        <LoadingState detail={packId} label={t("Loading {kind} pack...", { kind: t(kindLabel) })} />
      ) : (
        <p className="border border-coral/30 border-s-2 border-s-coral bg-coral/10 p-4 text-sm leading-6 text-ink" role="alert">
          {t(state.message)}
        </p>
      )}
    </main>
  );
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
