import { describe, expect, it } from "vitest";

import {
  buildWeaknessModeDrillHref,
  createWeaknessModeDrillSession,
  weaknessModeSourceParam
} from "@/features/drills/weaknessMode";
import type { SkillCategory, SkillTag } from "@/lib/domain";
import type { StoredUserResponse } from "@/lib/storage/appStorageTypes";

describe("Weakness Mode", () => {
  it("builds a bounded drill URL", () => {
    const defaultUrl = new URL(buildWeaknessModeDrillHref(), "http://localhost");
    const minimumUrl = new URL(buildWeaknessModeDrillHref(0), "http://localhost");
    const maximumUrl = new URL(buildWeaknessModeDrillHref(25), "http://localhost");

    expect(defaultUrl.pathname).toBe("/drills/session");
    expect(defaultUrl.searchParams.get("source")).toBe(weaknessModeSourceParam);
    expect(defaultUrl.searchParams.get("count")).toBe("5");
    expect(minimumUrl.searchParams.get("count")).toBe("1");
    expect(maximumUrl.searchParams.get("count")).toBe("10");
  });

  it("creates an untimed instant-feedback drill for the weakest focus", () => {
    const created = createWeaknessModeDrillSession(
      [
        ...Array.from({ length: 10 }, (_, index) =>
          response(`addition-miss-${index + 1}`, "arithmetic", false, 30, ["addition"])
        ),
        response("percent-hit", "percentages", true, 10, ["percentage_change"])
      ],
      {
        questionCount: 3,
        seed: "weak-focus",
        sessionId: "weak-session",
        startedAt: "2026-08-09T12:00:00.000Z"
      }
    );

    expect(created.session).toMatchObject({
      id: "weak-session",
      settings: {
        categories: ["arithmetic"],
        feedbackMode: "instant",
        questionCount: 3,
        tags: ["addition"],
        timeMode: "untimed"
      },
      startedAt: "2026-08-09T12:00:00.000Z"
    });
    expect(created.questions).toHaveLength(3);
    expect(created.questions.every((question) => question.category === "arithmetic")).toBe(true);
    expect(created.questions.every((question) => question.tags.includes("addition"))).toBe(true);
  });

  it("falls back to the weak category when its recorded tag has no matching templates", () => {
    const created = createWeaknessModeDrillSession(
      Array.from({ length: 10 }, (_, index) =>
        response(`growth-tag-${index + 1}`, "business_math", false, 40, ["simple_growth"])
      ),
      { questionCount: 3, seed: "category-fallback" }
    );

    expect(created.session.settings.categories).toEqual(["business_math"]);
    expect(created.session.settings.tags).toBeUndefined();
    expect(created.questions).toHaveLength(3);
    expect(created.questions.every((question) => question.category === "business_math")).toBe(true);
  });

  it("rejects missing or unusable history", () => {
    expect(() => createWeaknessModeDrillSession([], { seed: "empty" })).toThrow(
      "Weakness Mode requires usable practice history."
    );
    expect(() =>
      createWeaknessModeDrillSession(
        [response("unsupported", "market_sizing", false, 30)],
        { seed: "unsupported" }
      )
    ).toThrow("Weakness Mode requires usable practice history.");
    expect(() =>
      createWeaknessModeDrillSession(
        Array.from({ length: 9 }, (_, index) =>
          response(`under-evidenced-${index + 1}`, "arithmetic", false, 30, ["addition"])
        ),
        { seed: "under-evidenced" }
      )
    ).toThrow("Weakness Mode requires usable practice history.");
  });

  it("generates the same session from the same seed and metadata", () => {
    const responses = Array.from({ length: 10 }, (_, index) =>
      response(`division-miss-${index + 1}`, "arithmetic", false, 25, ["division"])
    );
    const options = {
      questionCount: 5,
      seed: "repeatable",
      sessionId: "repeatable-session",
      startedAt: "2026-08-09T12:00:00.000Z"
    } as const;

    expect(createWeaknessModeDrillSession(responses, options)).toEqual(
      createWeaknessModeDrillSession(responses, options)
    );
  });
});

function response(
  id: string,
  category: SkillCategory,
  isCorrect: boolean,
  timeTakenSeconds: number,
  tags?: SkillTag[]
): StoredUserResponse {
  return {
    category,
    errorTypes: isCorrect ? ["none"] : ["arithmetic_error"],
    id,
    isCorrect,
    questionId: id,
    rawInput: isCorrect ? "10" : "9",
    sessionId: "session-1",
    submittedAt: "2026-08-09T12:00:00.000Z",
    tags,
    timeTakenSeconds
  };
}
