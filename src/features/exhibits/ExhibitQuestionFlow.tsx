"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { ExhibitAnswerInput } from "@/features/exhibits/ExhibitAnswerInput";
import { ExhibitChartRenderer } from "@/features/exhibits/ExhibitChartRenderer";
import { ExhibitTableRenderer } from "@/features/exhibits/ExhibitTableRenderer";
import {
  getExhibitDimensionColumnIds,
  getExhibitMetricColumnIds,
  isExhibitMultipleChoiceQuestion,
  toExhibitQuestion,
  validateExhibitResponse
} from "@/features/exhibits/exhibitDataset";
import { isExhibitChartDataset } from "@/features/exhibits/exhibitChartData";
import { formatExhibitAnswerValue } from "@/features/exhibits/exhibitFormatting";
import { persistExhibitAttempt } from "@/features/exhibits/exhibitPersistence";
import type { ExhibitDataset, ExhibitQuestionSpec } from "@/features/exhibits/exhibitTypes";
import { useI18n } from "@/features/i18n/I18nProvider";
import { formatLabel } from "@/lib/format";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import type { ValidationResult } from "@/lib/validation/validateAnswer";

interface ExhibitQuestionFlowProps {
  datasets: readonly ExhibitDataset[];
  storageFactory?: () => AppStorage;
}

type AttemptSaveStatus = "error" | "idle" | "saved" | "saving";

