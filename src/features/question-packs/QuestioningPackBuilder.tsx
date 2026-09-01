"use client";

import { type FormEvent, useRef, useState } from "react";

import { buttonClass, uiInputs, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";
import { useUnsavedChangesGuard } from "@/features/question-packs/useUnsavedChangesGuard";

interface QuestioningPackBuilderProps {
  onPreview(payload: unknown): void;
}

const starterConcepts = [
  { id: "objective", label: "Objective", aliases: ["objective", "goal", "success", "target"] },
  { id: "timing", label: "Time horizon", aliases: ["time", "timeline", "year", "years", "horizon"] },
  { id: "customers", label: "Customers", aliases: ["customer", "customers", "segment", "demand"] },
  { id: "economics", label: "Economics", aliases: ["profit", "profitability", "revenue", "cost", "economics"] }
];

const starterIntents = [
  {
    id: "success_criteria",
    label: "Success criteria",
    feedback: "Clarify the objective and time horizon.",
    priority: true,
    weight: 35,
    requiredConceptGroups: [["objective"], ["timing"]],
    referenceQuestions: ["What defines success, and over what time horizon?"]
  },
  {
    id: "customer_evidence",
    label: "Customer evidence",
    feedback: "Identify the relevant customer demand and segments.",
    priority: true,
    weight: 30,
    requiredConceptGroups: [["customers"]],
    referenceQuestions: ["Which customer segments and demand patterns matter most?"]
  },
  {
    id: "economics",
    label: "Economics",
    feedback: "Test the revenue, cost, and profitability implications.",
    priority: false,
    weight: 35,
    requiredConceptGroups: [["economics"]],
    referenceQuestions: ["What are the revenue, cost, and profitability implications?"]
  }
];

const starterConceptsJson = JSON.stringify(starterConcepts, null, 2);
const starterIntentsJson = JSON.stringify(starterIntents, null, 2);

type JsonArrayError = "array" | "syntax";

export function QuestioningPackBuilder({ onPreview }: QuestioningPackBuilderProps) {
  const { t } = useI18n();
  const { clearDirty, isDirty, markDirty } = useUnsavedChangesGuard(
    t("Leave this builder? Your unsaved changes will be lost.")
  );
  const conceptsRef = useRef<HTMLTextAreaElement>(null);
  const intentsRef = useRef<HTMLTextAreaElement>(null);
  const maximumQuestionsRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [packId, setPackId] = useState("my-questioning-pack");
  const [packIdIsCustom, setPackIdIsCustom] = useState(false);
  const [packVersion, setPackVersion] = useState("1.0");
  const [promptTitle, setPromptTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [situation, setSituation] = useState("");
  const [objective, setObjective] = useState("");
  const [language, setLanguage] = useState("en");
  const [mode, setMode] = useState<"clarifying" | "diagnostic">("diagnostic");
  const [minimumQuestions, setMinimumQuestions] = useState(3);
  const [maximumQuestions, setMaximumQuestions] = useState(8);
  const [concepts, setConcepts] = useState(starterConceptsJson);
  const [intents, setIntents] = useState(starterIntentsJson);
  const [conceptsError, setConceptsError] = useState<JsonArrayError>();
  const [intentsError, setIntentsError] = useState<JsonArrayError>();
  const [questionCountError, setQuestionCountError] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedConcepts = parseJsonArray(concepts);
    const parsedIntents = parseJsonArray(intents);
    const nextCountError =
      !Number.isInteger(minimumQuestions) ||
      !Number.isInteger(maximumQuestions) ||
      minimumQuestions < 1 ||
      maximumQuestions > 12 ||
      maximumQuestions < minimumQuestions;
    setConceptsError(parsedConcepts.error);
    setIntentsError(parsedIntents.error);
    setQuestionCountError(nextCountError);

    if (parsedConcepts.error !== undefined) {
      conceptsRef.current?.focus();
      return;
    }
    if (parsedIntents.error !== undefined) {
      intentsRef.current?.focus();
      return;
    }
    if (nextCountError) {
      maximumQuestionsRef.current?.focus();
      return;
    }

    onPreview({
      format: "math-drill-question-pack",
      schemaVersion: 3,
      kind: "case_practice",
      id: packId.trim(),
      packVersion: packVersion.trim(),
      title: title.trim(),
      questioningPrompts: [{
        id: `${packId.trim()}-prompt`.slice(0, 80),
        title: promptTitle.trim(),
        industry: industry.trim(),
        situation: situation.trim(),
        objective: objective.trim(),
        language,
        mode,
        minimumQuestions,
        maximumQuestions,
        concepts: parsedConcepts.value,
        intents: parsedIntents.value
      }]
    });
  }

  function discardChanges() {
    setTitle("");
    setPackId("my-questioning-pack");
    setPackIdIsCustom(false);
    setPackVersion("1.0");
    setPromptTitle("");
    setIndustry("");
    setSituation("");
    setObjective("");
    setLanguage("en");
    setMode("diagnostic");
    setMinimumQuestions(3);
    setMaximumQuestions(8);
    setConcepts(starterConceptsJson);
    setIntents(starterIntentsJson);
    setConceptsError(undefined);
    setIntentsError(undefined);
    setQuestionCountError(false);
    clearDirty();
  }

  return (
    <details
      className="group border border-ink/15 border-t-2 border-t-coral bg-paper p-4 sm:p-5"
      data-testid="questioning-pack-builder"
    >
      <summary className="-m-2 cursor-pointer list-none p-2 font-semibold text-ink transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
        {t("Build a questioning pack")}
        <span className="ms-2 text-sm font-normal text-ink/65">
          {t("Create a deterministic case-questioning rubric in the app.")}
        </span>
      </summary>

      <form className="mt-5 grid min-w-0 gap-5" onChange={markDirty} onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Pack title">
            <input
              className={uiInputs.base}
              dir="auto"
              maxLength={100}
              onChange={(event) => {
                const nextTitle = event.currentTarget.value;
                setTitle(nextTitle);
                if (!packIdIsCustom) setPackId(slugify(nextTitle) || "my-questioning-pack");
              }}
              required
              value={title}
            />
          </Field>
          <Field label="Pack ID">
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
          <Field label="Version">
            <input className={uiInputs.base} maxLength={100} onChange={(event) => setPackVersion(event.currentTarget.value)} required value={packVersion} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Case title">
            <input className={uiInputs.base} dir="auto" maxLength={100} onChange={(event) => setPromptTitle(event.currentTarget.value)} required value={promptTitle} />
          </Field>
          <Field label="Industry">
            <input className={uiInputs.base} dir="auto" maxLength={100} onChange={(event) => setIndustry(event.currentTarget.value)} required value={industry} />
          </Field>
          <Field label="Content language">
            <input
              className={uiInputs.base}
              dir="ltr"
              maxLength={35}
              onChange={(event) => setLanguage(event.currentTarget.value)}
              required
              value={language}
            />
          </Field>
          <Field label="Situation" wide>
            <textarea className={uiInputs.textarea} dir="auto" maxLength={2_000} onChange={(event) => setSituation(event.currentTarget.value)} required value={situation} />
          </Field>
          <Field label="Objective" wide>
            <textarea className={uiInputs.textarea} dir="auto" maxLength={1_000} onChange={(event) => setObjective(event.currentTarget.value)} required value={objective} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Question mode">
            <select className={uiInputs.base} onChange={(event) => setMode(event.currentTarget.value as typeof mode)} value={mode}>
              <option value="clarifying">{t("Clarifying")}</option>
              <option value="diagnostic">{t("Diagnostic")}</option>
            </select>
          </Field>
          <Field label="Minimum questions">
            <input
              className={uiInputs.base}
              max="12"
              min="1"
              onChange={(event) => {
                setMinimumQuestions(event.currentTarget.valueAsNumber);
                setQuestionCountError(false);
              }}
              required
              type="number"
              value={minimumQuestions}
            />
          </Field>
          <Field label="Maximum questions">
            <input
              aria-describedby={questionCountError ? "questioning-count-error" : undefined}
              aria-invalid={questionCountError ? true : undefined}
              className={uiInputs.base}
              max="12"
              min="1"
              onChange={(event) => {
                setMaximumQuestions(event.currentTarget.valueAsNumber);
                setQuestionCountError(false);
              }}
              ref={maximumQuestionsRef}
              required
              type="number"
              value={maximumQuestions}
            />
            {questionCountError ? (
              <span className="text-sm text-coral" id="questioning-count-error" role="alert">
                {t("Maximum questions must be between the minimum and 12.")}
              </span>
            ) : null}
          </Field>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <Field label="Concepts JSON">
            <textarea
              aria-describedby={`concepts-json-help${conceptsError ? " concepts-json-error" : ""}`}
              aria-invalid={conceptsError ? true : undefined}
              aria-label={t("Concepts JSON")}
              className={`${uiInputs.textarea} min-h-80 min-w-0 font-mono text-sm`}
              dir="ltr"
              onChange={(event) => {
                setConcepts(event.currentTarget.value);
                setConceptsError(undefined);
              }}
              ref={conceptsRef}
              required
              spellCheck={false}
              value={concepts}
            />
            <span className={uiText.dense} id="concepts-json-help">{t("List canonical concepts and the phrases that should match each one.")}</span>
            {conceptsError ? (
              <span className="text-sm text-coral" id="concepts-json-error" role="alert">
                {conceptsError === "syntax"
                  ? t("Concepts must be valid JSON. Check brackets, commas, and quotation marks.")
                  : t("Concepts must be a JSON array enclosed in square brackets.")}
              </span>
            ) : null}
          </Field>
          <Field label="Scoring themes JSON">
            <textarea
              aria-describedby={`scoring-themes-json-help${intentsError ? " scoring-themes-json-error" : ""}`}
              aria-invalid={intentsError ? true : undefined}
              aria-label={t("Scoring themes JSON")}
              className={`${uiInputs.textarea} min-h-80 min-w-0 font-mono text-sm`}
              dir="ltr"
              onChange={(event) => {
                setIntents(event.currentTarget.value);
                setIntentsError(undefined);
              }}
              ref={intentsRef}
              required
              spellCheck={false}
              value={intents}
            />
            <span className={uiText.dense} id="scoring-themes-json-help">{t("Define theme weights, required concept groups, model questions, and optional priorities.")}</span>
            {intentsError ? (
              <span className="text-sm text-coral" id="scoring-themes-json-error" role="alert">
                {intentsError === "syntax"
                  ? t("Scoring themes must be valid JSON. Check brackets, commas, and quotation marks.")
                  : t("Scoring themes must be a JSON array enclosed in square brackets.")}
              </span>
            ) : null}
          </Field>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className={buttonClass("primary")} type="submit">{t("Preview Pack")}</button>
          <button className={buttonClass("secondary")} disabled={!isDirty} onClick={discardChanges} type="button">
            {t("Discard changes")}
          </button>
        </div>
      </form>
    </details>
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

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 73);
}

function parseJsonArray(source: string): { error?: JsonArrayError; value?: unknown[] } {
  try {
    const value: unknown = JSON.parse(source);
    return Array.isArray(value) ? { value } : { error: "array" };
  } catch {
    return { error: "syntax" };
  }
}
