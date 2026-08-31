"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { PageHeader } from "@/components/PageHeader";
import { evaluateMarketSizingDraft } from "@/features/market-sizing/marketSizingEvaluation";
import type {
  MarketSizingAssumptionEvaluation,
  MarketSizingEvaluation
} from "@/features/market-sizing/marketSizingEvaluation";
import { persistMarketSizingAttempt } from "@/features/market-sizing/marketSizingPersistence";
import { scoreMarketSizingAttempt } from "@/features/market-sizing/marketSizingScoring";
import type { MarketSizingAttemptScore } from "@/features/market-sizing/marketSizingScoring";
import type { MarketSizingInputStep, MarketSizingTemplate } from "@/features/market-sizing/marketSizingTypes";
import { useI18n } from "@/features/i18n/I18nProvider";
import type { UnitType } from "@/lib/domain";
import { formatLabel } from "@/lib/format";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { AppStorage } from "@/lib/storage/appStorageTypes";

interface MarketSizingGuidedFormProps {
  storageFactory?: () => AppStorage;
  templates: readonly MarketSizingTemplate[];
}

type StepValue = boolean | string;

interface MarketSizingDraft {
  finalAnswer: string;
  interpretationId: string;
  note: string;
  stepValues: Record<string, StepValue>;
}

type AttemptSaveStatus = "error" | "idle" | "saved" | "saving";
type MarketSizingStage = 0 | 1 | 2 | 3;

