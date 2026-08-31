import type { DrillSettings } from "@/lib/domain";

export const defaultDrillSettings: DrillSettings = {
  categories: ["arithmetic"],
  difficulty: "beginner",
  questionCount: 5,
  timeMode: "untimed",
  feedbackMode: "instant"
};

export function createDrillSettings(overrides: Partial<DrillSettings> = {}): DrillSettings {
  const settings: DrillSettings = {
    ...defaultDrillSettings,
    ...overrides,
    categories: overrides.categories ?? defaultDrillSettings.categories,
    tags: overrides.tags
  };

  if (hasActiveRemainderDivision(settings)) {
    settings.arithmeticAllowNegatives = false;
  }

  return settings;
}

export function hasActiveRemainderDivision(
  settings: Pick<DrillSettings, "arithmeticDivisionMode" | "categories" | "tags">
): boolean {
  return settings.arithmeticDivisionMode === "remainder" &&
    settings.categories.includes("arithmetic") &&
    (settings.tags === undefined || settings.tags.includes("division"));
}
