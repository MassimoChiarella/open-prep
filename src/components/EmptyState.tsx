"use client";

import Link from "next/link";

import { buttonClass, cx, panelClass, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";

interface EmptyStateAction {
  href: string;
  label: string;
}

interface EmptyStateProps {
  action?: EmptyStateAction;
  description: string;
  secondaryAction?: EmptyStateAction;
  title: string;
  tone?: "error" | "neutral";
}

export function EmptyState({
  action,
  description,
  secondaryAction,
  title,
  tone = "neutral"
}: EmptyStateProps) {
  const { t } = useI18n();

  return (
    <section
      className={panelClass(tone === "error" ? "danger" : "default", "grid gap-4")}
      data-testid="empty-state"
    >
      <div className="grid gap-2">
        <h2 className={uiText.sectionTitle}>{t(title)}</h2>
        <p className={cx(uiText.body, "max-w-2xl")}>{t(description)}</p>
      </div>
      {action !== undefined || secondaryAction !== undefined ? (
        <div className="flex flex-wrap gap-3">
          {action !== undefined ? (
            <Link className={buttonClass("primary")} href={action.href}>
              {t(action.label)}
            </Link>
          ) : null}
          {secondaryAction !== undefined ? (
            <Link className={buttonClass("secondary")} href={secondaryAction.href}>
              {t(secondaryAction.label)}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
