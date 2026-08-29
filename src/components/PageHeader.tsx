"use client";

import Link from "next/link";

import { buttonClass, cx, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";

interface PageHeaderAction {
  documentNavigation?: boolean;
  href: string;
  label: string;
}

interface PageHeaderProps {
  action?: PageHeaderAction;
  description: string;
  eyebrow: string;
  title: string;
}

export function PageHeader({ action, description, eyebrow, title }: PageHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="grid min-w-0 overflow-hidden border-y border-ink/20 bg-white lg:grid-cols-12">
      <div className="grid min-w-0 gap-5 px-5 py-7 sm:px-7 sm:py-9 lg:col-span-7">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="font-mono text-xs font-semibold text-ink/45">
            01
          </span>
          <span aria-hidden="true" className="h-px w-8 bg-coral" />
          <p className={cx(uiText.eyebrow, "text-teal")}>{t(eyebrow)}</p>
        </div>
        <h1 className={cx(uiText.pageTitle, "break-words [overflow-wrap:anywhere]")}>{t(title)}</h1>
      </div>
      <div className="grid min-w-0 content-between gap-6 border-t border-ink/15 px-5 py-7 sm:px-7 lg:col-span-5 lg:border-s lg:border-t-0">
        <p className={cx(uiText.pageDescription, "min-w-0 max-w-md break-words")}>{t(description)}</p>
        {action !== undefined ? (
          action.documentNavigation ? (
            <a className={buttonClass("primary", "shrink-0")} href={action.href}>
              {t(action.label)}
            </a>
          ) : (
            <Link className={buttonClass("primary", "shrink-0")} href={action.href}>
              {t(action.label)}
            </Link>
          )
        ) : null}
      </div>
    </header>
  );
}
