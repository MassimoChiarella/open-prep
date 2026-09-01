"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { accuracyModeSourceParam, createAccuracyModeSettings } from "@/features/drills/accuracyMode";
import { LocalDrillSessionLoader } from "@/features/drills/AdaptiveDrillSession";
import { dailyWorkoutSourceParam } from "@/features/drills/dailyWorkout";
import { buildDrillSessionSeed, parseDrillSettingsQuery } from "@/features/drills/drillSessionQuery";
import { createQuickFireModeSettings, quickFireModeSourceParam } from "@/features/drills/quickFireMode";
import { retryMissedSourceParam, reviewQueueSourceParam } from "@/features/drills/mistakeRetry";
import { weaknessModeSourceParam } from "@/features/drills/weaknessMode";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  QuestionPackDrillSessionLoader,
  questionPackSourceParam
} from "@/features/question-packs/QuestionPackDrillSession";
import { QuestionPackPoolDrillSession } from "@/features/question-packs/QuestionPackPoolDrillSession";
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

  const parsed = useMemo(
    () => parseDrillSettingsQuery(new URLSearchParams(queryKey)),
    [queryKey]
  );
  const namedMode =
    source === quickFireModeSourceParam
      ? "quick_fire"
      : source === accuracyModeSourceParam
        ? "accuracy"
        : undefined;
  const settings = useMemo(
    () => namedMode === "quick_fire"
      ? createQuickFireModeSettings(parsed.settings)
      : namedMode === "accuracy"
        ? createAccuracyModeSettings(parsed.settings)
        : parsed.settings,
    [namedMode, parsed.settings]
  );

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

  const sessionCopy = getSessionCopy(namedMode, requestedInterviewMathMode);

  return (
    <QuestionPackPoolDrillSession
      interviewMathMode={interviewMathMode}
      interviewMathRequested={requestedInterviewMathMode}
      queueTitle={sessionCopy.queueTitle}
      seed={buildDrillSessionSeed(settings, sessionSeed.value)}
      sessionEyebrow={sessionCopy.eyebrow}
      sessionTitle={sessionCopy.title}
      settings={settings}
      warnings={parsed.warnings}
    />
  );
}

function getSessionCopy(namedMode: "accuracy" | "quick_fire" | undefined, interviewMathRequested: boolean) {
  if (interviewMathRequested) {
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
