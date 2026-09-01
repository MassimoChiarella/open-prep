import { describe, expect, it } from "vitest";

import { createDrillSession } from "@/features/drills/sessionFactory";
import { createDrillSettings, defaultDrillSettings } from "@/features/drills/drillSettings";

describe("createDrillSettings", () => {
  it("creates default beginner arithmetic drill settings", () => {
    expect(defaultDrillSettings).toMatchObject({
      categories: ["arithmetic"],
      difficulty: "beginner",
      questionCount: 5,
      timingAccommodation: "standard",
      timeMode: "untimed",
      feedbackMode: "instant"
    });
  });

  it("merges explicit overrides without mutating defaults", () => {
    const settings = createDrillSettings({
      categories: ["percentages"],
      tags: ["percentage_of_number"],
      questionCount: 3,
      feedbackMode: "retry_first"
    });

    expect(settings).toMatchObject({
      categories: ["percentages"],
      tags: ["percentage_of_number"],
      questionCount: 3,
      feedbackMode: "retry_first"
    });
    expect(defaultDrillSettings).not.toHaveProperty("tags");
  });
});

describe("createDrillSession", () => {
  it("creates a deterministic session and question queue", () => {
    const first = createDrillSession({
      seed: "session-001",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 3 }
    });
    const second = createDrillSession({
      seed: "session-001",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 3 }
    });

    expect(first).toEqual(second);
    expect(first.session).toMatchObject({
      id: "drill-session-001-20260602T000000000Z",
      startedAt: "2026-06-02T00:00:00.000Z",
      responses: []
    });
    expect(first.session.questionIds).toEqual(first.questions.map((question) => question.id));
    expect(first.questions).toHaveLength(3);
  });

  it("uses explicit session ids when provided", () => {
    const created = createDrillSession({
      seed: "seed",
      sessionId: "custom-session",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 1 }
    });

    expect(created.session.id).toBe("custom-session");
  });

  it("validates invalid settings before creating a session", () => {
    expect(() => createDrillSession({ seed: "bad", settings: { categories: [] } })).toThrow(
      "A drill session requires at least one category."
    );
    expect(() => createDrillSession({ seed: "bad", settings: { questionCount: 0 } })).toThrow(
      "A drill session requires a positive whole-number question count."
    );
    expect(() =>
      createDrillSession({ seed: "bad", settings: { timeMode: "per_question", secondsPerQuestion: 0 } })
    ).toThrow("Timed-per-question drills require positive secondsPerQuestion.");
    expect(() =>
      createDrillSession({ seed: "bad", settings: { timeMode: "session", totalSessionSeconds: 0 } })
    ).toThrow("Session-timed drills require positive totalSessionSeconds.");
  });
});
