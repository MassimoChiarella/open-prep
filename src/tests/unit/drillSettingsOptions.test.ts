import { describe, expect, it } from "vitest";

import { buildDrillSettingsQuery } from "@/features/drills/drillSettingsOptions";
import { buildDrillSessionSeed, parseDrillSettingsQuery } from "@/features/drills/drillSessionQuery";
import { createDrillSettings } from "@/features/drills/drillSettings";
import { createDrillSession } from "@/features/drills/sessionFactory";

describe("drill settings options", () => {
  it("serializes drill settings for the session route without external state", () => {
    const query = buildDrillSettingsQuery(
      createDrillSettings({
        categories: ["arithmetic", "percentages"],
        tags: ["addition", "percentage_of_number"],
        questionCount: 8,
        timeMode: "per_question",
        secondsPerQuestion: 45,
        feedbackMode: "retry_first"
      })
    );

    expect(Object.fromEntries(new URLSearchParams(query))).toEqual({
      categories: "arithmetic,percentages",
      difficulty: "beginner",
      count: "8",
      timeMode: "per_question",
      feedbackMode: "retry_first",
      tags: "addition,percentage_of_number",
      secondsPerQuestion: "45"
    });
  });

  it("parses serialized drill settings for deterministic local session creation", () => {
    const query = buildDrillSettingsQuery(
      createDrillSettings({
        categories: ["arithmetic", "percentages"],
        tags: ["addition", "percentage_of_number"],
        questionCount: 3,
        timeMode: "session",
        totalSessionSeconds: 240,
        feedbackMode: "end_of_session"
      })
    );

    const parsed = parseDrillSettingsQuery(new URLSearchParams(query));

    expect(parsed).toEqual({
      warnings: [],
      settings: createDrillSettings({
        categories: ["arithmetic", "percentages"],
        tags: ["addition", "percentage_of_number"],
        questionCount: 3,
        timeMode: "session",
        totalSessionSeconds: 240,
        feedbackMode: "end_of_session"
      })
    });
    expect(buildDrillSessionSeed(parsed.settings)).toBe(
      "session:arithmetic-percentages:addition-percentage_of_number:beginner:3:session:end_of_session"
    );
  });

  it("varies normal session nonces while preserving explicit-seed reproducibility", () => {
    const settings = createDrillSettings({
      categories: ["arithmetic"],
      questionCount: 5,
      tags: ["addition", "subtraction"]
    });
    const firstSeed = buildDrillSessionSeed(settings, 0);
    const secondSeed = buildDrillSessionSeed(settings, 1);
    const firstQuestions = createDrillSession({ seed: firstSeed, settings }).questions;
    const secondQuestions = createDrillSession({ seed: secondSeed, settings }).questions;

    expect(firstSeed).not.toBe(secondSeed);
    expect(firstQuestions).not.toEqual(secondQuestions);
    expect(createDrillSession({ seed: firstSeed, settings }).questions).toEqual(firstQuestions);
    expect(buildDrillSessionSeed(settings, "debug-seed")).toBe(
      buildDrillSessionSeed(settings, "debug-seed")
    );
  });

  it("round-trips granular arithmetic, hints, units, and custom counts", () => {
    const settings = createDrillSettings({
      arithmeticAllowNegatives: true,
      arithmeticNumberFormat: "decimal",
      arithmeticOperandSize: "large",
      arithmeticTermCount: 4,
      arithmeticMultiplicationStyle: "multiple_25",
      arithmeticDivisionMode: "approximate",
      arithmeticDivisionRounding: "nearest_whole",
      arithmeticMixedOperators: ["addition", "division"],
      arithmeticUseParentheses: false,
      hintsEnabled: true,
      questionCount: 37,
      unitPreference: "m"
    });
    const query = buildDrillSettingsQuery(settings);

    expect(parseDrillSettingsQuery(new URLSearchParams(query))).toEqual({ settings, warnings: [] });
    expect(Object.fromEntries(new URLSearchParams(query))).toMatchObject({
      count: "37",
      hints: "1",
      negatives: "1",
      multiplicationStyle: "multiple_25",
      divisionMode: "approximate",
      divisionRounding: "nearest_whole",
      operators: "addition,division",
      parentheses: "0",
      numberFormat: "decimal",
      operandSize: "large",
      terms: "4",
      unit: "m"
    });
  });

  it("continues to accept legacy custom question counts", () => {
    expect(parseDrillSettingsQuery(new URLSearchParams({ count: "3" })).settings.questionCount).toBe(3);
    expect(parseDrillSettingsQuery(new URLSearchParams({ count: "8" })).settings.questionCount).toBe(8);
  });

  it("normalizes stale negative settings before creating remainder questions", () => {
    const settings = createDrillSettings({
      arithmeticAllowNegatives: true,
      arithmeticDivisionMode: "remainder",
      categories: ["arithmetic"],
      questionCount: 5,
      tags: ["division"]
    });
    const created = createDrillSession({ seed: "non-negative-remainders", settings });

    expect(settings.arithmeticAllowNegatives).toBe(false);
    expect(created.session.settings.arithmeticAllowNegatives).toBe(false);
    expect(created.questions).toHaveLength(5);
    expect(
      created.questions
        .flatMap((question) => Object.values(question.metadata?.variables ?? {}))
        .every((value) => typeof value !== "number" || value >= 0)
    ).toBe(true);

    expect(createDrillSettings({
      arithmeticAllowNegatives: true,
      arithmeticDivisionMode: "remainder",
      categories: ["arithmetic"],
      tags: ["addition"]
    }).arithmeticAllowNegatives).toBe(true);
  });

  it("round-trips case filters and Interview Math requirements", () => {
    const settings = createDrillSettings({
      caseCalculationStepCount: 5,
      caseIndustry: "insurance",
      caseRequireEquationSetup: false,
      caseRequireInterpretation: true,
      categories: ["case_math"],
      difficulty: "expert"
    });
    const query = buildDrillSettingsQuery(settings);
    const parsed = parseDrillSettingsQuery(new URLSearchParams(query));

    expect(parsed).toEqual({ settings, warnings: [] });
    expect(Object.fromEntries(new URLSearchParams(query))).toMatchObject({
      caseIndustry: "insurance",
      caseSteps: "5",
      requireEquation: "0",
      requireInterpretation: "1"
    });
    expect(buildDrillSessionSeed(settings)).toContain(
      "case-industry-insurance:case-steps-5:case-equation-optional:case-interpretation-required"
    );
  });

  it("round-trips an installed question-pack source", () => {
    const settings = createDrillSettings({
      categories: ["business_math"],
      difficulty: "intermediate",
      questionCount: 5,
      questionPackId: "company-case-prep"
    });
    const query = buildDrillSettingsQuery(settings);
    const params = new URLSearchParams(query);
    const parsed = parseDrillSettingsQuery(params);

    expect(params.get("source")).toBe("question_pack");
    expect(params.get("pack")).toBe("company-case-prep");
    expect(parsed.settings.questionPackId).toBe("company-case-prep");
    expect(buildDrillSessionSeed(parsed.settings)).toContain(":company-case-prep");
  });

  it("falls back from unsupported query values without throwing", () => {
    const parsed = parseDrillSettingsQuery(
      new URLSearchParams({
        categories: "arithmetic,unknown",
        count: "99",
        difficulty: "wizard",
        feedbackMode: "silent"
      })
    );

    expect(parsed.settings).toMatchObject({
      categories: ["arithmetic"],
      difficulty: "beginner",
      questionCount: 50,
      feedbackMode: "instant"
    });
    expect(parsed.warnings).toEqual([
      "Ignored unsupported category: unknown.",
      "Used default difficulty; unsupported value was wizard.",
      "Capped question count at 50.",
      "Used default feedback mode; unsupported value was silent."
    ]);
  });
});
