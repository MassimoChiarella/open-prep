"use client";

import { useState } from "react";

import { InfoHint } from "@/components/InfoHint";
import { buttonClass, panelClass, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";

type PackPlan = "series" | "single";

const steps = [
  {
    help: "Name the learning goal, audience, and intended difficulty before writing questions.",
    title: "Define"
  },
  {
    help: "Decide whether every question uses one format or the experience needs separate format-specific packs.",
    title: "Choose formats"
  },
  {
    help: "Use an in-app builder for fixed numeric or questioning packs. Use an editable starter for other supported formats.",
    title: "Build content"
  },
  {
    help: "Preview every pack independently and fix validation errors before downloading or installing it.",
    title: "Validate and review"
  },
  {
    help: "Install each validated pack locally and run a short practice check before sharing it.",
    title: "Install and test"
  }
] as const;

const builderDestinations = [
  {
    href: "#fixed-numeric-builder",
    label: "Fixed numeric builder"
  },
  {
    href: "#case-questioning-builder",
    label: "Case questioning builder"
  }
] as const;

const starterDestinations = [
  {
    href: "#content-pack-starters-numeric",
    label: "Generated and interview math"
  },
  {
    href: "#content-pack-starters-exhibits",
    label: "Exhibits"
  },
  {
    href: "#content-pack-starters-market-sizing",
    label: "Market sizing"
  },
  {
    href: "#content-pack-starters-benchmarks",
    label: "Benchmarks"
  },
  {
    href: "#content-pack-starters-case-practice",
    label: "Broader case practice"
  }
] as const;

export function ContentPackCreationGuide() {
  const { t } = useI18n();
  const [plan, setPlan] = useState<PackPlan>("series");
  const isSeries = plan === "series";

  return (
    <section
      aria-labelledby="content-pack-creation-guide-heading"
      className={panelClass("highlight", "grid min-w-0 gap-6")}
      data-testid="content-pack-creation-guide"
    >
      <header className="grid min-w-0 max-w-3xl gap-2 text-start">
        <h2 className={uiText.sectionTitle} id="content-pack-creation-guide-heading">
          {t("Build complex question packs, section by section")}
        </h2>
        <p className={uiText.body}>
          {t("Choose a structure first. The steps and shortcuts below keep large packs understandable and each file easy to validate.")}
        </p>
      </header>

      <div aria-label={t("Pack structure")} className="flex flex-wrap gap-3" role="group">
        <button
          aria-pressed={!isSeries}
          className={buttonClass(!isSeries ? "primary" : "secondary")}
          onClick={() => setPlan("single")}
          type="button"
        >
          {t("Single-format pack")}
        </button>
        <button
          aria-pressed={isSeries}
          className={buttonClass(isSeries ? "primary" : "secondary")}
          onClick={() => setPlan("series")}
          type="button"
        >
          {t("Multi-format series")}
        </button>
      </div>

      <ol className="grid min-w-0 gap-px bg-ink/15 sm:grid-cols-5">
        {steps.map((step, index) => (
          <li className="grid min-w-0 content-start gap-1 bg-white p-3" key={step.title}>
            <div className="flex min-w-0 items-center justify-between gap-1">
              <h3 className="min-w-0 text-sm font-semibold text-ink">{t(step.title)}</h3>
              <InfoHint align={index > 2 ? "end" : "start"} label={t("About {step}", { step: t(step.title) })}>
                {t(step.help)}
              </InfoHint>
            </div>
          </li>
        ))}
      </ol>

      <div aria-live="polite" className="grid min-w-0 gap-3 border-s-2 border-coral bg-white p-4 text-start">
        <h3 className={uiText.subsectionTitle}>
          {t(isSeries ? "Current task: outline the series" : "Current task: choose one format")}
        </h3>
        {isSeries ? (
          <>
            <p className={uiText.bodyStrong}>
              {t("Open Prep currently validates, installs, and runs one format per pack file. Build one independently validated pack file for each section. A single mixed-format file or one practice session spanning those files is not available yet.")}
            </p>
            <p className={uiText.body}>
              {t("Keep the sequence clear with numbered IDs and titles.")}
            </p>
            <code className="max-w-full overflow-x-auto text-xs text-ink/75" dir="ltr">
              retail-01-warmup, retail-02-exhibits, retail-03-synthesis
            </code>
          </>
        ) : (
          <p className={uiText.bodyStrong}>
            {t("Choose one builder or starter below, then preview, validate, install, and test the resulting pack file.")}
          </p>
        )}
        <p className={uiText.body}>
          {t("Building many fixed-numeric questions? Add them in batches in the guided builder. For very large packs, start from validated JSON and import it for review.")}
        </p>
      </div>

      <nav aria-label={t("Choose an authoring route")} className="grid min-w-0 gap-5">
        <div className="grid min-w-0 gap-2">
          <h3 className={uiText.subsectionTitle}>{t("Build in the app")}</h3>
          <ul className="grid min-w-0 gap-px bg-ink/15 sm:grid-cols-2">
            {builderDestinations.map((destination) => (
              <li className="min-w-0 bg-white" key={destination.href}>
                <a
                  className="grid h-full min-w-0 gap-1 p-4 text-start transition-colors hover:bg-mint/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                  href={destination.href}
                >
                  <span className="text-sm font-semibold text-teal underline decoration-teal/40 underline-offset-4">
                    {t(destination.label)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid min-w-0 gap-2">
          <h3 className={uiText.subsectionTitle}>{t("Start from an editable example")}</h3>
          <ul className="flex min-w-0 flex-wrap gap-2">
            {starterDestinations.map((destination) => (
              <li key={destination.href}>
                <a
                  className={buttonClass("secondary", "max-w-full whitespace-normal text-center")}
                  href={destination.href}
                >
                  {t(destination.label)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </section>
  );
}
