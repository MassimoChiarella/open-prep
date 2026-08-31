"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { PageHeader } from "@/components/PageHeader";
import { badgeClass, buttonClass, cx, uiInputs, uiText } from "@/components/uiStyles";
import { questioningPrompts } from "@/data/casePractice/questioningPrompts";
import { savePracticeAttempt } from "@/features/case-practice/practiceRecords";
import {
  isCompleteCaseQuestion,
  scoreCaseQuestioning,
  type CaseQuestioningPrompt,
  type CaseQuestioningQuestion,
  type CaseQuestioningScore
} from "@/features/case-practice/questioning/questioningScoring";
import { useI18n } from "@/features/i18n/I18nProvider";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

type SaveState = "idle" | "saving" | "saved" | "error";

interface QuestioningPracticeProps {
  backHref?: string;
  prompts?: readonly CaseQuestioningPrompt[];
  storageFactory?: () => AppStorage;
}

export function QuestioningPractice({
  backHref = "/case-practice",
  prompts = questioningPrompts,
  storageFactory = createIndexedDbAppStorage
}: QuestioningPracticeProps = {}) {
  const { t } = useI18n();
  const [promptIndex, setPromptIndex] = useState(0);
  const [questions, setQuestions] = useState<CaseQuestioningQuestion[]>(() => initialQuestions(prompts[0]));
  const [includeRanking, setIncludeRanking] = useState(false);
  const [result, setResult] = useState<CaseQuestioningScore | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const startedAt = useRef(0);
  const nextQuestionNumber = useRef((prompts[0]?.minimumQuestions ?? 0) + 1);
  const prompt = prompts[promptIndex] ?? prompts[0];

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  if (prompt === undefined) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          description={t("Practice asking focused questions that clarify the objective and expose the strongest diagnostic paths.")}
          eyebrow={t("Case Practice")}
          title={t("Questioning practice")}
        />
        <p className={uiText.body}>{t("Questioning prompts could not be loaded.")}</p>
      </main>
    );
  }

  function startPrompt(nextIndex: number) {
    const nextPrompt = prompts[nextIndex] ?? prompts[0];
    if (nextPrompt === undefined) return;
    setPromptIndex(nextIndex);
    setQuestions(initialQuestions(nextPrompt));
    setIncludeRanking(false);
    setResult(null);
    setSaveState("idle");
    nextQuestionNumber.current = nextPrompt.minimumQuestions + 1;
    startedAt.current = Date.now();
  }

  function updateQuestion(id: string, text: string) {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, text } : question));
  }

  function addQuestion() {
    if (questions.length >= prompt.maximumQuestions) return;
    const number = nextQuestionNumber.current;
    nextQuestionNumber.current += 1;
    setQuestions((current) => [...current, { id: `${prompt.id}-question-${number}`, text: "" }]);
  }

  function removeQuestion(id: string) {
    if (questions.length <= prompt.minimumQuestions) return;
    setQuestions((current) => current.filter((question) => question.id !== id));
  }

  function moveQuestion(id: string, offset: -1 | 1) {
    setQuestions((current) => {
      const index = current.findIndex((question) => question.id === id);
      const destination = index + offset;
      if (index < 0 || destination < 0 || destination >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
      return reordered;
    });
  }

  async function submitQuestions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (questions.some((question) => !isCompleteCaseQuestion(question.text, prompt.language))) return;

    const score = scoreCaseQuestioning(prompt, {
      includeRanking,
      questions: questions.map((question, index) => ({
        ...question,
        ...(includeRanking ? { rank: index + 1 } : {})
      }))
    });
    setResult(score);
    setSaveState("saving");

    try {
      const storage = storageFactory();
      try {
        await savePracticeAttempt(storage, {
          module: "questioning",
          itemId: prompt.id,
          completedAt: new Date().toISOString(),
          score: score.totalScore,
          maxScore: score.maxScore,
          durationSeconds: Math.max(1, Math.round((Date.now() - startedAt.current) / 1_000))
        });
      } finally {
        storage.close();
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  const canSubmit = questions.every((question) => isCompleteCaseQuestion(question.text, prompt.language));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: backHref, label: t("Back to Case Practice") }}
        description={t("Practice asking focused questions that clarify the objective and expose the strongest diagnostic paths.")}
        eyebrow={t("Case Practice")}
        title={t("Questioning practice")}
      />

      <section
        aria-labelledby="questioning-prompt-heading"
        className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 border border-ink/15 border-t-2 border-t-coral bg-white p-5 sm:p-6"
      >
        <label className={uiText.controlLabel} htmlFor="questioning-prompt">
          {t("Practice case")}
        </label>
        <select
          className={uiInputs.compact}
          dir="auto"
          disabled={saveState === "saving"}
          id="questioning-prompt"
          lang={prompt.language}
          onChange={(event) => startPrompt(Number(event.target.value))}
          value={promptIndex}
        >
          {prompts.map((item, index) => (
            <option key={item.id} value={index}>{item.title}</option>
          ))}
        </select>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 border-t border-ink/10 pt-5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className={cx(uiText.eyebrow, "min-w-0 max-w-full text-xs text-teal [overflow-wrap:anywhere]")} dir="auto" lang={prompt.language}>{prompt.industry}</p>
            <span className={badgeClass("neutral")}>
              {prompt.mode === "clarifying" ? t("Clarifying") : t("Diagnostic")}
            </span>
          </div>
          <h2 className={uiText.sectionTitle} dir="auto" id="questioning-prompt-heading" lang={prompt.language}>{prompt.title}</h2>
          <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")} dir="auto" lang={prompt.language}>{prompt.situation}</p>
          <p className={cx(uiText.body, "min-w-0")}>
            <strong className="text-ink">{t("Your task:")}</strong>{" "}
            <span className="[overflow-wrap:anywhere]" dir="auto" lang={prompt.language}>{prompt.objective}</span>
          </p>
        </div>
      </section>

      <form className="grid gap-8" onSubmit={submitQuestions}>
        <QuestioningResponseFields
          disabled={result !== null}
          includeRanking={includeRanking}
          onAdd={addQuestion}
          onMove={moveQuestion}
          onRankingChange={setIncludeRanking}
          onRemove={removeQuestion}
          onTextChange={updateQuestion}
          prompt={prompt}
          questions={questions}
        />

        {result === null ? (
          <button className={buttonClass("primary")} disabled={!canSubmit} type="submit">
            {t("Score Questions")}
          </button>
        ) : (
          <QuestioningResult
            prompt={prompt}
            promptCount={prompts.length}
            promptIndex={promptIndex}
            result={result}
            saveState={saveState}
            startPrompt={startPrompt}
          />
        )}
      </form>
    </main>
  );
}

