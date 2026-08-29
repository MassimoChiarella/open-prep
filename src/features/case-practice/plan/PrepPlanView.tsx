"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { PageHeader } from "@/components/PageHeader";
import { badgeClass, buttonClass, cx, uiInputs, uiText } from "@/components/uiStyles";
import { loadPracticeAttempts, loadPrepProfile, savePrepProfile } from "@/features/case-practice/practiceRecords";
import { useI18n } from "@/features/i18n/I18nProvider";
import type {
  PracticeAttemptRecord,
  PrepExperienceLevel,
  PrepProfileRecord
} from "@/features/case-practice/practiceTypes";
import {
  createWeeklyPrepRoadmap,
  maximumWeeklySessions,
  minimumWeeklySessions,
  type PrepPlanProfile,
  type WeeklyPrepRoadmap
} from "@/features/case-practice/plan/prepPlan";
import { loadProgressSummary, type ProgressSummary } from "@/features/progress/progressAggregation";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

interface ProfileDraft {
  experienceLevel: PrepExperienceLevel;
  interviewDate: string;
  targetFirms: string;
  weeklySessions: number;
}

type LoadState =
  | { status: "error" }
  | {
      attempts: PracticeAttemptRecord[];
      progress: ProgressSummary;
      status: "ready";
      today: string;
    }
  | { status: "loading" };

type SaveStatus = "error" | "idle" | "saved" | "saving";

const defaultDraft: ProfileDraft = {
  experienceLevel: "beginner",
  interviewDate: "",
  targetFirms: "",
  weeklySessions: 5
};

