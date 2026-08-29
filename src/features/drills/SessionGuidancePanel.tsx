"use client";

import Link from "next/link";

import { useI18n } from "@/features/i18n/I18nProvider";

export interface SessionGuidanceWeakness {
  accuracy: number;
  averageTimeSeconds: number;
  label: string;
  reason: string;
}

export interface SessionGuidancePanelProps {
  recommendationHref: string;
  recommendationText: string;
  weaknesses: readonly SessionGuidanceWeakness[];
}

export function SessionGuidancePanel({
  recommendationHref,
  recommendationText,
  weaknesses
}: SessionGuidancePanelProps) {
  const { formatNumber, formatPercent, t } = useI18n();
  const visibleWeaknesses = weaknesses.slice(0, 3);

  return (
    <section aria-labelledby="session-guidance-heading" className="grid gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-coral">{t("Practice Guidance")}</p>
        <h3 className="mt-1 text-base font-semibold text-ink" id="session-guidance-heading">
          {t("Focus Areas")}
        </h3>
      </div>

      {visibleWeaknesses.length > 0 ? (
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {visibleWeaknesses.map((weakness) => (
            <li className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-start sm:gap-4" key={weakness.label}>
              <div className="min-w-0">
                <p className="font-semibold text-ink">{t(weakness.label)}</p>
                <p className="mt-1 text-sm leading-6 text-ink/70">{t(weakness.reason)}</p>
              </div>
              <GuidanceStat label={t("Accuracy")} value={formatPercent(weakness.accuracy)} />
              <GuidanceStat
                label={t("Average time")}
                value={t("{seconds}s", {
                  seconds: formatNumber(weakness.averageTimeSeconds, { maximumFractionDigits: 1, minimumFractionDigits: 1 })
                })}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-y border-ink/10 py-3 text-sm leading-6 text-ink/70">
          {t("No focus areas were identified in this session.")}
        </p>
      )}

      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Recommended next drill")}</p>
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-ink px-4 text-center text-sm font-semibold text-white transition hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 sm:w-fit"
          href={recommendationHref}
        >
          {t(recommendationText)}
        </Link>
      </div>
    </section>
  );
}

function GuidanceStat({ label, value }: { label: string; value: string }) {
  return (
    <dl className="grid min-w-24 grid-cols-2 gap-2 text-sm sm:block sm:text-right">
      <dt className="font-semibold text-ink/65">{label}</dt>
      <dd className="font-semibold text-ink sm:mt-1">{value}</dd>
    </dl>
  );
}
