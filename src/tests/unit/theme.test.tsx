import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { I18nProvider } from "@/features/i18n/I18nProvider";
import { ThemePreferenceSelect } from "@/features/theme/ThemePreferenceSelect";
import {
  readStoredThemePreference,
  themePreferenceStorageKey
} from "@/features/theme/theme";

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("theme preference", () => {
  it("falls back to the system preference when storage is missing or invalid", () => {
    expect(readStoredThemePreference()).toBe("system");

    window.localStorage.setItem(themePreferenceStorageKey, "sepia");
    expect(readStoredThemePreference()).toBe("system");
  });

  it("restores, applies, and persists the accessible theme selector", async () => {
    window.localStorage.setItem(themePreferenceStorageKey, "dark");
    render(
      <I18nProvider>
        <ThemePreferenceSelect />
      </I18nProvider>
    );

    const select = screen.getByRole("combobox", { name: "Theme" });

    await waitFor(() => expect(select).toHaveValue("dark"));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "System",
      "Light",
      "Dark"
    ]);

    fireEvent.change(select, { target: { value: "light" } });
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(window.localStorage.getItem(themePreferenceStorageKey)).toBe("light");

    fireEvent.change(select, { target: { value: "system" } });
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(window.localStorage.getItem(themePreferenceStorageKey)).toBe("system");
  });
});
