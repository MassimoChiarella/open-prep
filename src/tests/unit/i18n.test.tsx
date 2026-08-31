import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { I18nProvider, LanguageSelect, useI18n } from "@/features/i18n/I18nProvider";
import {
  localePreferenceStorageKey,
  matchLocale,
  mergeCatalogs,
  translate
} from "@/features/i18n/i18n";

const originalLanguages = Object.getOwnPropertyDescriptor(window.navigator, "languages");

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  setSystemLanguages(["en"]);
});

afterAll(() => {
  if (originalLanguages === undefined) delete (window.navigator as { languages?: readonly string[] }).languages;
  else Object.defineProperty(window.navigator, "languages", originalLanguages);
});

describe("locale matching and translation", () => {
  it("matches regional, script, and fallback language tags", () => {
    expect(matchLocale(["es-MX"])).toBe("es");
    expect(matchLocale(["zh_TW"])).toBe("zh-Hant");
    expect(matchLocale(["zh-CN"])).toBe("zh-Hans");
    expect(matchLocale(["xx", "fr-CA"])).toBe("fr");
    expect(matchLocale(["xx"])).toBe("en");
  });

  it("merges catalogs, interpolates variables, and falls back to the English source", () => {
    const catalog = mergeCatalogs({
      en: { "Hello, {name}": "Hello, {name}" },
      fr: { "Hello, {name}": "Bonjour, {name}" }
    });

    expect(translate(catalog, "fr", "Hello, {name}", { name: "Ari" })).toBe("Bonjour, Ari");
    expect(translate(catalog, "de", "Hello, {name}", { name: "Ari" })).toBe("Hello, Ari");
    expect(translate(catalog, "ja", "Unknown message")).toBe("Unknown message");
    expect(translate(catalog, "fr", "constructor")).toBe("constructor");
  });
});

describe("I18nProvider", () => {
  it("renders safely before browser preferences are read", () => {
    window.localStorage.setItem(localePreferenceStorageKey, "ar");
    expect(renderToString(<I18nProvider><LanguageSelect /></I18nProvider>)).toContain("Auto (English)");
  });

  it("restores a persisted preference and updates document language and direction", async () => {
    window.localStorage.setItem(localePreferenceStorageKey, "ar");
    render(<I18nProvider><LocaleProbe /></I18nProvider>);

    await waitFor(() => expect(screen.getByTestId("locale")).toHaveTextContent("ar|ar"));
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("lang", "ar");
      expect(document.documentElement).toHaveAttribute("dir", "rtl");
    });
  });

  it("auto-detects the best navigator language and follows system changes", async () => {
    setSystemLanguages(["zh-TW", "en"]);
    render(<I18nProvider><LocaleProbe /><LanguageSelect /></I18nProvider>);

    await waitFor(() => expect(screen.getByTestId("locale")).toHaveTextContent("auto|zh-Hant"));
    expect(screen.getByRole("option", { name: "自動（繁體中文）" })).toBeInTheDocument();

    setSystemLanguages(["fr-CA"]);
    fireEvent(window, new Event("languagechange"));
    await waitFor(() => expect(screen.getByTestId("locale")).toHaveTextContent("auto|fr"));
    expect(document.documentElement).toHaveAttribute("lang", "fr");
  });

  it("persists selector changes and exposes an accessible localized label", async () => {
    setSystemLanguages(["en"]);
    render(<I18nProvider><LanguageSelect /></I18nProvider>);
    const select = screen.getByRole("combobox", { name: "Language" });

    expect(select).toHaveValue("auto");
    expect(screen.getAllByRole("option")).toHaveLength(11);
    fireEvent.change(select, { target: { value: "ar" } });

    await waitFor(() => expect(document.documentElement).toHaveAttribute("dir", "rtl"));
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBe("ar");
    expect(screen.getByRole("combobox", { name: "اللغة" })).toHaveValue("ar");
  });

  it("lets the selector use the available narrow-header width", () => {
    render(<I18nProvider><LanguageSelect /></I18nProvider>);

    const select = screen.getByRole("combobox", { name: "Language" });

    expect(select).toHaveClass("min-w-0", "w-full", "sm:w-44");
    expect(select.closest("label")).toHaveClass("min-w-0", "flex-1", "sm:flex-none");
  });

  it("formats numbers, percentages, dates, and durations with the resolved locale", () => {
    setSystemLanguages(["en"]);
    render(<I18nProvider><FormattingProbe /></I18nProvider>);

    expect(screen.getByTestId("number")).toHaveTextContent("1,234.5");
    expect(screen.getByTestId("percent")).toHaveTextContent("13%");
    expect(screen.getByTestId("date")).toHaveTextContent("Jan 2, 2026");
    expect(screen.getByTestId("duration")).toHaveTextContent("1m 30s");
  });
});

function LocaleProbe() {
  const { locale, preference } = useI18n();
  return <output data-testid="locale">{preference}|{locale}</output>;
}

function FormattingProbe() {
  const { formatDate, formatDuration, formatNumber, formatPercent } = useI18n();
  return (
    <>
      <output data-testid="number">{formatNumber(1234.5)}</output>
      <output data-testid="percent">{formatPercent(0.125)}</output>
      <output data-testid="date">
        {formatDate(new Date("2026-01-02T00:00:00Z"), { dateStyle: "medium", timeZone: "UTC" })}
      </output>
      <output data-testid="duration">{formatDuration(90)}</output>
    </>
  );
}

function setSystemLanguages(languages: readonly string[]): void {
  Object.defineProperty(window.navigator, "languages", {
    configurable: true,
    value: languages
  });
}
