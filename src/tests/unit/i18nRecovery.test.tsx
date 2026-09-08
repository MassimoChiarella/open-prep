import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { I18nProvider, LanguageSelect, useI18n } from "@/features/i18n/I18nProvider";
import { localePreferenceStorageKey } from "@/features/i18n/i18n";
import spanishMessages from "@/features/i18n/locales/es";

afterEach(() => {
  window.localStorage.clear();
});

describe("I18nProvider locale recovery", () => {
  it("allows the same locale to be selected again after a transient load failure", async () => {
    window.localStorage.setItem(localePreferenceStorageKey, "es");
    const loadLocale = vi.fn()
      .mockRejectedValueOnce(new Error("Injected locale load failure."))
      .mockResolvedValue(spanishMessages);
    render(<I18nProvider loadLocale={loadLocale}><LanguageSelect /><LocaleProbe /></I18nProvider>);

    await waitFor(() => expect(screen.getByTestId("locale-probe")).toHaveTextContent("auto|en"));
    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), { target: { value: "es" } });

    await waitFor(() => expect(screen.getByTestId("locale-probe")).toHaveTextContent("es|es"));
    expect(loadLocale).toHaveBeenCalledTimes(2);
  });
});

function LocaleProbe() {
  const { locale, preference } = useI18n();
  return <output data-testid="locale-probe">{preference}|{locale}</output>;
}