export function ExhibitQuestionFlow({
  datasets,
  storageFactory = createIndexedDbAppStorage
}: ExhibitQuestionFlowProps) {
  const { formatDuration, locale, t } = useI18n();
  const [selectedDatasetId, setSelectedDatasetId] = useState(() => datasets[0]?.id ?? "");
  const startedAtRef = useRef(new Date().toISOString());
  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === selectedDatasetId) ?? datasets[0],
    [datasets, selectedDatasetId]
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState(() => selectedDataset?.questions[0]?.id ?? "");
  const selectedQuestion = useMemo(
    () =>
      selectedDataset?.questions.find((question) => question.id === selectedQuestionId) ??
      selectedDataset?.questions[0],
    [selectedDataset, selectedQuestionId]
  );
  const [answerDraft, setAnswerDraft] = useState("");
  const [attemptStatus, setAttemptStatus] = useState<string | undefined>();
  const [saveStatus, setSaveStatus] = useState<AttemptSaveStatus>("idle");
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | undefined>();
  const resetAttemptState = useCallback(() => {
    setAnswerDraft("");
    setAttemptStatus(undefined);
    setSaveStatus("idle");
    setSolutionVisible(false);
    setValidationResult(undefined);
    startedAtRef.current = new Date().toISOString();
  }, []);
  const currentQuestion = useMemo(
    () =>
      selectedDataset === undefined || selectedQuestion === undefined
        ? undefined
        : toExhibitQuestion(selectedDataset, selectedQuestion),
    [selectedDataset, selectedQuestion]
  );

  if (selectedDataset === undefined || selectedQuestion === undefined || currentQuestion === undefined) {
    return (
      <EmptyState
        action={{ href: "/drills", label: t("Start Drill") }}
        description={t("Exhibit datasets could not be loaded. Use a drill while this area is unavailable.")}
        secondaryAction={{ href: "/progress", label: t("View Progress") }}
        title={t("Exhibit questions are unavailable.")}
      />
    );
  }

  return (
    <section className="grid max-w-full min-w-0 gap-6 overflow-hidden" data-testid="exhibit-question-flow">
      <div className="grid max-w-full min-w-0 gap-4 border border-ink/15 border-t-2 border-t-coral bg-white p-4 sm:p-6">
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/80">
            {t("Exhibit")}
            <select
              className="h-11 w-full min-w-0 rounded-md border border-ink/50 bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-teal"
              data-testid="exhibit-select"
              onChange={(event) => {
                const nextDatasetId = event.currentTarget.value;
                const nextDataset = datasets.find((dataset) => dataset.id === nextDatasetId);

                setSelectedDatasetId(nextDatasetId);
                setSelectedQuestionId(nextDataset?.questions[0]?.id ?? "");
                resetAttemptState();
              }}
              value={selectedDataset.id}
            >
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.title}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/80">
            {t("Question")}
            <select
              className="h-11 w-full min-w-0 rounded-md border border-ink/50 bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-teal"
              data-testid="exhibit-question-select"
              onChange={(event) => {
                setSelectedQuestionId(event.currentTarget.value);
                resetAttemptState();
              }}
              value={selectedQuestion.id}
            >
              {selectedDataset.questions.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.prompt}
                </option>
              ))}
            </select>
          </label>
        </div>

        <DatasetContextPanel dataset={selectedDataset} />
      </div>

      <div
        className="grid max-w-full min-w-0 gap-6 overflow-hidden lg:grid-cols-[minmax(0,1fr)_22rem]"
        data-testid="exhibit-workspace"
      >
        <section
          className="order-1 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 border border-ink/15 border-t-2 border-t-coral bg-white p-4 lg:col-start-2 lg:row-start-1 lg:p-5"
          data-testid="exhibit-question-prompt-panel"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-coral">
            {formatLabel(selectedDataset.visualization.type)}
          </p>
          <h2 className="text-xl font-semibold text-ink" id="exhibit-question-heading">
            {t("Exhibit Question")}
          </h2>
          <p className="min-w-0 text-base font-semibold leading-7 text-ink [overflow-wrap:anywhere]" data-testid="exhibit-question-prompt">
            {currentQuestion.prompt}
          </p>
          <p className="text-xs font-semibold text-ink/65">
            {t(formatLabel(currentQuestion.difficulty))} -{" "}
            {currentQuestion.metadata.expectedTimeSeconds === undefined
              ? t("Untimed")
              : t("{duration} target", { duration: formatDuration(currentQuestion.metadata.expectedTimeSeconds) })} -{" "}
            {isExhibitMultipleChoiceQuestion(selectedQuestion)
              ? t("Strategic choice")
              : t(formatLabel(currentQuestion.answer.unit ?? "none"))}
          </p>
        </section>

        <div
          className="order-2 min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1"
          data-testid="exhibit-visualization-panel"
        >
          {isExhibitChartDataset(selectedDataset) ? (
            <ExhibitChartRenderer dataset={selectedDataset} />
          ) : (
            <ExhibitTableRenderer dataset={selectedDataset} />
          )}
        </div>

        <aside
          aria-label={t("Answer controls")}
          className="order-3 grid h-fit gap-5 border border-ink/15 border-t-2 border-t-teal bg-white p-4 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-2 lg:p-5"
          data-testid="exhibit-answer-panel"
        >
          <ExhibitAnswerInput
            name={`exhibit-answer-${selectedQuestion.id}`}
            onChange={(value) => {
              setAnswerDraft(value);
              setAttemptStatus(undefined);
              setSaveStatus("idle");
              setSolutionVisible(false);
              setValidationResult(undefined);
            }}
            question={selectedQuestion}
            value={answerDraft}
          />

          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-teal motion-reduce:transform-none active:scale-[0.98]"
              disabled={saveStatus === "saving"}
              onClick={() => {
                void submitExhibitAttempt({
                  answerDraft,
                  dataset: selectedDataset,
                  locale,
                  question: selectedQuestion,
                  setAttemptStatus,
                  setSaveStatus,
                  setSolutionVisible,
                  setValidationResult,
                  startedAt: startedAtRef.current,
                  storageFactory,
                  t
                });
              }}
              type="button"
            >
              {saveStatus === "saving" ? t("Saving...") : t("Submit Answer")}
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-ink/30 px-4 text-sm font-semibold text-ink transition hover:border-teal hover:bg-paper motion-reduce:transform-none active:scale-[0.98]"
              onClick={resetAttemptState}
              type="button"
            >
              {t("Clear")}
            </button>
          </div>

          {attemptStatus !== undefined ? (
            <LocalSaveNotice
              detail={attemptStatus}
              label={saveStatus === "error" ? t("Save status") : t("Saved on this device")}
              tone={saveStatus === "error" || validationResult?.isCorrect === false ? "error" : "success"}
            />
          ) : null}

          {solutionVisible ? <SolutionPanel question={selectedQuestion} /> : null}
        </aside>
      </div>
    </section>
  );
}

