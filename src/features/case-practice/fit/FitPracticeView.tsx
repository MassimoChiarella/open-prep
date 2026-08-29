"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { badgeClass, buttonClass, cx, statusMessageClass, uiInputs, uiText } from "@/components/uiStyles";
import { fitPracticePrompts } from "@/data/casePractice/fitPrompts";
import {
  createFitStoryRecord,
  fitCompetencyLabels,
  fitReviewCriteria,
  scoreFitReview,
  validateFitStoryDraft,
  type FitPracticePrompt,
  type FitReviewCriterionId,
  type FitStoryDraft,
  type FitStoryValidationErrors
} from "@/features/case-practice/fit/fitPractice";
import {
  deleteFitStory,
  loadFitStories,
  saveFitStory,
  savePracticeAttempt
} from "@/features/case-practice/practiceRecords";
import { useI18n } from "@/features/i18n/I18nProvider";
import type { FitCompetency, FitStoryRecord } from "@/features/case-practice/practiceTypes";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

type RehearsalPhase = "idle" | "review" | "running" | "saved";
type SaveStatus = "error" | "idle" | "saved" | "saving";
type StoryStatus = "error" | "idle" | "loading" | "saved" | "saving";

const rehearsalDurations = [90, 120] as const;

export function FitPracticeView({
  prompts = fitPracticePrompts,
  storageFactory = createIndexedDbAppStorage
}: {
  prompts?: readonly FitPracticePrompt[];
  storageFactory?: () => AppStorage;
} = {}) {
  const { formatNumber, t } = useI18n();
  const [stories, setStories] = useState<FitStoryRecord[]>([]);
  const [storyStatus, setStoryStatus] = useState<StoryStatus>("loading");
  const [editingStoryId, setEditingStoryId] = useState<string>();
  const [draft, setDraft] = useState<FitStoryDraft>(createEmptyDraft);
  const [validationErrors, setValidationErrors] = useState<FitStoryValidationErrors>({});
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState("");
  const [durationSeconds, setDurationSeconds] = useState<(typeof rehearsalDurations)[number]>(120);
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const [phase, setPhase] = useState<RehearsalPhase>("idle");
  const [completedCriteria, setCompletedCriteria] = useState<FitReviewCriterionId[]>([]);
  const [reviewStatus, setReviewStatus] = useState<SaveStatus>("idle");

  const selectedStory = stories.find((story) => story.id === selectedStoryId);
  const availablePrompts = prompts.filter((prompt) => prompt.competency === selectedStory?.competency);
  const selectedPrompt = availablePrompts.find((prompt) => prompt.id === selectedPromptId) ?? availablePrompts[0];
  const reviewScore = scoreFitReview(completedCriteria);

  useEffect(() => {
    let cancelled = false;
    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      void loadFitStories(storage)
        .then((loadedStories) => {
          if (cancelled) return;

          setStories(loadedStories);
          setStoryStatus("idle");

          const firstStory = loadedStories[0];
          if (firstStory !== undefined) {
            setSelectedStoryId(firstStory.id);
            setSelectedPromptId(firstPromptId(prompts, firstStory.competency));
          }
        })
        .catch(() => {
          if (!cancelled) setStoryStatus("error");
        })
        .finally(() => storage?.close());
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) setStoryStatus("error");
      });
    }

    return () => {
      cancelled = true;
    };
  }, [prompts, storageFactory]);

  useEffect(() => {
    if (phase !== "running") return;

    if (remainingSeconds === 0) return;

    const timeout = window.setTimeout(() => {
      if (remainingSeconds === 1) {
        setRemainingSeconds(0);
        setPhase("review");
      } else {
        setRemainingSeconds(remainingSeconds - 1);
      }
    }, 1_000);
    return () => window.clearTimeout(timeout);
  }, [phase, remainingSeconds]);

  async function handleSaveStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateFitStoryDraft(draft);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      window.requestAnimationFrame(() => document.getElementById(`fit-story-${Object.keys(errors)[0]}`)?.focus());
      return;
    }

    setStoryStatus("saving");
    let storage: AppStorage | undefined;

    try {
      const record = createFitStoryRecord(draft, new Date().toISOString(), editingStoryId);
      storage = storageFactory();
      await saveFitStory(storage, record);
      setStories((current) => [record, ...current.filter((story) => story.id !== record.id)]);
      setSelectedStoryId((current) => current || record.id);

      if (selectedStoryId === record.id || selectedStoryId === "") {
        setSelectedPromptId(firstPromptId(prompts, record.competency));
        resetRehearsal();
      }

      setDraft(createEmptyDraft());
      setEditingStoryId(undefined);
      setValidationErrors({});
      setStoryStatus("saved");
    } catch {
      setStoryStatus("error");
    } finally {
      storage?.close();
    }
  }

  function handleStoryChange(update: Partial<FitStoryDraft>): void {
    setDraft((current) => ({ ...current, ...update }));
    setValidationErrors((current) => {
      const next = { ...current };

      for (const field of Object.keys(update) as Array<keyof FitStoryDraft>) {
        delete next[field];
      }

      return next;
    });
  }

  function editStory(story: FitStoryRecord) {
    setEditingStoryId(story.id);
    setDraft({
      competency: story.competency,
      title: story.title,
      situation: story.situation,
      task: story.task,
      action: story.action,
      result: story.result,
      reflection: story.reflection
    });
    setValidationErrors({});
    setStoryStatus("idle");
  }

  function cancelEdit() {
    setEditingStoryId(undefined);
    setDraft(createEmptyDraft());
    setValidationErrors({});
    setStoryStatus("idle");
  }

  async function removeStory(story: FitStoryRecord) {
    if (!window.confirm(t('Delete "{title}" from this browser?', { title: story.title }))) return;

    setStoryStatus("saving");
    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      await deleteFitStory(storage, story.id);

      const remainingStories = stories.filter((candidate) => candidate.id !== story.id);
      setStories(remainingStories);

      if (editingStoryId === story.id) cancelEdit();
      if (selectedStoryId === story.id) {
        const nextStory = remainingStories[0];
        setSelectedStoryId(nextStory?.id ?? "");
        setSelectedPromptId(nextStory === undefined ? "" : firstPromptId(prompts, nextStory.competency));
        resetRehearsal();
      }

      setStoryStatus("idle");
    } catch {
      setStoryStatus("error");
    } finally {
      storage?.close();
    }
  }

  function chooseStory(storyId: string) {
    const story = stories.find((candidate) => candidate.id === storyId);
    setSelectedStoryId(storyId);
    setSelectedPromptId(story === undefined ? "" : firstPromptId(prompts, story.competency));
    resetRehearsal();
  }

  function choosePrompt(promptId: string) {
    setSelectedPromptId(promptId);
    resetRehearsal();
  }

  function changeDuration(seconds: number) {
    const duration = seconds === 90 ? 90 : 120;
    setDurationSeconds(duration);
    setRemainingSeconds(duration);
    setPhase("idle");
    setCompletedCriteria([]);
    setReviewStatus("idle");
  }

  function resetRehearsal() {
    setRemainingSeconds(durationSeconds);
    setPhase("idle");
    setCompletedCriteria([]);
    setReviewStatus("idle");
  }

  function startRehearsal() {
    if (selectedStory === undefined || selectedPrompt === undefined) return;

    setRemainingSeconds(durationSeconds);
    setCompletedCriteria([]);
    setReviewStatus("idle");
    setPhase("running");
  }

  function toggleCriterion(id: FitReviewCriterionId) {
    setCompletedCriteria((current) =>
      current.includes(id) ? current.filter((criterion) => criterion !== id) : [...current, id]
    );
    setReviewStatus("idle");
  }

  async function saveReview() {
    if (selectedPrompt === undefined || phase !== "review") return;

    setReviewStatus("saving");
    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      await savePracticeAttempt(storage, {
        completedAt: new Date().toISOString(),
        durationSeconds: durationSeconds - remainingSeconds,
        itemId: selectedPrompt.id,
        maxScore: reviewScore.maxScore,
        module: "fit",
        score: reviewScore.score
      });
      setPhase("saved");
      setReviewStatus("saved");
    } catch {
      setReviewStatus("error");
    } finally {
      storage?.close();
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] xl:items-start">
      <section
        className="grid gap-6 border border-ink/15 border-t-2 border-t-coral bg-white p-5 sm:p-6"
        aria-labelledby="story-bank-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={cx(uiText.eyebrow, "text-coral")}>{t("Story Bank")}</p>
            <h2 className="mt-1 text-xl font-semibold text-ink" id="story-bank-heading">
              {t("STAR and PEI stories")}
            </h2>
          </div>
          <span className={badgeClass("neutral")}>{t("{count} saved", { count: formatNumber(stories.length) })}</span>
        </div>

        <StoryForm
          draft={draft}
          editing={editingStoryId !== undefined}
          errors={validationErrors}
          onCancel={cancelEdit}
          onChange={handleStoryChange}
          onSubmit={handleSaveStory}
          saving={storyStatus === "saving"}
        />

        <StoryStatusMessage status={storyStatus} />

        <div className="grid gap-1">
          <h3 className={uiText.sectionTitle}>{t("Saved stories")}</h3>
          {stories.length === 0 && storyStatus !== "loading" ? (
            <p className={uiText.body}>{t("Add your first story to begin a rehearsal.")}</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {stories.map((story) => (
                <li className="grid gap-3 py-4" key={story.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className={badgeClass("success")}>{t(fitCompetencyLabels[story.competency])}</span>
                      <h4 className="mt-2 font-semibold text-ink">{story.title}</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className={buttonClass("secondary", "px-3")} onClick={() => editStory(story)} type="button">
                        {t("Edit")}
                      </button>
                      <button className={buttonClass("secondary", "px-3")} onClick={() => chooseStory(story.id)} type="button">
                        {t("Rehearse")}
                      </button>
                      <button className={buttonClass("danger", "px-3")} onClick={() => void removeStory(story)} type="button">
                        {t("Delete")}
                      </button>
                    </div>
                  </div>
                  <p className={uiText.body}>{story.result}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section
        className="grid gap-5 border border-ink/15 border-t-2 border-t-teal bg-white p-5 sm:p-6 xl:sticky xl:top-6"
        aria-labelledby="fit-rehearsal-heading"
        id="fit-rehearsal"
      >
        <div>
          <p className={cx(uiText.eyebrow, "text-teal")}>{t("Timed Rehearsal")}</p>
          <h2 className="mt-1 text-xl font-semibold text-ink" id="fit-rehearsal-heading">
            {t("Practice an interview answer")}
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Field label={t("Story")}>
            <select
              className={uiInputs.base}
              disabled={phase === "running" || stories.length === 0}
              onChange={(event) => chooseStory(event.currentTarget.value)}
              value={selectedStoryId}
            >
              {stories.length === 0 ? <option value="">{t("No saved stories")}</option> : null}
              {stories.map((story) => (
                <option key={story.id} value={story.id}>
                  {story.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("Prompt")}>
            <select
              className={uiInputs.base}
              disabled={phase === "running" || selectedStory === undefined}
              onChange={(event) => choosePrompt(event.currentTarget.value)}
              value={selectedPrompt?.id ?? ""}
            >
              {availablePrompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.prompt}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {selectedPrompt !== undefined ? (
          <div className="grid gap-3 border-l-4 border-teal bg-white/70 px-4 py-3">
            <p className="text-lg font-semibold leading-7 text-ink">{selectedPrompt.prompt}</p>
            <ul className="grid list-disc gap-1 pl-5 text-sm leading-6 text-ink/70">
              {selectedPrompt.followUps.map((followUp) => (
                <li key={followUp}>{followUp}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className={uiText.body}>{t("Save a story to unlock a matching rehearsal prompt.")}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end xl:grid-cols-1">
          <Field label={t("Answer time")}>
            <select
              className={uiInputs.base}
              disabled={phase === "running"}
              onChange={(event) => changeDuration(Number(event.currentTarget.value))}
              value={durationSeconds}
            >
              {rehearsalDurations.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {t("{seconds} seconds", { seconds: formatNumber(seconds) })}
                </option>
              ))}
            </select>
          </Field>
          <p
            aria-label={t("{seconds} seconds remaining", { seconds: formatNumber(remainingSeconds) })}
            className="min-w-32 text-center text-4xl font-semibold tabular-nums text-ink"
            role="timer"
          >
            {formatTimer(remainingSeconds)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {phase === "running" ? (
            <button className={buttonClass("primary")} onClick={() => setPhase("review")} type="button">
              {t("Finish Answer")}
            </button>
          ) : (
            <button className={buttonClass("primary")} disabled={selectedPrompt === undefined} onClick={startRehearsal} type="button">
              {phase === "idle" ? t("Start Rehearsal") : t("Rehearse Again")}
            </button>
          )}
          {phase !== "idle" ? (
            <button className={buttonClass("secondary")} onClick={resetRehearsal} type="button">
              {t("Reset")}
            </button>
          ) : null}
        </div>

        {phase === "review" || phase === "saved" ? (
          <fieldset className="grid gap-3 border-t border-teal/20 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <legend className={uiText.sectionTitle}>{t("Self-review checklist")}</legend>
              <span className={badgeClass(reviewScore.score === reviewScore.maxScore ? "success" : "neutral")}>
                {formatNumber(reviewScore.score)}/{formatNumber(reviewScore.maxScore)}
              </span>
            </div>
            {fitReviewCriteria.map((criterion) => (
              <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-ink" key={criterion.id}>
                <input
                  checked={completedCriteria.includes(criterion.id)}
                  className="mt-1 h-4 w-4 shrink-0 accent-teal"
                  disabled={phase === "saved"}
                  onChange={() => toggleCriterion(criterion.id)}
                  type="checkbox"
                />
                {t(criterion.label)}
              </label>
            ))}
            <p className={uiText.dense}>{t("This records your checklist selections; it does not grade your story text.")}</p>
            {phase === "review" ? (
              <button className={buttonClass("primary")} disabled={reviewStatus === "saving"} onClick={() => void saveReview()} type="button">
                {reviewStatus === "saving" ? t("Saving...") : t("Save Self-Review")}
              </button>
            ) : null}
            <ReviewStatusMessage score={reviewScore.score} status={reviewStatus} />
          </fieldset>
        ) : null}
      </section>
    </div>
  );
}

function StoryForm({
  draft,
  editing,
  errors,
  onCancel,
  onChange,
  onSubmit,
  saving
}: {
  draft: FitStoryDraft;
  editing: boolean;
  errors: FitStoryValidationErrors;
  onCancel(): void;
  onChange(update: Partial<FitStoryDraft>): void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
  saving: boolean;
}) {
  const { t } = useI18n();
  return (
    <form className="grid gap-4 border-y border-ink/10 py-5" noValidate onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className={uiText.sectionTitle}>{editing ? t("Edit story") : t("Add a story")}</h3>
        {editing ? (
          <button className={buttonClass("secondary", "px-3")} onClick={onCancel} type="button">
            {t("Cancel")}
          </button>
        ) : null}
      </div>

      {Object.keys(errors).length > 0 ? (
        <div aria-live="polite" className={statusMessageClass("error")} role="alert">
          <p className="text-sm font-semibold text-ink">{t("Complete every story field before saving.")}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field error={errors.title} id="fit-story-title" label={t("Story title")}>
          <input
            aria-describedby={errors.title === undefined ? undefined : "fit-story-title-error"}
            aria-invalid={errors.title !== undefined}
            className={uiInputs.base}
            id="fit-story-title"
            maxLength={80}
            onChange={(event) => onChange({ title: event.currentTarget.value })}
            value={draft.title}
          />
        </Field>
        <Field error={errors.competency} id="fit-story-competency" label={t("Competency")}>
          <select
            aria-describedby={errors.competency === undefined ? undefined : "fit-story-competency-error"}
            aria-invalid={errors.competency !== undefined}
            className={uiInputs.base}
            id="fit-story-competency"
            onChange={(event) => onChange({ competency: event.currentTarget.value as FitCompetency })}
            value={draft.competency}
          >
            {(Object.entries(fitCompetencyLabels) as Array<[FitCompetency, string]>).map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StoryTextArea field="situation" label={t("Situation")} />
        <StoryTextArea field="task" label={t("Task")} />
        <StoryTextArea field="action" label={t("Action")} />
        <StoryTextArea field="result" label={t("Result")} />
      </div>
      <StoryTextArea field="reflection" label={t("Reflection")} />

      <button className={buttonClass("primary")} disabled={saving} type="submit">
        {saving ? t("Saving...") : editing ? t("Update Story") : t("Save Story")}
      </button>
    </form>
  );

  function StoryTextArea({ field, label }: { field: keyof Omit<FitStoryDraft, "competency" | "title">; label: string }) {
    const id = `fit-story-${field}`;
    return (
      <Field error={errors[field]} id={id} label={label}>
        <textarea
          aria-describedby={errors[field] === undefined ? undefined : `${id}-error`}
          aria-invalid={errors[field] !== undefined}
          className={uiInputs.textarea}
          id={id}
          maxLength={1_200}
          onChange={(event) => onChange({ [field]: event.currentTarget.value })}
          value={draft[field]}
        />
      </Field>
    );
  }
}

function Field({ children, error, id, label }: { children: ReactNode; error?: string; id?: string; label: string }) {
  const { t } = useI18n();
  const errorId = id === undefined ? undefined : `${id}-error`;
  return (
    <label className="grid gap-2" htmlFor={id}>
      <span className={uiText.controlLabel}>{label}</span>
      {children}
      {error !== undefined ? (
        <span className="text-xs font-medium text-coral" id={errorId}>
          {t(error)}
        </span>
      ) : null}
    </label>
  );
}

function StoryStatusMessage({ status }: { status: StoryStatus }) {
  const { t } = useI18n();
  if (status === "idle" || status === "saving") return null;

  const content = {
    error: ["Story bank unavailable", "Your latest story change could not be saved."],
    loading: ["Story bank", "Loading stories saved in this browser..."],
    saved: ["Story saved", "Your story is available for local rehearsal."]
  }[status];

  return (
    <div aria-live="polite" className={statusMessageClass(status === "error" ? "error" : status === "saved" ? "success" : "neutral")}>
      <p className="text-sm font-semibold text-ink">{t(content[0])}</p>
      <p className={uiText.dense}>{t(content[1])}</p>
    </div>
  );
}

function ReviewStatusMessage({ score, status }: { score: number; status: SaveStatus }) {
  const { formatNumber, t } = useI18n();
  if (status === "idle" || status === "saving") return null;

  return (
    <div aria-live="polite" className={statusMessageClass(status === "error" ? "error" : "success")}>
      <p className="text-sm font-semibold text-ink">
        {status === "saved"
          ? t("Self-review saved locally: {score}/{total}.", {
              score: formatNumber(score),
              total: formatNumber(fitReviewCriteria.length)
            })
          : t("Self-review could not be saved.")}
      </p>
    </div>
  );
}

function createEmptyDraft(): FitStoryDraft {
  return {
    competency: "leadership",
    title: "",
    situation: "",
    task: "",
    action: "",
    result: "",
    reflection: ""
  };
}

function firstPromptId(prompts: readonly FitPracticePrompt[], competency: FitCompetency): string {
  return prompts.find((prompt) => prompt.competency === competency)?.id ?? "";
}

function formatTimer(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
