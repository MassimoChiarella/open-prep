"use client";

import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { badgeClass, buttonClass, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";

export interface CasePracticeHubModule {
  description: string;
  href: string;
  label: string;
  meta: string;
}

interface CasePracticeHubProps {
  action?: { href: string; label: string };
  description?: string;
  eyebrow?: string;
  modules?: readonly CasePracticeHubModule[];
  summary?: string;
  title?: string;
}

const builtInModules = [
  {
    description: "Ask focused clarifying and diagnostic questions, then compare them with an authored rubric.",
    href: "/case-practice/questioning",
    label: "Questioning",
    meta: "Opening"
  },
  {
    description: "Build a hypothesis-led issue tree and compare it with a bundled model.",
    href: "/case-practice/structuring",
    label: "Structuring",
    meta: "Opening"
  },
  {
    description: "Generate relevant ideas in themes, then choose what deserves attention first.",
    href: "/case-practice/brainstorming",
    label: "Brainstorming",
    meta: "Exploration"
  },
  {
    description: "Turn case evidence into an answer-first conclusion with risks and next steps.",
    href: "/case-practice/synthesis",
    label: "Synthesis",
    meta: "Closing"
  },
  {
    description: "Review concise methods and worked examples before testing the key idea.",
    href: "/case-practice/lessons",
    label: "Concept Lessons",
    meta: "Learn"
  },
  {
    description: "Build a private story bank and rehearse leadership, conflict, failure, and impact.",
    href: "/case-practice/fit",
    label: "Fit Practice",
    meta: "Behavioral"
  },
  {
    description: "Set an interview target and generate a local weekly preparation sequence.",
    href: "/case-practice/plan",
    label: "Prep Plan",
    meta: "Roadmap"
  },
  {
    description: "Work through a complete case from opening structure to final recommendation.",
    href: "/case-practice/simulation",
    label: "Full Case",
    meta: "Integrated"
  }
] as const;

export function CasePracticeHub({
  action = { href: "/case-practice/plan", label: "Build Prep Plan" },
  description = "Practice the qualitative and communication skills surrounding the quantitative core of a consulting case.",
  eyebrow = "Case Skills",
  modules = builtInModules,
  summary = "Complete one module or combine them in the full-case workflow.",
  title = "Case Practice"
}: CasePracticeHubProps = {}) {
  const { t } = useI18n();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={action === undefined ? undefined : { ...action, label: t(action.label) }}
        description={t(description)}
        eyebrow={t(eyebrow)}
        title={t(title)}
      />

      <section aria-labelledby="case-practice-modules" className="grid gap-5">
        <div className="grid max-w-3xl gap-2 border-b border-ink/20 pb-5">
          <h2 className="text-2xl font-semibold text-ink" id="case-practice-modules">
            {t("Choose a focused skill")}
          </h2>
          <p className={uiText.body}>{t(summary)}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module, index) => (
            <article
              className="group flex min-h-56 flex-col gap-4 border border-ink/15 border-t-2 border-t-teal bg-white p-5 transition-colors hover:bg-mint/20 focus-within:border-teal sm:p-6"
              key={module.href}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={badgeClass("neutral")}>{t(module.meta)}</span>
                <span aria-hidden="true" className="font-mono text-xs font-semibold text-ink/45">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-xl font-semibold tracking-[-0.02em] text-ink">{t(module.label)}</h3>
              <p className={uiText.body}>{t(module.description)}</p>
              <Link className={buttonClass("secondary", "mt-auto gap-3")} href={module.href}>
                <span>{t("Open {module}", { module: t(module.label) })}</span>
                <span aria-hidden="true">
                  <span className="rtl:hidden">→</span>
                  <span className="hidden rtl:inline">←</span>
                </span>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
