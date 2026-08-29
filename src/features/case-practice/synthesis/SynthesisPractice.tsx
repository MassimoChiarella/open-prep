"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";

import { EmptyState } from "@/components/EmptyState";
import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { buttonClass, cx, uiInputs, uiText } from "@/components/uiStyles";
import { savePracticeAttempt } from "@/features/case-practice/practiceRecords";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  SYNTHESIS_DIMENSIONS,
  scoreSynthesisResponse,
  type SynthesisDimension,
  type SynthesisPrompt,
  type SynthesisResponse,
  type SynthesisScore
} from "@/features/case-practice/synthesis/synthesisScoring";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

interface SynthesisPracticeProps {
  prompts: readonly SynthesisPrompt[];
  storageFactory?: () => AppStorage;
}

type SaveStatus = "error" | "idle" | "saved" | "saving";

const dimensionLabels: Record<SynthesisDimension, string> = {
  recommendation: "Answer-first recommendation",
  evidence: "Strongest supporting evidence",
  risk: "Most important risk",
  nextStep: "Best next step"
};

export function SynthesisPractice({
  prompts,
  storageFactory = createIndexedDbAppStorage
}: SynthesisPracticeProps) {
  const { formatNumber, t } = useI18n();
  const [selectedPromptId, setSelectedPromptId] = useState(() => prompts[0]?.id ?? "");
  const [response, setResponse] = useState<Partial<SynthesisResponse>>({});
  const [score, setScore] = useState<SynthesisScore>();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>();
  const startedAtRef = useRef<number>();
  const prompt = useMemo(
    () => prompts.find((candidate) => candidate.id === selectedPromptId) ?? prompts[0],
    [prompts, selectedPromptId]
  );

  if (prompt === undefined) {
    return (
      <EmptyState
        action={{ href: "/case-practice", label: t("Back to Case Practice") }}
        description={t("Synthesis prompts could not be loaded.")}
        title={t("Synthesis practice is unavailable.")}
      />
    );
  }

  function resetAttempt(nextPromptId?: string): void {
    if (nextPromptId !== undefined) {
      setSelectedPromptId(nextPromptId);
    }
    setResponse({});
    setScore(undefined);
    setSaveStatus("idle");
    setStatusMessage(undefined);
    startedAtRef.current = undefined;
  }

  function selectOption(dimension: SynthesisDimension, optionId: string): void {
    startedAtRef.current ??= Date.now();
    setResponse((current) => ({ ...current, [dimension]: optionId }));
    setScore(undefined);
    setSaveStatus("idle");
    setStatusMessage(undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!isCompleteResponse(response)) {
      setSaveStatus("error");
      setStatusMessage(t("Select one option in each section before scoring your response."));
      return;
    }

    const completedAt = new Date();
    const nextScore = scoreSynthesisResponse(prompt, response);
    setScore(nextScore);
    setSaveStatus("saving");
    setStatusMessage(t("Saving this attempt on your device..."));

    try {
      const storage = storageFactory();

      try {
        await savePracticeAttempt(storage, {
          completedAt: completedAt.toISOString(),
          durationSeconds: Math.max(
            0,
            Math.round((completedAt.getTime() - (startedAtRef.current ?? completedAt.getTime())) / 1000)
          ),
          itemId: prompt.id,
          maxScore: nextScore.maxScore,
          module: "synthesis",
          score: nextScore.totalScore
        });
      } finally {
        storage.close();
      }

      setSaveStatus("saved");
      setStatusMessage(t("Score {score}/{maxScore} saved on this device.", {
        score: formatNumber(nextScore.totalScore),
        maxScore: formatNumber(nextScore.maxScore)
      }));
    } catch {
      setSaveStatus("error");
      setStatusMessage(
        t("Score {score}/{maxScore} is ready, but this attempt could not be saved.", {
          score: formatNumber(nextScore.totalScore),
          maxScore: formatNumber(nextScore.maxScore)
        })
      );
    }
  }

  return (
    <section className="grid gap-6" data-testid="synthesis-practice">
      <section
        className="grid gap-5 border border-ink/15 border-t-2 border-t-coral bg-white p-5 sm:p-6"
        aria-labelledby="synthesis-case-heading"
      >
        <label className={cx(uiText.controlLabel, "grid max-w-xl gap-2")}>
          {t("Case prompt")}
          <select
            className={uiInputs.compact}
            onChange={(event) => resetAttempt(event.currentTarget.value)}
            value={prompt.id}
          >
            {prompts.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-2">
          <p className={cx(uiText.eyebrow, "text-coral")}>{prompt.client}</p>
          <h2 className={uiText.sectionTitle} id="synthesis-case-heading">
            {prompt.title}
          </h2>
          <p className={uiText.bodyStrong}>{prompt.situation}</p>
          <p className="text-base font-semibold text-ink">{prompt.decision}</p>
        </div>

        <div className="grid gap-2">
          <h3 className={uiText.subsectionTitle}>{t("Case evidence")}</h3>
          <ul className={cx(uiText.body, "grid list-disc gap-2 pl-5")}>
            {prompt.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      </section>

      <form className="grid gap-6" onSubmit={(event) => void handleSubmit(event)}>
        <SynthesisResponseFields onChoose={selectOption} prompt={prompt} response={response} />

        <div className="flex flex-wrap items-center gap-3">
          <button
            className={buttonClass("primary")}
            disabled={saveStatus === "saving" || score !== undefined}
            type="submit"
          >
            {saveStatus === "saving" ? t("Saving...") : score === undefined ? t("Score Response") : t("Response Scored")}
          </button>
          <button
            className={buttonClass("secondary")}
            disabled={saveStatus === "saving"}
            onClick={() => resetAttempt()}
            type="button"
          >
            {t("Clear Response")}
          </button>
        </div>

        {statusMessage !== undefined ? (
          <LocalSaveNotice
            detail={statusMessage}
            label={saveStatus === "error" ? t("Attempt Status") : undefined}
            tone={saveStatus === "error" ? "error" : saveStatus === "saved" ? "success" : "neutral"}
          />
        ) : null}
      </form>

      {score !== undefined ? <SynthesisReview prompt={prompt} score={score} /> : null}
    </section>
  );
}

export function SynthesisResponseFields({
  onChoose,
  prompt,
  response
}: {
  onChoose: (dimension: SynthesisDimension, optionId: string) => void;
  prompt: SynthesisPrompt;
  response: Partial<SynthesisResponse>;
}) {
  const { t } = useI18n();
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {SYNTHESIS_DIMENSIONS.map((dimension) => (
        <div className="min-w-0 border border-ink/15 border-t-2 border-t-teal bg-white p-5 sm:p-6" key={dimension}>
          <fieldset className="grid min-w-0 content-start gap-3">
            <legend className={cx(uiText.sectionTitle, "w-full max-w-full break-words")}>
              {t(dimensionLabels[dimension])}
            </legend>
            {prompt.options[dimension].map((option) => (
              <label
                className={cx(
                  "flex min-h-11 cursor-pointer items-start gap-3 border px-3 py-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal",
                  response[dimension] === option.id
                    ? "border-teal bg-mint/50"
                    : "border-ink/15 bg-white hover:border-teal hover:bg-mint/20"
                )}
                key={option.id}
              >
                <input
                  checked={response[dimension] === option.id}
                  className="mt-1 h-4 w-4 shrink-0 accent-teal"
                  name={`${prompt.id}-${dimension}`}
                  onChange={() => onChoose(dimension, option.id)}
                  required
                  type="radio"
                  value={option.id}
                />
                <span className={uiText.bodyStrong}>{option.label}</span>
              </label>
            ))}
          </fieldset>
        </div>
      ))}
    </div>
  );
}

function SynthesisReview({ prompt, score }: { prompt: SynthesisPrompt; score: SynthesisScore }) {
  const { formatNumber, t } = useI18n();
  return (
    <section
      className="grid gap-5 border border-ink/15 border-t-2 border-t-teal bg-white p-5 sm:p-6"
      aria-labelledby="synthesis-review-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className={uiText.sectionTitle} id="synthesis-review-heading">
          {t("Response review")}
        </h2>
        <p className={uiText.metric}>
          {formatNumber(score.totalScore)} / {formatNumber(score.maxScore)}
        </p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {score.criteria.map((criterion) => (
          <li className={cx(uiText.bodyStrong, "flex items-center justify-between gap-3")} key={criterion.dimension}>
            <span>{t(dimensionLabels[criterion.dimension])}</span>
            <span className={criterion.earnedPoints === 1 ? "font-semibold text-teal" : "font-semibold text-coral"}>
              {formatNumber(criterion.earnedPoints)}/{formatNumber(1)}
            </span>
          </li>
        ))}
      </ul>

      <div className="grid gap-2 border-t border-teal/20 pt-4">
        <h3 className={uiText.subsectionTitle}>{t("Model close")}</h3>
        <p className={uiText.bodyStrong}>{prompt.modelClose}</p>
      </div>
    </section>
  );
}

function isCompleteResponse(response: Partial<SynthesisResponse>): response is SynthesisResponse {
  return SYNTHESIS_DIMENSIONS.every((dimension) => response[dimension] !== undefined);
}
