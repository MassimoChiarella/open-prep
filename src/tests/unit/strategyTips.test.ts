import { describe, expect, it } from "vitest";

import {
  fallbackStrategyTip,
  resolveStrategyTip,
  strategyTipCatalog
} from "@/features/drills/strategyTips";
import type { ErrorType, SkillTag } from "@/lib/domain";

describe("resolveStrategyTip", () => {
  it.each([
    ["percentage_point_error", "percentage-points"],
    ["magnitude_error", "magnitude"],
    ["rounding_error", "rounding"],
    ["unit_error", "unit-conversion"],
    ["formula_error", "formula"],
    ["setup_error", "setup"],
    ["interpretation_error", "interpretation"]
  ] satisfies [ErrorType, string][])('resolves the "%s" error', (errorType, expectedId) => {
    expect(resolveStrategyTip({ errorTypes: [errorType], tags: [] }).id).toBe(expectedId);
  });

  it.each([
    ["percentage_points", "percentage-points"],
    ["k_m_b_conversion", "magnitude"],
    ["weighted_average", "weighted-average"],
    ["margin", "margin"],
    ["contribution_margin", "margin"],
    ["breakeven", "breakeven"],
    ["unit_conversion", "unit-conversion"]
  ] satisfies [SkillTag, string][])('resolves the "%s" skill tag', (tag, expectedId) => {
    expect(resolveStrategyTip({ errorTypes: [], tags: [tag] }).id).toBe(expectedId);
  });

  it("uses ordered errors before tags", () => {
    expect(
      resolveStrategyTip({
        errorTypes: ["setup_error", "formula_error"],
        tags: ["weighted_average"]
      }).id
    ).toBe("setup");
  });

  it("skips unsupported errors before using the first matching tag", () => {
    expect(
      resolveStrategyTip({
        errorTypes: ["none", "arithmetic_error"],
        tags: ["breakeven", "margin"]
      }).id
    ).toBe("breakeven");
  });

  it("returns the stable generic fallback when nothing matches", () => {
    expect(resolveStrategyTip({ errorTypes: [], tags: [] })).toBe(fallbackStrategyTip);
    expect(resolveStrategyTip({ errorTypes: ["arithmetic_error"], tags: ["addition"] })).toBe(
      fallbackStrategyTip
    );
  });

  it("does not mutate error or tag order", () => {
    const errorTypes = Object.freeze<ErrorType[]>(["rounding_error", "magnitude_error"]);
    const tags = Object.freeze<SkillTag[]>(["margin", "breakeven"]);

    resolveStrategyTip({ errorTypes, tags });

    expect(errorTypes).toEqual(["rounding_error", "magnitude_error"]);
    expect(tags).toEqual(["margin", "breakeven"]);
  });

  it("keeps catalog ids unique", () => {
    const ids = strategyTipCatalog.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
