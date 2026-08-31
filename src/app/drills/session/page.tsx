"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { ActiveDrillSession } from "@/features/drills/ActiveDrillSession";
import { accuracyModeSourceParam, createAccuracyModeSettings } from "@/features/drills/accuracyMode";
import { LocalDrillSessionLoader } from "@/features/drills/AdaptiveDrillSession";
import { dailyWorkoutSourceParam } from "@/features/drills/dailyWorkout";
import { buildDrillSessionSeed, parseDrillSettingsQuery } from "@/features/drills/drillSessionQuery";
import { createQuickFireModeSettings, quickFireModeSourceParam } from "@/features/drills/quickFireMode";
import { retryMissedSourceParam, reviewQueueSourceParam } from "@/features/drills/mistakeRetry";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { weaknessModeSourceParam } from "@/features/drills/weaknessMode";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  QuestionPackDrillSessionLoader,
  questionPackSourceParam
} from "@/features/question-packs/QuestionPackDrillSession";
import { nextLocalPracticeNonce } from "@/lib/localPracticeNonce";

export default function DrillSessionPage() {
  return (
    <Suspense fallback={<DrillSessionLoading />}>
      <DrillSessionPageContent />
    </Suspense>
  );
}

function DrillSessionPageContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const source = searchParams.get("source") ?? undefined;
  const requestedInterviewMathMode = searchParams.get("mode") === "interview";
  const queryKey = searchParams.toString();
  const requestedSeed = searchParams.get("seed")?.trim() || undefined;
  const [sessionSeed, setSessionSeed] = useState<{ key: string; value: string | number }>();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSessionSeed({
        key: queryKey,
        value: requestedSeed ?? nextLocalPracticeNonce("drill-session")
      });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [queryKey, requestedSeed]);

  if (source === dailyWorkoutSourceParam || source === weaknessModeSourceParam) {
    const adaptiveCount = parseAdaptiveQuestionCount(searchParams.get("count"), source, t);

    return (
      <LocalDrillSessionLoader
        mode={source}
        questionCount={adaptiveCount.questionCount}
        warnings={adaptiveCount.warnings}
      />
    );
  }

  const parsed = parseDrillSettingsQuery(searchParams);
  const namedMode =
    source === quickFireModeSourceParam
      ? "quick_fire"
      : source === accuracyModeSourceParam
        ? "accuracy"
        : undefined;
  const settings =
    namedMode === "quick_fire"
      ? createQuickFireModeSettings(parsed.settings)
      : namedMode === "accuracy"
        ? createAccuracyModeSettings(parsed.settings)
        : parsed.settings;
  const interviewMathMode =
    requestedInterviewMathMode ||
    (settings.categories.length === 1 && settings.categories[0] === "case_math");

  if (source === questionPackSourceParam) {
    return (
      <QuestionPackDrillSessionLoader
        difficulty={parsed.settings.difficulty}
        packId={searchParams.get("pack") ?? undefined}
        questionCount={parsed.settings.questionCount}
        warnings={parsed.warnings}
      />
    );
  }

  if (source === retryMissedSourceParam || source === reviewQueueSourceParam) {
    return (
      <LocalDrillSessionLoader
        mode={source === reviewQueueSourceParam ? "review_queue" : "retry_missed"}
        questionCount={parsed.settings.questionCount}
        warnings={parsed.warnings}
      />
    );
  }

  if (sessionSeed?.key !== queryKey) {
    return <DrillSessionLoading />;
  }

  const created = createSessionResult(settings, interviewMathMode, sessionSeed.value);
  const sessionCopy = getSessionCopy(namedMode, interviewMathMode);

  if (created.status === "ready") {
    return (
      <ActiveDrillSession
        initialSession={created.session}
        interviewMathMode={interviewMathMode}
        questions={created.questions}
        queueTitle={sessionCopy.queueTitle === undefined ? undefined : t(sessionCopy.queueTitle)}
        sessionEyebrow={sessionCopy.eyebrow === undefined ? undefined : t(sessionCopy.eyebrow)}
        sessionTitle={sessionCopy.title === undefined ? undefined : t(sessionCopy.title)}
        warnings={parsed.warnings.map((warning) => t(warning))}
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: "/drills", label: t("Change Settings") }}
        description={t("Create a local drill session from the selected settings.")}
        eyebrow={t(sessionCopy.eyebrow ?? "Practice")}
        title={t(sessionCopy.title ?? "Active Drill Session")}
      />
      <p className="border border-s-2 border-coral/30 border-s-coral bg-coral/10 p-4 text-sm leading-6 text-ink">{t(created.message)}</p>
    </main>
  );
}

function getSessionCopy(namedMode: "accuracy" | "quick_fire" | undefined, interviewMathMode: boolean) {
  if (interviewMathMode) {
    return { eyebrow: "Case Practice", queueTitle: "Case Questions", title: "Interview Math Session" };
  }

  if (namedMode === "quick_fire") {
    return { eyebrow: "Speed Practice", queueTitle: "Rapid Questions", title: "Quick Fire" };
  }

  if (namedMode === "accuracy") {
    return { eyebrow: "Accuracy Practice", queueTitle: "Accuracy Questions", title: "Accuracy Mode" };
  }

  return { eyebrow: undefined, queueTitle: undefined, title: undefined };
}

function parseAdaptiveQuestionCount(
  rawValue: string | null,
  source: string,
  t: ReturnType<typeof useI18n>["t"]
) {
  const isDailyWorkout = source === dailyWorkoutSourceParam;
  const fallback = isDailyWorkout ? 10 : 5;
  const minimum = isDailyWorkout ? 10 : 1;
  const maximum = isDailyWorkout ? 20 : 10;
  const parsed = Number(rawValue ?? fallback);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return {
      questionCount: fallback,
      warnings: [
        t("Used default question count of {count}; expected a positive whole number.", { count: fallback })
      ]
    };
  }

  const questionCount = Math.max(minimum, Math.min(maximum, parsed));

  return {
    questionCount,
    warnings:
      questionCount === parsed
        ? []
        : [
            t("Adjusted question count to the {minimum}-{maximum} range for this mode.", {
              maximum,
              minimum
            })
          ]
  };
}

function DrillSessionLoading() {
  const { t } = useI18n();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        description={t("Preparing your selected local drill.")}
        eyebrow={t("Practice")}
        title={t("Active Drill Session")}
      />
      <LoadingState label={t("Preparing drill")} />
    </main>
  );
}

function createSessionResult(
  settings: ReturnType<typeof parseDrillSettingsQuery>["settings"],
  interviewMathMode: boolean,
  seedNonce: string | number
) {
  try {
    const created = createDrillSession({
      seed: buildDrillSessionSeed(settings, seedNonce),
      settings
    });

    if (
      interviewMathMode &&
      created.questions.some((question) => question.metadata?.caseStyle?.interviewMath === undefined)
    ) {
      throw new Error("Interview Math mode requires case-style questions. Choose the Interview Math preset.");
    }

    return {
      status: "ready" as const,
      ...created
    };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Unable to create a local drill session."
    };
  }
}
