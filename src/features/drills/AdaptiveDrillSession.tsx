"use client";

import Link from "next/link";
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
import { createQuestionPackPoolSession } from "@/features/question-packs/questionPackPool";
import {
  buildQuestionPackPoolDraftScope,
  readQuestionPackPoolPreference,
  type QuestionPackPoolPreference
} from "@/features/question-packs/questionPackPoolPreference";
import type { Question, QuestionTemplate } from "@/lib/domain";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type {
  AppStorage,
  MistakeNotebookRecord,
  QuestionPackRecord,
  RetryScheduleRecord,
  StoredUserResponse
} from "@/lib/storage/appStorageTypes";

export type LocalDrillMode = "daily_workout" | "retry_missed" | "review_queue" | "weakness_mode";

type LocalDrillState =
  | { message: string; questionPoolRecovery?: boolean; status: "error" }
  | { created: LocalCreatedSession; status: "ready" }
  | { status: "loading" };

type LocalCreatedSession = CreatedDrillSession & {
  draftKeyScope?: string;
  similarQuestionTemplates?: QuestionTemplate[];
};

export function LocalDrillSessionLoader({
  mode,
  questionCount,
  storageFactory = createIndexedDbAppStorage,
  warnings = []
}: {
  mode: LocalDrillMode;
  questionCount: number;
  storageFactory?: () => AppStorage;
  warnings?: string[];
}) {
  const { t } = useI18n();
  const [state, setState] = useState<LocalDrillState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      const startedAt = new Date().toISOString();
      const preference: QuestionPackPoolPreference = mode === "retry_missed"
        ? { mode: "built_in_only", selectedPackIds: [] }
        : readQuestionPackPoolPreference();
      const selectedPackIds = preference.mode === "built_in_only"
        ? []
        : preference.selectedPackIds;
      const activeStorage = storage;

      void Promise.all([
        activeStorage.getAll("responses"),
        activeStorage.getAll("mistake_notebook"),
        activeStorage.getAll("retry_schedules"),
        Promise.all(selectedPackIds.map((packId) => activeStorage.get("question_packs", packId)))
      ])
        .then(([responses, mistakes, retrySchedules, selectedPacks]) => {
          const installedPacks = selectedPacks.filter((pack): pack is QuestionPackRecord => pack !== undefined);
          const created = createLocalSession(
            mode,
            questionCount,
            startedAt,
            responses,
            mistakes,
            retrySchedules,
            preference,
            installedPacks
          );

          return preference.mode === "built_in_only"
            ? created
            : {
                ...created,
                draftKeyScope: buildQuestionPackPoolDraftScope(preference, installedPacks)
              };
        })
        .then((created) => {
          if (!cancelled) setState({ created, status: "ready" });
        })
        .catch((error) => {
          if (!cancelled) {
            setState({
              message: error instanceof Error ? error.message : "Unable to create local practice.",
              questionPoolRecovery: isQuestionPoolSelectionError(error),
              status: "error"
            });
          }
        })
        .finally(() => storage?.close());
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) setState({ message: "Local practice history is unavailable.", status: "error" });
      });
    }

    return () => {
      cancelled = true;
      storage?.close();
    };
  }, [mode, questionCount, storageFactory]);

  const copy = localModeCopy[mode];

  if (state.status === "ready") {
    return (
      <ActiveDrillSession
        draftKeyScope={state.created.draftKeyScope}
        initialSession={state.created.session}
        queueTitle={t(copy.queueTitle)}
        questions={state.created.questions}
        sessionEyebrow={t(copy.eyebrow)}
        sessionTitle={t(copy.title)}
        similarQuestionTemplates={state.created.similarQuestionTemplates}
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
      {state.status === "error" && state.questionPoolRecovery ? (
        <Link
          className="w-fit text-sm font-semibold text-teal underline underline-offset-4"
          href="/settings#question-pool-settings"
        >
          {t("Question Pool Settings")}
        </Link>
      ) : null}
    </main>
  );
}

