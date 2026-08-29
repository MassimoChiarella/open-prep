"use client";

import Link from "next/link";

import { badgeClass, buttonClass, cx, uiText, type StatusTone } from "@/components/uiStyles";
import { createDrillSettings } from "@/features/drills/drillSettings";
import { buildDrillSettingsQuery } from "@/features/drills/drillSettingsOptions";
import { useI18n } from "@/features/i18n/I18nProvider";
import type { Recommendation } from "@/lib/domain";

interface RecommendationCardsProps {
  limit?: number;
  recommendations: readonly Recommendation[];
}

const fallbackSettings = createDrillSettings({
  categories: ["arithmetic"],
  feedbackMode: "instant",
  questionCount: 5,
  tags: ["addition", "subtraction"],
  timeMode: "untimed"
});

export function RecommendationCards({
  limit = 3,
  recommendations
}: RecommendationCardsProps) {
  const { t } = useI18n();
  const visibleRecommendations = recommendations.slice(0, Math.max(0, limit));

  return (
    <section aria-labelledby="recommendations-heading" className="grid gap-5">
      <div className="border-b border-ink/15 pb-4">
        <p className={cx(uiText.eyebrow, "text-coral")}>{t("Practice Queue")}</p>
        <h2
          className="mt-2 min-w-0 break-words text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink [overflow-wrap:anywhere]"
          id="recommendations-heading"
        >
          {t("Recommended Next Drill")}
        </h2>
      </div>

      {visibleRecommendations.length > 0 ? (
        <div className="grid gap-4">
          {visibleRecommendations.map((recommendation) => (
            <article
              className="grid content-start gap-4 border border-ink/15 border-t-2 border-t-teal bg-white p-5"
              data-testid={`recommendation-card-${recommendation.id}`}
              key={recommendation.id}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <h3 className="min-w-0 flex-1 break-words text-lg font-semibold text-ink [overflow-wrap:anywhere]">
                  {t(recommendation.title)}
                </h3>
                <span className={priorityBadgeClass(recommendation.priority)}>
                  {t(recommendation.priority)}
                </span>
              </div>
              {recommendation.signal !== undefined ? (
                <p className="text-sm font-semibold text-teal">
                  {t(recommendation.signal.label)}: {recommendation.signal.value}
                </p>
              ) : null}
              <p className="text-sm leading-6 text-ink/70">{t(recommendation.reason)}</p>
              <Link className={buttonClass("primary", "mt-auto")} href={drillHref(recommendation.suggestedSettings)}>
                {t("Start Recommended Drill")}
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <article
          className="grid gap-4 border border-ink/15 border-t-2 border-t-teal bg-white p-5"
          data-testid="recommendation-fallback-card"
        >
          <h3 className="min-w-0 break-words text-lg font-semibold text-ink [overflow-wrap:anywhere]">
            {t("Start with a baseline warm-up")}
          </h3>
          <p className="text-sm leading-6 text-ink/70">
            {t("Complete this short arithmetic set to build a reliable progress baseline.")}
          </p>
          <Link className={buttonClass()} href={drillHref(fallbackSettings)}>
            {t("Start Baseline Drill")}
          </Link>
        </article>
      )}
    </section>
  );
}

function drillHref(settings: Recommendation["suggestedSettings"]): string {
  return `/drills/session?${buildDrillSettingsQuery(settings)}`;
}

function priorityBadgeClass(priority: Recommendation["priority"]): string {
  const tones = {
    high: "error",
    low: "success",
    medium: "warning"
  } satisfies Record<Recommendation["priority"], StatusTone>;

  return badgeClass(tones[priority], "capitalize");
}