export function PrepPlanView({
  storageFactory = createIndexedDbAppStorage
}: {
  storageFactory?: () => AppStorage;
} = {}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<ProfileDraft>(defaultDraft);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    let storage: AppStorage | undefined;
    const now = new Date();

    try {
      storage = storageFactory();

      void Promise.all([
        loadPrepProfile(storage),
        loadProgressSummary(storage, { now: now.toISOString() }),
        loadPracticeAttempts(storage)
      ])
        .then(([profile, progress, attempts]) => {
          if (cancelled) {
            return;
          }

          if (profile !== undefined) {
            setDraft(toDraft(profile));
            setHasSavedProfile(true);
          }

          setLoadState({ attempts, progress, status: "ready", today: localDateKey(now) });
        })
        .catch(() => {
          if (!cancelled) {
            setLoadState({ status: "error" });
          }
        })
        .finally(() => storage?.close());
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setLoadState({ status: "error" });
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [storageFactory]);

  const profile = useMemo(() => toPlanProfile(draft), [draft]);
  const roadmap = useMemo(
    () =>
      loadState.status === "ready"
        ? createWeeklyPrepRoadmap({
            attempts: loadState.attempts,
            profile,
            progress: loadState.progress,
            today: loadState.today
          })
        : undefined,
    [loadState, profile]
  );

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveStatus("saving");

    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      const saved = await savePrepProfile(storage, {
        ...profile,
        updatedAt: new Date().toISOString()
      });

      setDraft(toDraft(saved));
      setHasSavedProfile(true);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    } finally {
      storage?.close();
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: "/case-practice", label: t("Back to Case Practice") }}
        description={t("Set your preparation constraints and use local performance evidence to prioritize the week.")}
        eyebrow={t("Preparation")}
        title={t("Weekly Prep Plan")}
      />

      {loadState.status === "loading" ? (
        <LoadingState
          detail={t("Reading your profile and saved practice history from this browser.")}
          label={t("Building your preparation snapshot...")}
        />
      ) : null}

      {loadState.status === "error" ? (
        <EmptyState
          action={{ href: "/case-practice", label: t("Return to Case Practice") }}
          description={t("Your local preparation profile and practice history could not be read in this browser.")}
          secondaryAction={{ href: "/settings", label: t("Open Settings") }}
          title={t("Preparation data is unavailable.")}
          tone="error"
        />
      ) : null}

      {loadState.status === "ready" && roadmap !== undefined ? (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <form
              className="grid gap-5 border border-ink/15 border-t-2 border-t-coral bg-white p-5 sm:p-6"
              onSubmit={handleSave}
            >
              <div className="grid gap-1">
                <h2 className={uiText.sectionTitle}>{t("Preparation profile")}</h2>
                <p className={uiText.body}>{t("The roadmap updates as these inputs change.")}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={cx(uiText.controlLabel, "grid gap-2")}>
                  {t("Experience level")}
                  <select
                    className={uiInputs.base}
                    onChange={(event) => {
                      setDraft((current) => ({
                        ...current,
                        experienceLevel: event.currentTarget.value as PrepExperienceLevel
                      }));
                      setSaveStatus("idle");
                    }}
                    value={draft.experienceLevel}
                  >
                    <option value="beginner">{t("Beginner")}</option>
                    <option value="intermediate">{t("Intermediate")}</option>
                    <option value="advanced">{t("Advanced")}</option>
                  </select>
                </label>

                <label className={cx(uiText.controlLabel, "grid gap-2")}>
                  {t("Interview date (optional)")}
                  <input
                    className={uiInputs.base}
                    min={loadState.today}
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, interviewDate: event.currentTarget.value }));
                      setSaveStatus("idle");
                    }}
                    type="date"
                    value={draft.interviewDate}
                  />
                </label>

                <label className={cx(uiText.controlLabel, "grid gap-2 sm:col-span-2")}>
                  {t("Target firms (optional)")}
                  <input
                    aria-describedby="target-firms-help"
                    className={uiInputs.base}
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, targetFirms: event.currentTarget.value }));
                      setSaveStatus("idle");
                    }}
                    placeholder={t("Firm A, Firm B")}
                    type="text"
                    value={draft.targetFirms}
                  />
                  <span className={uiText.dense} id="target-firms-help">
                    {t("Separate firm names with commas.")}
                  </span>
                </label>

                <label className={cx(uiText.controlLabel, "grid gap-2")}>
                  {t("Practice sessions per week")}
                  <input
                    className={uiInputs.base}
                    max={maximumWeeklySessions}
                    min={minimumWeeklySessions}
                    onChange={(event) => {
                      setDraft((current) => ({
                        ...current,
                        weeklySessions: Number.isNaN(event.currentTarget.valueAsNumber)
                          ? minimumWeeklySessions
                          : event.currentTarget.valueAsNumber
                      }));
                      setSaveStatus("idle");
                    }}
                    required
                    type="number"
                    value={draft.weeklySessions}
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button className={buttonClass("primary")} disabled={saveStatus === "saving"} type="submit">
                  {saveStatus === "saving" ? t("Saving...") : hasSavedProfile ? t("Update Profile") : t("Save Profile")}
                </button>
                <p className={uiText.dense}>{t("Saved only in this browser.")}</p>
              </div>

              {saveStatus === "saved" ? (
                <LocalSaveNotice detail={t("Your preparation profile and weekly target are saved.")} />
              ) : null}
              {saveStatus === "error" ? (
                <LocalSaveNotice
                  detail={t("Your profile could not be saved. Your current plan preview is still available.")}
                  label={t("Save failed")}
                  tone="error"
                />
              ) : null}
            </form>

            <PlanSnapshot
              attempts={loadState.attempts.length}
              firms={profile.targetFirms}
              progress={loadState.progress}
              roadmap={roadmap}
            />
          </div>

          <WeeklyRoadmap roadmap={roadmap} />
        </>
      ) : null}
    </main>
  );
}

function PlanSnapshot({
  attempts,
  firms,
  progress,
  roadmap
}: {
  attempts: number;
  firms: readonly string[];
  progress: ProgressSummary;
  roadmap: WeeklyPrepRoadmap;
}) {
  const { formatNumber, t } = useI18n();
  return (
    <aside className="grid gap-4 border border-ink/15 border-t-2 border-t-teal bg-white p-5 sm:p-6">
      <div className="grid gap-1">
        <p className={cx(uiText.eyebrow, "text-teal")}>{t("Plan basis")}</p>
        <h2 className={uiText.sectionTitle}>{t("Current snapshot")}</h2>
      </div>
      <dl className="grid gap-3">
        <SnapshotItem label={t("Weekly sessions")} value={formatNumber(roadmap.totalSessions)} />
        <SnapshotItem label={t("Interview timing")} value={formatInterviewTiming(roadmap.daysUntilInterview, formatNumber, t)} />
        <SnapshotItem label={t("Math questions")} value={formatNumber(progress.dashboard.totalQuestionsAnswered)} />
        <SnapshotItem label={t("Case attempts")} value={formatNumber(attempts)} />
        <SnapshotItem label={t("Target firms")} value={firms.length === 0 ? t("Not specified") : firms.join(", ")} />
      </dl>
    </aside>
  );
}

function SnapshotItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-teal/10 pb-3 last:border-0 last:pb-0">
      <dt className={uiText.dense}>{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function WeeklyRoadmap({ roadmap }: { roadmap: WeeklyPrepRoadmap }) {
  const { formatNumber, t } = useI18n();
  return (
    <section aria-labelledby="weekly-roadmap-heading" className="grid gap-5">
      <div className="grid gap-2 sm:flex sm:items-end sm:justify-between">
        <div>
          <p className={cx(uiText.eyebrow, "text-coral")}>{t("Prioritized roadmap")}</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink" id="weekly-roadmap-heading">
            {t("This week")}
          </h2>
        </div>
        <p className={uiText.bodyStrong}>
          {t("{sessions} {sessionLabel} across {focuses} {focusLabel}", {
            sessions: formatNumber(roadmap.totalSessions),
            sessionLabel: t(roadmap.totalSessions === 1 ? "session" : "sessions"),
            focuses: formatNumber(roadmap.items.length),
            focusLabel: t(roadmap.items.length === 1 ? "focus" : "focuses")
          })}
        </p>
      </div>

      <ol className="grid gap-4 md:grid-cols-2">
        {roadmap.items.map((item, index) => (
          <li
            className="group flex h-full flex-col gap-3 border border-ink/15 border-t-2 border-t-teal bg-white p-5 transition-colors hover:bg-mint/20 focus-within:border-teal sm:p-6"
            key={item.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={badgeClass(index === 0 ? "success" : "neutral")}>
                {t("Priority {number}", { number: formatNumber(index + 1) })}
              </span>
              <span className={uiText.dense}>
                {t("{count} {label}", {
                  count: formatNumber(item.sessions),
                  label: t(item.sessions === 1 ? "session" : "sessions")
                })}
              </span>
            </div>
            <h3 className={uiText.sectionTitle}>{t(item.title)}</h3>
            <p className={uiText.bodyStrong}>{t(item.reason)}</p>
            <p className={uiText.body}>{t(item.description)}</p>
            <Link className={buttonClass("secondary", "mt-auto gap-3")} href={item.href}>
              <span>{t("Open {title}", { title: t(item.title) })}</span>
              <span aria-hidden="true">
                <span className="rtl:hidden">→</span>
                <span className="hidden rtl:inline">←</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <details className="border-y border-ink/20 py-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink transition-colors hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">{t("Browse all ranked practice areas")}</summary>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {roadmap.priorities.map((item, index) => (
            <li key={item.id}>
              <Link
                className="flex min-h-11 items-center justify-between gap-3 border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-teal hover:bg-mint/30 hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                href={item.href}
              >
                <span className="min-w-0 break-words">{t(item.title)}</span>
                <span aria-label={t("Priority {number}", { number: formatNumber(index + 1) })} className="shrink-0 text-xs text-ink/65">
                  {formatNumber(index + 1)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

function toDraft(profile: PrepProfileRecord): ProfileDraft {
  return {
    experienceLevel: profile.experienceLevel,
    interviewDate: profile.interviewDate ?? "",
    targetFirms: profile.targetFirms.join(", "),
    weeklySessions: profile.weeklySessions
  };
}

function toPlanProfile(draft: ProfileDraft): PrepPlanProfile {
  return {
    experienceLevel: draft.experienceLevel,
    interviewDate: draft.interviewDate || undefined,
    targetFirms: normalizeFirms(draft.targetFirms),
    weeklySessions: draft.weeklySessions
  };
}

function normalizeFirms(value: string): string[] {
  const firms = new Map<string, string>();

  for (const firm of value.split(",").map((item) => item.trim()).filter(Boolean)) {
    firms.set(firm.toLocaleLowerCase(), firm);
  }

  return [...firms.values()];
}

function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function formatInterviewTiming(
  days: number | undefined,
  formatNumber: ReturnType<typeof useI18n>["formatNumber"],
  t: ReturnType<typeof useI18n>["t"]
): string {
  if (days === undefined) {
    return t("Not scheduled");
  }
  if (days < 0) {
    return t("Date passed; update profile");
  }
  if (days === 0) {
    return t("Today");
  }

  return t("{count} {label}", { count: formatNumber(days), label: t(days === 1 ? "day" : "days") });
}
