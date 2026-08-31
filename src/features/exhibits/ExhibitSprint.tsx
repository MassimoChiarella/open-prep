"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ExhibitAnswerInput } from "@/features/exhibits/ExhibitAnswerInput";
import { ExhibitChartRenderer } from "@/features/exhibits/ExhibitChartRenderer";
import { isExhibitChartDataset } from "@/features/exhibits/exhibitChartData";
import {
  isExhibitMultipleChoiceQuestion,
  validateExhibitResponse
} from "@/features/exhibits/exhibitDataset";
import { formatExhibitAnswerValue } from "@/features/exhibits/exhibitFormatting";
import { persistExhibitAttempt } from "@/features/exhibits/exhibitPersistence";
import {
  buildExhibitSprintItems,
  exhibitSprintQuestionCounts,
  type ExhibitSprintItem
} from "@/features/exhibits/exhibitSprintSelection";
import { ExhibitTableRenderer } from "@/features/exhibits/ExhibitTableRenderer";
import type { ExhibitDataset, ExhibitQuestionSpec } from "@/features/exhibits/exhibitTypes";
import { useI18n } from "@/features/i18n/I18nProvider";
import { formatLabel } from "@/lib/format";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { nextLocalPracticeNonce } from "@/lib/localPracticeNonce";
import type { ValidationResult } from "@/lib/validation/validateAnswer";

interface ExhibitSprintProps {
  backHref?: string;
  datasets: readonly ExhibitDataset[];
  seed?: string | number;
  storageFactory?: () => AppStorage;
}

interface SprintFeedback {
  message: string;
  saveStatus: "error" | "saved" | "saving";
  timedOut: boolean;
  validation: ValidationResult;
}

interface SprintResult {
  datasetTitle: string;
  isCorrect: boolean;
  prompt: string;
  timedOut: boolean;
}

type SprintPhase = "active" | "setup" | "summary";