function DatasetContextPanel({ dataset }: { dataset: ExhibitDataset }) {
  const { formatNumber, t } = useI18n();
  const dimensionLabels = getColumnLabels(dataset, getExhibitDimensionColumnIds(dataset));
  const metricLabels = getColumnLabels(dataset, getExhibitMetricColumnIds(dataset));

  return (
    <details
      className="group max-w-full min-w-0 border border-ink/15 bg-paper"
      data-testid="exhibit-dataset-context"
    >
      <summary className="flex min-h-14 min-w-0 cursor-pointer list-none items-center justify-between gap-4 px-3 py-3 transition-colors marker:content-none hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal">
        <span className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Dataset details")}</span>
          <span className="min-w-0 text-sm font-semibold text-ink [overflow-wrap:anywhere]">{dataset.title}</span>
        </span>
        <span aria-hidden="true" className="text-xl font-semibold text-teal group-open:rotate-45">
          +
        </span>
      </summary>

      <div className="grid min-w-0 gap-4 border-t border-ink/10 px-3 py-3">
        <p className="break-words text-sm leading-6 text-ink/70">{dataset.description}</p>

        <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <DatasetStat label={t("Type")} value={t(formatLabel(dataset.visualization.type))} />
          <DatasetStat label={t("Rows")} value={formatNumber(dataset.rows.length)} />
          <DatasetStat label={t("Questions")} value={formatNumber(dataset.questions.length)} />
          <DatasetStat label={t("Unit")} value={t(formatLabel(dataset.unit))} />
        </dl>

        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <DatasetColumnSummary label={t("Dimensions")} value={dimensionLabels.join(", ")} />
          <DatasetColumnSummary label={t("Metrics")} value={metricLabels.join(", ")} />
        </div>

        {dataset.sourceNote !== undefined ? (
          <p className="break-words text-xs leading-5 text-ink/65">{dataset.sourceNote}</p>
        ) : null}
      </div>
    </details>
  );
}

function DatasetStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-s-2 border-ink/15 bg-white px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-ink">{value}</dd>
    </div>
  );
}

function DatasetColumnSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-s-2 border-ink/15 bg-white px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-5 text-ink">{value}</p>
    </div>
  );
}

function SolutionPanel({ question }: { question: ExhibitQuestionSpec }) {
  const { t } = useI18n();

  return (
    <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 border-s-2 border-teal bg-mint px-3 py-3 [overflow-wrap:anywhere]" data-testid="exhibit-solution-panel">
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal">{t("Solution")}</p>
        <p className="text-sm font-semibold leading-6 text-ink">
          {t("Correct answer: {answer}", { answer: formatQuestionAnswer(question) })}
        </p>
        <p className="text-sm leading-6 text-ink/75">{question.explanation.short}</p>
      </div>
      <ol className="grid gap-2 text-sm leading-6 text-ink/75">
        {question.explanation.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
}

async function submitExhibitAttempt({
  answerDraft,
  dataset,
  locale,
  question,
  setAttemptStatus,
  setSaveStatus,
  setSolutionVisible,
  setValidationResult,
  startedAt,
  storageFactory,
  t
}: {
  answerDraft: string;
  dataset: ExhibitDataset;
  locale?: string;
  question: ExhibitQuestionSpec;
  setAttemptStatus: (status: string | undefined) => void;
  setSaveStatus: (status: AttemptSaveStatus) => void;
  setSolutionVisible: (visible: boolean) => void;
  setValidationResult: (result: ValidationResult | undefined) => void;
  startedAt: string;
  storageFactory: () => AppStorage;
  t: ReturnType<typeof useI18n>["t"];
}): Promise<void> {
  if (answerDraft.trim().length === 0) {
    setAttemptStatus(t("Enter an answer before submitting."));
    setSaveStatus("error");
    setSolutionVisible(false);
    setValidationResult(undefined);
    return;
  }

  const validation = validateExhibitResponse(answerDraft, question, { locale });

  setValidationResult(validation);
  setSolutionVisible(true);
  setSaveStatus("saving");

  try {
    const storage = storageFactory();

    try {
      await persistExhibitAttempt({
        dataset,
        question,
        rawInput: answerDraft,
        startedAt,
        storage,
        validation
      });
    } finally {
      storage.close();
    }

    setSaveStatus("saved");
    setAttemptStatus(
      validation.isCorrect
        ? t("Correct. Attempt saved on this device.")
        : t("{feedback} Attempt saved on this device.", { feedback: t(validation.feedbackMessage) })
    );
  } catch {
    setSaveStatus("error");
    setAttemptStatus(t("Answer checked, but the attempt could not be saved on this device."));
  }
}

function formatQuestionAnswer(question: ExhibitQuestionSpec): string {
  if (isExhibitMultipleChoiceQuestion(question)) {
    return question.choices.find((choice) => choice.id === question.correctChoiceId)?.label ?? "Unavailable";
  }

  return formatExhibitAnswerValue(question.answer.value, question.answer.unit);
}

function getColumnLabels(dataset: ExhibitDataset, columnIds: readonly string[]): string[] {
  return columnIds.map((columnId) => dataset.columns.find((column) => column.id === columnId)?.label ?? columnId);
}
