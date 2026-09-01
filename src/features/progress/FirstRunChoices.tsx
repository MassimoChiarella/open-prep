"use client";

import Link from "next/link";
import { useId } from "react";

import { buttonClass, cx, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";

interface FirstRunChoice {
  description: string;
  href: string;
  label: string;
}

interface FirstRunChoicesProps {
  showContentPacksAction: boolean;
}

const primaryChoices: readonly FirstRunChoice[] = [
  {
    description: "Set your goals and turn them into a focused weekly roadmap.",
    href: "/case-practice/plan/",
    label: "Build my prep plan"
  },
  {
    description: "Measure your current interview math skills and see where to focus next.",
    href: "/benchmark/",
    label: "Take a baseline"
  },
  {
    description: "Choose a case skill or full simulation to practice now.",
    href: "/case-practice/",
    label: "Practice a specific skill"
  }
];

const contentPacksChoice: FirstRunChoice = {
  description: "Discover shared practice packs or build and import your own.",
  href: "/content-packs/?view=discover",
  label: "Find or create a content pack"
};

export function FirstRunChoices({ showContentPacksAction }: FirstRunChoicesProps) {
  const { t } = useI18n();
  const headingId = useId();
  const choices = showContentPacksAction
    ? [...primaryChoices, contentPacksChoice]
    : primaryChoices;

  return (
    <section
      aria-labelledby={headingId}
      className="grid min-w-0 max-w-full gap-6"
      data-testid="first-run-choices"
    >
      <div className="grid min-w-0 max-w-3xl gap-2">
        <p className={cx(uiText.eyebrow, "text-coral")}>{t("First Run")}</p>
        <h2 className={uiText.sectionTitle} id={headingId}>
          {t("Choose how to start")}
        </h2>
        <p className={cx(uiText.body, "min-w-0 max-w-2xl break-words [overflow-wrap:anywhere]")}>
          {t("Choose one starting point, or continue directly to practice.")}
        </p>
      </div>

      <ul className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        {choices.map((choice) => {
          const descriptionId = `${headingId}-${choice.label.replaceAll(" ", "-").toLowerCase()}-description`;

          return (
            <li className="min-w-0 max-w-full" key={choice.href}>
              <Link
                aria-describedby={descriptionId}
                aria-label={t(choice.label)}
                className="group grid h-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 border border-ink/15 bg-white p-4 text-start transition-colors hover:bg-mint/45 focus-visible:z-10 focus-visible:bg-mint/45"
                href={choice.href}
              >
                <span className={cx(uiText.subsectionTitle, "min-w-0 break-words [overflow-wrap:anywhere]")}>
                  {t(choice.label)}
                </span>
                <span
                  aria-hidden="true"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-teal/30 bg-mint/70 text-base text-teal transition-transform group-hover:border-teal group-hover:bg-white rtl:rotate-180"
                  data-testid="first-run-choice-arrow"
                >
                  &rarr;
                </span>
                <span
                  className={cx(uiText.body, "col-span-full min-w-0 break-words [overflow-wrap:anywhere]")}
                  id={descriptionId}
                >
                  {t(choice.description)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        className={buttonClass(
          "secondary",
          "max-w-full whitespace-normal text-start [overflow-wrap:anywhere]"
        )}
        href="/drills/"
      >
        {t("Skip for now and browse drills")}
      </Link>
    </section>
  );
}
