"use client";

import { isExhibitMultipleChoiceQuestion } from "@/features/exhibits/exhibitDataset";
import type { ExhibitQuestionSpec } from "@/features/exhibits/exhibitTypes";
import { useI18n } from "@/features/i18n/I18nProvider";
import type { AnswerSpec } from "@/lib/domain";

interface ExhibitAnswerInputProps {
  disabled?: boolean;
  name: string;
  onChange: (value: string) => void;
  question: ExhibitQuestionSpec;
  value: string;
}

export function ExhibitAnswerInput({
  disabled = false,
  name,
  onChange,
  question,
  value
}: ExhibitAnswerInputProps) {
  const { t } = useI18n();

  if (isExhibitMultipleChoiceQuestion(question)) {
    return (
      <fieldset className="grid min-w-0 gap-2" disabled={disabled}>
        <legend className="text-sm font-medium text-ink/80">{t("Answer")}</legend>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
          {question.choices.map((choice) => (
            <label
              className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 rounded-md border border-ink/20 px-3 py-2 text-sm font-medium text-ink transition hover:border-teal hover:bg-paper focus-within:border-teal focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal has-[:checked]:border-teal has-[:checked]:bg-mint"
              key={choice.id}
            >
              <input
                checked={value === choice.id}
                className="h-4 w-4 shrink-0 accent-teal"
                name={name}
                onChange={() => onChange(choice.id)}
                type="radio"
                value={choice.id}
              />
              <span className="min-w-0 [overflow-wrap:anywhere]">{choice.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-ink/80">
      {t("Answer")}
      <input
        className="h-11 w-full min-w-0 rounded-md border border-ink/50 bg-white px-3 text-base text-ink outline-none transition placeholder:text-ink/65 focus:border-ink focus:ring-2 focus:ring-teal/20 disabled:bg-paper"
        disabled={disabled}
        inputMode="decimal"
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholderForAnswer(question.answer)}
        type="text"
        value={value}
      />
    </label>
  );
}

function placeholderForAnswer(answer: AnswerSpec): string {
  if (answer.unit === "currency") {
    return "$12.5M";
  }

  if (answer.unit === "percentage" || answer.unit === "percentage_points") {
    return "45%";
  }

  return "125000";
}
