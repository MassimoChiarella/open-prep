import { describe, expect, it } from "vitest";

import {
  calculateElapsedSeconds,
  calculateRemainingSeconds,
  createTimerSnapshot,
  formatSeconds,
  getStandardTimeLimitSeconds,
  getTimeLimitSeconds,
  timingAccommodationLabel
} from "@/features/drills/drillTimer";
import { createDrillSettings } from "@/features/drills/drillSettings";
import type { TimingAccommodation } from "@/features/timing/timingAccommodation";

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
      remainingSeconds: 20,
      standardLimitSeconds: 30
    });
  });

  it.each([
    ["standard", 5],
    ["time_and_a_half", 8],
    ["double_time", 10]
  ] satisfies ReadonlyArray<readonly [TimingAccommodation, number]>) (
    "expires %s at the exact adjusted limit and preserves the final second",
    (timingAccommodation, effectiveLimitSeconds) => {
      const settings = createDrillSettings({
        secondsPerQuestion: 5,
        timeMode: "per_question",
        timingAccommodation
      });
      const snapshotAt = (nowMs: number) => createTimerSnapshot({
        nowMs,
        questionStartedAtMs: 0,
        sessionStartedAtMs: 0,
        settings
      });

      expect(getStandardTimeLimitSeconds(settings)).toBe(5);
      expect(getTimeLimitSeconds(settings)).toBe(effectiveLimitSeconds);
      expect(snapshotAt(effectiveLimitSeconds * 1_000 - 1)).toMatchObject({
        isExpired: false,
        label: "0:01",
        remainingSeconds: 1,
        standardLimitSeconds: 5
      });
      expect(snapshotAt(effectiveLimitSeconds * 1_000)).toMatchObject({
        isExpired: true,
        label: "0:00",
        remainingSeconds: 0,
        standardLimitSeconds: 5
      });
    }
  );

  it("keeps an accommodated timed drill running untimed while retaining its authored limit", () => {
    const settings = createDrillSettings({
      secondsPerQuestion: 20,
      timeMode: "per_question",
      timingAccommodation: "untimed"
    });

    expect(getStandardTimeLimitSeconds(settings)).toBe(20);
    expect(getTimeLimitSeconds(settings)).toBeUndefined();
    expect(createTimerSnapshot({
      nowMs: 600_000,
      questionStartedAtMs: 0,
      sessionStartedAtMs: 0,
      settings
    })).toEqual({
      elapsedSeconds: 600,
      isExpired: false,
      label: "10:00",
      standardLimitSeconds: 20
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
    expect(timingAccommodationLabel(undefined)).toBe("Standard time");
    expect(timingAccommodationLabel("untimed")).toBe("Untimed practice");
  });
});
