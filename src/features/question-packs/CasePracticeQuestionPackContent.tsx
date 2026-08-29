"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { brainstormingPrompts } from "@/data/casePractice/brainstormingPrompts";
import { conceptLessons } from "@/data/casePractice/conceptLessons";
import { fitPracticePrompts } from "@/data/casePractice/fitPrompts";
import { fullCaseSimulations } from "@/data/casePractice/fullCaseSimulations";
import { questioningPrompts } from "@/data/casePractice/questioningPrompts";
import { structuringPrompts } from "@/data/casePractice/structuringPrompts";
import { synthesisPrompts } from "@/data/casePractice/synthesisPrompts";
import { BrainstormingDrill } from "@/features/case-practice/brainstorming/BrainstormingDrill";
import {
  CasePracticeHub,
  type CasePracticeHubModule
} from "@/features/case-practice/CasePracticeHub";
import { FitPracticeView } from "@/features/case-practice/fit/FitPracticeView";
import { ConceptLessonsView } from "@/features/case-practice/lessons/ConceptLessonsView";
import { QuestioningPractice } from "@/features/case-practice/questioning/QuestioningPractice";
import { FullCaseSimulation } from "@/features/case-practice/simulation/FullCaseSimulation";
import { StructuringPractice } from "@/features/case-practice/structuring/StructuringPractice";
import { SynthesisPractice } from "@/features/case-practice/synthesis/SynthesisPractice";
import { useI18n } from "@/features/i18n/I18nProvider";
import { toQuestionPackCasePracticeContent } from "@/features/question-packs/questionPack";
import {
  SpecializedPackState,
  useInstalledPack
} from "@/features/question-packs/SpecializedQuestionPackContent";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { AppStorage } from "@/lib/storage/appStorageTypes";

export type CasePracticePackView =
  | "brainstorming"
  | "fit"
  | "hub"
  | "lessons"
  | "questioning"
  | "simulation"
  | "structuring"
  | "synthesis";

interface CasePracticeQuestionPackContentProps {
  caseId?: string;
  packId?: string;
  storageFactory?: () => AppStorage;
  view: CasePracticePackView;
}

type ReadonlyCollection<T> = T extends (infer TItem)[] ? readonly TItem[] : T;
type CasePracticeContent = {
  [TKey in keyof ReturnType<typeof toQuestionPackCasePracticeContent>]: ReadonlyCollection<
    ReturnType<typeof toQuestionPackCasePracticeContent>[TKey]
  >;
};

const builtInContent: CasePracticeContent = {
  brainstormingPrompts,
  fitPrompts: fitPracticePrompts,
  fullCases: fullCaseSimulations,
  lessons: conceptLessons,
  questioningPrompts,
  structuringPrompts,
  synthesisPrompts
};

export function CasePracticeQuestionPackPage({ view }: { view: CasePracticePackView }) {
  const { t } = useI18n();
  return (
    <Suspense fallback={<LoadingState label={t("Loading case practice...")} />}>
      <CasePracticeQueryContent view={view} />
    </Suspense>
  );
}

function CasePracticeQueryContent({ view }: { view: CasePracticePackView }) {
  const searchParams = useSearchParams();

  return (
    <CasePracticeQuestionPackContent
      caseId={searchParams.get("case")?.trim() || undefined}
      packId={searchParams.get("pack")?.trim() || undefined}
      view={view}
    />
  );
}

