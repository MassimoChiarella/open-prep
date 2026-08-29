import { describe, expect, it } from "vitest";

import {
  createQuickFireModeSettings,
  quickFireModeSourceParam
} from "@/features/drills/quickFireMode";
import type { DrillSettings } from "@/lib/domain";

describe("Quick Fire mode", () => {
  it("builds speed-oriented defaults", () => {
    expect(quickFireModeSourceParam).toBe("quick_fire_mode");
    expect(createQuickFireModeSettings()).toMatchObject({
      categories: ["arithmetic"],
      difficulty: "beginner",
      feedbackMode: "instant",
      questionCount: 10,
      secondsPerQuestion: 20,
      timeMode: "per_question",
      totalSessionSeconds: undefined
    });
  });

  it("preserves supported overrides while enforcing mode timing and feedback", () => {
    const overrides: Partial<DrillSettings> = {
      categories: ["percentages"],
      difficulty: "advanced",
      feedbackMode: "retry_first",
      questionCount: 24,
      questionPackId: "speed-pack",
      secondsPerQuestion: 15,
      tags: ["percentage_change"],
      timeMode: "session",
      totalSessionSeconds: 600
    };

    const settings = createQuickFireModeSettings(overrides);

    expect(settings).toMatchObject({
      categories: ["percentages"],
      difficulty: "advanced",
      feedbackMode: "instant",
      questionCount: 24,
      questionPackId: "speed-pack",
      secondsPerQuestion: 15,
      tags: ["percentage_change"],
      timeMode: "per_question",
      totalSessionSeconds: undefined
    });
  });

  it("clamps question counts and timer values to supported bounds", () => {
    expect(createQuickFireModeSettings({ questionCount: 3, secondsPerQuestion: 1 })).toMatchObject({
      questionCount: 10,
      secondsPerQuestion: 5
    });
    expect(createQuickFireModeSettings({ questionCount: 99, secondsPerQuestion: 500 })).toMatchObject({
      questionCount: 30,
      secondsPerQuestion: 120
    });
    expect(createQuickFireModeSettings({ questionCount: 18.9, secondsPerQuestion: 12.8 })).toMatchObject({
      questionCount: 18,
      secondsPerQuestion: 12
    });
    expect(createQuickFireModeSettings({ questionCount: Number.NaN, secondsPerQuestion: Infinity })).toMatchObject({
      questionCount: 10,
      secondsPerQuestion: 20
    });
  });
});
