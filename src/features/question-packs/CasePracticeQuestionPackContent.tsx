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
import type { FullCaseSimulation } from "@/features/case-practice/simulation/FullCaseSimulation";
import { StructuringPractice } from "@/features/case-practice/structuring/StructuringPractice";
import { SynthesisPractice } from "@/features/case-practice/synthesis/SynthesisPractice";
import { useI18n } from "@/features/i18n/I18nProvider";
import { toQuestionPackCasePracticeContent } from "@/features/question-packs/questionPack";
import {
  QuestionPackContentBoundary,
  SpecializedPackState,
  useInstalledPack
} from "@/features/question-packs/InstalledPackContent";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { AppStorage, CasePracticeQuestionPackRecord } from "@/lib/storage/appStorageTypes";

export type CasePracticePackView =
  | "brainstorming"
  | "fit"
  | "hub"
  | "lessons"
  | "questioning"
  | "simulation"
  | "structuring"
  | "synthesis";

type CasePracticeViewProps =
  | { view: Exclude<CasePracticePackView, "simulation">; SimulationComponent?: never }
  | { view: "simulation"; SimulationComponent: typeof FullCaseSimulation };

type CasePracticeQuestionPackContentProps = CasePracticeViewProps & {
  caseId?: string;
  packId?: string;
  storageFactory?: () => AppStorage;
};

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

export function CasePracticeQuestionPackPage(props: CasePracticeViewProps) {
  const { t } = useI18n();
  return (
    <Suspense fallback={<LoadingState label={t("Loading case practice...")} />}>
      <CasePracticeQueryContent {...props} />
    </Suspense>
  );
}

function CasePracticeQueryContent(props: CasePracticeViewProps) {
  const searchParams = useSearchParams();

  return (
    <CasePracticeQuestionPackContent
      {...props}
      caseId={searchParams.get("case")?.trim() || undefined}
      packId={searchParams.get("pack")?.trim() || undefined}
    />
  );
}

