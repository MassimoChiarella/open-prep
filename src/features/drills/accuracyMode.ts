import { createDrillSettings } from "@/features/drills/drillSettings";
import type { DrillSettings } from "@/lib/domain";

export const accuracyModeSourceParam = "accuracy_mode";

export function createAccuracyModeSettings(
  overrides: Partial<DrillSettings> = {}
): DrillSettings {
  return createDrillSettings({
    ...overrides,
    feedbackMode: "instant",
    secondsPerQuestion: undefined,
    timeMode: "untimed",
    totalSessionSeconds: undefined
  });
}