export function ExhibitSprint({
  backHref = "/exhibits",
  datasets,
  seed,
  storageFactory = createIndexedDbAppStorage
}: ExhibitSprintProps) {
  const { formatNumber, formatPercent, locale, t } = useI18n();
  const [questionCount, setQuestionCount] = useState<(typeof exhibitSprintQuestionCounts)[number]>(5);
  const [sprintSeed, setSprintSeed] = useState<string | number | undefined>(seed);
  const items = useMemo(
    () => buildExhibitSprintItems(datasets, questionCount, sprintSeed),
    [datasets, questionCount, sprintSeed]
  );
  const [phase, setPhase] = useState<SprintPhase>("setup");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerDraft, setAnswerDraft] = useState("");
  const [feedback, setFeedback] = useState<SprintFeedback>();
  const [results, setResults] = useState<SprintResult[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const startedAtRef = useRef(new Date().toISOString());
  const item = items[questionIndex];

  const submitCurrent = useCallback(
    async (timedOut = false) => {
      if (item === undefined || feedback !== undefined) {
        return;
      }

      if (!timedOut && answerDraft.trim().length === 0) {
        setFeedback(undefined);
        return;
      }

      const validation = validateExhibitResponse(answerDraft, item.question, { locale, timedOut });
      const initialFeedback: SprintFeedback = {
        message: timedOut ? t("Time expired. Review the answer, then continue.") : t(validation.feedbackMessage),
        saveStatus: "saving",
        timedOut,
        validation
      };

      setFeedback(initialFeedback);
      setResults((current) => [
        ...current,
        {
          datasetTitle: item.dataset.title,
          isCorrect: validation.isCorrect,
          prompt: item.question.prompt,
          timedOut
        }
      ]);

      try {
        const storage = storageFactory();

        try {
          await persistExhibitAttempt({
            dataset: item.dataset,
            question: item.question,
            rawInput: answerDraft,
            startedAt: startedAtRef.current,
            storage,
            validation
          });
        } finally {
          storage.close();
        }

        setFeedback({ ...initialFeedback, saveStatus: "saved" });
      } catch {
        setFeedback({
          ...initialFeedback,
            message: t("{feedback} The attempt could not be saved on this device.", {
              feedback: initialFeedback.message
            }),
          saveStatus: "error"
        });
      }
    },
    [answerDraft, feedback, item, locale, storageFactory, t]
  );

  useEffect(() => {
    if (phase !== "active" || feedback !== undefined || item === undefined) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (secondsRemaining <= 1) {
        setSecondsRemaining(0);
        void submitCurrent(true);
      } else {
        setSecondsRemaining((seconds) => seconds - 1);
      }
    }, 1_000);

    return () => window.clearTimeout(timer);
  }, [feedback, item, phase, secondsRemaining, submitCurrent]);

  if (items.length < 3) {
    return (
      <section className="border border-ink/15 border-t-2 border-t-coral bg-white p-6">
        <h2 className="text-xl font-semibold text-ink">{t("Exhibit Sprint is unavailable")}</h2>
        <p className="mt-2 text-sm leading-6 text-ink/70">{t("At least three local exhibit questions are required.")}</p>
      </section>
    );
  }

  if (phase === "setup") {
    return (
      <section className="grid gap-6 border border-ink/15 border-t-2 border-t-coral bg-white p-5 sm:p-6" data-testid="exhibit-sprint-setup">
        <div className="grid gap-2">
          <h2 className="text-xl font-semibold text-ink">{t("Choose sprint length")}</h2>
          <p className="text-sm leading-6 text-ink/70">{t("Each question uses its own countdown and saves locally.")}</p>
        </div>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-ink">{t("Questions")}</legend>
          <div className="flex flex-wrap gap-2">
            {exhibitSprintQuestionCounts.map((count) => (
              <label
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-ink/20 px-4 text-sm font-semibold text-ink transition-colors hover:border-teal hover:bg-paper focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal has-[:checked]:border-teal has-[:checked]:bg-mint"
                key={count}
              >
                <input
                  checked={questionCount === count}
                  className="accent-teal"
                  name="sprint-question-count"
                  onChange={() => setQuestionCount(count)}
                  type="radio"
                />
                {formatNumber(count)}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-teal motion-reduce:transform-none active:scale-[0.98]"
          onClick={() => {
            const nextSeed = seed ?? nextLocalPracticeNonce("exhibit-sprint");
            const nextItems = buildExhibitSprintItems(datasets, questionCount, nextSeed);

            setSprintSeed(nextSeed);
            setQuestionIndex(0);
            setAnswerDraft("");
            setFeedback(undefined);
            setResults([]);
            setSecondsRemaining(questionSeconds(nextItems[0]));
            startedAtRef.current = new Date().toISOString();
            setPhase("active");
          }}
          type="button"
        >
          {t("Start Exhibit Sprint")}
        </button>
      </section>
    );
  }

  if (phase === "summary") {
    const correctCount = results.filter((result) => result.isCorrect).length;

    return (
      <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6" data-testid="exhibit-sprint-summary">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 border border-ink/15 border-t-2 border-t-teal bg-white p-5 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal">{t("Sprint complete")}</p>
          <h2 className="text-2xl font-semibold text-ink">
            {t("{correct} of {total} correct", {
              correct: formatNumber(correctCount),
              total: formatNumber(results.length)
            })}
          </h2>
          <p className="text-sm text-ink/70">
            {t("Accuracy {percent}", {
              percent: formatPercent(results.length === 0 ? 0 : correctCount / results.length)
            })}
          </p>
        </div>
        <ol className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
          {results.map((result, index) => (
            <li className="min-w-0 border border-ink/15 border-s-2 border-s-teal bg-white p-4 [overflow-wrap:anywhere]" key={`${result.prompt}-${index}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{result.datasetTitle}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-ink">{result.prompt}</p>
              <p className={`mt-2 text-sm font-semibold ${result.isCorrect ? "text-teal" : "text-coral"}`}>
              {result.isCorrect ? t("Correct") : result.timedOut ? t("Timed out") : t("Incorrect")}
              </p>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-teal motion-reduce:transform-none active:scale-[0.98]"
            onClick={() => setPhase("setup")}
            type="button"
          >
            {t("Start Another Sprint")}
          </button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-ink/30 px-5 text-sm font-semibold text-ink transition hover:border-teal hover:bg-paper motion-reduce:transform-none active:scale-[0.98]"
            href={backHref}
          >
            {t("Return to Exhibit Practice")}
          </Link>
        </div>
      </section>
    );
  }

  return item === undefined ? null : (
    <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5" data-testid="exhibit-sprint-active">
      <header className="grid min-w-0 gap-4 border border-ink/15 border-t-2 border-t-coral bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2" data-testid="exhibit-sprint-prompt">
          <p className="text-xs font-semibold uppercase tracking-wide text-coral">{t("Timed exhibit")}</p>
          <h2 className="min-w-0 text-xl font-semibold text-ink [overflow-wrap:anywhere]">{item.question.prompt}</h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:grid sm:justify-items-end">
          <div className="text-start sm:text-end">
            <p className="text-sm font-semibold text-ink">
              {t("Question {current} of {total}", {
                current: formatNumber(questionIndex + 1),
                total: formatNumber(items.length)
              })}
            </p>
            <p className="mt-1 text-xs text-ink/65">{t(formatLabel(item.dataset.visualization.type))}</p>
          </div>
          <p
            aria-live="off"
            className={`rounded-md px-3 py-2 font-semibold tabular-nums ${secondsRemaining <= 10 ? "bg-coral/10 text-coral" : "bg-paper text-ink"}`}
            data-testid="exhibit-sprint-timer"
            role="timer"
          >
            {t("{duration} remaining", { duration: formatTime(secondsRemaining, formatNumber) })}
          </p>
        </div>
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0" data-testid="exhibit-sprint-exhibit">
          {isExhibitChartDataset(item.dataset) ? (
            <ExhibitChartRenderer dataset={item.dataset} />
          ) : (
            <ExhibitTableRenderer dataset={item.dataset} />
          )}
        </div>

        <aside
          className="grid h-fit min-w-0 grid-cols-[minmax(0,1fr)] gap-5 border border-ink/15 border-t-2 border-t-teal bg-white p-5 lg:sticky lg:top-6"
          data-testid="exhibit-sprint-response"
        >
          <ExhibitAnswerInput
            disabled={feedback !== undefined}
            name={`sprint-answer-${questionIndex}`}
            onChange={setAnswerDraft}
            question={item.question}
            value={answerDraft}
          />

          {feedback === undefined ? (
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-teal motion-reduce:transform-none active:scale-[0.98]"
              disabled={answerDraft.trim().length === 0}
              onClick={() => void submitCurrent(false)}
              type="button"
            >
              {t("Submit Answer")}
            </button>
          ) : (
            <SprintFeedbackPanel feedback={feedback} question={item.question} />
          )}

          {feedback !== undefined ? (
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-teal motion-reduce:transform-none active:scale-[0.98] disabled:opacity-60"
              disabled={feedback.saveStatus === "saving"}
              onClick={() => {
                const nextIndex = questionIndex + 1;

                if (nextIndex >= items.length) {
                  setPhase("summary");
                  return;
                }

                setQuestionIndex(nextIndex);
                setAnswerDraft("");
                setFeedback(undefined);
                setSecondsRemaining(questionSeconds(items[nextIndex]));
                startedAtRef.current = new Date().toISOString();
              }}
              type="button"
            >
              {questionIndex + 1 === items.length ? t("View Summary") : t("Next Question")}
            </button>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function SprintFeedbackPanel({
  feedback,
  question
}: {
  feedback: SprintFeedback;
  question: ExhibitQuestionSpec;
}) {
  const { t } = useI18n();

  return (
    <section
      className={`grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 border-s-2 px-3 py-3 [overflow-wrap:anywhere] ${feedback.validation.isCorrect ? "border-teal bg-mint" : "border-coral bg-coral/10"}`}
      data-testid="exhibit-sprint-feedback"
      role="status"
    >
      <p className="text-sm font-semibold text-ink">{feedback.message}</p>
      <p className="text-sm text-ink/75">{t("Correct answer: {answer}", { answer: formatQuestionAnswer(question) })}</p>
      <ol className="grid gap-1 text-sm leading-6 text-ink/70">
        {question.explanation.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <p className="text-xs font-semibold text-ink/65">
        {feedback.saveStatus === "saving"
          ? t("Saving locally...")
          : feedback.saveStatus === "saved"
            ? t("Saved on this device")
            : t("Local save unavailable")}
      </p>
    </section>
  );
}

function formatQuestionAnswer(question: ExhibitQuestionSpec): string {
  if (isExhibitMultipleChoiceQuestion(question)) {
    return question.choices.find((choice) => choice.id === question.correctChoiceId)?.label ?? "Unavailable";
  }

  return formatExhibitAnswerValue(question.answer.value, question.answer.unit);
}

function formatTime(
  seconds: number,
  formatNumber: ReturnType<typeof useI18n>["formatNumber"]
): string {
  return `${formatNumber(Math.floor(seconds / 60), { useGrouping: false })}:${formatNumber(seconds % 60, {
    minimumIntegerDigits: 2,
    useGrouping: false
  })}`;
}

function questionSeconds(item: ExhibitSprintItem | undefined): number {
  return item?.question.expectedTimeSeconds ?? 60;
}