export function CasePracticeQuestionPackContent({
  caseId,
  packId,
  storageFactory = createIndexedDbAppStorage,
  view
}: CasePracticeQuestionPackContentProps) {
  const state = useInstalledPack(packId, "case_practice", storageFactory);

  if (state.status === "loading" || state.status === "error") {
    return <SpecializedPackState kindLabel="case-practice" packId={packId} state={state} />;
  }

  const pack = state.status === "ready" ? state.pack : undefined;
  const content = pack === undefined ? builtInContent : toQuestionPackCasePracticeContent(pack);
  const backHref = pack === undefined ? "/case-practice" : `/case-practice?pack=${encodeURIComponent(pack.id)}`;
  const contentKey = pack?.id ?? "built-in";

  if (view === "hub") {
    return pack === undefined ? <CasePracticeHub /> : (
      <CasePracticeHub
        action={{ href: "/settings", label: "Manage Content Packs" }}
        description={pack.description ?? `Practice the locally installed ${pack.title} content pack.`}
        eyebrow="Custom Content"
        modules={toHubModules(pack.id, content)}
        summary="Choose an exercise included in this installed pack."
        title={pack.title}
      />
    );
  }

  if (view === "structuring" && content.structuringPrompts?.length) {
    return (
      <StructuringPractice
        backHref={backHref}
        key={contentKey}
        prompts={content.structuringPrompts}
      />
    );
  }

  if (view === "questioning" && content.questioningPrompts?.length) {
    return (
      <QuestioningPractice
        backHref={backHref}
        key={contentKey}
        prompts={content.questioningPrompts}
      />
    );
  }

  if (view === "brainstorming" && content.brainstormingPrompts?.length) {
    return (
      <BrainstormingDrill
        backHref={backHref}
        key={contentKey}
        prompts={content.brainstormingPrompts}
      />
    );
  }

  if (view === "synthesis" && content.synthesisPrompts?.length) {
    return (
      <ExerciseShell
        backHref={backHref}
        description="Build a concise recommendation from the evidence, then compare it with a model close."
        title="Synthesis and Recommendation"
      >
        <SynthesisPractice key={contentKey} prompts={content.synthesisPrompts} />
      </ExerciseShell>
    );
  }

  if (view === "lessons" && content.lessons?.length) {
    return (
      <ConceptLessonsView
        backHref={backHref}
        key={contentKey}
        lessons={content.lessons}
      />
    );
  }

  if (view === "fit" && content.fitPrompts?.length) {
    return (
      <ExerciseShell
        backHref={backHref}
        description="Build evidence-rich stories, rehearse under time pressure, and record a structured self-review."
        title="Fit and Behavioral Practice"
      >
        <FitPracticeView key={contentKey} prompts={content.fitPrompts} />
      </ExerciseShell>
    );
  }

  if (view === "simulation" && content.fullCases?.length) {
    const simulation =
      caseId === undefined
        ? content.fullCases[0]
        : content.fullCases.find((candidate) => candidate.id === caseId);

    if (simulation !== undefined) {
      return (
        <FullCaseSimulation
          backHref={backHref}
          key={`${contentKey}:${simulation.id}`}
          simulation={simulation}
        />
      );
    }
  }

  return <MissingPackContent backHref={backHref} view={view} />;
}

function toHubModules(
  packId: string,
  content: CasePracticeContent
): CasePracticeHubModule[] {
  const packQuery = `pack=${encodeURIComponent(packId)}`;
  const modules: CasePracticeHubModule[] = [];

  if (content.questioningPrompts?.length) {
    modules.push({
      description: "Ask focused clarifying and diagnostic questions, then compare them with an authored rubric.",
      href: `/case-practice/questioning?${packQuery}`,
      label: "Questioning",
      meta: "Opening"
    });
  }
  if (content.structuringPrompts?.length) {
    modules.push({
      description: "Build a hypothesis-led issue tree and compare it with the pack model.",
      href: `/case-practice/structuring?${packQuery}`,
      label: "Structuring",
      meta: "Opening"
    });
  }
  if (content.brainstormingPrompts?.length) {
    modules.push({
      description: "Generate relevant ideas in themes, then identify the strongest priorities.",
      href: `/case-practice/brainstorming?${packQuery}`,
      label: "Brainstorming",
      meta: "Exploration"
    });
  }
  if (content.synthesisPrompts?.length) {
    modules.push({
      description: "Turn case evidence into an answer-first conclusion with risks and next steps.",
      href: `/case-practice/synthesis?${packQuery}`,
      label: "Synthesis",
      meta: "Closing"
    });
  }
  if (content.lessons?.length) {
    modules.push({
      description: "Review pack lessons and worked examples, then test the key idea.",
      href: `/case-practice/lessons?${packQuery}`,
      label: "Concept Lessons",
      meta: "Learn"
    });
  }
  if (content.fitPrompts?.length) {
    modules.push({
      description: "Use the pack prompts to rehearse stories from your private local story bank.",
      href: `/case-practice/fit?${packQuery}`,
      label: "Fit Practice",
      meta: "Behavioral"
    });
  }
  for (const fullCase of content.fullCases ?? []) {
    modules.push({
      description: fullCase.situation,
      href: `/case-practice/simulation?${packQuery}&case=${encodeURIComponent(fullCase.id)}`,
      label: fullCase.title,
      meta: "Full Case"
    });
  }

  return modules;
}

function ExerciseShell({
  backHref = "/case-practice",
  children,
  description,
  title
}: {
  backHref?: string;
  children: ReactNode;
  description: string;
  title: string;
}) {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: backHref, label: t("Back to Case Practice") }}
        description={t(description)}
        eyebrow={t("Case Practice")}
        title={t(title)}
      />
      {children}
    </main>
  );
}

function MissingPackContent({ backHref, view }: { backHref: string; view: CasePracticePackView }) {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: backHref, label: t("Back to Case Practice") }}
        description={t("Choose an exercise that is included in this content pack.")}
        eyebrow={t("Custom Content")}
        title={t("Content Unavailable")}
      />
      <p className="border border-coral/30 border-s-2 border-s-coral bg-coral/10 p-4 text-sm leading-6 text-ink" role="alert">
        {t("This pack does not contain the requested {view} exercise.", { view: t(view.replace("_", "-")) })}
      </p>
    </main>
  );
}
