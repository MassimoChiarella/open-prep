"use client";

import { useEffect, useState } from "react";

import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { ActiveDrillSession } from "@/features/drills/ActiveDrillSession";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  buildQuestionPackPoolDraftScope,
  readQuestionPackPoolPreference,
  type QuestionPackPoolPreference
} from "@/features/question-packs/questionPackPoolPreference";
import {
  createQuestionPackPoolSession,
  type CreatedQuestionPackPoolSession
} from "@/features/question-packs/questionPackPool";
import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import type { DrillSettings } from "@/lib/domain";
import type { AppStorage, QuestionPackRecord } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

const emptyWarnings: string[] = [];

interface QuestionPackPoolDrillSessionProps {
  interviewMathMode: boolean;
  interviewMathRequested?: boolean;
  queueTitle?: string;
  seed: string | number;
  sessionEyebrow?: string;
  sessionTitle?: string;
  settings: DrillSettings;
  storageFactory?: () => AppStorage;
  warnings?: string[];
}

type PoolSessionState =
  | { message: string; status: "error" }
  | {
      created: CreatedQuestionPackPoolSession;
      draftKeyScope?: string;
      interviewMathMode: boolean;
      language?: string;
      status: "ready";
      warnings: string[];
    }
  | { status: "loading" };

export function QuestionPackPoolDrillSession({
  interviewMathMode,
  interviewMathRequested = false,
  queueTitle,
  seed,
  sessionEyebrow,
  sessionTitle,
  settings,
  storageFactory = createIndexedDbAppStorage,
  warnings = emptyWarnings
}: QuestionPackPoolDrillSessionProps) {
  const { t } = useI18n();
  const [state, setState] = useState<PoolSessionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let storage: AppStorage | undefined;

    async function loadSession() {
      const preference = readQuestionPackPoolPreference();
      const loaded = await loadSelectedPacks(preference, storageFactory);
      storage = loaded.storage;
      const numericPacks = loaded.packs.filter((pack) =>
        pack.kind === "fixed_numeric" || pack.kind === "generated_template"
      );
      const created = preference.mode === "built_in_only" ||
        (preference.mode === "built_in_and_selected" && numericPacks.length === 0)
        ? {
            ...createDrillSession({ seed, settings }),
            similarQuestionTemplates: [...starterQuestionTemplates]
          }
        : createQuestionPackPoolSession({
            includeBuiltIn: preference.mode === "built_in_and_selected",
            packs: numericPacks,
            requireInterviewMath: interviewMathRequested,
            seed,
            settings
          });
      const effectiveInterviewMathMode = interviewMathRequested || (
        interviewMathMode &&
        created.questions.every((question) => question.metadata?.caseStyle?.interviewMath !== undefined)
      );
      if (
        interviewMathRequested &&
        created.questions.some((question) => question.metadata?.caseStyle?.interviewMath === undefined)
      ) {
        throw new Error("Interview Math mode requires case-style questions. Choose the Interview Math preset.");
      }
      const nextWarnings = [
        ...warnings,
        ...(loaded.missingCount === 0
          ? []
          : [loaded.missingCount === 1
              ? "1 selected question pack is no longer installed and was skipped."
              : `${loaded.missingCount} selected question packs are no longer installed and were skipped.`]),
        ...(created.questions.length === settings.questionCount
          ? []
          : [`The active question pool contains ${created.questions.length} matching questions, so this drill was shortened.`])
      ];
      const language = preference.mode === "selected_only" && numericPacks.length === 1
        ? numericPacks[0].catalogProvenance?.language
        : undefined;
      const draftKeyScope = preference.mode === "built_in_only"
        ? undefined
        : buildQuestionPackPoolDraftScope(preference, loaded.packs);

      if (!cancelled) {
        setState({
          created,
          draftKeyScope,
          interviewMathMode: effectiveInterviewMathMode,
          language,
          status: "ready",
          warnings: nextWarnings
        });
      }
    }

    void loadSession().catch((error) => {
      if (!cancelled) {
        setState({
          message: error instanceof Error ? error.message : "Unable to load the selected question pool.",
          status: "error"
        });
      }
    }).finally(() => storage?.close());

    return () => {
      cancelled = true;
      storage?.close();
    };
  }, [interviewMathMode, interviewMathRequested, seed, settings, storageFactory, warnings]);

  if (state.status === "ready") {
    return (
      <div className="contents" dir={state.language === undefined ? undefined : "auto"} lang={state.language}>
        <ActiveDrillSession
          draftKeyScope={state.draftKeyScope}
          initialSession={state.created.session}
          interviewMathMode={state.interviewMathMode}
          questions={state.created.questions}
          queueTitle={state.interviewMathMode ? "Case Questions" : queueTitle}
          sessionEyebrow={state.interviewMathMode ? "Case Practice" : sessionEyebrow}
          sessionTitle={state.interviewMathMode ? "Interview Math Session" : sessionTitle}
          similarQuestionTemplates={state.created.similarQuestionTemplates}
          storageFactory={storageFactory}
          warnings={state.warnings}
        />
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: state.status === "error" ? "/settings#question-pool-settings" : "/drills", label: t(state.status === "error" ? "Question Packs" : "Change Settings") }}
        description={t("Create a local drill session from the selected settings.")}
        eyebrow={t(sessionEyebrow ?? "Practice")}
        title={t(sessionTitle ?? "Active Drill Session")}
      />
      {state.status === "loading" ? (
        <LoadingState label={t("Preparing drill")} />
      ) : (
        <p className="border border-s-2 border-coral/30 border-s-coral bg-coral/10 p-4 text-sm leading-6 text-ink" role="alert">
          {t(state.message)}
        </p>
      )}
    </main>
  );
}

async function loadSelectedPacks(
  preference: QuestionPackPoolPreference,
  storageFactory: () => AppStorage
): Promise<{ missingCount: number; packs: QuestionPackRecord[]; storage?: AppStorage }> {
  if (preference.mode === "built_in_only" || preference.selectedPackIds.length === 0) {
    return { missingCount: 0, packs: [] };
  }

  const storage = storageFactory();
  try {
    const records = await Promise.all(
      preference.selectedPackIds.map((packId) => storage.get("question_packs", packId))
    );
    const packs = records.filter((pack): pack is QuestionPackRecord => pack !== undefined);
    return {
      missingCount: records.length - packs.length,
      packs,
      storage
    };
  } catch (error) {
    storage.close();
    throw error;
  }
}
