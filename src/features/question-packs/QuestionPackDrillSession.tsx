"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { ActiveDrillSession } from "@/features/drills/ActiveDrillSession";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  createQuestionPackDrillSession,
  questionPackSourceParam,
  type CreatedQuestionPackDrillSession
} from "@/features/question-packs/questionPack";
import type { Difficulty } from "@/lib/domain";
import type { AppStorage, QuestionPackRecord } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

export { questionPackSourceParam } from "@/features/question-packs/questionPack";

interface QuestionPackDrillSessionLoaderProps {
  difficulty: Difficulty;
  packId?: string;
  questionCount: number;
  storageFactory?: () => AppStorage;
  warnings?: string[];
}

type LoaderState =
  | { message: string; status: "error" }
  | { created: CreatedQuestionPackDrillSession; pack: QuestionPackRecord; status: "ready" }
  | { status: "loading" };

export function QuestionPackDrillSessionLoader({
  difficulty,
  packId,
  questionCount,
  storageFactory = createIndexedDbAppStorage,
  warnings = []
}: QuestionPackDrillSessionLoaderProps) {
  const { t } = useI18n();
  const [state, setState] = useState<LoaderState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    if (packId === undefined || packId.trim() === "") {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setState({ message: "Choose an installed question pack from Content Packs.", status: "error" });
        }
      });

      return () => {
        cancelled = true;
      };
    }

    try {
      const storage = storageFactory();

      void storage
        .get("question_packs", packId)
        .then((pack) => {
          if (pack === undefined) {
            throw new Error("This question pack is not installed on this device.");
          }

          return {
            created: createQuestionPackDrillSession(pack, { difficulty, questionCount }),
            pack
          };
        })
        .then(({ created, pack }) => {
          if (!cancelled) {
            setState({ created, pack, status: "ready" });
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setState({
              message: error instanceof Error ? error.message : "Unable to create a question-pack drill.",
              status: "error"
            });
          }
        })
        .finally(() => storage.close());
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setState({ message: "Installed question packs are unavailable.", status: "error" });
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [difficulty, packId, questionCount, storageFactory]);

  if (state.status === "ready") {
    const interviewMathMode = state.created.interviewMathMode;

    return (
      <div className="contents" dir="auto" lang={state.pack.catalogProvenance?.language}>
        <ActiveDrillSession
          initialSession={state.created.session}
          interviewMathMode={interviewMathMode}
          questions={state.created.questions}
          queueTitle={interviewMathMode ? t("Interview Math Questions") : state.pack.title}
          sessionEyebrow={t(interviewMathMode ? "Custom Interview Math" : "Custom Content")}
          sessionTitle={t("{title} {mode}", { title: state.pack.title, mode: t(interviewMathMode ? "Interview Math" : "Drill") })}
          storageFactory={storageFactory}
          warnings={warnings}
        />
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: "/settings", label: t("Question Packs") }}
        description={t("Load a locally installed question pack.")}
        eyebrow={t("Custom Content")}
        title={t("Question Pack Drill")}
      />
      <p className="border border-ink/15 border-s-2 border-s-teal bg-white p-4 text-sm leading-6 text-ink">
        {t(state.status === "loading" ? "Loading question pack from this device..." : state.message)}
      </p>
    </main>
  );
}
