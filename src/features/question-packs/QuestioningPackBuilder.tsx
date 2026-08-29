"use client";

import { type FormEvent, useState } from "react";

import { buttonClass, uiInputs, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";

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

export function QuestioningPackBuilder({ onPreview }: QuestioningPackBuilderProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [packId, setPackId] = useState("my-questioning-pack");
  const [packIdIsCustom, setPackIdIsCustom] = useState(false);
  const [packVersion, setPackVersion] = useState("1.0");
  const [promptTitle, setPromptTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [situation, setSituation] = useState("");
  const [objective, setObjective] = useState("");
  const [mode, setMode] = useState<"clarifying" | "diagnostic">("diagnostic");
  const [minimumQuestions, setMinimumQuestions] = useState(3);
  const [maximumQuestions, setMaximumQuestions] = useState(8);
  const [concepts, setConcepts] = useState(JSON.stringify(starterConcepts, null, 2));
  const [intents, setIntents] = useState(JSON.stringify(starterIntents, null, 2));
  const [jsonError, setJsonError] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const parsedConcepts: unknown = JSON.parse(concepts);
      const parsedIntents: unknown = JSON.parse(intents);
      if (!Array.isArray(parsedConcepts) || !Array.isArray(parsedIntents)) throw new TypeError();
      setJsonError(false);
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
          language: "en",
          mode,
          minimumQuestions,
          maximumQuestions,
          concepts: parsedConcepts,
          intents: parsedIntents
        }]
      });
    } catch {
      setJsonError(true);
    }
  }

  return (
    <details
      className="group border border-ink/15 border-t-2 border-t-coral bg-paper p-4 sm:p-5"
      data-testid="questioning-pack-builder"
    >
      <summary className="-m-2 cursor-pointer list-none p-2 font-semibold text-ink transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
        {t("Build a questioning pack")}
        <span className="ml-2 text-sm font-normal text-ink/65">
          {t("Create a deterministic case-questioning rubric in the app.")}
        </span>
      </summary>

      <form className="mt-5 grid gap-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Pack title">
            <input
              className={uiInputs.base}
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
            <input className={uiInputs.base} maxLength={100} onChange={(event) => setPromptTitle(event.currentTarget.value)} required value={promptTitle} />
          </Field>
          <Field label="Industry">
            <input className={uiInputs.base} maxLength={100} onChange={(event) => setIndustry(event.currentTarget.value)} required value={industry} />
          </Field>
          <Field label="Situation" wide>
            <textarea className={uiInputs.textarea} maxLength={2_000} onChange={(event) => setSituation(event.currentTarget.value)} required value={situation} />
          </Field>
          <Field label="Objective" wide>
            <textarea className={uiInputs.textarea} maxLength={1_000} onChange={(event) => setObjective(event.currentTarget.value)} required value={objective} />
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
            <input className={uiInputs.base} max="12" min="1" onChange={(event) => setMinimumQuestions(event.currentTarget.valueAsNumber)} required type="number" value={minimumQuestions} />
          </Field>
          <Field label="Maximum questions">
            <input className={uiInputs.base} max="12" min="1" onChange={(event) => setMaximumQuestions(event.currentTarget.valueAsNumber)} required type="number" value={maximumQuestions} />
          </Field>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Concepts JSON">
            <textarea aria-label={t("Concepts JSON")} className={`${uiInputs.textarea} min-h-80 font-mono text-sm`} onChange={(event) => setConcepts(event.currentTarget.value)} required spellCheck={false} value={concepts} />
            <span className={uiText.dense}>{t("List canonical concepts and the phrases that should match each one.")}</span>
          </Field>
          <Field label="Scoring themes JSON">
            <textarea aria-label={t("Scoring themes JSON")} className={`${uiInputs.textarea} min-h-80 font-mono text-sm`} onChange={(event) => setIntents(event.currentTarget.value)} required spellCheck={false} value={intents} />
            <span className={uiText.dense}>{t("Define theme weights, required concept groups, model questions, and optional priorities.")}</span>
          </Field>
        </div>

        {jsonError ? (
          <p className="border border-coral/30 bg-coral/10 p-3 text-sm text-ink" role="alert">
            {t("Concepts and scoring themes must be valid JSON arrays.")}
          </p>
        ) : null}

        <button className={buttonClass("primary")} type="submit">{t("Preview Pack")}</button>
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
