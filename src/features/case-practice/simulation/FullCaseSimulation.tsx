"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { PageHeader } from "@/components/PageHeader";
import { buttonClass, cx, uiInputs, uiText } from "@/components/uiStyles";
import {
  brightCartFullCase
} from "@/data/casePractice/fullCaseSimulations";
import { BrainstormingResponseFields } from "@/features/case-practice/brainstorming/BrainstormingDrill";
import type { FullCaseDraftRecord } from "@/features/case-practice/practiceTypes";
import { usePracticeAttemptSave, type PracticeAttemptSaveState } from "@/features/case-practice/usePracticeAttemptSave";
import { canResumeFullCaseDraft, fullCaseContentKey, fullCaseDraftId, isFullCaseDraftRecord } from "@/features/case-practice/simulation/fullCaseDraft";
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
import { subscribeToLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import { formatLabel } from "@/lib/format";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

interface FullCaseSimulationProps {
  backHref?: string;
  simulation?: FullCaseSimulationSpec;
  storageFactory?: () => AppStorage;
}

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

// Serialize pending writes across a same-case remount, including an explicit
// deletion requested just before navigation. Only unsettled operations are kept.
const pendingDraftWrites = new Map<string, Promise<void>>();

export function FullCaseSimulation(props: FullCaseSimulationProps) {
  const simulation = props.simulation ?? brightCartFullCase;
  return <FullCaseSession key={JSON.stringify(simulation)} {...props} simulation={simulation} />;
}

function FullCaseSession({
  backHref = "/case-practice",
  simulation: initialSimulation = brightCartFullCase,
  storageFactory: initialStorageFactory = createIndexedDbAppStorage
}: FullCaseSimulationProps) {
  const [simulation] = useState(initialSimulation);
  const [storageFactory] = useState(() => initialStorageFactory);
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
  const { saveState, saveAttempt, retrySave, resetSave } = usePracticeAttemptSave(storageFactory);
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<FullCaseDraftRecord>();
  const [resumeFocusRequest, setResumeFocusRequest] = useState(0);
  const [contentKey, setContentKey] = useState<string>();
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error" | "incompatible">("idle");
  const [draftDeleting, setDraftDeleting] = useState(false);
  const [draftDeleteFailed, setDraftDeleteFailed] = useState(false);
  const draftFocusReturn = useRef<HTMLElement | null>(null);
  const [attemptLocale, setAttemptLocale] = useState<string>(locale);
  const draftRevision = useRef(0);
  const runRevision = useRef(0);
  const lifecycleRevision = useRef(0);
  const dataRevision = useRef(0);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingDraftSnapshot = useRef<FullCaseDraftRecord | undefined>(undefined);
  const flushDraftWriteRef = useRef<() => Promise<void>>(async () => undefined);
  const startedAtRef = useRef(0);
  const nextQuestionNumberRef = useRef((simulation.questioning?.minimumQuestions ?? 0) + 1);
  const calculationQuestion = getFullCaseCalculationQuestion(simulation);
  const currentStage = stages[stage];

  useEffect(() => {
    let cancelled = false;
    const invalidate = () => {
      cancelled = true;
      lifecycleRevision.current += 1;
      draftRevision.current += 1;
    };
    const unsubscribe = subscribeToLocalDataInvalidation(() => {
      dataRevision.current += 1;
      if (draftSaveTimer.current !== undefined) clearTimeout(draftSaveTimer.current);
      draftSaveTimer.current = undefined;
      pendingDraftSnapshot.current = undefined;
      invalidate();
    });
    void (async () => {
      const key = await fullCaseContentKey(simulation);
      const storage = storageFactory();
      try {
        await pendingDraftWrites.get(fullCaseDraftId(simulation.id))?.catch(() => undefined);
        const saved = await storage.get("practice_records", fullCaseDraftId(simulation.id));
        if (cancelled) return;
        setContentKey(key);
        if (saved !== undefined) {
          if (canResumeFullCaseDraft(saved, simulation, key)) setPendingDraft(saved);
          else setDraftStatus("incompatible");
        }
      } finally { storage.close(); }
    })().catch(() => { if (!cancelled) setDraftStatus("error"); });
    return () => { unsubscribe(); invalidate(); };
  }, [simulation, storageFactory]);

  const queueDraftWrite = useCallback((draft?: FullCaseDraftRecord): Promise<void> => {
    const revision = ++draftRevision.current;
    const data = dataRevision.current;
    const run = runRevision.current;
    const id = fullCaseDraftId(simulation.id);
    let storage: AppStorage | undefined;
    let storageError: unknown;
    // Subscribe to data invalidation now, before waiting on an older operation.
    try { storage = storageFactory(); } catch (error) { storageError = error; }
    const pending = (pendingDraftWrites.get(id) ?? Promise.resolve()).catch(() => undefined).then(async () => {
      if (draft !== undefined && (data !== dataRevision.current || run !== runRevision.current)) throw new Error("The draft is no longer active.");
      if (revision === draftRevision.current) setDraftStatus("saving");
      if (storage === undefined) throw storageError;
      if (draft === undefined) await storage.delete("practice_records", id);
      else {
        if (!isFullCaseDraftRecord(draft)) throw new Error("Full-case draft exceeds supported limits.");
        await storage.put("practice_records", draft);
      }
    }).finally(() => { storage?.close(); });
    pendingDraftWrites.set(id, pending);
    const clearPending = () => { if (pendingDraftWrites.get(id) === pending) pendingDraftWrites.delete(id); };
    void pending.then(clearPending, clearPending);
    void pending.then(() => {
      if (revision === draftRevision.current) {
        setDraftStatus(draft === undefined ? "idle" : "saved");
        if (draft === undefined) setDraftDeleteFailed(false);
      }
    }, () => {
      if (revision === draftRevision.current) {
        setDraftStatus("error");
        if (draft === undefined) setDraftDeleteFailed(true);
      }
    });
    return pending;
  }, [simulation.id, storageFactory]);

  const draftSnapshot = useCallback((completedAt?: string): FullCaseDraftRecord => ({
    id: fullCaseDraftId(simulation.id), kind: "full_case_draft", simulationId: simulation.id,
    contentKey: contentKey!, updatedAt: new Date().toISOString(),
    startedAt: new Date(startedAtRef.current || Date.now()).toISOString(),
    ...(completedAt === undefined ? {} : { completedAt }), locale: attemptLocale, stage,
    questions: questions.map(({ id, text }) => ({ id, text })), includeQuestionRanking,
    hypothesisId, branchIds, calculationInput, ideaIds, priorityIdeaIds, synthesis
  }), [attemptLocale, branchIds, calculationInput, contentKey, hypothesisId, ideaIds, includeQuestionRanking, priorityIdeaIds, questions, simulation.id, stage, synthesis]);

  const cancelScheduledDraftWrite = useCallback(() => {
    if (draftSaveTimer.current !== undefined) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = undefined;
    pendingDraftSnapshot.current = undefined;
  }, []);

  const flushScheduledDraftWrite = useCallback((): Promise<void> => {
    if (draftSaveTimer.current !== undefined) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = undefined;
    const draft = pendingDraftSnapshot.current;
    pendingDraftSnapshot.current = undefined;
    return draft === undefined ? Promise.resolve() : queueDraftWrite(draft);
  }, [queueDraftWrite]);

  useEffect(() => {
    flushDraftWriteRef.current = flushScheduledDraftWrite;
  }, [flushScheduledDraftWrite]);

  useEffect(() => () => {
    void flushDraftWriteRef.current().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (draftEnabled && contentKey !== undefined && pendingDraft === undefined && result === undefined) {
      pendingDraftSnapshot.current = draftSnapshot();
      if (draftSaveTimer.current !== undefined) clearTimeout(draftSaveTimer.current);
      draftSaveTimer.current = setTimeout(() => {
        void flushScheduledDraftWrite().catch(() => undefined);
      }, 250);
    } else {
      cancelScheduledDraftWrite();
    }
  }, [cancelScheduledDraftWrite, contentKey, draftEnabled, draftSnapshot, flushScheduledDraftWrite, pendingDraft, result]);

  async function discardDraft(): Promise<void> {
    if (draftDeleting) return;
    draftFocusReturn.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDraftDeleting(true);
    setDraftEnabled(false);
    cancelScheduledDraftWrite();
    const lifecycle = lifecycleRevision.current;
    try {
      await queueDraftWrite();
      if (lifecycle === lifecycleRevision.current) setPendingDraft(undefined);
    } catch { /* The notice retains the failed deletion for a retry. */ }
    finally { if (lifecycle === lifecycleRevision.current) setDraftDeleting(false); }
  }

  async function resumeDraft(): Promise<void> {
    if (pendingDraft === undefined || draftDeleting || draftDeleteFailed) return;
    const run = runRevision.current;
    const lifecycle = lifecycleRevision.current;
    const draft = pendingDraft;
    setStage(draft.stage); setQuestions(draft.questions); setIncludeQuestionRanking(draft.includeQuestionRanking);
    setHypothesisId(draft.hypothesisId); setBranchIds(draft.branchIds); setCalculationInput(draft.calculationInput);
    setIdeaIds(draft.ideaIds); setPriorityIdeaIds(draft.priorityIdeaIds); setSynthesis(draft.synthesis);
    setAttemptLocale(draft.locale);
    startedAtRef.current = Date.parse(draft.startedAt);
    nextQuestionNumberRef.current = Math.max(0, ...draft.questions.map((question) => Number(question.id.split("-").at(-1)) || 0)) + 1;
    setPendingDraft(undefined); setDraftEnabled(true);
    setResumeFocusRequest((current) => current + 1);
    if (draft.completedAt !== undefined && isSynthesisComplete(draft.synthesis)) {
      const score = scoreFullCaseSimulation(simulation, {
        structure: { hypothesisId: draft.hypothesisId, branchIds: draft.branchIds },
        calculationInput: draft.calculationInput,
        brainstorming: { selectedIdeaIds: draft.ideaIds, priorityIdeaIds: draft.priorityIdeaIds },
        ...(simulation.questioning === undefined ? {} : { questioning: {
          includeRanking: draft.includeQuestionRanking,
          questions: draft.questions.map((question, index) => ({ ...question, ...(draft.includeQuestionRanking ? { rank: index + 1 } : {}) }))
        } }), synthesis: draft.synthesis
      }, draft.locale);
      setResult(score);
      if (await persistCaseScore(score, new Date(draft.completedAt)) && run === runRevision.current && lifecycle === lifecycleRevision.current) {
        await queueDraftWrite().catch(() => undefined);
      }
    }
  }

  useEffect(() => {
    if (startedAtRef.current === 0) return;

    const target = document.getElementById(
      result === undefined && currentStage !== undefined
        ? stageHeadingIds[currentStage.id]
        : "full-case-result-heading"
    );

    target?.focus();
    target?.scrollIntoView({ block: "start" });
  }, [currentStage, result, resumeFocusRequest, stage]);

  useEffect(() => {
    if (draftDeleting || draftFocusReturn.current === null) return;
    const previous = draftFocusReturn.current;
    draftFocusReturn.current = null;
    if (document.activeElement !== document.body && document.activeElement !== previous) return;
    const target = previous.isConnected && !previous.matches(":disabled")
      ? previous
      : document.getElementById("full-case-discard-draft") ?? document.getElementById("full-case-draft-opt-in");
    target?.focus();
  }, [draftDeleting]);

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
    const run = runRevision.current;
    const lifecycle = lifecycleRevision.current;

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
    }, attemptLocale);
    setResult(score);
    cancelScheduledDraftWrite();
    if (draftEnabled && contentKey !== undefined) {
      await queueDraftWrite(draftSnapshot(completedAt.toISOString())).catch(() => undefined);
    }
    if (run !== runRevision.current || lifecycle !== lifecycleRevision.current) return;
    if (await persistCaseScore(score, completedAt)) {
      if (draftEnabled && run === runRevision.current && lifecycle === lifecycleRevision.current) await queueDraftWrite().catch(() => undefined);
    }
  }

  function persistCaseScore(score: FullCaseScore, completedAt: Date): Promise<boolean> {
    return saveAttempt({
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
  }

  function resetCase(): void {
    runRevision.current += 1;
    cancelScheduledDraftWrite();
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
    resetSave();
    if (draftEnabled) void queueDraftWrite().catch(() => undefined);
    setDraftEnabled(false);
    setAttemptLocale(locale);
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
        <p className={cx(uiText.eyebrow, "min-w-0 text-teal [overflow-wrap:anywhere]")} dir="auto">{simulation.client}</p>
        <h2 className={uiText.sectionTitle} dir="auto" id="full-case-heading">
          {simulation.title}
        </h2>
        <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")} dir="auto">{simulation.situation}</p>
      </section>

      <section aria-label={t("Local case draft")} className="grid gap-3 border border-ink/15 bg-white p-4">
        <label className="flex items-start gap-3 text-sm text-ink">
          <input id="full-case-draft-opt-in" type="checkbox" checked={draftEnabled} disabled={contentKey === undefined || pendingDraft !== undefined || draftDeleting || draftDeleteFailed || draftStatus === "incompatible" || result !== undefined}
            onChange={(event) => {
              if (event.currentTarget.checked) { markStarted(); setDraftEnabled(true); }
              else void discardDraft();
            }} />
          {t("Save a private draft on this device so I can resume this case.")}
        </label>
        {pendingDraft !== undefined ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className={uiText.body}>{t("A saved case draft is available.")}</p>
            <button className={buttonClass("primary")} disabled={draftDeleting || draftDeleteFailed} type="button" onClick={() => void resumeDraft()}>{t("Resume draft")}</button>
            <button id="full-case-discard-draft" className={buttonClass("secondary")} disabled={draftDeleting} type="button" onClick={() => void discardDraft()}>{t("Discard draft")}</button>
          </div>
        ) : null}
        {draftStatus === "incompatible" ? (
          <div className="grid gap-2">
            <p className={uiText.body}>{t("The saved draft uses different case content or is invalid. Discard it to save a new draft.")}</p>
            <button id="full-case-discard-draft" className={buttonClass("secondary")} disabled={draftDeleting} type="button" onClick={() => void discardDraft()}>{t("Discard draft")}</button>
          </div>
        ) : null}
        {draftStatus === "saved" ? <p role="status" className={uiText.body}>{t("Private draft saved on this device.")}</p> : null}
        {draftStatus === "error" ? <LocalSaveNotice label={t("Not Saved")} tone="error" detail={t("The local draft could not be read or updated. Keep this page open to preserve your current work.")} /> : null}
        {draftDeleteFailed && pendingDraft === undefined ? <button id="full-case-discard-draft" className={buttonClass("secondary")} disabled={draftDeleting} type="button" onClick={() => void discardDraft()}>{t("Discard draft")}</button> : null}
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
                setAttemptLocale(locale);
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
          onRetry={() => {
            const run = runRevision.current;
            const lifecycle = lifecycleRevision.current;
            void retrySave().then((saved) => {
              if (saved && draftEnabled && run === runRevision.current && lifecycle === lifecycleRevision.current) void queueDraftWrite().catch(() => undefined);
            });
          }}
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
        <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")} dir="auto">{prompt.objective}</p>
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
        <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")} dir="auto">{prompt.objective}</p>
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
        <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")} dir="auto">{question.prompt}</p>
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
        <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")} dir="auto">{prompt.decision}</p>
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
            <li className="min-w-0 [overflow-wrap:anywhere]" dir="auto" key={fact}>{fact}</li>
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
  onRetry,
  result,
  saveState,
  simulation
}: {
  calculationQuestion: ReturnType<typeof getFullCaseCalculationQuestion>;
  onReset: () => void;
  onRetry: () => void;
  result: FullCaseScore;
  saveState: PracticeAttemptSaveState;
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
        <>
        <LocalSaveNotice
          detail={t("Your score is still visible, but this case could not be saved locally.")}
          label={t("Not Saved")}
          tone="error"
        />
        <button className={buttonClass("secondary")} onClick={onRetry} type="button">{t("Retry local save")}</button>
        </>
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
              <li className="min-w-0 [overflow-wrap:anywhere]" dir="auto" key={step}>{step}</li>
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
          <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")} dir="auto">{simulation.synthesis.modelClose}</p>
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
