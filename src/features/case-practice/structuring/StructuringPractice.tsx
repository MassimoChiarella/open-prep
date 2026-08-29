"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { PageHeader } from "@/components/PageHeader";
import { badgeClass, buttonClass, cx, uiInputs, uiText } from "@/components/uiStyles";
import { structuringPrompts } from "@/data/casePractice/structuringPrompts";
import { savePracticeAttempt } from "@/features/case-practice/practiceRecords";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  scoreCaseStructure,
  type CaseStructuringPrompt,
  type CaseStructuringScore
} from "@/features/case-practice/structuring/structuringScoring";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

type SaveState = "idle" | "saving" | "saved" | "error";

interface StructuringPracticeProps {
  backHref?: string;
  prompts?: readonly CaseStructuringPrompt[];
}

export function StructuringPractice({
  backHref = "/case-practice",
  prompts = structuringPrompts
}: StructuringPracticeProps = {}) {
  const { t } = useI18n();
  const [promptIndex, setPromptIndex] = useState(0);
  const [hypothesisId, setHypothesisId] = useState("");
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [result, setResult] = useState<CaseStructuringScore | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const startedAt = useRef(0);
  const prompt = prompts[promptIndex] ?? prompts[0];

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  function startPrompt(nextIndex: number) {
    setPromptIndex(nextIndex);
    setHypothesisId("");
    setBranchIds([]);
    setResult(null);
    setSaveState("idle");
    startedAt.current = Date.now();
  }

  function toggleBranch(branchId: string) {
    setBranchIds((current) =>
      current.includes(branchId) ? current.filter((id) => id !== branchId) : [...current, branchId]
    );
  }

  async function submitStructure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hypothesisId === "" || branchIds.length === 0) return;

    const score = scoreCaseStructure(prompt, { hypothesisId, branchIds });
    setResult(score);
    setSaveState("saving");

    try {
      const storage = createIndexedDbAppStorage();
      try {
        await savePracticeAttempt(storage, {
          module: "structuring",
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

  const canSubmit = hypothesisId !== "" && branchIds.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: backHref, label: t("Back to Case Practice") }}
        description={t("Set a testable starting hypothesis, build a focused issue tree, and compare it with a model structure.")}
        eyebrow={t("Case Practice")}
        title={t("Case structuring")}
      />

      <section
        aria-labelledby="case-prompt-heading"
        className="grid gap-5 border border-ink/15 border-t-2 border-t-coral bg-white p-5 sm:p-6"
      >
        <label className={uiText.controlLabel} htmlFor="structuring-prompt">
          {t("Practice case")}
        </label>
        <select
          className={uiInputs.compact}
          disabled={saveState === "saving"}
          id="structuring-prompt"
          onChange={(event) => startPrompt(Number(event.target.value))}
          value={promptIndex}
        >
          {prompts.map((item, index) => (
            <option key={item.id} value={index}>
              {item.title}
            </option>
          ))}
        </select>

        <div className="grid gap-2 border-t border-ink/10 pt-5">
          <p className={cx(uiText.eyebrow, "text-xs text-teal")}>{prompt.industry}</p>
          <h2 className={uiText.sectionTitle} id="case-prompt-heading">
            {prompt.title}
          </h2>
          <p className={uiText.bodyStrong}>{prompt.situation}</p>
          <p className={uiText.body}>
            <strong className="text-ink">{t("Your task:")}</strong> {prompt.objective}
          </p>
        </div>
      </section>

      <form className="grid gap-8" onSubmit={submitStructure}>
        <StructuringResponseFields
          branchIds={branchIds}
          disabled={result !== null}
          hypothesisId={hypothesisId}
          onHypothesisChange={setHypothesisId}
          onToggleBranch={toggleBranch}
          prompt={prompt}
        />

        {result === null ? (
          <button className={buttonClass("primary")} disabled={!canSubmit} type="submit">
            {t("Score Structure")}
          </button>
        ) : (
          <StructuringResult
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

export function StructuringResponseFields({
  branchIds,
  disabled = false,
  hypothesisId,
  onHypothesisChange,
  onToggleBranch,
  prompt
}: {
  branchIds: readonly string[];
  disabled?: boolean;
  hypothesisId: string;
  onHypothesisChange: (id: string) => void;
  onToggleBranch: (id: string) => void;
  prompt: CaseStructuringPrompt;
}) {
  const { formatNumber, t } = useI18n();
  const branchLimitReached = branchIds.length >= prompt.maxBranches;

  return (
    <div className="grid gap-8">
      <fieldset className="grid gap-4" disabled={disabled}>
        <legend className={uiText.sectionTitle}>{t("1. Choose an initial hypothesis")}</legend>
        <p className={uiText.body}>
          {t("Pick the most useful proposition to test first. It should focus the analysis without assuming the answer.")}
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          {prompt.hypotheses.map((hypothesis) => {
            const selected = hypothesisId === hypothesis.id;
            return (
              <label
                className={cx(
                  "flex min-h-28 cursor-pointer gap-3 border bg-white p-4 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal",
                  selected ? "border-teal bg-mint/40" : "border-ink/15 hover:border-teal hover:bg-mint/20"
                )}
                key={hypothesis.id}
              >
                <input
                  checked={selected}
                  className="mt-1 h-4 w-4 shrink-0 accent-teal"
                  name={`${prompt.id}-hypothesis`}
                  onChange={() => onHypothesisChange(hypothesis.id)}
                  required
                  type="radio"
                  value={hypothesis.id}
                />
                <span className={uiText.bodyStrong}>{hypothesis.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset aria-describedby={`${prompt.id}-branch-limit`} className="grid gap-4" disabled={disabled}>
        <legend className={uiText.sectionTitle}>{t("2. Build the issue tree")}</legend>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={uiText.body} id={`${prompt.id}-branch-limit`}>
            {t("Choose up to {count} distinct workstreams. Prioritize branches that directly answer the objective.", {
              count: formatNumber(prompt.maxBranches)
            })}
          </p>
          <span className={badgeClass(branchLimitReached ? "warning" : "neutral")}>
            {t("{selected} / {total} selected", {
              selected: formatNumber(branchIds.length),
              total: formatNumber(prompt.maxBranches)
            })}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {prompt.branchOptions.map((branch) => {
            const selected = branchIds.includes(branch.id);
            const unavailable = branchLimitReached && !selected;
            return (
              <label
                className={cx(
                  "flex min-h-32 gap-3 border bg-white p-4 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal",
                  selected && "border-teal bg-mint/40",
                  !selected && !unavailable && "cursor-pointer border-ink/15 hover:border-teal hover:bg-mint/20",
                  unavailable && "cursor-not-allowed border-ink/15 opacity-55"
                )}
                key={branch.id}
              >
                <input
                  checked={selected}
                  className="mt-1 h-4 w-4 shrink-0 accent-teal"
                  disabled={unavailable}
                  onChange={() => onToggleBranch(branch.id)}
                  type="checkbox"
                  value={branch.id}
                />
                <span>
                  <span className="block text-sm font-semibold text-ink">{branch.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-ink/65">{branch.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function StructuringResult({
  prompt,
  promptCount,
  promptIndex,
  result,
  saveState,
  startPrompt
}: {
  prompt: CaseStructuringPrompt;
  promptCount: number;
  promptIndex: number;
  result: CaseStructuringScore;
  saveState: SaveState;
  startPrompt: (index: number) => void;
}) {
  const { formatNumber, t } = useI18n();
  return (
    <section aria-labelledby="structuring-result-heading" className="grid gap-6 border-t border-ink/10 pt-8">
      <div
        className={cx(
          "grid gap-4 border border-ink/15 border-t-2 bg-white p-5 sm:p-6",
          result.totalScore >= 80 ? "border-t-teal" : "border-t-coral"
        )}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={cx(uiText.eyebrow, "text-xs text-teal")}>{t("Completed")}</p>
            <h2 className={uiText.sectionTitle} id="structuring-result-heading">
              {t("Structure review")}
            </h2>
          </div>
          <p aria-live="polite" className={uiText.metric}>
            {formatNumber(result.totalScore)} / {formatNumber(result.maxScore)}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4 border-y border-ink/10 py-4 text-sm">
          <div>
            <dt className="text-ink/65">{t("Hypothesis")}</dt>
            <dd className="mt-1 font-semibold text-ink">{formatNumber(result.hypothesisPoints)} / {formatNumber(35)}</dd>
          </div>
          <div>
            <dt className="text-ink/65">{t("Issue tree")}</dt>
            <dd className="mt-1 font-semibold text-ink">{formatNumber(result.branchPoints)} / {formatNumber(65)}</dd>
          </div>
        </dl>

        <ul className="grid gap-2 text-sm leading-6 text-ink/75">
          {result.feedback.map((item) => (
            <li className="border-l-2 border-teal/40 pl-3" key={item}>
              {t(item)}
            </li>
          ))}
        </ul>
      </div>

      {saveState === "saving" ? (
        <LocalSaveNotice detail={t("Recording this completed attempt in local progress.")} label={t("Saving")} tone="neutral" />
      ) : null}
      {saveState === "saved" ? (
        <LocalSaveNotice detail={t("This structuring result is available to local progress and future case workflows.")} />
      ) : null}
      {saveState === "error" ? (
        <LocalSaveNotice
          detail={t("Your score is still visible, but this attempt could not be saved locally.")}
          label={t("Not Saved")}
          tone="error"
        />
      ) : null}

      <div className="grid gap-4">
        <div>
          <h2 className={uiText.sectionTitle}>{t("Model structure")}</h2>
          <p className={cx(uiText.body, "mt-1")}>{t("Use these branches as a comparison, not as a script to memorize.")}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {prompt.modelStructure.map((branch) => {
            const matched = result.matchedBranchIds.includes(branch.branchId);
            return (
              <article className="border border-ink/15 border-t-2 border-t-teal bg-white p-4" key={branch.branchId}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className={uiText.subsectionTitle}>{branch.title}</h3>
                  <span className={badgeClass(matched ? "success" : "warning")}>
                    {matched ? t("Covered") : t("Missed")}
                  </span>
                </div>
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink/70">
                  {branch.questions.map((question) => (
                    <li className="border-l-2 border-ink/10 pl-3" key={question}>
                      {question}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className={buttonClass("secondary", "disabled:cursor-not-allowed disabled:opacity-50")}
          disabled={saveState === "saving"}
          onClick={() => startPrompt(promptIndex)}
          type="button"
        >
          {t("Retry Case")}
        </button>
        <button
          className={buttonClass("primary", "disabled:cursor-not-allowed disabled:opacity-50")}
          disabled={saveState === "saving"}
          onClick={() => startPrompt((promptIndex + 1) % promptCount)}
          type="button"
        >
          {t("Next Case")}
        </button>
      </div>
    </section>
  );
}
