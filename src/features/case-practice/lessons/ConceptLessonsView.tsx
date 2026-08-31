"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { PageHeader } from "@/components/PageHeader";
import {
  badgeClass,
  buttonClass,
  cx,
  statusMessageClass,
  uiText
} from "@/components/uiStyles";
import {
  loadPracticeAttempts,
  savePracticeAttempt
} from "@/features/case-practice/practiceRecords";
import {
  scoreConceptKnowledgeCheck,
  type ConceptCheckScore,
  type ConceptLesson,
  type ConceptLessonTopic
} from "@/features/case-practice/lessons/conceptLessonScoring";
import { useI18n } from "@/features/i18n/I18nProvider";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

interface ConceptLessonsViewProps {
  backHref?: string;
  lessons: readonly ConceptLesson[];
  storageFactory?: () => AppStorage;
}

type SaveStatus = "error" | "idle" | "saved" | "saving";

const topicLabels: Record<ConceptLessonTopic, string> = {
  brainstorming: "Brainstorming",
  business_economics: "Business Economics",
  exhibit_reading: "Exhibit Reading",
  issue_tree: "Issue Trees",
  mental_math: "Mental Math",
  synthesis: "Synthesis"
};

export function ConceptLessonsView({
  backHref = "/case-practice",
  lessons,
  storageFactory = createIndexedDbAppStorage
}: ConceptLessonsViewProps) {
  const { formatNumber, t } = useI18n();
  const [activeLessonId, setActiveLessonId] = useState(() => lessons[0]?.id ?? "");
  const [answerId, setAnswerId] = useState<string>();
  const [result, setResult] = useState<ConceptCheckScore>();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState<string>();
  const [masteredLessonIds, setMasteredLessonIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const startedAtRef = useRef(new Date().toISOString());
  const activeLessonIndex = lessons.findIndex((lesson) => lesson.id === activeLessonId);
  const activeLesson = lessons[activeLessonIndex];
  const masteredCount = useMemo(
    () => lessons.filter((lesson) => masteredLessonIds.has(lesson.id)).length,
    [lessons, masteredLessonIds]
  );

  useEffect(() => {
    let cancelled = false;
    let storage: AppStorage | undefined;

    async function loadMastery() {
      try {
        storage = storageFactory();
        const attempts = await loadPracticeAttempts(storage, "lessons");

        if (!cancelled) {
          setMasteredLessonIds(
            new Set(
              attempts
                .filter((attempt) => attempt.score === attempt.maxScore)
                .map((attempt) => attempt.itemId)
            )
          );
        }
      } catch {
        if (!cancelled) {
          setSaveStatus("error");
          setSaveMessage(t("Saved lesson progress could not be loaded on this device."));
        }
      } finally {
        storage?.close();
      }
    }

    void loadMastery();

    return () => {
      cancelled = true;
    };
  }, [storageFactory, t]);

  function openLesson(lessonId: string) {
    setActiveLessonId(lessonId);
    setAnswerId(undefined);
    setResult(undefined);
    setSaveStatus("idle");
    setSaveMessage(undefined);
    startedAtRef.current = new Date().toISOString();
  }

  async function submitCheck() {
    if (activeLesson === undefined || answerId === undefined) {
      return;
    }

    const nextResult = scoreConceptKnowledgeCheck(activeLesson.knowledgeCheck, answerId);
    const completedAt = new Date().toISOString();
    setResult(nextResult);
    setSaveStatus("saving");
    setSaveMessage(undefined);

    if (nextResult.isCorrect) {
      setMasteredLessonIds((current) => new Set(current).add(activeLesson.id));
    }

    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      await savePracticeAttempt(storage, {
        completedAt,
        durationSeconds: Math.max(
          0,
          Math.round((Date.parse(completedAt) - Date.parse(startedAtRef.current)) / 1000)
        ),
        itemId: activeLesson.id,
        maxScore: nextResult.maxScore,
        module: "lessons",
        score: nextResult.score
      });
      setSaveStatus("saved");
      setSaveMessage(t("This knowledge check was saved on this device."));
    } catch {
      setSaveStatus("error");
      setSaveMessage(t("This result could not be saved on this device."));
    } finally {
      storage?.close();
    }
  }

  if (activeLesson === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          action={{ href: backHref, label: t("Back to Case Practice") }}
          description={t("Build the core habits used throughout a consulting case.")}
          eyebrow={t("Case Practice")}
          title={t("Concept Lessons")}
        />
        <EmptyState
          description={t("Concept lessons could not be loaded.")}
          title={t("Lessons are unavailable.")}
        />
      </main>
    );
  }

  const previousLesson = lessons[activeLessonIndex - 1];
  const nextLesson = lessons[activeLessonIndex + 1];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: backHref, label: t("Back to Case Practice") }}
        description={t("Practice the core reasoning habits that connect calculations to a complete case.")}
        eyebrow={t("Case Practice")}
        title={t("Concept Lessons")}
      />

      <section
        aria-labelledby="lesson-progress-heading"
        className="grid gap-3 border-y border-ink/20 py-5"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={uiText.sectionTitle} id="lesson-progress-heading">
              {t("Lesson Progress")}
            </h2>
            <p className={uiText.body}>{t("Mastered checks are stored on this device.")}</p>
          </div>
          <p className="text-sm font-semibold text-teal">
            {t("{mastered} of {total} mastered", {
              mastered: formatNumber(masteredCount),
              total: formatNumber(lessons.length)
            })}
          </p>
        </div>
        <progress
          aria-label={t("{mastered} of {total} lessons mastered", {
            mastered: formatNumber(masteredCount),
            total: formatNumber(lessons.length)
          })}
          className="h-2 w-full accent-teal"
          max={lessons.length}
          value={masteredCount}
        />
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <nav
          aria-label={t("Lesson progression")}
          className="h-fit min-w-0 max-w-full border border-ink/15 border-t-2 border-t-coral bg-white p-2"
        >
          <ol className="min-w-0 divide-y divide-ink/10">
            {lessons.map((lesson, index) => {
              const active = lesson.id === activeLesson.id;
              const mastered = masteredLessonIds.has(lesson.id);

              return (
                <li className="min-w-0" key={lesson.id}>
                  <button
                    aria-current={active ? "step" : undefined}
                    className={cx(
                      "grid min-h-16 w-full min-w-0 grid-cols-[minmax(0,1fr)] gap-1 px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
                      active ? "bg-mint text-ink" : "text-ink hover:bg-paper"
                    )}
                    onClick={() => openLesson(lesson.id)}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-ink/65">
                      <span>{t("Lesson {number}", { number: formatNumber(index + 1) })}</span>
                      <span className={mastered ? "text-teal" : "text-ink/45"}>
                        {mastered ? t("Mastered") : t("Open")}
                      </span>
                    </span>
                    <span className="min-w-0 text-sm font-semibold leading-5 [overflow-wrap:anywhere]">{lesson.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <article className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7 border border-ink/15 border-t-2 border-t-teal bg-white p-5 sm:p-6">
          <header className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={badgeClass("neutral")}>{t(topicLabels[activeLesson.topic])}</span>
              <span className={uiText.dense}>
                {t("Lesson {current} of {total}", {
                  current: formatNumber(activeLessonIndex + 1),
                  total: formatNumber(lessons.length)
                })}
              </span>
            </div>
            <h2 className="min-w-0 text-2xl font-semibold text-ink [overflow-wrap:anywhere]">{activeLesson.title}</h2>
            <p className={cx(uiText.pageDescription, "min-w-0 [overflow-wrap:anywhere]")}>{activeLesson.objective}</p>
          </header>

          <section aria-labelledby="lesson-principles-heading" className="grid gap-3 border-t border-ink/10 pt-6">
            <h3 className={uiText.subsectionTitle} id="lesson-principles-heading">
              {t("Core Principle")}
            </h3>
            <ul className="grid min-w-0 gap-2 text-sm leading-6 text-ink/70">
              {activeLesson.principles.map((principle) => (
                <li className="flex min-w-0 gap-3" key={principle}>
                  <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-saffron" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">{principle}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="worked-example-heading" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 border-y border-ink/15 bg-paper px-4 py-5 sm:px-5">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
              <p className={cx(uiText.eyebrow, "text-coral")}>{t("Worked Example")}</p>
              <h3 className={uiText.subsectionTitle} id="worked-example-heading">
                {activeLesson.workedExample.prompt}
              </h3>
            </div>
            <ol className="grid min-w-0 gap-3 text-sm leading-6 text-ink/70">
              {activeLesson.workedExample.steps.map((step, index) => (
                <li className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] gap-2" key={step}>
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center border border-ink/15 bg-white text-xs font-semibold text-teal"
                  >
                    {formatNumber(index + 1)}
                  </span>
                  <span className="min-w-0 [overflow-wrap:anywhere]">{step}</span>
                </li>
              ))}
            </ol>
            <p className="min-w-0 border-l-4 border-teal pl-3 text-sm font-semibold leading-6 text-ink [overflow-wrap:anywhere]">
              {activeLesson.workedExample.answer}
            </p>
          </section>

          <form
            className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 border-t border-ink/10 pt-6"
            onSubmit={(event) => {
              event.preventDefault();
              void submitCheck();
            }}
          >
            <fieldset className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
              <legend className={uiText.sectionTitle}>{t("Knowledge Check")}</legend>
              <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")}>{activeLesson.knowledgeCheck.prompt}</p>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
                {activeLesson.knowledgeCheck.options.map((option) => (
                  <label
                    className={cx(
                      "flex min-h-12 min-w-0 cursor-pointer items-center gap-3 border px-3 py-2 text-sm font-medium transition",
                      answerId === option.id
                        ? "border-teal bg-mint text-ink"
                        : "border-ink/10 bg-white text-ink/80 hover:border-teal"
                    )}
                    key={option.id}
                  >
                    <input
                      checked={answerId === option.id}
                      className="h-4 w-4 shrink-0 accent-teal"
                      name={`lesson-check-${activeLesson.id}`}
                      onChange={() => {
                        setAnswerId(option.id);
                        setResult(undefined);
                        setSaveStatus("idle");
                        setSaveMessage(undefined);
                      }}
                      type="radio"
                      value={option.id}
                    />
                    <span className="min-w-0 [overflow-wrap:anywhere]">{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              className={buttonClass("primary")}
              disabled={answerId === undefined || saveStatus === "saving"}
              type="submit"
            >
              {saveStatus === "saving" ? t("Saving...") : result === undefined ? t("Check Answer") : t("Check Again")}
            </button>

            {result !== undefined ? (
              <div
                aria-atomic="true"
                aria-live="polite"
                className={statusMessageClass(result.isCorrect ? "success" : "warning")}
                role="status"
              >
                <p className={cx(uiText.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")}>{t(result.feedback)}</p>
              </div>
            ) : null}

            {saveMessage !== undefined ? (
              <LocalSaveNotice
                detail={saveMessage}
                label={saveStatus === "error" ? t("Local save") : t("Saved on this device")}
                tone={saveStatus === "error" ? "error" : "success"}
              />
            ) : null}
          </form>

          <div className="flex flex-wrap justify-between gap-3 border-t border-ink/10 pt-6">
            {previousLesson === undefined ? <span /> : (
              <button
                className={buttonClass("secondary")}
                onClick={() => openLesson(previousLesson.id)}
                type="button"
              >
                {t("Previous Lesson")}
              </button>
            )}
            {nextLesson === undefined ? null : (
              <button
                className={buttonClass("secondary")}
                onClick={() => openLesson(nextLesson.id)}
                type="button"
              >
                {t("Next Lesson")}
              </button>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
