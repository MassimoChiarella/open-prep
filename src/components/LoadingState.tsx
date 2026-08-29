"use client";

import { cx, panelClass, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";

interface LoadingStateProps {
  detail?: string;
  label: string;
  testId?: string;
}

export function LoadingState({ detail, label, testId }: LoadingStateProps) {
  const { t } = useI18n();

  return (
    <section
      aria-atomic="true"
      aria-live="polite"
      className={panelClass("default", "grid gap-3")}
      data-testid={testId}
      role="status"
    >
      <div className="grid gap-1">
        <p className={uiText.bodyStrong}>{t(label)}</p>
        {detail !== undefined ? <p className={uiText.body}>{t(detail)}</p> : null}
      </div>
      <div aria-hidden="true" className="grid gap-2">
        <span className={cx(skeletonClass, "w-3/4")} />
        <span className={cx(skeletonClass, "w-1/2")} />
      </div>
    </section>
  );
}

const skeletonClass = "block h-3 rounded-full bg-ink/10";
