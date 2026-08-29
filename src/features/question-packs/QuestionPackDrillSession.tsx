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
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

export { questionPackSourceParam } from "@/features/question-packs/questionPack";

interface QuestionPackDrillSessionLoaderProps {
  difficulty: Difficulty;
  packId?: string;
  questionCount: number;
  warnings?: string[];
}

type LoaderState =
  | { message: string; status: "error" }
  | { created: CreatedQuestionPackDrillSession; status: "ready"; title: string }
  | { status: "loading" };

export function QuestionPackDrillSessionLoader({
  difficulty,
  packId,
  questionCount,
  warnings = []
}: QuestionPackDrillSessionLoaderProps) {
  const { t } = useI18n();
  const [state, setState] = useState<LoaderState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    if (packId === undefined || packId.trim() === "") {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setState({ message: "Choose an installed question pack from Settings.", status: "error" });
        }
      });

      return () => {
        cancelled = true;
      };
    }

    try {
      const storage = createIndexedDbAppStorage();

      void storage
        .get("question_packs", packId)
        .then((pack) => {
          if (pack === undefined) {
            throw new Error("This question pack is not installed on this device.");
          }

          return {
            created: createQuestionPackDrillSession(pack, { difficulty, questionCount }),
            title: pack.title
          };
        })
        .then(({ created, title }) => {
          if (!cancelled) {
            setState({ created, status: "ready", title });
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
  }, [difficulty, packId, questionCount]);

  if (state.status === "ready") {
    const interviewMathMode = state.created.interviewMathMode;

    return (
      <ActiveDrillSession
        initialSession={state.created.session}
        interviewMathMode={interviewMathMode}
        questions={state.created.questions}
        queueTitle={interviewMathMode ? t("Interview Math Questions") : state.title}
        sessionEyebrow={t(interviewMathMode ? "Custom Interview Math" : "Custom Content")}
        sessionTitle={t("{title} {mode}", { title: state.title, mode: t(interviewMathMode ? "Interview Math" : "Drill") })}
        warnings={warnings}
      />
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
