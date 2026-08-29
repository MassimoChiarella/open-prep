import { createDrillSettings } from "@/features/drills/drillSettings";
import type { DrillSettings } from "@/lib/domain";

export const quickFireModeSourceParam = "quick_fire_mode";

const defaultQuestionCount = 10;
const defaultSecondsPerQuestion = 20;

export function createQuickFireModeSettings(
  overrides: Partial<DrillSettings> = {}
): DrillSettings {
  return createDrillSettings({
    ...overrides,
    feedbackMode: "instant",
    questionCount: clampWholeNumber(overrides.questionCount, defaultQuestionCount, 10, 30),
    secondsPerQuestion: clampWholeNumber(
      overrides.secondsPerQuestion,
      defaultSecondsPerQuestion,
      5,
      120
    ),
    timeMode: "per_question",
    totalSessionSeconds: undefined
  });
}

function clampWholeNumber(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(minimum, Math.min(maximum, Math.trunc(value)));
}
