"use client";

import { useEffect, useRef, useState } from "react";

import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { PageHeader } from "@/components/PageHeader";
import { buttonClass, cx, uiInputs, uiText } from "@/components/uiStyles";
import {
  brightCartFullCase
} from "@/data/casePractice/fullCaseSimulations";
import { BrainstormingResponseFields } from "@/features/case-practice/brainstorming/BrainstormingDrill";
import { savePracticeAttempt } from "@/features/case-practice/practiceRecords";
import { QuestioningResponseFields } from "@/features/case-practice/questioning/QuestioningPractice";
import type { CaseQuestioningQuestion } from "@/features/case-practice/questioning/questioningScoring";
import {
  getFullCaseCalculationQuestion,
  scoreFullCaseSimulation,
  type FullCaseScore
} from "@/features/case-practice/simulation/fullCaseScoring";
import type { FullCaseSimulationSpec } from "@/features/case-practice/simulation/fullCaseTypes";
import { StructuringResponseFields } from "@/features/case-practice/structuring/StructuringPractice";
import { SynthesisResponseFields } from "@/features/case-practice/synthesis/SynthesisPractice";
import {
  SYNTHESIS_DIMENSIONS,
  type SynthesisDimension,
  type SynthesisResponse
} from "@/features/case-practice/synthesis/synthesisScoring";
import { ExhibitChartRenderer } from "@/features/exhibits/ExhibitChartRenderer";
import { isExhibitChartDataset } from "@/features/exhibits/exhibitChartData";
import { ExhibitTableRenderer } from "@/features/exhibits/ExhibitTableRenderer";
import { useI18n } from "@/features/i18n/I18nProvider";
import { formatLabel } from "@/lib/format";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

interface FullCaseSimulationProps {
  backHref?: string;
  simulation?: FullCaseSimulationSpec;
  storageFactory?: () => AppStorage;
}

type SaveState = "error" | "idle" | "saved" | "saving";

type FullCaseStageId = "brainstorming" | "calculation" | "questioning" | "structure" | "synthesis";

const fullCaseStages = [
  { id: "questioning", label: "Questioning" },
  { id: "structure", label: "Structure" },
  { id: "calculation", label: "Exhibit and math" },
  { id: "brainstorming", label: "Brainstorm" },
  { id: "synthesis", label: "Synthesize" }
] as const satisfies readonly { id: FullCaseStageId; label: string }[];

const stageHeadingIds: Record<FullCaseStageId, string> = {
  brainstorming: "brainstorm-stage-heading",
  calculation: "calculation-stage-heading",
  questioning: "questioning-stage-heading",
  structure: "structure-stage-heading",
  synthesis: "synthesis-stage-heading"
};

