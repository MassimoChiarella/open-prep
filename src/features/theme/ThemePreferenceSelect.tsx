"use client";

import { useEffect, useState } from "react";

import { uiInputs } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  applyThemePreference,
  isThemePreference,
  readStoredThemePreference,
  saveThemePreference,
  type ThemePreference
} from "@/features/theme/theme";

export function ThemePreferenceSelect() {
  const { t } = useI18n();
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedPreference = readStoredThemePreference();
      setPreference(storedPreference);
      applyThemePreference(storedPreference);
    });

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <label className="grid max-w-sm gap-2 text-sm font-medium text-ink/80">
      {t("Theme")}
      <select
        aria-label={t("Theme")}
        className={uiInputs.compact}
        onChange={(event) => {
          const nextPreference = event.currentTarget.value;

          if (!isThemePreference(nextPreference)) return;

          setPreference(nextPreference);
          saveThemePreference(nextPreference);
        }}
        value={preference}
      >
        <option value="system">{t("System")}</option>
        <option value="light">{t("Light")}</option>
        <option value="dark">{t("Dark")}</option>
      </select>
    </label>
  );
}