export function CasePracticeQuestionPackContent({
  caseId,
  packId,
  storageFactory = createIndexedDbAppStorage,
  view,
  SimulationComponent
}: CasePracticeQuestionPackContentProps) {
  const state = useInstalledPack(packId, "case_practice", storageFactory);

  if (state.status === "loading" || state.status === "error") {
    return <SpecializedPackState kindLabel="case-practice" packId={packId} state={state} />;
  }

  const directPack = state.source === "direct" ? state.packs[0] : undefined;
  const boundaryPack = !state.includeBuiltIns && state.packs.length === 1 ? state.packs[0] : undefined;
  const content = mergeCasePracticeContent(state.includeBuiltIns, state.packs);
  const backHref = directPack === undefined ? "/case-practice" : `/case-practice?pack=${encodeURIComponent(directPack.id)}`;
  const contentKey = [state.includeBuiltIns ? "built-in" : "selected-only", ...state.packs.map(({ id }) => id)].join(":");
  const renderPackContent = (children: ReactNode) => (
    <QuestionPackContentBoundary pack={boundaryPack}>{children}</QuestionPackContentBoundary>
  );

  if (view === "hub") {
    if (state.source === "preference" && state.includeBuiltIns && state.packs.length === 0) {
      return renderPackContent(<CasePracticeHub />);
    }

    return renderPackContent(directPack !== undefined ? (
      <CasePracticeHub
        action={{ href: "/content-packs/?view=installed", label: "Manage Content Packs" }}
        description={directPack.description ?? `Practice the locally installed ${directPack.title} content pack.`}
        eyebrow="Custom Content"
        modules={toHubModules(content, directPack.id)}
        summary="Choose an exercise included in this installed pack."
        title={directPack.title}
      />
    ) : (
      <CasePracticeHub
        action={{ href: "/settings#question-pool-settings", label: "Question Pool Settings" }}
        description={state.includeBuiltIns
          ? "Practice built-in case skills together with your selected local content packs."
          : "Practice only the case exercises from your selected local content packs."}
        eyebrow="Selected Content"
        modules={toHubModules(content, undefined, state.includeBuiltIns)}
        summary="Choose an exercise available in the active question pool."
        title="Case Practice"
      />
    ));
  }

  if (view === "structuring" && content.structuringPrompts?.length) {
    return renderPackContent(
      <StructuringPractice
        backHref={backHref}
        key={contentKey}
        prompts={content.structuringPrompts}
      />
    );
  }

  if (view === "questioning" && content.questioningPrompts?.length) {
    return renderPackContent(
      <QuestioningPractice
        backHref={backHref}
        key={contentKey}
        prompts={content.questioningPrompts}
      />
    );
  }

  if (view === "brainstorming" && content.brainstormingPrompts?.length) {
    return renderPackContent(
      <BrainstormingDrill
        backHref={backHref}
        key={contentKey}
        prompts={content.brainstormingPrompts}
      />
    );
  }

  if (view === "synthesis" && content.synthesisPrompts?.length) {
    return renderPackContent(
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
    return renderPackContent(
      <ConceptLessonsView
        backHref={backHref}
        key={contentKey}
        lessons={content.lessons}
      />
    );
  }

  if (view === "fit" && content.fitPrompts?.length) {
    return renderPackContent(
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
      return renderPackContent(
        <SimulationComponent
          backHref={backHref}
          key={`${contentKey}:${simulation.id}`}
          simulation={simulation}
        />
      );
    }
  }

  return renderPackContent(<MissingPackContent backHref={backHref} view={view} />);
}

function toHubModules(
  content: CasePracticeContent,
  packId?: string,
  includePrepPlan = false
): CasePracticeHubModule[] {
  const route = (pathname: string) => packId === undefined
    ? pathname
    : `${pathname}?pack=${encodeURIComponent(packId)}`;
  const modules: CasePracticeHubModule[] = [];

  if (content.questioningPrompts?.length) {
    modules.push({
      description: "Ask focused clarifying and diagnostic questions, then compare them with an authored rubric.",
      href: route("/case-practice/questioning"),
      label: "Questioning",
      meta: "Opening"
    });
  }
  if (content.structuringPrompts?.length) {
    modules.push({
      description: "Build a hypothesis-led issue tree and compare it with the pack model.",
      href: route("/case-practice/structuring"),
      label: "Structuring",
      meta: "Opening"
    });
  }
  if (content.brainstormingPrompts?.length) {
    modules.push({
      description: "Generate relevant ideas in themes, then identify the strongest priorities.",
      href: route("/case-practice/brainstorming"),
      label: "Brainstorming",
      meta: "Exploration"
    });
  }
  if (content.synthesisPrompts?.length) {
    modules.push({
      description: "Turn case evidence into an answer-first conclusion with risks and next steps.",
      href: route("/case-practice/synthesis"),
      label: "Synthesis",
      meta: "Closing"
    });
  }
  if (content.lessons?.length) {
    modules.push({
      description: "Review pack lessons and worked examples, then test the key idea.",
      href: route("/case-practice/lessons"),
      label: "Concept Lessons",
      meta: "Learn"
    });
  }
  if (content.fitPrompts?.length) {
    modules.push({
      description: "Use the pack prompts to rehearse stories from your private local story bank.",
      href: route("/case-practice/fit"),
      label: "Fit Practice",
      meta: "Behavioral"
    });
  }
  if (includePrepPlan) {
    modules.push({
      description: "Set an interview target and generate a local weekly preparation sequence.",
      href: "/case-practice/plan",
      label: "Prep Plan",
      meta: "Roadmap"
    });
  }
  for (const fullCase of content.fullCases ?? []) {
    const caseQuery = `case=${encodeURIComponent(fullCase.id)}`;
    modules.push({
      description: fullCase.situation,
      href: packId === undefined
        ? `/case-practice/simulation?${caseQuery}`
        : `/case-practice/simulation?pack=${encodeURIComponent(packId)}&${caseQuery}`,
      label: fullCase.title,
      meta: "Full Case"
    });
  }

  return modules;
}

function mergeCasePracticeContent(
  includeBuiltIns: boolean,
  packs: readonly CasePracticeQuestionPackRecord[]
): CasePracticeContent {
  const sources: CasePracticeContent[] = [
    ...(includeBuiltIns ? [builtInContent] : []),
    ...packs.map(toQuestionPackCasePracticeContent)
  ];

  return {
    brainstormingPrompts: sources.flatMap(({ brainstormingPrompts: prompts }) => prompts ?? []),
    fitPrompts: sources.flatMap(({ fitPrompts: prompts }) => prompts ?? []),
    fullCases: sources.flatMap(({ fullCases: cases }) => cases ?? []),
    lessons: sources.flatMap(({ lessons }) => lessons ?? []),
    questioningPrompts: sources.flatMap(({ questioningPrompts: prompts }) => prompts ?? []),
    structuringPrompts: sources.flatMap(({ structuringPrompts: prompts }) => prompts ?? []),
    synthesisPrompts: sources.flatMap(({ synthesisPrompts: prompts }) => prompts ?? [])
  };
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