export function FullCaseSimulation({
  backHref = "/case-practice",
  simulation = brightCartFullCase,
  storageFactory = createIndexedDbAppStorage
}: FullCaseSimulationProps) {
  const { locale, t } = useI18n();
  const stages = simulation.questioning === undefined ? fullCaseStages.slice(1) : fullCaseStages;
  const [stage, setStage] = useState(0);
  const [questions, setQuestions] = useState<CaseQuestioningQuestion[]>(() => initialQuestions(simulation));
  const [includeQuestionRanking, setIncludeQuestionRanking] = useState(false);
  const [hypothesisId, setHypothesisId] = useState("");
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [calculationInput, setCalculationInput] = useState("");
  const [ideaIds, setIdeaIds] = useState<string[]>([]);
  const [priorityIdeaIds, setPriorityIdeaIds] = useState<string[]>([]);
  const [synthesis, setSynthesis] = useState<Partial<SynthesisResponse>>({});
  const [result, setResult] = useState<FullCaseScore>();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const startedAtRef = useRef(0);
  const nextQuestionNumberRef = useRef((simulation.questioning?.minimumQuestions ?? 0) + 1);
  const calculationQuestion = getFullCaseCalculationQuestion(simulation);
  const currentStage = stages[stage];

  useEffect(() => {
    if (startedAtRef.current === 0) return;

    const target = document.getElementById(
      result === undefined && currentStage !== undefined
        ? stageHeadingIds[currentStage.id]
        : "full-case-result-heading"
    );

    target?.focus();
    target?.scrollIntoView({ block: "start" });
  }, [currentStage, result, stage]);

  function markStarted(): void {
    startedAtRef.current ||= Date.now();
  }

  function toggleBranch(branchId: string): void {
    markStarted();
    setBranchIds((current) =>
      current.includes(branchId) ? current.filter((id) => id !== branchId) : [...current, branchId]
    );
  }

  function updateQuestion(id: string, text: string): void {
    markStarted();
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, text } : question));
  }

  function addQuestion(): void {
    const prompt = simulation.questioning;
    if (prompt === undefined || questions.length >= prompt.maximumQuestions) return;
    markStarted();
    const number = nextQuestionNumberRef.current;
    nextQuestionNumberRef.current += 1;
    setQuestions((current) => [...current, { id: `${prompt.id}-question-${number}`, text: "" }]);
  }

  function removeQuestion(id: string): void {
    const prompt = simulation.questioning;
    if (prompt === undefined || questions.length <= prompt.minimumQuestions) return;
    markStarted();
    setQuestions((current) => current.filter((question) => question.id !== id));
  }

  function moveQuestion(id: string, offset: -1 | 1): void {
    markStarted();
    setQuestions((current) => {
      const index = current.findIndex((question) => question.id === id);
      const destination = index + offset;
      if (index < 0 || destination < 0 || destination >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
      return reordered;
    });
  }

  function toggleIdea(ideaId: string, checked: boolean): void {
    markStarted();
    setIdeaIds((current) => {
      if (!checked) {
        setPriorityIdeaIds((priorities) => priorities.filter((id) => id !== ideaId));
        return current.filter((id) => id !== ideaId);
      }

      return current.includes(ideaId) || current.length >= simulation.brainstorming.selectionLimit
        ? current
        : [...current, ideaId];
    });
  }

  function togglePriority(ideaId: string, checked: boolean): void {
    markStarted();
    if (!ideaIds.includes(ideaId)) return;

    setPriorityIdeaIds((current) => {
      if (!checked) return current.filter((id) => id !== ideaId);
      return current.includes(ideaId) || current.length >= simulation.brainstorming.priorityLimit
        ? current
        : [...current, ideaId];
    });
  }

  function chooseSynthesis(dimension: SynthesisDimension, optionId: string): void {
    markStarted();
    setSynthesis((current) => ({ ...current, [dimension]: optionId }));
  }

  function moveToStage(nextStage: number): void {
    markStarted();
    setStage(Math.max(0, Math.min(stages.length - 1, nextStage)));
  }

  async function completeCase(): Promise<void> {
    if (!isSynthesisComplete(synthesis) || !canContinueStage(stages.length - 1)) return;

    const completedAt = new Date();
    const score = scoreFullCaseSimulation(simulation, {
      structure: { hypothesisId, branchIds },
      calculationInput,
      brainstorming: { selectedIdeaIds: ideaIds, priorityIdeaIds },
      ...(simulation.questioning === undefined
        ? {}
        : {
            questioning: {
              includeRanking: includeQuestionRanking,
              questions: questions.map((question, index) => ({
                ...question,
                ...(includeQuestionRanking ? { rank: index + 1 } : {})
              }))
            }
          }),
      synthesis
    }, locale);
    setResult(score);
    setSaveState("saving");

    try {
      const storage = storageFactory();
      try {
        await savePracticeAttempt(storage, {
          module: "full_case",
          itemId: simulation.id,
          completedAt: completedAt.toISOString(),
          score: score.totalScore,
          maxScore: score.maxScore,
          durationSeconds: Math.max(
            1,
            Math.round((completedAt.getTime() - (startedAtRef.current || completedAt.getTime())) / 1_000)
          )
        });
      } finally {
        storage.close();
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function resetCase(): void {
    setStage(0);
    setQuestions(initialQuestions(simulation));
    setIncludeQuestionRanking(false);
    setHypothesisId("");
    setBranchIds([]);
    setCalculationInput("");
    setIdeaIds([]);
    setPriorityIdeaIds([]);
    setSynthesis({});
    setResult(undefined);
    setSaveState("idle");
    nextQuestionNumberRef.current = (simulation.questioning?.minimumQuestions ?? 0) + 1;
    startedAtRef.current = 0;
  }

  function canContinueStage(stageIndex: number): boolean {
    const stageId = stages[stageIndex]?.id;
    if (stageId === "questioning") return questions.every((question) => question.text.trim() !== "");
    if (stageId === "structure") return hypothesisId !== "" && branchIds.length > 0;
    if (stageId === "calculation") return calculationInput.trim() !== "";
    if (stageId === "brainstorming") {
      return (
        ideaIds.length === simulation.brainstorming.selectionLimit &&
        priorityIdeaIds.length === simulation.brainstorming.priorityLimit
      );
    }
    return stageId === "synthesis" && isSynthesisComplete(synthesis);
  }

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: backHref, label: t("Back to Case Practice") }}
        description={t("Work from an opening hypothesis through quantitative evidence to a final recommendation. Feedback is held until the case is complete.")}
        eyebrow={t("Integrated Practice")}
        title={t("Full Case Simulation")}
      />

      <section
        aria-labelledby="full-case-heading"
        className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 border border-ink/15 border-t-2 border-t-coral bg-white p-5 sm:p-6"
      >
        <p className={cx(uiText.eyebrow, "min-w-0 text-teal [overflow-wrap:anywhere]")}>{simulation.client}</p>
        <h2 className={uiText.sectionTitle} id="full-case-heading">
          {simulation.title}
        </h2>
        <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")}>{simulation.situation}</p>
      </section>

      {result === undefined ? (
        <>
          <StageProgress stage={stage} stages={stages} />

          {currentStage?.id === "questioning" && simulation.questioning !== undefined ? (
            <QuestioningStage
              includeRanking={includeQuestionRanking}
              onAdd={addQuestion}
              onMove={moveQuestion}
              onRankingChange={(checked) => {
                markStarted();
                setIncludeQuestionRanking(checked);
              }}
              onRemove={removeQuestion}
              onTextChange={updateQuestion}
              prompt={simulation.questioning}
              questions={questions}
            />
          ) : null}
          {currentStage?.id === "structure" ? (
            <StructureStage
              branchIds={branchIds}
              hypothesisId={hypothesisId}
              onHypothesisChange={(id) => {
                markStarted();
                setHypothesisId(id);
              }}
              onToggleBranch={toggleBranch}
              simulation={simulation}
            />
          ) : null}
          {currentStage?.id === "calculation" ? (
            <CalculationStage
              input={calculationInput}
              onChange={(value) => {
                markStarted();
                setCalculationInput(value);
              }}
              simulation={simulation}
            />
          ) : null}
          {currentStage?.id === "brainstorming" ? (
            <BrainstormStage
              ideaIds={ideaIds}
              onToggleIdea={toggleIdea}
              onTogglePriority={togglePriority}
              priorityIdeaIds={priorityIdeaIds}
              simulation={simulation}
            />
          ) : null}
          {currentStage?.id === "synthesis" ? (
            <SynthesisStage onChoose={chooseSynthesis} response={synthesis} simulation={simulation} />
          ) : null}

          <div className="flex flex-wrap justify-between gap-3 border-t border-ink/10 pt-6">
            <button
              className={buttonClass("secondary", "disabled:cursor-not-allowed disabled:opacity-50")}
              disabled={stage === 0}
              onClick={() => moveToStage(stage - 1)}
              type="button"
            >
              {t("Previous Stage")}
            </button>
            {stage < stages.length - 1 ? (
              <button
                className={buttonClass("primary", "disabled:cursor-not-allowed disabled:opacity-50")}
                disabled={!canContinueStage(stage)}
                onClick={() => moveToStage(stage + 1)}
                type="button"
              >
                {t("Continue to {stage}", { stage: t(stages[stage + 1]?.label ?? "") })}
              </button>
            ) : (
              <button
                className={buttonClass("primary", "disabled:cursor-not-allowed disabled:opacity-50")}
                disabled={!canContinueStage(stage) || saveState === "saving"}
                onClick={() => void completeCase()}
                type="button"
              >
                {t("Complete Case")}
              </button>
            )}
          </div>
        </>
      ) : (
        <FullCaseReview
          calculationQuestion={calculationQuestion}
          onReset={resetCase}
          result={result}
          saveState={saveState}
          simulation={simulation}
        />
      )}
    </main>
  );
}

