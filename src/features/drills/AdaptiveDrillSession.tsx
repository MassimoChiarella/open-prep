"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { ActiveDrillSession } from "@/features/drills/ActiveDrillSession";
import { createDailyWorkoutSession } from "@/features/drills/dailyWorkout";
import {
  createReviewDrillSession,
  createRetryMissedDrillSession
} from "@/features/drills/mistakeRetry";
import type { CreatedDrillSession } from "@/features/drills/sessionFactory";
import { createWeaknessModeDrillSession } from "@/features/drills/weaknessMode";
import { useI18n } from "@/features/i18n/I18nProvider";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type {
  MistakeNotebookRecord,
  RetryScheduleRecord,
  StoredUserResponse
} from "@/lib/storage/appStorageTypes";

export type LocalDrillMode = "daily_workout" | "retry_missed" | "review_queue" | "weakness_mode";

type LocalDrillState =
  | { message: string; status: "error" }
  | { created: CreatedDrillSession; status: "ready" }
  | { status: "loading" };

export function LocalDrillSessionLoader({
  mode,
  questionCount,
  warnings = []
}: {
  mode: LocalDrillMode;
  questionCount: number;
  warnings?: string[];
}) {
  const { t } = useI18n();
  const [state, setState] = useState<LocalDrillState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    try {
      const storage = createIndexedDbAppStorage();
      const startedAt = new Date().toISOString();

      void Promise.all([
        storage.getAll("responses"),
        storage.getAll("mistake_notebook"),
        storage.getAll("retry_schedules")
      ])
        .then(([responses, mistakes, retrySchedules]) =>
          createLocalSession(mode, questionCount, startedAt, responses, mistakes, retrySchedules)
        )
        .then((created) => {
          if (!cancelled) setState({ created, status: "ready" });
        })
        .catch((error) => {
          if (!cancelled) {
            setState({
              message: error instanceof Error ? error.message : "Unable to create local practice.",
              status: "error"
            });
          }
        })
        .finally(() => storage.close());
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) setState({ message: "Local practice history is unavailable.", status: "error" });
      });
    }

    return () => {
      cancelled = true;
    };
  }, [mode, questionCount]);

  const copy = localModeCopy[mode];

  if (state.status === "ready") {
    return (
      <ActiveDrillSession
        initialSession={state.created.session}
        queueTitle={t(copy.queueTitle)}
        questions={state.created.questions}
        sessionEyebrow={t(copy.eyebrow)}
        sessionTitle={t(copy.title)}
        warnings={warnings.map((warning) => t(warning))}
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ ...copy.action, label: t(copy.action.label) }}
        description={t(copy.description)}
        eyebrow={t(copy.eyebrow)}
        title={t(copy.title)}
      />
      <p className="border border-s-2 border-ink/15 bg-white p-4 text-sm leading-6 text-ink" role="status">
        {state.status === "loading" ? t(copy.loadingLabel) : t(state.message)}
      </p>
    </main>
  );
}

function createLocalSession(
  mode: LocalDrillMode,
  questionCount: number,
  startedAt: string,
  responses: StoredUserResponse[],
  mistakes: MistakeNotebookRecord[],
  retrySchedules: RetryScheduleRecord[]
): CreatedDrillSession {
  if (mode === "daily_workout") {
    return createDailyWorkoutSession(
      { mistakes, responses, retrySchedules },
      {
        now: startedAt,
        questionCount,
        seed: `daily-workout:${startedAt.slice(0, 10)}`,
        startedAt
      }
    );
  }
  if (mode === "weakness_mode") {
    return createWeaknessModeDrillSession(responses, {
      questionCount,
      seed: `${mode}:${startedAt}`,
      startedAt
    });
  }
  if (mode === "review_queue") {
    return createReviewDrillSession(mistakes, { questionCount, retrySchedules, startedAt });
  }
  return createRetryMissedDrillSession(mistakes, { questionCount, startedAt });
}

const localModeCopy: Record<
  LocalDrillMode,
  {
    action: { href: string; label: string };
    description: string;
    eyebrow: string;
    loadingLabel: string;
    queueTitle: string;
    title: string;
  }
> = {
  daily_workout: {
    action: { href: "/", label: "Back to Dashboard" },
    description: "Review due questions, target weak skills, then finish with balanced local practice.",
    eyebrow: "Daily Practice",
    loadingLabel: "Building today's workout from local progress...",
    queueTitle: "Workout Queue",
    title: "Daily Workout"
  },
  retry_missed: {
    action: { href: "/progress", label: "Back to Progress" },
    description: "Retry unresolved questions saved in the local mistake notebook.",
    eyebrow: "Retry",
    loadingLabel: "Loading review questions from this device...",
    queueTitle: "Missed Questions",
    title: "Retry Missed Questions"
  },
  review_queue: {
    action: { href: "/progress", label: "Back to Progress" },
    description: "Review due missed questions, then continue with related generated practice.",
    eyebrow: "Review",
    loadingLabel: "Loading review questions from this device...",
    queueTitle: "Review Queue",
    title: "Review Due Items"
  },
  weakness_mode: {
    action: { href: "/progress", label: "Back to Progress" },
    description: "Practice the category and skill that most need attention in saved local progress.",
    eyebrow: "Adaptive Practice",
    loadingLabel: "Finding the clearest focus in local progress...",
    queueTitle: "Weakness Focus",
    title: "Weakness Mode"
  }
};
