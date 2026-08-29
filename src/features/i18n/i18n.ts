export const locales = ["en", "es", "fr", "de", "pt", "zh-Hans", "zh-Hant", "ja", "ar", "hi"] as const;

export type Locale = (typeof locales)[number];
export type LocalePreference = Locale | "auto";
export type Messages = Record<string, string>;
export type MessageCatalog = Record<Locale, Messages>;
export type PartialMessageCatalog = Partial<Record<Locale, Messages>>;
export type TranslationVariables = Record<string, string | number>;

export const defaultLocale: Locale = "en";
export const localePreferenceStorageKey = "consulting_math_locale_preference";

const localeSet = new Set<string>(locales);

export function isLocale(value: string): value is Locale {
  return localeSet.has(value);
}

export function isLocalePreference(value: string | null): value is LocalePreference {
  return value === "auto" || (value !== null && isLocale(value));
}

export function matchLocale(languageTags: readonly string[] | undefined): Locale {
  for (const languageTag of languageTags ?? []) {
    const normalized = languageTag.trim().replaceAll("_", "-");
    if (normalized === "") continue;

    const canonical = canonicalizeLocale(normalized);
    if (canonical !== undefined) return canonical;
  }

  return defaultLocale;
}

export function localeDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function mergeCatalogs(...catalogs: readonly PartialMessageCatalog[]): MessageCatalog {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      Object.assign({}, ...catalogs.map((catalog) => catalog[locale] ?? {}))
    ])
  ) as MessageCatalog;
}

export function translate(
  catalog: MessageCatalog,
  locale: Locale,
  message: string,
  variables: TranslationVariables = {}
): string {
  const template = catalog[locale][message] ?? catalog.en[message] ?? message;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : match
  );
}

function canonicalizeLocale(languageTag: string): Locale | undefined {
  try {
    const locale = new Intl.Locale(languageTag).maximize();

    if (locale.language === "zh") return locale.script === "Hant" ? "zh-Hant" : "zh-Hans";
    return isLocale(locale.language) ? locale.language : undefined;
  } catch {
    return undefined;
  }
}
