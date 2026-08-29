import { describe, expect, it } from "vitest";

import {
  calculateElapsedSeconds,
  calculateRemainingSeconds,
  createTimerSnapshot,
  formatSeconds,
  getTimeLimitSeconds
} from "@/features/drills/drillTimer";
import { createDrillSettings } from "@/features/drills/drillSettings";

describe("drill timer helpers", () => {
  it("formats elapsed time for untimed drills", () => {
    const settings = createDrillSettings({ timeMode: "untimed" });

    expect(getTimeLimitSeconds(settings)).toBeUndefined();
    expect(
      createTimerSnapshot({
        settings,
        nowMs: 12_400,
        questionStartedAtMs: 1_000,
        sessionStartedAtMs: 0
      })
    ).toEqual({
      elapsedSeconds: 11,
      isExpired: false,
      label: "0:11"
    });
  });

  it("counts down per-question timers from the active question start", () => {
    const settings = createDrillSettings({
      timeMode: "per_question",
      secondsPerQuestion: 30
    });

    expect(
      createTimerSnapshot({
        settings,
        nowMs: 15_900,
        questionStartedAtMs: 5_000,
        sessionStartedAtMs: 0
      })
    ).toEqual({
      elapsedSeconds: 10,
      isExpired: false,
      label: "0:20",
      limitSeconds: 30,
      remainingSeconds: 20
    });
  });

  it("marks timed drills expired when no time remains", () => {
    const settings = createDrillSettings({
      timeMode: "session",
      totalSessionSeconds: 120
    });

    expect(
      createTimerSnapshot({
        settings,
        nowMs: 125_000,
        questionStartedAtMs: 100_000,
        sessionStartedAtMs: 0
      })
    ).toMatchObject({
      elapsedSeconds: 125,
      isExpired: true,
      label: "0:00",
      remainingSeconds: 0
    });
  });

  it("calculates and formats timer primitives", () => {
    expect(calculateElapsedSeconds(1_000, 3_900)).toBe(2);
    expect(calculateRemainingSeconds(10, 15)).toBe(0);
    expect(formatSeconds(125)).toBe("2:05");
  });
});
