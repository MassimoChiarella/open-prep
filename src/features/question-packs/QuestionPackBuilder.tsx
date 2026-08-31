"use client";

import { useRef, useState, type FormEvent } from "react";

import { buttonClass, uiInputs, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  categoryOptions,
  difficultyOptions,
  skillTagOptions,
  unitPreferenceOptions
} from "@/features/drills/drillSettingsOptions";
import type { Difficulty, RoundingRule, SkillCategory, SkillTag, UnitType } from "@/lib/domain";

interface QuestionPackBuilderProps {
  onPreview(payload: unknown): void;
}

type ToleranceType = "absolute" | "exact" | "percentage" | "range";

interface QuestionDraft {
  key: number;
  id: string;
  prompt: string;
  value: string;
  unit: UnitType;
  category: SkillCategory;
  difficulty: Difficulty;
  expectedTimeSeconds: string;
  roundingRule: "" | RoundingRule;
  tag: SkillTag;
  summary: string;
  steps: string;
  toleranceType: ToleranceType;
  toleranceValue: string;
  toleranceMin: string;
  toleranceMax: string;
}

const toleranceOptions: Array<{ label: string; value: ToleranceType }> = [
  { label: "Exact", value: "exact" },
  { label: "Absolute", value: "absolute" },
  { label: "Percentage", value: "percentage" },
  { label: "Range", value: "range" }
];

const roundingOptions: Array<{ label: string; value: "" | RoundingRule }> = [
  { label: "Not specified", value: "" },
  { label: "Exact", value: "exact" },
  { label: "Nearest whole number", value: "nearest_whole" },
  { label: "Nearest 0.1", value: "nearest_0_1" },
  { label: "Nearest thousand", value: "nearest_1k" },
  { label: "Nearest million", value: "nearest_1m" }
];

