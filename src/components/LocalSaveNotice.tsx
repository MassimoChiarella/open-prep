"use client";

import { cx, statusMessageClass, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";

type LocalSaveNoticeTone = "error" | "neutral" | "success";

interface LocalSaveNoticeProps {
  detail: string;
  label?: string;
  tone?: LocalSaveNoticeTone;
}

export function LocalSaveNotice({
  detail,
  label = "Saved On This Device",
  tone = "success"
}: LocalSaveNoticeProps) {
  const { t } = useI18n();

  return (
    <div aria-atomic="true" aria-live="polite" className={statusMessageClass(tone)} role="status">
      <p className={cx(uiText.eyebrow, "text-xs text-ink/65")}>{t(label)}</p>
      <p className={cx(uiText.bodyStrong, "mt-1")}>{t(detail)}</p>
    </div>
  );
}
