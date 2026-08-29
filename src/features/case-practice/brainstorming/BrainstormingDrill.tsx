"use client";

import { useMemo, useRef, useState } from "react";

import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { PageHeader } from "@/components/PageHeader";
import { badgeClass, buttonClass, cx, uiInputs, uiText } from "@/components/uiStyles";
import { brainstormingPrompts } from "@/data/casePractice/brainstormingPrompts";
import {
  scoreBrainstorming,
  type BrainstormingIdea,
  type BrainstormingPrompt,
  type BrainstormingScore
} from "@/features/case-practice/brainstorming/brainstormingScoring";
import { useI18n } from "@/features/i18n/I18nProvider";
import { savePracticeAttempt } from "@/features/case-practice/practiceRecords";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

type SaveStatus = "error" | "idle" | "saved" | "saving";

interface BrainstormingDrillProps {
  backHref?: string;
  prompts?: readonly BrainstormingPrompt[];
}

export function BrainstormingDrill({
  backHref = "/case-practice",
  prompts = brainstormingPrompts
}: BrainstormingDrillProps = {}) {
  const { formatNumber, t } = useI18n();
  const [promptId, setPromptId] = useState(prompts[0]?.id ?? "");
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<string[]>([]);
  const [priorityIdeaIds, setPriorityIdeaIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [score, setScore] = useState<BrainstormingScore>();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const startedAt = useRef<number>();
  const prompt = useMemo(
    () => prompts.find((candidate) => candidate.id === promptId) ?? prompts[0],
    [promptId, prompts]
  );

  if (prompt === undefined) {
    return null;
  }

  const selectionComplete = selectedIdeaIds.length === prompt.selectionLimit;
  const prioritiesComplete = priorityIdeaIds.length === prompt.priorityLimit;

  function reset(nextPromptId = prompt.id) {
    setPromptId(nextPromptId);
    setSelectedIdeaIds([]);
    setPriorityIdeaIds([]);
    setNote("");
    setScore(undefined);
    setSaveStatus("idle");
    startedAt.current = undefined;
  }

  function toggleIdea(ideaId: string, checked: boolean) {
    startedAt.current ??= Date.now();
    setSelectedIdeaIds((current) =>
      checked ? [...current, ideaId] : current.filter((candidate) => candidate !== ideaId)
    );
    if (!checked) {
      setPriorityIdeaIds((current) => current.filter((candidate) => candidate !== ideaId));
    }
    setScore(undefined);
    setSaveStatus("idle");
  }

  function togglePriority(ideaId: string, checked: boolean) {
    setPriorityIdeaIds((current) =>
      checked ? [...current, ideaId] : current.filter((candidate) => candidate !== ideaId)
    );
    setScore(undefined);
    setSaveStatus("idle");
  }

  async function handleSubmit() {
    const result = scoreBrainstorming(prompt, { note, priorityIdeaIds, selectedIdeaIds });
    const completedAt = new Date().toISOString();

    setScore(result);
    setSaveStatus("saving");

    try {
      const storage = createIndexedDbAppStorage();

      try {
        await savePracticeAttempt(storage, {
          module: "brainstorming",
          itemId: prompt.id,
          completedAt,
          score: result.totalScore,
          maxScore: result.maxScore,
          durationSeconds:
            startedAt.current === undefined
              ? 0
              : Math.max(0, Math.round((Date.now() - startedAt.current) / 1000))
        });
      } finally {
        storage.close();
      }

      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: backHref, label: t("Back to Case Practice") }}
        description={t("Build a broad answer across distinct themes, then identify the ideas that deserve attention first.")}
        eyebrow={t("Case Practice")}
        title={t("Structured Brainstorming")}
      />

      <section
        className="grid gap-4 border border-ink/15 border-t-2 border-t-coral bg-white p-5 sm:p-6"
        aria-labelledby="brainstorming-prompt-heading"
      >
        <label className={cx(uiText.controlLabel, "grid max-w-xl gap-2")}>
          {t("Prompt")}
          <select
            className={uiInputs.compact}
            onChange={(event) => reset(event.currentTarget.value)}
            value={prompt.id}
          >
            {prompts.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-2 border-t border-ink/10 pt-4">
          <h2 className="text-xl font-semibold text-ink" id="brainstorming-prompt-heading">
            {prompt.title}
          </h2>
          <p className={uiText.body}>{prompt.context}</p>
          <p className={uiText.bodyStrong}>{prompt.question}</p>
        </div>
      </section>

      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <BrainstormingResponseFields
          description={t("Select {ideas} ideas and mark {priorities} as priorities.", {
            ideas: formatNumber(prompt.selectionLimit),
            priorities: formatNumber(prompt.priorityLimit)
          })}
          heading={t("Build your answer")}
          onIdeaChange={toggleIdea}
          onPriorityChange={togglePriority}
          priorityIdeaIds={priorityIdeaIds}
          prompt={prompt}
          selectedIdeaIds={selectedIdeaIds}
        />

        <label className={cx(uiText.controlLabel, "grid gap-2")}>
          {t("Optional reflection note")}
          <textarea
            className={uiInputs.textarea}
            onChange={(event) => {
              setNote(event.currentTarget.value);
              setSaveStatus("idle");
            }}
            placeholder={t("Capture your reasoning for the two priorities")}
            value={note}
          />
          <span className={uiText.dense}>{t("For reflection only; it does not affect the score or saved result.")}</span>
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            aria-describedby={`${prompt.id}-brainstorming-progress`}
            className={buttonClass("primary")}
            disabled={!selectionComplete || !prioritiesComplete || saveStatus === "saving"}
            type="submit"
          >
            {saveStatus === "saving" ? t("Saving...") : t("Score and Save")}
          </button>
          <button className={buttonClass("secondary")} onClick={() => reset()} type="button">
            {t("Reset")}
          </button>
        </div>
      </form>

      {score !== undefined ? <ScorePanel prompt={prompt} score={score} /> : null}
      {saveStatus === "saved" ? (
        <LocalSaveNotice detail={t("This brainstorming result was added to your local practice history.")} />
      ) : null}
      {saveStatus === "error" ? (
        <LocalSaveNotice
          detail={t("Your score is available below, but it could not be saved on this device.")}
          label={t("Save status")}
          tone="error"
        />
      ) : null}
    </main>
  );
}

export function BrainstormingResponseFields({
  description,
  heading,
  onIdeaChange,
  onPriorityChange,
  priorityIdeaIds,
  prompt,
  selectedIdeaIds
}: {
  description: string;
  heading: string;
  onIdeaChange: (id: string, checked: boolean) => void;
  onPriorityChange: (id: string, checked: boolean) => void;
  priorityIdeaIds: readonly string[];
  prompt: BrainstormingPrompt;
  selectedIdeaIds: readonly string[];
}) {
  const { formatNumber, t } = useI18n();
  const selectionComplete = selectedIdeaIds.length === prompt.selectionLimit;
  const prioritiesComplete = priorityIdeaIds.length === prompt.priorityLimit;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-2xl font-semibold text-ink">{heading}</h2>
          <p className={uiText.body} id={`${prompt.id}-brainstorming-progress`}>
            {description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-live="polite">
          <span className={badgeClass(selectionComplete ? "success" : "neutral")}>
            {t("Ideas {selected}/{total}", {
              selected: formatNumber(selectedIdeaIds.length),
              total: formatNumber(prompt.selectionLimit)
            })}
          </span>
          <span className={badgeClass(prioritiesComplete ? "success" : "neutral")}>
            {t("Priorities {selected}/{total}", {
              selected: formatNumber(priorityIdeaIds.length),
              total: formatNumber(prompt.priorityLimit)
            })}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {prompt.themes.map((theme) => (
          <div className="min-w-0 border border-ink/15 border-t-2 border-t-teal bg-white p-5 sm:p-6" key={theme.id}>
            <fieldset className="min-w-0">
              <legend className="w-full max-w-full break-words text-base font-semibold text-ink">{theme.label}</legend>
              <div className="mt-2 divide-y divide-ink/10">
                {theme.ideas.map((idea) => (
                  <IdeaChoice
                    idea={idea}
                    key={idea.id}
                    onIdeaChange={(checked) => onIdeaChange(idea.id, checked)}
                    onPriorityChange={(checked) => onPriorityChange(idea.id, checked)}
                    priorityDisabled={
                      !selectedIdeaIds.includes(idea.id) ||
                      (prioritiesComplete && !priorityIdeaIds.includes(idea.id))
                    }
                    prioritySelected={priorityIdeaIds.includes(idea.id)}
                    selectionDisabled={selectionComplete && !selectedIdeaIds.includes(idea.id)}
                    selected={selectedIdeaIds.includes(idea.id)}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        ))}
      </div>
    </div>
  );
}

function IdeaChoice({
  idea,
  onIdeaChange,
  onPriorityChange,
  priorityDisabled,
  prioritySelected,
  selectionDisabled,
  selected
}: {
  idea: BrainstormingIdea;
  onIdeaChange: (checked: boolean) => void;
  onPriorityChange: (checked: boolean) => void;
  priorityDisabled: boolean;
  prioritySelected: boolean;
  selectionDisabled: boolean;
  selected: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 py-4 first:pt-2 last:pb-1">
      <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-ink">
        <input
          aria-label={t("Include {idea}", { idea: idea.label })}
          checked={selected}
          className="mt-1 h-4 w-4 shrink-0 accent-teal"
          disabled={selectionDisabled}
          onChange={(event) => onIdeaChange(event.currentTarget.checked)}
          type="checkbox"
        />
        <span>{idea.label}</span>
      </label>
      <label className={cx("ml-7 flex min-h-8 items-center gap-2 text-xs font-semibold", priorityDisabled ? "text-ink/45" : "text-teal")}>
        <input
          aria-label={t("Prioritize {idea}", { idea: idea.label })}
          checked={prioritySelected}
          className="h-4 w-4 accent-teal"
          disabled={priorityDisabled}
          onChange={(event) => onPriorityChange(event.currentTarget.checked)}
          type="checkbox"
        />
        {t("Priority")}
      </label>
    </div>
  );
}

function ScorePanel({ prompt, score }: { prompt: BrainstormingPrompt; score: BrainstormingScore }) {
  const { formatNumber, t } = useI18n();
  const ideas = prompt.themes.flatMap((theme) => theme.ideas);
  const ideaLabels = new Map(ideas.map((idea) => [idea.id, idea.label]));
  const missedRelevant = ideas.filter(
    (idea) => idea.relevant && !score.relevance.relevantIdeaIds.includes(idea.id)
  );
  const selectedDistractors = ideas.filter((idea) => score.relevance.irrelevantIdeaIds.includes(idea.id));

  return (
    <section
      aria-labelledby="brainstorming-score-heading"
      aria-live="polite"
      className="grid gap-5 border border-ink/15 border-t-2 border-t-teal bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className={cx(uiText.eyebrow, "text-teal")}>{t("Result")}</p>
          <h2 className="text-2xl font-semibold text-ink" id="brainstorming-score-heading">
            {t("Brainstorming score")}
          </h2>
        </div>
        <span className="rounded-md bg-white px-3 py-2 text-lg font-semibold text-teal">
          {formatNumber(score.totalScore)}/{formatNumber(score.maxScore)}
        </span>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <ScoreDimension label={t("Coverage")} dimension={score.coverage} />
        <ScoreDimension label={t("Relevance")} dimension={score.relevance} />
        <ScoreDimension label={t("Prioritization")} dimension={score.prioritization} />
      </dl>

      <div className="grid gap-4 border-t border-teal/20 pt-4 md:grid-cols-3">
        <FeedbackList
          emptyLabel={t("You covered every relevant benchmark idea.")}
          heading={t("Relevant ideas missed")}
          labels={missedRelevant.map((idea) => idea.label)}
        />
        <FeedbackList
          emptyLabel={t("No off-brief ideas selected.")}
          heading={t("Off-brief selections")}
          labels={selectedDistractors.map((idea) => idea.label)}
        />
        <FeedbackList
          emptyLabel={t("No benchmark priorities are configured.")}
          heading={t("Benchmark priorities")}
          labels={prompt.priorityIdeaIds.map((id) => ideaLabels.get(id) ?? id)}
        />
      </div>
    </section>
  );
}

function ScoreDimension({
  dimension,
  label
}: {
  dimension: { score: number; maxScore: number };
  label: string;
}) {
  const { formatNumber } = useI18n();
  return (
    <div className="border-l-2 border-teal pl-3">
      <dt className={uiText.controlLabel}>{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-ink">
        {formatNumber(dimension.score)}/{formatNumber(dimension.maxScore)}
      </dd>
    </div>
  );
}

function FeedbackList({
  emptyLabel,
  heading,
  labels
}: {
  emptyLabel: string;
  heading: string;
  labels: readonly string[];
}) {
  return (
    <div className="grid content-start gap-2">
      <h3 className={uiText.subsectionTitle}>{heading}</h3>
      {labels.length === 0 ? (
        <p className={uiText.dense}>{emptyLabel}</p>
      ) : (
        <ul className="grid list-disc gap-1 pl-5 text-xs leading-5 text-ink/70">
          {labels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
