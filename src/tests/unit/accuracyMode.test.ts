import { describe, expect, it } from "vitest";

import {
  accuracyModeSourceParam,
  createAccuracyModeSettings
} from "@/features/drills/accuracyMode";
import type { DrillSettings } from "@/lib/domain";

describe("Accuracy mode", () => {
  it("builds beginner-friendly untimed defaults with instant feedback", () => {
    expect(accuracyModeSourceParam).toBe("accuracy_mode");
    expect(createAccuracyModeSettings()).toMatchObject({
      categories: ["arithmetic"],
      difficulty: "beginner",
      feedbackMode: "instant",
      questionCount: 5,
      secondsPerQuestion: undefined,
      timeMode: "untimed",
      totalSessionSeconds: undefined
    });
  });

  it("preserves content overrides while removing timer state", () => {
    const overrides: Partial<DrillSettings> = {
      categories: ["business_math"],
      difficulty: "intermediate",
      feedbackMode: "end_of_session",
      questionCount: 20,
      questionPackId: "accuracy-pack",
      secondsPerQuestion: 45,
      tags: ["margin"],
      timeMode: "per_question",
      totalSessionSeconds: 900
    };

    const settings = createAccuracyModeSettings(overrides);

    expect(settings).toMatchObject({
      categories: ["business_math"],
      difficulty: "intermediate",
      feedbackMode: "instant",
      questionCount: 20,
      questionPackId: "accuracy-pack",
      secondsPerQuestion: undefined,
      tags: ["margin"],
      timeMode: "untimed",
      totalSessionSeconds: undefined
    });
  });
});