function createLocalSession(
  mode: LocalDrillMode,
  questionCount: number,
  startedAt: string,
  responses: StoredUserResponse[],
  mistakes: MistakeNotebookRecord[],
  retrySchedules: RetryScheduleRecord[],
  preference: QuestionPackPoolPreference,
  selectedPacks: QuestionPackRecord[]
): LocalCreatedSession {
  if (mode === "retry_missed") {
    return createRetryMissedDrillSession(mistakes, { questionCount, startedAt });
  }

  if (mode === "daily_workout") {
    const created = createDailyWorkoutSession(
      { mistakes, responses, retrySchedules },
      {
        now: startedAt,
        questionCount,
        seed: `daily-workout:${startedAt.slice(0, 10)}`,
        startedAt
      }
    );

    return preference.mode === "built_in_only"
      ? created
      : replaceGeneratedFill(
          created,
          normalizeDailyWorkoutCount(questionCount),
          preference,
          selectedPacks,
          `daily-workout:${startedAt.slice(0, 10)}:fill`,
          startedAt
        );
  }
  if (mode === "weakness_mode") {
    const options = {
      questionCount,
      seed: `${mode}:${startedAt}`,
      startedAt
    };
    const created = createWeaknessModeDrillSession(responses, options);

    return preference.mode === "built_in_only"
      ? created
      : createQuestionPackPoolSession({
          includeBuiltIn: preference.mode === "built_in_and_selected",
          packs: selectedPacks,
          seed: options.seed,
          settings: created.session.settings,
          startedAt
        });
  }

  const created = createReviewDrillSession(mistakes, { questionCount, retrySchedules, startedAt });
  return preference.mode === "built_in_only"
    ? created
    : replaceGeneratedFill(
        created,
        Math.max(1, Math.trunc(questionCount)),
        preference,
        selectedPacks,
        `review-queue:${startedAt}:fill`,
        startedAt
      );
}

function replaceGeneratedFill(
  created: CreatedDrillSession,
  targetQuestionCount: number,
  preference: QuestionPackPoolPreference,
  selectedPacks: readonly QuestionPackRecord[],
  seed: string,
  startedAt: string
): LocalCreatedSession {
  const historicalQuestions = created.questions.filter(isHistoricalRetryQuestion);
  const fillCount = Math.max(0, targetQuestionCount - historicalQuestions.length);

  if (fillCount === 0) {
    return {
      ...created,
      ...(preference.mode === "selected_only" ? { similarQuestionTemplates: [] } : {})
    };
  }

  const fill = createQuestionPackPoolSession({
    includeBuiltIn: preference.mode === "built_in_and_selected",
    packs: selectedPacks,
    seed,
    settings: { ...created.session.settings, questionCount: fillCount },
    startedAt
  });
  const questions = [...historicalQuestions, ...fill.questions];

  return {
    questions,
    session: {
      ...created.session,
      questionIds: questions.map((question) => question.id),
      settings: {
        ...created.session.settings,
        categories: Array.from(new Set(questions.map((question) => question.category))),
        difficulty: highestQuestionDifficulty(questions),
        tags: Array.from(new Set(questions.flatMap((question) => question.tags))),
        questionCount: questions.length
      }
    },
    similarQuestionTemplates: fill.similarQuestionTemplates
  };
}

function isHistoricalRetryQuestion(question: Question): boolean {
  return question.id.startsWith("retry-");
}

function highestQuestionDifficulty(questions: readonly Question[]): Question["difficulty"] {
  const order: readonly Question["difficulty"][] = ["beginner", "intermediate", "advanced", "expert"];
  return questions.reduce<Question["difficulty"]>(
    (highest, question) => order.indexOf(question.difficulty) > order.indexOf(highest)
      ? question.difficulty
      : highest,
    "beginner"
  );
}

function normalizeDailyWorkoutCount(questionCount: number): number {
  if (!Number.isFinite(questionCount)) return 10;
  return Math.max(10, Math.min(20, Math.floor(questionCount)));
}

function isQuestionPoolSelectionError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith("Selected packs only is active,");
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
