import { render, waitFor } from "@testing-library/react";
import { type ReactElement, useEffect } from "react";

import { I18nProvider, useI18n } from "@/features/i18n/I18nProvider";
import {
  type Locale,
  type LocalePreference,
  localePreferenceStorageKey
} from "@/features/i18n/i18n";

type NonEnglishLocale = Exclude<Locale, "en">;
interface LocaleState {
  locale: Locale;
  preference: LocalePreference;
}

const localeWaitTimeout = 4_000;

export function renderWithStoredLocale(ui: ReactElement, locale: NonEnglishLocale) {
  window.localStorage.setItem(localePreferenceStorageKey, locale);
  const control = renderWithI18n(ui);

  return {
    initialize: () => control.waitForLocale(locale, locale)
  };
}

export function renderWithI18n(ui: ReactElement) {
  let state: LocaleState | undefined;
  render(
    <I18nProvider>
      <LocaleReadinessProbe onChange={(nextState) => { state = nextState; }} />
      {ui}
    </I18nProvider>
  );

  return {
    waitForLocale: (locale: Locale, preference: LocalePreference = locale) => waitFor(() => {
      if (state?.locale !== locale || state.preference !== preference) {
        throw new Error(`Expected locale state ${preference}|${locale}; received ${state?.preference ?? "unmounted"}|${state?.locale ?? "unmounted"}.`);
      }
    }, { timeout: localeWaitTimeout })
  };
}

export function resetI18nTestState() {
  window.localStorage.removeItem(localePreferenceStorageKey);
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
}

function LocaleReadinessProbe({
  onChange
}: {
  onChange: (state: LocaleState) => void;
}) {
  const { locale, preference } = useI18n();

  useEffect(() => {
    onChange({ locale, preference });
  }, [locale, onChange, preference]);

  return null;
}
