"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { buildBenchmarkSelectionHref } from "@/features/benchmarks/benchmarkSession";
import {
  loadLatestStoredSessionSummarySnapshot,
  loadStoredSessionSummarySnapshotById
} from "@/features/drills/drillPersistence";
import { SessionSummaryView } from "@/features/drills/SessionSummaryView";
import type { SessionSummarySnapshot } from "@/features/drills/sessionSummary";
import { useI18n } from "@/features/i18n/I18nProvider";
import { createPersonalBestRecords, findSourcePersonalBests } from "@/features/progress/personalBests";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

type LoaderState =
  | { newBestLabels: string[]; repeatHref?: string; snapshot: SessionSummarySnapshot; status: "loaded" }
  | { status: "empty" }
  | { status: "error" }
  | { status: "loading" };

interface StoredSessionSummaryLoaderProps {
  sessionId?: string;
  storageFactory?: () => AppStorage;
}

export function StoredSessionSummaryLoader({
  sessionId,
  storageFactory = createIndexedDbAppStorage
}: StoredSessionSummaryLoaderProps = {}) {
  const { t } = useI18n();
  const [state, setState] = useState<LoaderState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    try {
      const storage = storageFactory();
      const loadSnapshot =
        sessionId === undefined
          ? loadLatestStoredSessionSummarySnapshot(storage)
          : loadStoredSessionSummarySnapshotById(storage, sessionId);

      void loadSnapshot
        .then(async (snapshot) => {
          if (cancelled) {
            return;
          }

          if (snapshot === undefined) {
            setState({ status: "empty" });
            return;
          }

          const [sessions, responses, benchmarkResults] = await Promise.all([
            storage.getAll("drill_sessions"),
            storage.getAll("responses"),
            storage.getAll("benchmark_results")
          ]);
          const sourceIds = [
            snapshot.id,
            ...benchmarkResults.filter((result) => result.sessionId === snapshot.id).map((result) => result.id)
          ];
          const benchmarkResult = benchmarkResults.find((result) => result.sessionId === snapshot.id);
          const bests = findSourcePersonalBests(
            createPersonalBestRecords({ benchmarkResults, responses, sessions }),
            sourceIds
          );

          if (!cancelled) {
            setState({
              newBestLabels: bests.map((best) => best.label),
              repeatHref:
                benchmarkResult === undefined
                  ? undefined
                  : buildBenchmarkSelectionHref(
                      benchmarkResult.benchmarkId,
                      questionPackIdFromBenchmarkId(benchmarkResult.benchmarkId)
                    ),
              snapshot,
              status: "loaded"
            });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setState({ status: "error" });
          }
        })
        .finally(() => storage.close());
    } catch {
      void Promise.resolve().then(() => setState({ status: "error" }));
    }

    return () => {
      cancelled = true;
    };
  }, [sessionId, storageFactory]);

  if (state.status === "loading") {
    return (
      <LoadingState
        detail={t("Checking this device for your latest completed drill.")}
        label={t("Loading session summary...")}
        testId="session-summary-loading-state"
      />
    );
  }

  if (state.status === "loaded") {
    return (
      <SessionSummaryView
        newBestLabels={state.newBestLabels}
        repeatAction={
          state.repeatHref === undefined ? undefined : { href: state.repeatHref, label: t("Repeat Benchmark") }
        }
        snapshot={state.snapshot}
      />
    );
  }

  return (
    <>
      {state.status === "error" ? (
        <div className="grid gap-2">
          <p className="border-s-2 border-saffron bg-saffron/20 px-3 py-2 text-sm leading-6 text-ink">
            {t("Could not read saved session history on this device.")}
          </p>
        </div>
      ) : null}

      <EmptyState
        action={{ href: "/drills", label: t("Start Drill") }}
        description={
          state.status === "error"
            ? t("Start a new drill to rebuild a fresh summary.")
            : sessionId !== undefined
              ? t("This completed session is not available in local history on this device.")
            : t("Complete one drill to review score, accuracy, timing, categories, and error patterns.")
        }
        secondaryAction={{ href: "/progress", label: t("View Progress") }}
        title={
          state.status === "error"
            ? t("Session summary could not load.")
            : sessionId !== undefined
              ? t("Saved session not found.")
              : t("No completed drill yet.")
        }
        tone={state.status === "error" ? "error" : "neutral"}
      />
    </>
  );
}

function questionPackIdFromBenchmarkId(benchmarkId: string): string | undefined {
  return /^question-pack:(?<packId>[^:]+):version:/.exec(benchmarkId)?.groups?.packId;
}
