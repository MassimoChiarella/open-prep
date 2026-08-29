import type { DrillSettings } from "@/lib/domain";

export const defaultDrillSettings: DrillSettings = {
  categories: ["arithmetic"],
  difficulty: "beginner",
  questionCount: 5,
  timeMode: "untimed",
  feedbackMode: "instant"
};

export function createDrillSettings(overrides: Partial<DrillSettings> = {}): DrillSettings {
  return {
    ...defaultDrillSettings,
    ...overrides,
    categories: overrides.categories ?? defaultDrillSettings.categories,
    tags: overrides.tags
  };
}
