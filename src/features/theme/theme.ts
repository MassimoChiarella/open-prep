export const themePreferenceStorageKey = "consulting_math_theme_preference";
export const themePreferences = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof themePreferences)[number];

export function isThemePreference(value: string | null): value is ThemePreference {
  return value !== null && themePreferences.includes(value as ThemePreference);
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";

  try {
    const value = window.localStorage.getItem(themePreferenceStorageKey);
    return isThemePreference(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function applyThemePreference(preference: ThemePreference): void {
  if (typeof document === "undefined") return;

  if (preference === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.dataset.theme = preference;
  }
}

export function saveThemePreference(preference: ThemePreference): void {
  applyThemePreference(preference);

  try {
    window.localStorage.setItem(themePreferenceStorageKey, preference);
  } catch {
    // The preference still applies for this session when storage is unavailable.
  }
}

export const themeInitializationScript = `(()=>{try{const preference=localStorage.getItem("${themePreferenceStorageKey}");if(preference==="light"||preference==="dark")document.documentElement.dataset.theme=preference}catch{}})();`;
