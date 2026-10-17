"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { SessionSummaryView } from "@/features/drills/SessionSummaryView";
import type { SessionSummarySnapshot } from "@/features/drills/sessionSummary";
import { useI18n } from "@/features/i18n/I18nProvider";
import { loadBrowserStoredSessionSummary } from "@/features/progress/browserProgress";
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
    const controller = new AbortController();
    void loadBrowserStoredSessionSummary(storageFactory, sessionId, controller.signal)
      .then((detail) => {
        if (controller.signal.aborted) return;
        setState(detail.snapshot === undefined ? { status: "empty" } : { ...detail, snapshot: detail.snapshot, status: "loaded" });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
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