export function QuestioningResponseFields({
  disabled = false,
  includeRanking,
  onAdd,
  onMove,
  onRankingChange,
  onRemove,
  onTextChange,
  prompt,
  questions
}: {
  disabled?: boolean;
  includeRanking: boolean;
  onAdd: () => void;
  onMove: (id: string, offset: -1 | 1) => void;
  onRankingChange: (checked: boolean) => void;
  onRemove: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  prompt: CaseQuestioningPrompt;
  questions: readonly CaseQuestioningQuestion[];
}) {
  const { formatNumber, t } = useI18n();

  return (
    <fieldset className="grid gap-5" disabled={disabled}>
      <legend className={uiText.sectionTitle}>{t("Ask your questions")}</legend>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className={uiText.body} id={`${prompt.id}-question-count`}>
          {t("Enter {minimum} to {maximum} distinct questions. Be specific about the business evidence you need.", {
            minimum: formatNumber(prompt.minimumQuestions),
            maximum: formatNumber(prompt.maximumQuestions)
          })}
        </p>
        <span className={badgeClass("neutral")}>
          {t("{count} questions", { count: formatNumber(questions.length) })}
        </span>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 border-y border-ink/10 py-3 text-sm font-medium text-ink">
        <input
          checked={includeRanking}
          className="h-5 w-5 shrink-0 accent-teal"
          onChange={(event) => onRankingChange(event.currentTarget.checked)}
          type="checkbox"
        />
        <span>
          {t("Rank my questions")}
          <span className="mt-0.5 block font-normal text-ink/65">
            {t("Optional: arrange the most important questions first for a prioritization score.")}
          </span>
        </span>
      </label>

      <div aria-describedby={`${prompt.id}-question-count`} className="grid gap-4">
        {questions.map((question, index) => (
          <div className="grid gap-2 border-b border-ink/10 pb-4 sm:grid-cols-[auto_1fr_auto] sm:items-start" key={question.id}>
            <span className={cx(badgeClass(includeRanking ? "success" : "neutral"), "mt-1 min-w-14 text-center")}>
              {includeRanking ? t("Rank {number}", { number: formatNumber(index + 1) }) : t("Q{number}", { number: formatNumber(index + 1) })}
            </span>
            <label className="grid gap-1" htmlFor={question.id}>
              <span className="sr-only">{t("Question {number}", { number: formatNumber(index + 1) })}</span>
              <textarea
                aria-describedby={question.text.trim() !== "" && !isCompleteCaseQuestion(question.text, prompt.language) ? `${question.id}-quality` : undefined}
                aria-invalid={question.text.trim() !== "" && !isCompleteCaseQuestion(question.text, prompt.language)}
                className={cx(uiInputs.textarea, "min-h-20")}
                dir="auto"
                id={question.id}
                maxLength={300}
                onChange={(event) => onTextChange(question.id, event.currentTarget.value)}
                placeholder={t("Type a question you would ask the interviewer")}
                required
                value={question.text}
              />
              {question.text.trim() !== "" && !isCompleteCaseQuestion(question.text, prompt.language) ? (
                <span className="text-xs leading-5 text-coral" id={`${question.id}-quality`}>
                  {t("Write a complete question with enough detail to show what relationship or evidence you want to test.")}
                </span>
              ) : null}
            </label>
            <div className="flex min-h-11 gap-2 sm:justify-end">
              {includeRanking ? (
                <>
                  <button
                    aria-label={t("Move question {number} up", { number: formatNumber(index + 1) })}
                    className={buttonClass("secondary", "h-11 min-w-11 px-0 text-lg")}
                    disabled={disabled || index === 0}
                    onClick={() => onMove(question.id, -1)}
                    title={t("Move up")}
                    type="button"
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    aria-label={t("Move question {number} down", { number: formatNumber(index + 1) })}
                    className={buttonClass("secondary", "h-11 min-w-11 px-0 text-lg")}
                    disabled={disabled || index === questions.length - 1}
                    onClick={() => onMove(question.id, 1)}
                    title={t("Move down")}
                    type="button"
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                </>
              ) : null}
              <button
                className={buttonClass("secondary")}
                disabled={disabled || questions.length <= prompt.minimumQuestions}
                onClick={() => onRemove(question.id)}
                type="button"
              >
                {t("Remove")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        className={buttonClass("secondary")}
        disabled={disabled || questions.length >= prompt.maximumQuestions}
        onClick={onAdd}
        type="button"
      >
        {t("Add Question")}
      </button>
    </fieldset>
  );
}

function QuestioningResult({
  prompt,
  promptCount,
  promptIndex,
  result,
  saveState,
  startPrompt
}: {
  prompt: CaseQuestioningPrompt;
  promptCount: number;
  promptIndex: number;
  result: CaseQuestioningScore;
  saveState: SaveState;
  startPrompt: (index: number) => void;
}) {
  const { formatNumber, formatPercent, t } = useI18n();
  const intentById = new Map(prompt.intents.map((intent) => [intent.id, intent]));
  const conceptById = new Map(prompt.concepts.map((concept) => [concept.id, concept]));

  return (
    <section aria-labelledby="questioning-result-heading" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 border-t border-ink/10 pt-8">
      <div
        className={cx(
          "grid gap-5 border border-ink/15 border-t-2 bg-white p-5 sm:p-6",
          result.totalScore / result.maxScore >= 0.8 ? "border-t-teal" : "border-t-coral"
        )}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={cx(uiText.eyebrow, "text-xs text-teal")}>{t("Completed")}</p>
            <h2 className={uiText.sectionTitle} id="questioning-result-heading">{t("Question review")}</h2>
          </div>
          <p aria-live="polite" className={uiText.metric}>
            {formatNumber(result.totalScore)} / {formatNumber(result.maxScore)}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4 border-y border-ink/10 py-4 text-sm sm:grid-cols-4">
          <ScoreMetric label={t("Coverage")} score={result.coverage.score} max={result.coverage.maxScore} />
          <ScoreMetric label={t("Relevance")} score={result.relevance.score} max={result.relevance.maxScore} />
          <ScoreMetric label={t("Distinctness")} score={result.distinctness.score} max={result.distinctness.maxScore} />
          {result.prioritization === undefined ? (
            <div><dt className="text-ink/65">{t("Prioritization")}</dt><dd className="mt-1 font-semibold text-ink">{t("Not scored")}</dd></div>
          ) : (
            <ScoreMetric label={t("Prioritization")} score={result.prioritization.score} max={result.prioritization.maxScore} />
          )}
        </dl>
        <p className={uiText.dense}>
          {t("Matches use the authored rubric, its concept aliases, and text similarity. An unmatched question may still be reasonable outside this rubric.")}
        </p>
      </div>

      {saveState === "saving" ? <LocalSaveNotice detail={t("Recording this completed attempt in local progress.")} label={t("Saving")} tone="neutral" /> : null}
      {saveState === "saved" ? <LocalSaveNotice detail={t("This questioning result is available to local progress and future case workflows.")} /> : null}
      {saveState === "error" ? <LocalSaveNotice detail={t("Your score is still visible, but this attempt could not be saved locally.")} label={t("Not Saved")} tone="error" /> : null}

      <div className="grid gap-4">
        <h2 className={uiText.sectionTitle}>{t("Question-by-question feedback")}</h2>
        <div className="grid gap-3">
          {result.matches.map((match, index) => (
            <article className="min-w-0 border border-ink/15 border-t-2 border-t-teal bg-white p-4" key={match.questionId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className={cx(uiText.eyebrow, "text-xs text-ink/55")}>{t("Question {number}", { number: formatNumber(index + 1) })}</p>
                  <p className={cx(uiText.bodyStrong, "mt-1 break-words")} dir="auto">{match.text}</p>
                </div>
                <span className={cx(badgeClass(match.duplicateOfQuestionId ? "warning" : match.intentId ? "success" : "neutral"), "min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere]")} dir="auto">
                  {match.duplicateOfQuestionId ? t("Repeated theme") : match.intentLabel ?? t("No rubric match")}
                </span>
              </div>
              {match.intentId === undefined ? (
                <p className={cx(uiText.body, "mt-3")}>{t("No authored theme was recognized. Try naming the business measure, segment, process, or decision you want to test.")}</p>
              ) : (
                <div className="mt-3 grid gap-2">
                  <p className={cx(uiText.body, "min-w-0 [overflow-wrap:anywhere]")} dir="auto" lang={prompt.language}>{intentById.get(match.intentId)?.feedback}</p>
                  <p className={uiText.dense}>
                    {t("Match confidence: {percent}", { percent: formatPercent(match.similarity) })}
                  </p>
                  {match.matchedConceptIds.length > 0 ? (
                    <p className={cx(uiText.dense, "min-w-0 [overflow-wrap:anywhere]")}>
                      {t("Recognized concepts: {concepts}", {
                        concepts: match.matchedConceptIds.map((id) => conceptById.get(id)?.label ?? id).join(", ")
                      })}
                    </p>
                  ) : null}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <h2 className={uiText.sectionTitle}>{t("Model question set")}</h2>
        <p className={uiText.body}>{t("Compare your questions with these rubric themes. They are examples, not a script to memorize.")}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {prompt.intents.map((intent) => {
            const matched = result.coverage.matchedIntentIds.includes(intent.id);
            return (
              <article className="min-w-0 border border-ink/15 border-t-2 border-t-coral bg-white p-4" key={intent.id}>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <h3 className={uiText.subsectionTitle} dir="auto" lang={prompt.language}>{intent.label}</h3>
                  <span className={badgeClass(matched ? "success" : "warning")}>{matched ? t("Covered") : t("Missed")}</span>
                </div>
                <p className={cx(uiText.body, "mt-2 min-w-0 [overflow-wrap:anywhere]")} dir="auto" lang={prompt.language}>{intent.feedback}</p>
                <ul className="mt-3 grid min-w-0 gap-2 text-sm leading-6 text-ink/70">
                  {intent.referenceQuestions.map((question) => <li className="min-w-0 border-s-2 border-teal/30 ps-3 [overflow-wrap:anywhere]" dir="auto" key={question} lang={prompt.language}>{question}</li>)}
                </ul>
              </article>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className={buttonClass("secondary")} disabled={saveState === "saving"} onClick={() => startPrompt(promptIndex)} type="button">{t("Retry Case")}</button>
        <button className={buttonClass("primary")} disabled={saveState === "saving"} onClick={() => startPrompt((promptIndex + 1) % promptCount)} type="button">{t("Next Case")}</button>
      </div>
    </section>
  );
}

function ScoreMetric({ label, max, score }: { label: string; max: number; score: number }) {
  const { formatNumber } = useI18n();
  return <div><dt className="text-ink/65">{label}</dt><dd className="mt-1 font-semibold text-ink">{formatNumber(score)} / {formatNumber(max)}</dd></div>;
}

function initialQuestions(prompt: CaseQuestioningPrompt | undefined): CaseQuestioningQuestion[] {
  return Array.from({ length: prompt?.minimumQuestions ?? 0 }, (_, index) => ({
    id: `${prompt?.id ?? "questioning"}-question-${index + 1}`,
    text: ""
  }));
}