export function MarketSizingGuidedForm({
  storageFactory = createIndexedDbAppStorage,
  templates
}: MarketSizingGuidedFormProps) {
  const { formatNumber: formatLocaleNumber, locale, t } = useI18n();
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => templates[0]?.id ?? "");
  const startedAtRef = useRef(new Date().toISOString());
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId, templates]
  );
  const [draft, setDraft] = useState<MarketSizingDraft>(() => createEmptyDraft(selectedTemplate));
  const [activeStage, setActiveStage] = useState<MarketSizingStage>(0);
  const [furthestStage, setFurthestStage] = useState<MarketSizingStage>(0);
  const [hasScored, setHasScored] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string | undefined>();
  const [saveStatus, setSaveStatus] = useState<AttemptSaveStatus>("idle");
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocusStageRef = useRef(false);
  const evaluation = useMemo(
    () =>
      selectedTemplate === undefined
        ? undefined
        : evaluateMarketSizingDraft({
            finalAnswer: draft.finalAnswer,
            locale,
            stepValues: draft.stepValues,
            template: selectedTemplate
          }),
    [draft.finalAnswer, draft.stepValues, locale, selectedTemplate]
  );
  const assumptionEvaluationByStepId = useMemo(
    () => new Map((evaluation?.assumptionEvaluations ?? []).map((item) => [item.stepId, item])),
    [evaluation]
  );
  const score = useMemo(
    () =>
      selectedTemplate === undefined || evaluation === undefined
        ? undefined
        : scoreMarketSizingAttempt({
            evaluation,
            interpretationId: draft.interpretationId,
            note: draft.note,
            stepValues: draft.stepValues,
            template: selectedTemplate
          }),
    [draft.interpretationId, draft.note, draft.stepValues, evaluation, selectedTemplate]
  );

  const requiredProgress = useMemo(
    () =>
      selectedTemplate === undefined
        ? { completed: 0, missingLabels: [], total: 0 }
        : countCompletedRequiredSteps(selectedTemplate, draft.stepValues),
    [draft.stepValues, selectedTemplate]
  );
  const canContinueAssumptions =
    requiredProgress.completed === requiredProgress.total && evaluation?.calculatedValue !== undefined;
  const canContinueFinalAnswer =
    evaluation?.finalAnswer.status === "match" || evaluation?.finalAnswer.status === "mismatch";
  const completedStages = [
    furthestStage >= 1 && canContinueAssumptions,
    furthestStage >= 2 && evaluation?.calculatedValue !== undefined,
    furthestStage >= 3 && canContinueFinalAnswer,
    hasScored
  ];

  useEffect(() => {
    if (!shouldFocusStageRef.current) {
      return;
    }

    shouldFocusStageRef.current = false;
    stageHeadingRef.current?.focus();
  }, [activeStage]);

  function goToStage(stage: MarketSizingStage) {
    shouldFocusStageRef.current = true;
    setFurthestStage((current) => (stage > current ? stage : current));
    setActiveStage(stage);
  }

  function updateDraft(update: (current: MarketSizingDraft) => MarketSizingDraft) {
    setDraft(update);
    setHasScored(false);
    setReviewStatus(undefined);
    setSaveStatus("idle");
  }

  const handleTemplateChange = useCallback(
    (nextTemplateId: string) => {
      const nextTemplate = templates.find((template) => template.id === nextTemplateId);

      setSelectedTemplateId(nextTemplateId);
      setDraft(createEmptyDraft(nextTemplate));
      setActiveStage(0);
      setFurthestStage(0);
      setHasScored(false);
      setReviewStatus(undefined);
      setSaveStatus("idle");
      startedAtRef.current = new Date().toISOString();
    },
    [templates]
  );

  if (selectedTemplate === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          action={{ href: "/drills", label: t("Start Drill") }}
          description={t("Market sizing prompts could not be loaded. Use a drill or exhibit while this area is unavailable.")}
          secondaryAction={{ href: "/exhibits", label: t("Try Exhibits") }}
          title={t("Market sizing prompts are unavailable.")}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
      <section className="min-w-0 space-y-6">
        <PageHeader
          description={t("Work from assumptions to a scored answer.")}
          eyebrow={t("Advanced Practice")}
          title={t("Guided Market Sizing")}
        />

        <section className="grid min-w-0 gap-4 border border-ink/15 border-t-2 border-t-coral bg-white p-4 sm:p-6">
          <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/80">
            {t("Prompt")}
            <select
              className="h-11 w-full min-w-0 rounded-md border border-ink/50 bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-teal"
              onChange={(event) => handleTemplateChange(event.currentTarget.value)}
              value={selectedTemplate.id}
            >
              {templates.map((template) => (
                <option dir="auto" key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
          </label>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 border-y border-ink/15 bg-paper px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Prompt")}</p>
            <p className="min-w-0 text-sm leading-6 text-ink [overflow-wrap:anywhere]">
              <bdi className="block min-w-0 max-w-full" dir="auto">{selectedTemplate.prompt}</bdi>
            </p>
          </div>
        </section>

        <form
          className="min-w-0 space-y-8 border border-ink/15 border-t-2 border-t-teal bg-white p-4 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();

            if (activeStage !== 3) {
              return;
            }

            setHasScored(true);
            void persistReviewedAttempt({
              draft,
              evaluation,
              score,
              selectedTemplate,
              setReviewStatus,
              setSaveStatus,
              startedAt: startedAtRef.current,
              storageFactory,
              t
            });
          }}
        >
          <MarketSizingFlowNav
            activeStage={activeStage}
            completedStages={completedStages}
          />

          {activeStage === 0 ? (
            <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4" data-testid="market-sizing-assumptions-section">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <div className="grid gap-1">
                  <p className="text-sm font-semibold uppercase tracking-wide text-coral">{t("Step 1 of 4")}</p>
                  <h2 className="text-xl font-semibold text-ink" ref={stageHeadingRef} tabIndex={-1}>
                    {t("Assumptions")}
                  </h2>
                </div>
                <span
                  className="rounded-md bg-mint px-3 py-2 text-sm font-semibold text-teal"
                  data-testid="market-sizing-required-count"
                >
                  {t("{completed}/{total} required", {
                    completed: formatLocaleNumber(requiredProgress.completed),
                    total: formatLocaleNumber(requiredProgress.total)
                  })}
                </span>
              </div>
              <RequiredProgressPanel progress={requiredProgress} />

              {evaluation?.calculationError !== undefined ? (
                <p
                  className="rounded-md border border-coral/30 bg-coral/10 px-3 py-3 text-sm leading-6 text-ink"
                  data-testid="market-sizing-calculation-error"
                  role="alert"
                >
                  {t(evaluation.calculationError)}
                </p>
              ) : null}

              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
                {selectedTemplate.inputSteps.map((step) => (
                  <MarketSizingStepField
                    key={step.id}
                    onChange={(value) =>
                      updateDraft((current) => ({
                        ...current,
                        stepValues: {
                          ...current.stepValues,
                          [step.id]: value
                        }
                      }))
                    }
                    evaluation={assumptionEvaluationByStepId.get(step.id)}
                    step={step}
                    value={draft.stepValues[step.id]}
                  />
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  aria-describedby={!canContinueAssumptions ? "market-sizing-required-progress" : undefined}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-teal px-4 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/30"
                  disabled={!canContinueAssumptions}
                  onClick={() => goToStage(1)}
                  type="button"
                >
                  {t("Continue to Calculation")}
                </button>
              </div>
            </section>
          ) : null}

          {activeStage === 1 ? (
            <section className="grid gap-4" data-testid="market-sizing-calculation-section">
              <div className="grid gap-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-coral">{t("Step 2 of 4")}</p>
                <h2 className="text-xl font-semibold text-ink" ref={stageHeadingRef} tabIndex={-1}>
                  {t("Calculation")}
                </h2>
              </div>
              <CalculationPanel evaluation={evaluation} template={selectedTemplate} />
              <div className="grid gap-2 rounded-md bg-paper px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Formula")}</p>
                <p className="break-words font-mono text-sm leading-6 text-ink">
                  {selectedTemplate.finalFormula.expression}
                </p>
              </div>
              <StageActions
                backLabel={t("Back to Assumptions")}
                continueLabel={t("Continue to Final Answer")}
                onBack={() => goToStage(0)}
                onContinue={() => goToStage(2)}
              />
            </section>
          ) : null}

          {activeStage === 2 ? (
            <section className="grid gap-4" data-testid="market-sizing-answer-section">
              <div className="grid gap-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-coral">{t("Step 3 of 4")}</p>
                <h2 className="text-xl font-semibold text-ink" ref={stageHeadingRef} tabIndex={-1}>
                  {t("Final Answer")}
                </h2>
              </div>
              <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/80">
                {t("Final answer ({unit})", { unit: t(formatUnit(selectedTemplate.outputUnit)) })}
                <input
                  aria-describedby={
                    evaluation?.finalAnswer.status === "invalid" || evaluation?.finalAnswer.status === "missing"
                      ? "market-sizing-final-answer-status"
                      : undefined
                  }
                  className="h-11 w-full min-w-0 rounded-md border border-ink/50 bg-white px-3 text-base text-ink outline-none transition placeholder:text-ink/65 focus:border-teal"
                  inputMode="decimal"
                  onChange={(event) => {
                    const finalAnswer = event.currentTarget.value;

                    updateDraft((current) => ({ ...current, finalAnswer }));
                  }}
                  placeholder={selectedTemplate.outputUnit === "currency" ? "e.g. $125M" : "e.g. 125000000"}
                  type="text"
                  value={draft.finalAnswer}
                />
              </label>
              {evaluation !== undefined ? <FinalAnswerStatus evaluation={evaluation} /> : null}
              <StageActions
                backLabel={t("Back to Calculation")}
                continueDisabled={!canContinueFinalAnswer}
                continueLabel={t("Submit Answer")}
                continueDescribedBy="market-sizing-final-answer-status"
                onBack={() => goToStage(1)}
                onContinue={() => goToStage(3)}
              />
            </section>
          ) : null}

          {activeStage === 3 ? (
            <section className="grid gap-4" data-testid="market-sizing-review-section">
              <div className="grid gap-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-coral">{t("Step 4 of 4")}</p>
                <h2 className="text-xl font-semibold text-ink" ref={stageHeadingRef} tabIndex={-1}>
                  {t("Sense-Check And Review")}
                </h2>
              </div>
              <ReviewResultPanel evaluation={evaluation} template={selectedTemplate} />
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-md bg-saffron/10 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Sense-check")}</p>
                <p className="min-w-0 text-sm leading-6 text-ink/80 [overflow-wrap:anywhere]">
                  <bdi className="block min-w-0 max-w-full" dir="auto">{selectedTemplate.senseCheck.prompt}</bdi>
                </p>
              </div>
              <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/80">
                {t("Interpretation")}
                <select
                  className="h-11 w-full min-w-0 rounded-md border border-ink/50 bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-teal"
                  onChange={(event) => {
                    const interpretationId = event.currentTarget.value;

                    updateDraft((current) => ({ ...current, interpretationId }));
                  }}
                  value={draft.interpretationId}
                >
                  <option value="">{t("Select interpretation")}</option>
                  {(selectedTemplate.senseCheck.interpretationOptions ?? []).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/80">
                {t("Notes")}
                <textarea
                  className="min-h-28 w-full min-w-0 rounded-md border border-ink/50 bg-white px-3 py-2 text-base text-ink outline-none transition placeholder:text-ink/65 focus:border-teal"
                  onChange={(event) => {
                    const note = event.currentTarget.value;

                    updateDraft((current) => ({ ...current, note }));
                  }}
                  placeholder={t("Optional self-review note")}
                  value={draft.note}
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-ink/50 px-4 text-sm font-semibold text-ink transition hover:border-teal"
                  onClick={() => goToStage(2)}
                  type="button"
                >
                  {t("Back to Final Answer")}
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-teal px-4 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/30"
                  disabled={saveStatus === "saving"}
                  type="submit"
                >
                  {saveStatus === "saving" ? t("Saving...") : hasScored ? t("Score Again") : t("Score Draft")}
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-ink/50 px-4 text-sm font-semibold text-ink transition hover:border-teal"
                  onClick={() => {
                    updateDraft(() => createEmptyDraft(selectedTemplate));
                    setFurthestStage(0);
                    goToStage(0);
                    startedAtRef.current = new Date().toISOString();
                  }}
                  type="button"
                >
                  {t("Reset")}
                </button>
              </div>
              {hasScored ? <ScorePanel score={score} /> : null}
              {reviewStatus !== undefined ? (
                <LocalSaveNotice
                  detail={reviewStatus}
                  label={saveStatus === "error" ? t("Save status") : t("Saved on this device")}
                  tone={saveStatus === "error" ? "error" : "success"}
                />
              ) : null}
            </section>
          ) : null}
        </form>
      </section>

      <aside
        aria-labelledby="market-sizing-template-summary-heading"
        className="h-fit min-w-0 border border-ink/15 border-t-2 border-t-coral bg-white p-4 sm:p-5"
      >
        <div className="grid min-w-0 gap-5">
          <div className="grid min-w-0 gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-coral">
              {t(formatLabel(selectedTemplate.sizingType))}
            </p>
            <h2 className="text-xl font-semibold text-ink" id="market-sizing-template-summary-heading">
              <bdi className="block" dir="auto">{selectedTemplate.title}</bdi>
            </h2>
            <p className="break-words text-sm leading-6 text-ink/70">
              <bdi className="block" dir="auto">{selectedTemplate.description}</bdi>
            </p>
          </div>

          <dl className="grid min-w-0 grid-cols-2 gap-3 text-sm">
            <SummaryStat label={t("Difficulty")} value={t(formatLabel(selectedTemplate.difficulty))} />
            <SummaryStat label={t("Industry")} value={t(formatLabel(selectedTemplate.industry))} />
            <SummaryStat label={t("Output")} value={t(formatUnit(selectedTemplate.outputUnit))} />
            {hasScored && score !== undefined ? (
              <SummaryStat label={t("Score")} value={t("{score}/{max} pts", {
                score: formatLocaleNumber(score.totalScore),
                max: formatLocaleNumber(score.maxScore)
              })} />
            ) : null}
            <SummaryStat
              label={t("Ranges")}
              value={
                activeStage === 0
                  ? t("Not checked yet")
                  : evaluation === undefined
                    ? t("Unavailable")
                    : t("{inRange}/{total} in range", {
                        inRange: formatLocaleNumber(evaluation.rangeSummary.inRange),
                        total: formatLocaleNumber(evaluation.rangeSummary.total)
                      })
              }
            />
          </dl>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-md bg-saffron/10 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Sense-check")}</p>
            <p className="min-w-0 text-sm leading-6 text-ink/80 [overflow-wrap:anywhere]">
              <bdi className="block min-w-0 max-w-full" dir="auto">{selectedTemplate.senseCheck.prompt}</bdi>
            </p>
          </div>
        </div>
      </aside>
    </main>
  );
}

function MarketSizingFlowNav({
  activeStage,
  completedStages
}: {
  activeStage: MarketSizingStage;
  completedStages: readonly boolean[];
}) {
  const { formatNumber: formatLocaleNumber, t } = useI18n();
  const steps = ["Assumptions", "Calculation", "Final Answer", "Review"];

  return (
    <ol
      aria-label={t("Market sizing progress")}
      className="grid border-y border-ink/20 bg-paper text-sm sm:grid-cols-4"
      data-testid="market-sizing-flow-steps"
    >
      {steps.map((step, index) => {
        const active = index === activeStage;
        const completed = completedStages[index] === true;

        return (
          <li
            aria-current={active ? "step" : undefined}
            className={[
              "grid gap-1 border-s-2 px-3 py-3 font-semibold",
              active
                ? "border-teal bg-mint/60 text-ink"
                : completed
                  ? "border-teal/30 bg-white text-ink"
                  : "border-ink/15 bg-transparent text-ink/65"
            ].join(" ")}
            data-state={active ? "active" : completed ? "completed" : "upcoming"}
            data-testid={`market-sizing-flow-step-${index + 1}`}
            key={step}
          >
            <span>
              <span className="mr-2 text-teal">{formatLocaleNumber(index + 1)}</span>
              {t(step)}
            </span>
            <span className="text-xs font-medium text-ink/65">
              {active ? t("Current") : completed ? t("Complete") : t("Upcoming")}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StageActions({
  backLabel,
  continueDescribedBy,
  continueDisabled = false,
  continueLabel,
  onBack,
  onContinue
}: {
  backLabel: string;
  continueDescribedBy?: string;
  continueDisabled?: boolean;
  continueLabel: string;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-between gap-3">
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-ink/50 px-4 text-sm font-semibold text-ink transition hover:border-teal"
        onClick={onBack}
        type="button"
      >
        {backLabel}
      </button>
      <button
        aria-describedby={continueDisabled ? continueDescribedBy : undefined}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-teal px-4 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/30"
        disabled={continueDisabled}
        onClick={onContinue}
        type="button"
      >
        {continueLabel}
      </button>
    </div>
  );
}

function MarketSizingStepField({
  evaluation,
  onChange,
  step,
  value
}: {
  evaluation?: MarketSizingAssumptionEvaluation;
  onChange: (value: StepValue) => void;
  step: MarketSizingInputStep;
  value: StepValue | undefined;
}) {
  const { t } = useI18n();
  const commonClasses =
    "h-11 w-full min-w-0 max-w-full rounded-md border border-ink/50 bg-white px-3 text-base text-ink outline-none transition placeholder:text-ink/65 focus:border-teal";
  const showNumericFeedback = evaluation !== undefined && evaluation.status !== "not_applicable";

  return (
    <label
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 border border-ink/15 px-3 py-3 text-sm font-medium text-ink/80 transition-colors hover:border-teal/50 focus-within:border-teal"
      data-testid={`market-sizing-field-${step.id}`}
    >
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <bdi className="min-w-0 [overflow-wrap:anywhere]" dir="auto">{step.label}</bdi>
        {step.required ? (
          <span className="rounded-md bg-mint px-2 py-0.5 text-xs font-semibold text-teal">{t("Required")}</span>
        ) : null}
        {showNumericFeedback ? <span className={assumptionStatusClass(evaluation.status)}>{t(fieldStatusLabel(evaluation.status))}</span> : null}
      </span>
      {fieldForStep(step, value, onChange, commonClasses, t)}
      {step.helperText !== undefined ? (
        <bdi className="min-w-0 text-xs leading-5 text-ink/65 [overflow-wrap:anywhere]" dir="auto">{step.helperText}</bdi>
      ) : null}
      {showNumericFeedback ? <AssumptionRangeFeedback evaluation={evaluation} step={step} /> : null}
    </label>
  );
}

function RequiredProgressPanel({
  progress
}: {
  progress: { completed: number; missingLabels: string[]; total: number };
}) {
  const { formatPercent, t } = useI18n();
  const progressRatio = progress.total === 0 ? 0 : progress.completed / progress.total;
  const progressPercent = Math.round(progressRatio * 100);
  const nextMissing = progress.missingLabels[0];

  return (
    <section
      aria-atomic="true"
      aria-live="polite"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 border-y border-ink/15 bg-paper px-3 py-3"
      data-testid="market-sizing-required-progress"
      id="market-sizing-required-progress"
      role="status"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{t("Required Assumption Progress")}</p>
        <span className="text-sm font-semibold text-ink/70">{t("{percent} complete", { percent: formatPercent(progressRatio) })}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white" aria-hidden="true">
        <div className="h-full rounded-full bg-teal" style={{ width: `${progressPercent}%` }} />
      </div>
      <p className="min-w-0 text-xs leading-5 text-ink/65 [overflow-wrap:anywhere]">
        {nextMissing === undefined
          ? t("All required assumptions are filled.")
          : t("Next required field: {field}.", { field: nextMissing })}
      </p>
    </section>
  );
}

function AssumptionRangeFeedback({
  evaluation,
  step
}: {
  evaluation: MarketSizingAssumptionEvaluation;
  step: MarketSizingInputStep;
}) {
  const { formatNumber, formatPercent, t } = useI18n();

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="grid gap-2 rounded-md bg-paper px-3 py-2"
      data-testid={`market-sizing-range-${step.id}`}
      role="status"
    >
      <div className="flex flex-wrap gap-2 text-xs leading-5 text-ink/65">
        {step.assumptionRange !== undefined ? (
          <span>
            {t("Expected range:")} <span className="font-semibold text-ink/75">{formatRangeBounds(step, formatNumber, formatPercent, t)}</span>
          </span>
        ) : (
          <span>{t("No expected range set for this assumption.")}</span>
        )}
        {evaluation.normalizedValue !== undefined ? (
          <span>
            {t("Entered:")}{" "}
            <span className="font-semibold text-ink/75">
              {formatRangeValue(evaluation.normalizedValue, step.unit ?? step.assumptionRange?.unit, formatNumber, formatPercent, t)}
            </span>
          </span>
        ) : null}
      </div>
      <p className={rangeMessageClass(evaluation.status)}>
        <bdi className="block" dir="auto">{t(evaluation.message)}</bdi>
      </p>
    </div>
  );
}

function CalculationPanel({
  evaluation,
  template
}: {
  evaluation: MarketSizingEvaluation | undefined;
  template: MarketSizingTemplate;
}) {
  const { formatNumber, formatPercent, t } = useI18n();
  const formulaInputs = template.inputSteps.filter((step) => step.variableName !== undefined);

  return (
    <div className="grid gap-4 border-y border-ink/15 bg-paper px-3 py-3" data-testid="market-sizing-calculation">
      <div className="grid gap-2" data-testid="market-sizing-calculation-inputs">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Formula Inputs")}</p>
        <dl className="grid gap-2 sm:grid-cols-2">
          {formulaInputs.map((step) => {
            const value = step.variableName === undefined ? undefined : evaluation?.variables[step.variableName];

            return (
              <div className="min-w-0 border-s-2 border-teal/30 bg-white px-3 py-2" key={step.id}>
                <dt className="min-w-0 text-xs font-semibold uppercase tracking-wide text-ink/65 [overflow-wrap:anywhere]">
                  <bdi dir="auto">{step.label}</bdi>
                </dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {value === undefined ? t("Missing") : formatRangeValue(value, step.unit, formatNumber, formatPercent, t)}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}

function FinalAnswerStatus({ evaluation }: { evaluation: MarketSizingEvaluation }) {
  const { t } = useI18n();

  if (
    evaluation.finalAnswer.status === "not_ready" ||
    evaluation.finalAnswer.status === "match" ||
    evaluation.finalAnswer.status === "mismatch"
  ) {
    return null;
  }

  return (
    <p
      aria-atomic="true"
      aria-live="polite"
      className={finalAnswerStatusClass(evaluation.finalAnswer.status)}
      data-testid="market-sizing-final-answer-status"
      id="market-sizing-final-answer-status"
      role="status"
    >
      {t(evaluation.finalAnswer.message)}
    </p>
  );
}

function ReviewResultPanel({
  evaluation,
  template
}: {
  evaluation: MarketSizingEvaluation | undefined;
  template: MarketSizingTemplate;
}) {
  const { formatNumber, formatPercent, t } = useI18n();

  if (evaluation?.calculatedValue === undefined) {
    return null;
  }

  return (
    <section className="grid gap-2 border-y border-ink/15 bg-paper px-3 py-3" data-testid="market-sizing-review-result">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Calculated Result")}</p>
      <p className="text-lg font-semibold leading-7 text-ink">
        {formatCalculatedValue(evaluation.calculatedValue, template.outputUnit, formatNumber, formatPercent, t)}
      </p>
      <p
        aria-atomic="true"
        className={finalAnswerStatusClass(evaluation.finalAnswer.status)}
        role="status"
      >
        {t(evaluation.finalAnswer.message)}
      </p>
    </section>
  );
}

function ScorePanel({ score }: { score: MarketSizingAttemptScore | undefined }) {
  const { formatNumber: formatLocaleNumber, formatPercent, t } = useI18n();
  if (score === undefined) {
    return null;
  }

  const scorePercent = score.maxScore === 0 ? 0 : Math.round((score.totalScore / score.maxScore) * 100);
  const needsWorkCount = score.breakdown.filter((dimension) => dimension.awardedPoints < dimension.maxPoints).length;

  return (
    <section className="grid gap-4 border border-ink/15 border-t-2 border-t-teal px-3 py-3" data-testid="market-sizing-score">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h3 className="text-base font-semibold text-ink">{t("Rubric Score")}</h3>
            <p className="text-xs leading-5 text-ink/65">
              {t("Scoring separates structure, assumptions, math, units, sense-check, and interpretation.")}
            </p>
          </div>
          <span className="rounded-md bg-mint px-3 py-1.5 text-sm font-semibold text-teal">
            {t("{score}/{max} pts", { score: formatLocaleNumber(score.totalScore), max: formatLocaleNumber(score.maxScore) })}
          </span>
        </div>

        <div className="grid gap-2 border-y border-ink/15 bg-paper px-3 py-3" data-testid="market-sizing-score-summary">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">{t("{percent} complete", { percent: formatPercent(scorePercent / 100) })}</p>
            <p className="text-xs font-semibold text-ink/65">
              {needsWorkCount === 0
                ? t("All rubric areas complete")
                : t("{count} rubric areas need work", { count: formatLocaleNumber(needsWorkCount) })}
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white" aria-hidden="true">
            <div className="h-full rounded-full bg-teal" style={{ width: `${scorePercent}%` }} />
          </div>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        {score.breakdown.map((dimension) => (
          <div className="grid gap-2 border-s-2 border-teal/30 bg-paper px-3 py-3" key={dimension.id}>
            <dt className="flex flex-wrap items-start justify-between gap-2 text-sm font-semibold text-ink">
              <span className="grid gap-1">
                <span>{t(dimension.label)}</span>
                <span className={scoreDimensionStatusClass(dimension)}>
                  {t(scoreDimensionStatusLabel(dimension))}
                </span>
              </span>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-ink/70">
                {t("{score}/{max} pts", {
                  score: formatLocaleNumber(dimension.awardedPoints),
                  max: formatLocaleNumber(dimension.maxPoints)
                })}
              </span>
            </dt>
            <dd className="text-xs leading-5 text-ink/65">{localizedScoreMessage(dimension.message, formatLocaleNumber, t)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function fieldForStep(
  step: MarketSizingInputStep,
  value: StepValue | undefined,
  onChange: (value: StepValue) => void,
  className: string,
  t: ReturnType<typeof useI18n>["t"]
) {
  if (step.inputKind === "boolean") {
    return (
      <span className="flex min-h-11 items-center gap-3">
        <input
          aria-label={step.label}
          checked={value === true}
          className="h-4 w-4 accent-teal"
          onChange={(event) => onChange(event.currentTarget.checked)}
          type="checkbox"
        />
        <span className="text-sm font-medium text-ink">{t("Completed")}</span>
      </span>
    );
  }

  if (step.inputKind === "choice") {
    const selectedValue = stringValue(value);
    const selectedOption = (step.options ?? []).find((option) => option.id === selectedValue);
    const selectedChoiceDescriptionId = `market-sizing-selected-choice-${step.id}`;

    return (
      <span className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
        <select
          aria-describedby={selectedOption === undefined ? undefined : selectedChoiceDescriptionId}
          aria-label={step.label}
          className={className}
          onChange={(event) => onChange(event.currentTarget.value)}
          value={selectedValue}
        >
          <option value="">{t("Select option")}</option>
          {(step.options ?? []).map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {selectedOption === undefined ? null : (
          <span
            aria-live="polite"
            className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1 border-s-2 border-teal/30 bg-paper px-3 py-2 text-sm text-ink/80 [overflow-wrap:anywhere]"
            data-testid={selectedChoiceDescriptionId}
            id={selectedChoiceDescriptionId}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-teal">{t("Selected")}</span>
            <bdi className="min-w-0 max-w-full font-medium" dir="auto">{selectedOption.label}</bdi>
          </span>
        )}
      </span>
    );
  }

  if (step.inputKind === "note") {
    return (
      <textarea
        aria-label={step.label}
        className="min-h-24 w-full min-w-0 max-w-full rounded-md border border-ink/50 bg-white px-3 py-2 text-base text-ink outline-none transition placeholder:text-ink/65 focus:border-teal"
        onChange={(event) => onChange(event.currentTarget.value)}
        value={stringValue(value)}
      />
    );
  }

  if (step.inputKind === "integer" || step.inputKind === "number") {
    return (
      <input
        aria-label={step.label}
        className={className}
        inputMode={step.inputKind === "integer" ? "numeric" : "decimal"}
        onChange={(event) => onChange(event.currentTarget.value)}
        step={step.inputKind === "integer" ? 1 : "any"}
        type="number"
        value={stringValue(value)}
      />
    );
  }

  return (
    <input
      aria-label={step.label}
      className={className}
      inputMode="decimal"
      onChange={(event) => onChange(event.currentTarget.value)}
      placeholder={step.inputKind === "percentage" ? t("60% or 0.6") : t("$50")}
      type="text"
      value={stringValue(value)}
    />
  );
}

function localizedScoreMessage(
  message: string,
  formatNumber: ReturnType<typeof useI18n>["formatNumber"],
  t: ReturnType<typeof useI18n>["t"]
): string {
  const requiredMatch = /^(\d+)\/(\d+) required fields completed\.$/.exec(message);
  if (requiredMatch !== null) {
    return t("{completed}/{total} required fields completed.", {
      completed: formatNumber(Number(requiredMatch[1])),
      total: formatNumber(Number(requiredMatch[2]))
    });
  }

  const rangeMatch = /^(\d+)\/(\d+) ranged assumptions are in range\.$/.exec(message);
  if (rangeMatch !== null) {
    return t("{inRange}/{total} ranged assumptions are in range.", {
      inRange: formatNumber(Number(rangeMatch[1])),
      total: formatNumber(Number(rangeMatch[2]))
    });
  }

  return t(message);
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-s-2 border-teal/30 bg-paper px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}

function createEmptyDraft(template: MarketSizingTemplate | undefined): MarketSizingDraft {
  return {
    finalAnswer: "",
    interpretationId: "",
    note: "",
    stepValues: Object.fromEntries(
      (template?.inputSteps ?? []).map((step) => [step.id, step.inputKind === "boolean" ? false : ""])
    )
  };
}

function countCompletedRequiredSteps(
  template: MarketSizingTemplate,
  stepValues: MarketSizingDraft["stepValues"]
): { completed: number; missingLabels: string[]; total: number } {
  const requiredSteps = template.inputSteps.filter((step) => step.required);
  const missingSteps = requiredSteps.filter((step) => !isStepComplete(stepValues[step.id]));

  return {
    completed: requiredSteps.length - missingSteps.length,
    missingLabels: missingSteps.map((step) => step.label),
    total: requiredSteps.length
  };
}

function isStepComplete(value: StepValue | undefined): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return value !== undefined && value.trim().length > 0;
}

function stringValue(value: StepValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function formatRangeBounds(
  step: MarketSizingInputStep,
  formatNumber: ReturnType<typeof useI18n>["formatNumber"],
  formatPercent: ReturnType<typeof useI18n>["formatPercent"],
  t: ReturnType<typeof useI18n>["t"]
): string {
  const range = step.assumptionRange;

  if (range === undefined) {
    return "";
  }

  return t("{min} to {max}", {
    min: formatRangeValue(range.min, step.unit ?? range.unit, formatNumber, formatPercent, t),
    max: formatRangeValue(range.max, step.unit ?? range.unit, formatNumber, formatPercent, t)
  });
}

function formatRangeValue(
  value: number,
  unit: UnitType | undefined,
  formatNumber: ReturnType<typeof useI18n>["formatNumber"],
  formatPercent: ReturnType<typeof useI18n>["formatPercent"],
  t: ReturnType<typeof useI18n>["t"]
): string {
  if (unit === "percentage") {
    return formatPercent(value, { maximumFractionDigits: 1 });
  }

  if (unit === "currency") {
    return `$${formatNumber(value, { maximumFractionDigits: 2 })}`;
  }

  return `${formatNumber(value, { maximumFractionDigits: 2 })}${unit === undefined ? "" : ` ${t(formatUnit(unit))}`}`;
}

function formatCalculatedValue(
  value: number,
  unit: UnitType,
  formatNumber: ReturnType<typeof useI18n>["formatNumber"],
  formatPercent: ReturnType<typeof useI18n>["formatPercent"],
  t: ReturnType<typeof useI18n>["t"]
): string {
  if (unit === "currency") {
    return `$${formatNumber(value, { maximumFractionDigits: 2 })}`;
  }

  if (unit === "percentage") {
    return formatPercent(value, { maximumFractionDigits: 1 });
  }

  return `${formatNumber(value, { maximumFractionDigits: 2 })} ${t(formatUnit(unit))}`;
}

function formatUnit(value: UnitType): string {
  const labels: Partial<Record<UnitType, string>> = {
    currency: "Currency",
    percentage: "Percentage",
    units: "Units",
    users: "People"
  };

  return labels[value] ?? formatLabel(value);
}

function assumptionStatusClass(status: MarketSizingAssumptionEvaluation["status"]): string {
  return [
    "w-fit rounded-md px-2 py-1 text-xs font-semibold",
    status === "in_range"
      ? "bg-mint text-teal"
      : status === "missing"
        ? "bg-paper text-ink/65"
        : "bg-coral/10 text-ink"
  ].join(" ");
}

function fieldStatusLabel(status: MarketSizingAssumptionEvaluation["status"]): string {
  const labels: Record<MarketSizingAssumptionEvaluation["status"], string> = {
    in_range: "In range",
    invalid: "Invalid",
    missing: "Missing",
    not_applicable: "Not scored",
    out_of_range: "Out of range"
  };

  return labels[status];
}

function rangeMessageClass(status: MarketSizingAssumptionEvaluation["status"]): string {
  return [
    "w-fit rounded-md px-2 py-1 text-xs font-semibold",
    status === "in_range"
      ? "bg-mint text-teal"
      : status === "missing"
        ? "bg-white text-ink/65"
        : "bg-coral/10 text-ink"
  ].join(" ");
}

function finalAnswerStatusClass(status: MarketSizingEvaluation["finalAnswer"]["status"]): string {
  return [
    "rounded-md px-3 py-2 text-sm leading-6 text-ink",
    status === "match" ? "bg-mint" : "bg-coral/10"
  ].join(" ");
}

function scoreDimensionStatusLabel(dimension: MarketSizingAttemptScore["breakdown"][number]): string {
  if (dimension.awardedPoints === dimension.maxPoints) {
    return "Complete";
  }

  if (dimension.awardedPoints > 0) {
    return "Partial";
  }

  return "Needs work";
}

function scoreDimensionStatusClass(dimension: MarketSizingAttemptScore["breakdown"][number]): string {
  const baseClass = "w-fit rounded-md px-2 py-1 text-xs font-semibold";
  const status = scoreDimensionStatusLabel(dimension);

  if (status === "Complete") {
    return `${baseClass} bg-mint text-teal`;
  }

  if (status === "Partial") {
    return `${baseClass} bg-saffron/20 text-ink`;
  }

  return `${baseClass} bg-coral/10 text-ink`;
}

async function persistReviewedAttempt({
  draft,
  evaluation,
  score,
  selectedTemplate,
  setReviewStatus,
  setSaveStatus,
  startedAt,
  storageFactory,
  t
}: {
  draft: MarketSizingDraft;
  evaluation: MarketSizingEvaluation | undefined;
  score: MarketSizingAttemptScore | undefined;
  selectedTemplate: MarketSizingTemplate | undefined;
  setReviewStatus: (status: string | undefined) => void;
  setSaveStatus: (status: AttemptSaveStatus) => void;
  startedAt: string;
  storageFactory: () => AppStorage;
  t: ReturnType<typeof useI18n>["t"];
}): Promise<void> {
  if (selectedTemplate === undefined || evaluation === undefined || score === undefined) {
    setReviewStatus(t("Unable to score this draft."));
    setSaveStatus("error");
    return;
  }

  setSaveStatus("saving");

  try {
    const storage = storageFactory();

    try {
      await persistMarketSizingAttempt({
        evaluation,
        finalAnswer: draft.finalAnswer,
        interpretationId: draft.interpretationId,
        note: draft.note,
        score,
        startedAt,
        stepValues: draft.stepValues,
        storage,
        template: selectedTemplate
      });
    } finally {
      storage.close();
    }

    setReviewStatus(t("Score {score}/{max} saved on this device.", {
      score: score.totalScore,
      max: score.maxScore
    }));
    setSaveStatus("saved");
  } catch {
    setReviewStatus(t("Could not save this market sizing attempt on this device."));
    setSaveStatus("error");
  }
}
