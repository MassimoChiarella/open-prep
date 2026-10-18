"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { buttonClass } from "@/components/uiStyles";
import { SessionSummaryView } from "@/features/drills/SessionSummaryView";
import type { SessionSummarySnapshot } from "@/features/drills/sessionSummary";
import { useI18n } from "@/features/i18n/I18nProvider";
import { loadBrowserStoredSessionSummary, UnverifiedStoredSessionSummaryError } from "@/features/progress/browserProgress";
import { AppStorageConflictError, type AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

type LoaderState =
  | {
      enrichment: "loading" | "loaded" | "error";
      newBestLabels: string[];
      repeatHref?: string;
      snapshot: SessionSummarySnapshot;
      status: "loaded";
      sessionId?: string;
      storageFactory: () => AppStorage;
    }
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
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let snapshot: SessionSummarySnapshot | undefined;
    void loadBrowserStoredSessionSummary(storageFactory, sessionId, controller.signal, (loadedSnapshot) => {
      if (controller.signal.aborted) return;
      snapshot = loadedSnapshot;
      setState({ enrichment: "loading", newBestLabels: [], sessionId, snapshot, status: "loaded", storageFactory });
    })
      .then((detail) => {
        if (controller.signal.aborted) return;
        setState(detail.snapshot === undefined ? { status: "empty" } : { ...detail, enrichment: "loaded", sessionId, snapshot: detail.snapshot, status: "loaded", storageFactory });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const invalidated = error instanceof AppStorageConflictError || error instanceof UnverifiedStoredSessionSummaryError ||
          (error instanceof DOMException && error.name === "AbortError");
        setState(snapshot === undefined || invalidated ? { status: "error" }
          : { enrichment: "error", newBestLabels: [], sessionId, snapshot, status: "loaded", storageFactory });
      });
    return () => controller.abort();
  }, [attempt, sessionId, storageFactory]);

  if (state.status === "loading" || (state.status === "loaded" && (state.sessionId !== sessionId || state.storageFactory !== storageFactory))) {
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
      <div className="grid gap-4">
        {state.enrichment !== "loaded" ? (
          <div className="border-s-2 border-saffron bg-saffron/20 px-3 py-2 text-sm leading-6 text-ink" role="status">
            <p>{state.enrichment === "loading"
              ? t("Loading personal-best history and repeat option...")
              : t("Personal-best history and the repeat option could not load. Your session results are still available.")}</p>
            {state.enrichment === "error" ? (
              <button
                className={buttonClass("secondary", "mt-2")}
                onClick={() => {
                  setState({ ...state, enrichment: "loading" });
                  setAttempt((current) => current + 1);
                }} type="button"
              >{t("Retry")}</button>
            ) : null}
          </div>
        ) : null}
        <SessionSummaryView
          newBestLabels={state.newBestLabels}
          repeatAction={
            state.repeatHref === undefined ? undefined : { href: state.repeatHref, label: t("Repeat Benchmark") }
          }
          repeatActionStatus={state.enrichment === "loaded" ? undefined : state.enrichment}
          snapshot={state.snapshot}
        />
      </div>
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
