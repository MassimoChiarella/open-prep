"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { cx, uiInputs } from "@/components/uiStyles";
import {
  type Locale,
  type LocalePreference,
  type Messages,
  type PartialMessageCatalog,
  isLocalePreference,
  languageNameKeys,
  localeDirection,
  localePreferenceStorageKey,
  locales,
  matchLocale,
  translate,
  type TranslationVariables
} from "@/features/i18n/i18n";
import englishMessages from "@/features/i18n/locales/en";

interface I18nContextValue {
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatDuration: (totalSeconds: number) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (value: number, options?: Intl.NumberFormatOptions) => string;
  locale: Locale;
  preference: LocalePreference;
  setPreference: (preference: LocalePreference) => void;
  t: (message: string, variables?: TranslationVariables) => string;
}

const fallbackLocale: Locale = "en";
const fallbackCatalog: PartialMessageCatalog = { en: englishMessages };
const localeLoaders = {
  ar: () => import("@/features/i18n/locales/ar"),
  de: () => import("@/features/i18n/locales/de"),
  es: () => import("@/features/i18n/locales/es"),
  fr: () => import("@/features/i18n/locales/fr"),
  hi: () => import("@/features/i18n/locales/hi"),
  ja: () => import("@/features/i18n/locales/ja"),
  pt: () => import("@/features/i18n/locales/pt"),
  "zh-Hans": () => import("@/features/i18n/locales/zh-Hans"),
  "zh-Hant": () => import("@/features/i18n/locales/zh-Hant")
} satisfies Record<Exclude<Locale, "en">, () => Promise<{ default: Messages }>>;
const I18nContext = createContext<I18nContextValue>({
  formatDate: (value, options) =>
    new Intl.DateTimeFormat(fallbackLocale, options).format(value instanceof Date ? value : new Date(value)),
  formatDuration: (totalSeconds) => formatLocalizedDuration(fallbackCatalog, fallbackLocale, totalSeconds),
  formatNumber: (value, options) => new Intl.NumberFormat(fallbackLocale, options).format(value),
  formatPercent: (value, options) =>
    new Intl.NumberFormat(fallbackLocale, { maximumFractionDigits: 0, style: "percent", ...options }).format(value),
  locale: fallbackLocale,
  preference: "auto",
  setPreference: () => undefined,
  t: (message, variables) => translate(fallbackCatalog, fallbackLocale, message, variables)
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LocalePreference>("auto");
  const [locale, setLocale] = useState<Locale>("en");
  const [requestedLocale, setRequestedLocale] = useState<Locale>("en");
  const [messages, setMessages] = useState<PartialMessageCatalog>(fallbackCatalog);
  const [initialized, setInitialized] = useState(false);
  const requestLocale = useCallback((nextLocale: Locale) => {
    setRequestedLocale(nextLocale);
    if (nextLocale === "en") {
      setMessages(fallbackCatalog);
      setLocale("en");
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedPreference = readStoredPreference();
      setPreferenceState(storedPreference);
      requestLocale(storedPreference === "auto" ? matchLocale(systemLanguages()) : storedPreference);
      setInitialized(true);
    });

    return () => window.clearTimeout(timeoutId);
  }, [requestLocale]);

  useEffect(() => {
    let current = true;

    if (requestedLocale === "en") {
      return undefined;
    }

    void localeLoaders[requestedLocale]().then(({ default: localizedMessages }) => {
      if (!current) return;
      setMessages({ en: englishMessages, [requestedLocale]: localizedMessages });
      setLocale(requestedLocale);
    }).catch(() => {
      if (!current) return;
      setMessages(fallbackCatalog);
      setLocale("en");
    });

    return () => {
      current = false;
    };
  }, [requestedLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirection(locale);
  }, [locale]);

  useEffect(() => {
    if (!initialized || preference !== "auto") return;

    const handleLanguageChange = () => requestLocale(matchLocale(systemLanguages()));
    window.addEventListener("languagechange", handleLanguageChange);
    return () => window.removeEventListener("languagechange", handleLanguageChange);
  }, [initialized, preference, requestLocale]);

  const setPreference = useCallback((nextPreference: LocalePreference) => {
    setPreferenceState(nextPreference);
    requestLocale(nextPreference === "auto" ? matchLocale(systemLanguages()) : nextPreference);
    try {
      window.localStorage.setItem(localePreferenceStorageKey, nextPreference);
    } catch {
      // The preference still applies for this session when storage is unavailable.
    }
  }, [requestLocale]);

  const t = useCallback(
    (message: string, variables?: TranslationVariables) => translate(messages, locale, message, variables),
    [locale, messages]
  );
  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, options).format(value),
    [locale]
  );
  const formatPercent = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, { maximumFractionDigits: 0, style: "percent", ...options }).format(value),
    [locale]
  );
  const formatDate = useCallback(
    (value: Date | number | string, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, options).format(value instanceof Date ? value : new Date(value)),
    [locale]
  );
  const formatDuration = useCallback(
    (totalSeconds: number) => formatLocalizedDuration(messages, locale, totalSeconds),
    [locale, messages]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ formatDate, formatDuration, formatNumber, formatPercent, locale, preference, setPreference, t }),
    [formatDate, formatDuration, formatNumber, formatPercent, locale, preference, setPreference, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export function LanguageSelect() {
  const { locale, preference, setPreference, t } = useI18n();

  return (
    <label className="inline-flex min-h-11 min-w-0 flex-1 items-center gap-2 text-sm font-medium text-ink/75 sm:flex-none">
      <span className="hidden sm:inline">{t("Language")}</span>
      <select
        aria-label={t("Language")}
        className={cx(uiInputs.compact, "min-w-0 w-full sm:w-44")}
        onChange={(event) => setPreference(event.currentTarget.value as LocalePreference)}
        value={preference}
      >
        <option value="auto">{t("Auto ({language})", { language: t(languageNameKeys[locale]) })}</option>
        {locales.map((optionLocale) => (
          <option key={optionLocale} value={optionLocale}>
            {t(languageNameKeys[optionLocale])}
          </option>
        ))}
      </select>
    </label>
  );
}

function readStoredPreference(): LocalePreference {
  try {
    const value = window.localStorage.getItem(localePreferenceStorageKey);
    return isLocalePreference(value) ? value : "auto";
  } catch {
    return "auto";
  }
}

function systemLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  return navigator.languages.length > 0 ? navigator.languages : [navigator.language];
}

function formatLocalizedDuration(catalog: PartialMessageCatalog, locale: Locale, totalSeconds: number): string {
  const roundedSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;
  const numberFormat = new Intl.NumberFormat(locale);
  return seconds === 0
    ? translate(catalog, locale, "{minutes} min", { minutes: numberFormat.format(minutes) })
    : translate(catalog, locale, "{minutes}m {seconds}s", {
        minutes: numberFormat.format(minutes),
        seconds: numberFormat.format(seconds)
      });
}
