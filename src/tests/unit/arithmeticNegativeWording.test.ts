import { describe, expect, it } from "vitest";

import { createDrillSession } from "@/features/drills/sessionFactory";

describe("negative starting-number setting", () => {
  it.each(["integer", "decimal"] as const)("allows negative mixed-operation answers with nonnegative %s operands", (numberFormat) => {
    const { questions, session } = createDrillSession({
      seed: "negative-starting-number-wording",
      settings: {
        arithmeticAllowNegatives: false,
        arithmeticMixedOperators: ["subtraction"],
        arithmeticNumberFormat: numberFormat,
        arithmeticTermCount: 3,
        categories: ["arithmetic"],
        questionCount: 10,
        tags: ["mixed_operations"]
      }
    });

    expect(session.settings.arithmeticAllowNegatives).toBe(false);
    expect(questions.some((question) => question.answer.value < 0)).toBe(true);
    for (const question of questions) {
      const operands = Object.values(question.metadata?.variables ?? {}).filter((value) => typeof value === "number");
      expect(operands).toHaveLength(3);
      expect(operands.every((value) => typeof value === "number" && value >= 0)).toBe(true);
    }
  });
});