export function QuestionPackBuilder({ onPreview }: QuestionPackBuilderProps) {
  const { t } = useI18n();
  const nextQuestionNumber = useRef(2);
  const [title, setTitle] = useState("");
  const [packVersion, setPackVersion] = useState("1.0");
  const [packId, setPackId] = useState("my-question-pack");
  const [packIdIsCustom, setPackIdIsCustom] = useState(false);
  const [description, setDescription] = useState("");
  const [publisher, setPublisher] = useState("");
  const [license, setLicense] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([createQuestionDraft(1)]);

  function updateQuestion(key: number, update: Partial<QuestionDraft>) {
    setQuestions((current) =>
      current.map((question) => (question.key === key ? { ...question, ...update } : question))
    );
  }

  function addQuestion() {
    const number = nextQuestionNumber.current;
    nextQuestionNumber.current += 1;
    setQuestions((current) => [...current, createQuestionDraft(number)]);
  }

  function removeQuestion(key: number) {
    setQuestions((current) => current.filter((question) => question.key !== key));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onPreview({
      format: "math-drill-question-pack",
      schemaVersion: 2,
      kind: "fixed_numeric",
      id: packId.trim(),
      packVersion: packVersion.trim(),
      title: title.trim(),
      ...optionalText("description", description),
      ...optionalText("publisher", publisher),
      ...optionalText("license", license),
      questions: questions.map(toQuestionPayload)
    });
  }

  return (
    <details
      className="group border border-ink/15 border-t-2 border-t-coral bg-paper p-4 sm:p-5"
      data-testid="question-pack-builder"
    >
      <summary className="-m-2 cursor-pointer list-none p-2 font-semibold text-ink transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
        {t("Build a question pack")}
        <span className="ml-2 text-sm font-normal text-ink/65">{t("Create fixed numeric questions in the app.")}</span>
      </summary>

      <form className="mt-5 grid gap-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Pack title")}>
            <input
              className={uiInputs.base}
              maxLength={100}
              onChange={(event) => {
                const nextTitle = event.currentTarget.value;
                setTitle(nextTitle);
                if (!packIdIsCustom) setPackId(slugify(nextTitle) || "my-question-pack");
              }}
              required
              value={title}
            />
          </Field>
          <Field label={t("Version")}>
            <input
              className={uiInputs.base}
              maxLength={100}
              onChange={(event) => setPackVersion(event.currentTarget.value)}
              required
              value={packVersion}
            />
          </Field>
        </div>

        <details className="border border-ink/15 bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">{t("Advanced pack details")}</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t("Pack ID")}>
              <input
                className={uiInputs.base}
                maxLength={80}
                onChange={(event) => {
                  setPackId(event.currentTarget.value);
                  setPackIdIsCustom(true);
                }}
                pattern="[a-z0-9][a-z0-9_-]*"
                required
                value={packId}
              />
            </Field>
            <Field label={t("Publisher (optional)")}>
              <input
                className={uiInputs.base}
                maxLength={100}
                onChange={(event) => setPublisher(event.currentTarget.value)}
                value={publisher}
              />
            </Field>
            <Field label={t("License (optional)")}>
              <input
                className={uiInputs.base}
                maxLength={100}
                onChange={(event) => setLicense(event.currentTarget.value)}
                value={license}
              />
            </Field>
            <Field label={t("Description (optional)")} wide>
              <textarea
                className={uiInputs.textarea}
                maxLength={500}
                onChange={(event) => setDescription(event.currentTarget.value)}
                value={description}
              />
            </Field>
          </div>
        </details>

        <div className="grid gap-4">
          {questions.map((question, index) => (
            <QuestionEditor
              canRemove={questions.length > 1}
              index={index}
              key={question.key}
              onChange={(update) => updateQuestion(question.key, update)}
              onRemove={() => removeQuestion(question.key)}
              question={question}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button className={buttonClass("secondary")} onClick={addQuestion} type="button">
            {t("Add Question")}
          </button>
          <button className={buttonClass("primary")} type="submit">
            {t("Preview Pack")}
          </button>
        </div>
      </form>
    </details>
  );
}

function QuestionEditor({
  canRemove,
  index,
  onChange,
  onRemove,
  question
}: {
  canRemove: boolean;
  index: number;
  onChange(update: Partial<QuestionDraft>): void;
  onRemove(): void;
  question: QuestionDraft;
}) {
  const number = index + 1;
  const { formatNumber, t } = useI18n();

  return (
    <fieldset className="grid gap-4 border border-ink/15 border-t-2 border-t-teal bg-white p-4" data-testid="builder-question">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <legend className="font-semibold text-ink">{t("Question {number}", { number: formatNumber(number) })}</legend>
        {canRemove ? (
          <button className={buttonClass("danger", "px-3")} onClick={onRemove} type="button">
            {t("Remove Question {number}", { number: formatNumber(number) })}
          </button>
        ) : null}
      </div>

      <Field label={t("Question ID")}>
        <input
          aria-label={t("Question {number} ID", { number: formatNumber(number) })}
          className={uiInputs.compact}
          maxLength={80}
          onChange={(event) => onChange({ id: event.currentTarget.value })}
          pattern="[a-z0-9][a-z0-9_-]*"
          required
          value={question.id}
        />
      </Field>

      <Field label={t("Prompt")}>
        <textarea
          aria-label={t("Question {number} prompt", { number: formatNumber(number) })}
          className={uiInputs.textarea}
          maxLength={2_000}
          onChange={(event) => onChange({ prompt: event.currentTarget.value })}
          required
          value={question.prompt}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("Answer value")}>
          <input
            aria-label={t("Question {number} answer value", { number: formatNumber(number) })}
            className={uiInputs.base}
            inputMode="decimal"
            onChange={(event) => onChange({ value: event.currentTarget.value })}
            required
            step="any"
            type="number"
            value={question.value}
          />
        </Field>
        <Field label={t("Unit")}>
          <select
            aria-label={t("Question {number} unit", { number: formatNumber(number) })}
            className={uiInputs.base}
            onChange={(event) => onChange({ unit: event.currentTarget.value as UnitType })}
            value={question.unit}
          >
            {unitPreferenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Difficulty")}>
          <select
            aria-label={t("Question {number} difficulty", { number: formatNumber(number) })}
            className={uiInputs.base}
            onChange={(event) => onChange({ difficulty: event.currentTarget.value as Difficulty })}
            value={question.difficulty}
          >
            {difficultyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Tolerance")}>
          <select
            aria-label={t("Question {number} tolerance", { number: formatNumber(number) })}
            className={uiInputs.base}
            onChange={(event) => onChange({ toleranceType: event.currentTarget.value as ToleranceType })}
            value={question.toleranceType}
          >
            {toleranceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <ToleranceFields index={number} onChange={onChange} question={question} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("Category")}>
          <select
            aria-label={t("Question {number} category", { number: formatNumber(number) })}
            className={uiInputs.base}
            onChange={(event) => onChange({ category: event.currentTarget.value as SkillCategory })}
            value={question.category}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Primary tag")}>
          <select
            aria-label={t("Question {number} primary tag", { number: formatNumber(number) })}
            className={uiInputs.base}
            onChange={(event) => onChange({ tag: event.currentTarget.value as SkillTag })}
            value={question.tag}
          >
            {skillTagOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Expected time (seconds, optional)")}>
          <input
            aria-label={t("Question {number} expected time", { number: formatNumber(number) })}
            className={uiInputs.base}
            max="3600"
            min="1"
            onChange={(event) => onChange({ expectedTimeSeconds: event.currentTarget.value })}
            step="1"
            type="number"
            value={question.expectedTimeSeconds}
          />
        </Field>
        <Field label={t("Rounding instruction (optional)")}>
          <select
            aria-label={t("Question {number} rounding instruction", { number: formatNumber(number) })}
            className={uiInputs.base}
            onChange={(event) => onChange({ roundingRule: event.currentTarget.value as "" | RoundingRule })}
            value={question.roundingRule}
          >
            {roundingOptions.map((option) => (
              <option key={option.value || "unspecified"} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={t("Explanation summary")}>
        <input
          aria-label={t("Question {number} explanation summary", { number: formatNumber(number) })}
          className={uiInputs.base}
          maxLength={1_000}
          onChange={(event) => onChange({ summary: event.currentTarget.value })}
          required
          value={question.summary}
        />
      </Field>
      <Field label={t("Explanation steps (one per line)")}>
        <textarea
          aria-label={t("Question {number} explanation steps", { number: formatNumber(number) })}
          className={uiInputs.textarea}
          maxLength={10_009}
          onChange={(event) => onChange({ steps: event.currentTarget.value })}
          required
          value={question.steps}
        />
      </Field>
    </fieldset>
  );
}

function ToleranceFields({
  index,
  onChange,
  question
}: {
  index: number;
  onChange(update: Partial<QuestionDraft>): void;
  question: QuestionDraft;
}) {
  const { formatNumber, t } = useI18n();
  if (question.toleranceType === "exact") {
    return <p className={uiText.dense}>{t("Only the exact numeric answer will be accepted.")}</p>;
  }

  if (question.toleranceType === "range") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Accepted minimum")}>
          <input
            aria-label={t("Question {number} tolerance minimum", { number: formatNumber(index) })}
            className={uiInputs.base}
            onChange={(event) => onChange({ toleranceMin: event.currentTarget.value })}
            required
            step="any"
            type="number"
            value={question.toleranceMin}
          />
        </Field>
        <Field label={t("Accepted maximum")}>
          <input
            aria-label={t("Question {number} tolerance maximum", { number: formatNumber(index) })}
            className={uiInputs.base}
            onChange={(event) => onChange({ toleranceMax: event.currentTarget.value })}
            required
            step="any"
            type="number"
            value={question.toleranceMax}
          />
        </Field>
      </div>
    );
  }

  return (
    <Field label={t(question.toleranceType === "percentage" ? "Relative tolerance" : "Absolute tolerance")}>
      <input
        aria-label={t("Question {number} tolerance value", { number: formatNumber(index) })}
        className={uiInputs.base}
        min="0"
        onChange={(event) => onChange({ toleranceValue: event.currentTarget.value })}
        required
        step="any"
        type="number"
        value={question.toleranceValue}
      />
      {question.toleranceType === "percentage" ? (
        <span className={uiText.dense}>{t("Use a fraction, such as 0.02 for 2%.")}</span>
      ) : null}
    </Field>
  );
}

function Field({ children, label, wide = false }: { children: React.ReactNode; label: string; wide?: boolean }) {
  const { t } = useI18n();
  return (
    <label className={`grid gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <span className={uiText.controlLabel}>{t(label)}</span>
      {children}
    </label>
  );
}

function createQuestionDraft(number: number): QuestionDraft {
  return {
    key: number,
    id: `question-${String(number).padStart(3, "0")}`,
    prompt: "",
    value: "",
    unit: "none",
    category: "arithmetic",
    difficulty: "beginner",
    expectedTimeSeconds: "",
    roundingRule: "",
    tag: "addition",
    summary: "",
    steps: "",
    toleranceType: "exact",
    toleranceValue: "",
    toleranceMin: "",
    toleranceMax: ""
  };
}

function toQuestionPayload(question: QuestionDraft) {
  return {
    id: question.id.trim(),
    type: "numeric" as const,
    category: question.category,
    tags: [question.tag],
    difficulty: question.difficulty,
    prompt: question.prompt.trim(),
    answer: {
      value: numericValue(question.value),
      unit: question.unit,
      ...tolerancePayload(question),
      ...(question.roundingRule === "" ? {} : { roundingRule: question.roundingRule })
    },
    explanation: {
      short: question.summary.trim(),
      steps: question.steps
        .split(/\r?\n/)
        .map((step) => step.trim())
        .filter(Boolean)
    },
    ...(question.expectedTimeSeconds.trim() === ""
      ? {}
      : { expectedTimeSeconds: numericValue(question.expectedTimeSeconds) })
  };
}

function tolerancePayload(question: QuestionDraft) {
  if (question.toleranceType === "exact") {
    return {};
  }

  if (question.toleranceType === "range") {
    return {
      tolerance: {
        type: "range" as const,
        min: numericValue(question.toleranceMin),
        max: numericValue(question.toleranceMax)
      }
    };
  }

  return {
    tolerance: {
      type: question.toleranceType,
      value: numericValue(question.toleranceValue)
    }
  };
}

function numericValue(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function optionalText<TKey extends "description" | "license" | "publisher">(
  key: TKey,
  value: string
): Partial<Record<TKey, string>> {
  const trimmed = value.trim();
  return trimmed === "" ? {} : { [key]: trimmed } as Record<TKey, string>;
}
