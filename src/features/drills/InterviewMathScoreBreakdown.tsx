"use client";

import { interviewMathScoreWeights } from "@/features/drills/interviewMathEvaluation";
import { useI18n } from "@/features/i18n/I18nProvider";
import type { InterviewMathScore } from "@/lib/domain";

const scoreItems: { key: Exclude<keyof InterviewMathScore, "total">; label: string }[] = [
  { key: "formulaSelection", label: "Formula" },
  { key: "equationSetup", label: "Setup" },
  { key: "calculationAccuracy", label: "Calculation" },
  { key: "unitsMagnitude", label: "Units" },
  { key: "interpretationSelection", label: "Interpretation" }
];

export function InterviewMathScoreBreakdown({ score }: { score: InterviewMathScore }) {
  const { formatNumber, t } = useI18n();

  return (
    <section
      aria-label={t("Interview Math component score")}
      className="grid gap-3 border-t border-ink/10 pt-3"
      data-testid="interview-math-score"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{t("Component score")}</h3>
        <p className="text-sm font-semibold text-teal">
          {t("{score}/100 points", { score: formatNumber(score.total) })}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-5">
        {scoreItems.map((item) => (
          <div className="min-w-0 border-l-2 border-ink/10 pl-2" key={item.key}>
            <dt className="text-xs font-semibold text-ink/65">{t(item.label)}</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {formatNumber(score[item.key])}/{formatNumber(interviewMathScoreWeights[item.key])}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