function StageProgress({
  stage,
  stages
}: {
  stage: number;
  stages: readonly { id: FullCaseStageId; label: string }[];
}) {
  const { formatNumber, t } = useI18n();

  return (
    <nav aria-label={t("Case stages")} id="full-case-stage-progress">
      <ol className={cx("grid grid-cols-2 gap-2", stages.length === 5 ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-4")}>
        {stages.map(({ id, label }, index) => (
          <li
            aria-current={stage === index ? "step" : undefined}
            className={cx(
              "min-h-14 rounded-md border px-3 py-2 text-sm font-semibold",
              stage === index ? "border-teal bg-mint text-teal" : "border-ink/10 bg-white text-ink/65"
            )}
            key={id}
          >
            <span className="block text-xs font-medium">{t("Stage {number}", { number: formatNumber(index + 1) })}</span>
            {t(label)}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function QuestioningStage({
  includeRanking,
  onAdd,
  onMove,
  onRankingChange,
  onRemove,
  onTextChange,
  prompt,
  questions,
}: {
  includeRanking: boolean;
  onAdd: () => void;
  onMove: (id: string, offset: -1 | 1) => void;
  onRankingChange: (checked: boolean) => void;
  onRemove: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  prompt: NonNullable<FullCaseSimulationSpec["questioning"]>;
  questions: readonly CaseQuestioningQuestion[];
}) {
  const { t } = useI18n();

  return (
    <section aria-labelledby="questioning-stage-heading" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
        <h2 className={uiText.sectionTitle} id="questioning-stage-heading" tabIndex={-1}>
          {t("Clarify and diagnose")}
        </h2>
        <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")}>{prompt.objective}</p>
      </div>
      <QuestioningResponseFields
        includeRanking={includeRanking}
        onAdd={onAdd}
        onMove={onMove}
        onRankingChange={onRankingChange}
        onRemove={onRemove}
        onTextChange={onTextChange}
        prompt={prompt}
        questions={questions}
      />
    </section>
  );
}

function StructureStage({
  branchIds,
  hypothesisId,
  onHypothesisChange,
  onToggleBranch,
  simulation
}: {
  branchIds: readonly string[];
  hypothesisId: string;
  onHypothesisChange: (id: string) => void;
  onToggleBranch: (id: string) => void;
  simulation: FullCaseSimulationSpec;
}) {
  const { t } = useI18n();
  const prompt = simulation.structure;

  return (
    <section aria-labelledby="structure-stage-heading" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
        <h2 className={uiText.sectionTitle} id="structure-stage-heading" tabIndex={-1}>
          {t("Open the case")}
        </h2>
        <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")}>{prompt.objective}</p>
      </div>
      <StructuringResponseFields
        branchIds={branchIds}
        hypothesisId={hypothesisId}
        onHypothesisChange={onHypothesisChange}
        onToggleBranch={onToggleBranch}
        prompt={prompt}
      />
    </section>
  );
}

function CalculationStage({
  input,
  onChange,
  simulation
}: {
  input: string;
  onChange: (value: string) => void;
  simulation: FullCaseSimulationSpec;
}) {
  const { t } = useI18n();
  const question = getFullCaseCalculationQuestion(simulation);

  return (
    <section aria-labelledby="calculation-stage-heading" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
        <h2 className={uiText.sectionTitle} id="calculation-stage-heading" tabIndex={-1}>
          {t("Read the exhibit and calculate")}
        </h2>
      </div>
      {isExhibitChartDataset(simulation.exhibit) ? (
        <ExhibitChartRenderer dataset={simulation.exhibit} />
      ) : (
        <ExhibitTableRenderer dataset={simulation.exhibit} />
      )}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 border border-ink/15 border-t-2 border-t-teal bg-white p-5 sm:p-6">
        <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")}>{question.prompt}</p>
        <label className={cx(uiText.controlLabel, "grid max-w-md gap-2")} htmlFor="full-case-calculation">
          {t("Your answer")}
          {question.answer.unit === undefined || question.answer.unit === "none"
            ? null
            : ` (${t(formatLabel(question.answer.unit))})`}
          <input
            autoComplete="off"
            className={uiInputs.base}
            id="full-case-calculation"
            inputMode="decimal"
            onChange={(event) => onChange(event.currentTarget.value)}
            placeholder={t("Enter a value")}
            value={input}
          />
        </label>
      </div>
    </section>
  );
}

function BrainstormStage({
  ideaIds,
  onToggleIdea,
  onTogglePriority,
  priorityIdeaIds,
  simulation
}: {
  ideaIds: readonly string[];
  onToggleIdea: (id: string, checked: boolean) => void;
  onTogglePriority: (id: string, checked: boolean) => void;
  priorityIdeaIds: readonly string[];
  simulation: FullCaseSimulationSpec;
}) {
  const { t } = useI18n();
  const prompt = simulation.brainstorming;

  return (
    <section aria-labelledby="brainstorm-stage-heading" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
      <h2 className="sr-only" id="brainstorm-stage-heading" tabIndex={-1}>{t("Brainstorming stage")}</h2>
      <BrainstormingResponseFields
        description={prompt.question}
        heading={t("Generate and prioritize actions")}
        onIdeaChange={onToggleIdea}
        onPriorityChange={onTogglePriority}
        priorityIdeaIds={priorityIdeaIds}
        prompt={prompt}
        selectedIdeaIds={ideaIds}
      />
    </section>
  );
}

function SynthesisStage({
  onChoose,
  response,
  simulation
}: {
  onChoose: (dimension: SynthesisDimension, optionId: string) => void;
  response: Partial<SynthesisResponse>;
  simulation: FullCaseSimulationSpec;
}) {
  const { t } = useI18n();
  const prompt = simulation.synthesis;

  return (
    <section aria-labelledby="synthesis-stage-heading" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
        <h2 className={uiText.sectionTitle} id="synthesis-stage-heading" tabIndex={-1}>
          {t("Close the case")}
        </h2>
        <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")}>{prompt.decision}</p>
      </div>

      <section
        className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 border-y border-ink/20 py-5"
        aria-labelledby="case-evidence-heading"
      >
        <h3 className={uiText.subsectionTitle} id="case-evidence-heading">
          {t("Evidence collected")}
        </h3>
        <ul className={cx(uiText.body, "grid list-disc gap-2 pl-5")}>
          {prompt.facts.map((fact) => (
            <li className="min-w-0 [overflow-wrap:anywhere]" key={fact}>{fact}</li>
          ))}
        </ul>
      </section>

      <SynthesisResponseFields onChoose={onChoose} prompt={prompt} response={response} />
    </section>
  );
}

function FullCaseReview({
  calculationQuestion,
  onReset,
  result,
  saveState,
  simulation
}: {
  calculationQuestion: ReturnType<typeof getFullCaseCalculationQuestion>;
  onReset: () => void;
  result: FullCaseScore;
  saveState: SaveState;
  simulation: FullCaseSimulationSpec;
}) {
  const { formatNumber, t } = useI18n();

  return (
    <section aria-labelledby="full-case-result-heading" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
      <div className="grid gap-5 border-y border-teal/20 bg-mint/40 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={cx(uiText.eyebrow, "text-teal")}>{t("Case complete")}</p>
            <h2 className={uiText.sectionTitle} id="full-case-result-heading" tabIndex={-1}>
              {t("Integrated case review")}
            </h2>
          </div>
          <p className={uiText.metric} data-testid="full-case-total-score">
            {formatNumber(result.totalScore)} / {formatNumber(result.maxScore)}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {result.sections.map((section) => (
            <article className="border border-ink/15 border-t-2 border-t-teal bg-white p-4" key={section.id}>
              <h3 className="text-sm font-semibold text-ink">{t(section.label)}</h3>
              <p className="mt-2 text-xl font-semibold text-teal">
                {formatNumber(section.score)} / {formatNumber(section.maxScore)}
              </p>
            </article>
          ))}
        </div>
      </div>

      {saveState === "saving" ? (
        <LocalSaveNotice detail={t("Recording the completed case in local progress.")} label={t("Saving")} tone="neutral" />
      ) : null}
      {saveState === "saved" ? (
        <LocalSaveNotice detail={t("This full-case result is available to your local preparation roadmap.")} />
      ) : null}
      {saveState === "error" ? (
        <LocalSaveNotice
          detail={t("Your score is still visible, but this case could not be saved locally.")}
          label={t("Not Saved")}
          tone="error"
        />
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {result.questioning === undefined ? null : (
          <article className="grid min-w-0 content-start gap-3 border border-ink/15 border-t-2 border-t-teal bg-white p-5 sm:p-6">
            <h3 className={uiText.sectionTitle}>{t("Questioning feedback")}</h3>
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <ScoreStat label={t("Coverage")} max={result.questioning.coverage.maxScore} score={result.questioning.coverage.score} />
              <ScoreStat label={t("Relevance")} max={result.questioning.relevance.maxScore} score={result.questioning.relevance.score} />
              <ScoreStat label={t("Distinctness")} max={result.questioning.distinctness.maxScore} score={result.questioning.distinctness.score} />
            </dl>
          </article>
        )}
        <article className="grid min-w-0 content-start gap-3 border border-ink/15 border-t-2 border-t-teal bg-white p-5 sm:p-6">
          <h3 className={uiText.sectionTitle}>{t("Structure feedback")}</h3>
          <ul className={cx(uiText.body, "grid list-disc gap-2 pl-5")}>
            {result.structure.feedback.map((item) => (
              <li className="min-w-0 [overflow-wrap:anywhere]" key={item}>{t(item)}</li>
            ))}
          </ul>
        </article>

        <article
          className={cx(
            "grid min-w-0 content-start gap-3 border border-ink/15 border-t-2 bg-white p-5 sm:p-6",
            result.calculation.isCorrect ? "border-t-teal" : "border-t-coral"
          )}
        >
          <h3 className={uiText.sectionTitle}>{t("Exhibit and math feedback")}</h3>
          <p className={uiText.bodyStrong}>{t(result.calculation.feedbackMessage)}</p>
          <ol className={cx(uiText.body, "grid list-decimal gap-2 pl-5")}>
            {calculationQuestion.explanation.steps.map((step) => (
              <li className="min-w-0 [overflow-wrap:anywhere]" key={step}>{step}</li>
            ))}
          </ol>
        </article>

        <article className="grid min-w-0 content-start gap-3 border border-ink/15 border-t-2 border-t-teal bg-white p-5 sm:p-6">
          <h3 className={uiText.sectionTitle}>{t("Brainstorming feedback")}</h3>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <ScoreStat label={t("Coverage")} max={result.brainstorming.coverage.maxScore} score={result.brainstorming.coverage.score} />
            <ScoreStat label={t("Relevance")} max={result.brainstorming.relevance.maxScore} score={result.brainstorming.relevance.score} />
            <ScoreStat
              label={t("Priorities")}
              max={result.brainstorming.prioritization.maxScore}
              score={result.brainstorming.prioritization.score}
            />
          </dl>
        </article>

        <article className="grid min-w-0 content-start gap-3 border border-ink/15 border-t-2 border-t-coral bg-white p-5 sm:p-6">
          <h3 className={uiText.sectionTitle}>{t("Model close")}</h3>
          <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")}>{simulation.synthesis.modelClose}</p>
        </article>
      </div>

      <button
        className={buttonClass("primary", "disabled:cursor-not-allowed disabled:opacity-50")}
        disabled={saveState === "saving"}
        onClick={onReset}
        type="button"
      >
        {t("Retry Full Case")}
      </button>
    </section>
  );
}

function ScoreStat({ label, max, score }: { label: string; max: number; score: number }) {
  const { formatNumber } = useI18n();

  return (
    <div>
      <dt className="text-ink/65">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">
        {formatNumber(score)} / {formatNumber(max)}
      </dd>
    </div>
  );
}

function isSynthesisComplete(response: Partial<SynthesisResponse>): response is SynthesisResponse {
  return SYNTHESIS_DIMENSIONS.every((dimension) => response[dimension] !== undefined);
}

function initialQuestions(simulation: FullCaseSimulationSpec): CaseQuestioningQuestion[] {
  return Array.from({ length: simulation.questioning?.minimumQuestions ?? 0 }, (_, index) => ({
    id: `${simulation.questioning?.id ?? simulation.id}-question-${index + 1}`,
    text: ""
  }));
}
