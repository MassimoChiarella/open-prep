import { describe, expect, it } from "vitest";

import { marketSizingTemplates } from "@/data/marketSizing/marketSizingTemplates";
import { evaluateMarketSizingDraft } from "@/features/market-sizing/marketSizingEvaluation";
import { persistMarketSizingAttempt } from "@/features/market-sizing/marketSizingPersistence";
import { scoreMarketSizingAttempt } from "@/features/market-sizing/marketSizingScoring";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("market sizing persistence", () => {
  it("persists a scored attempt record", async () => {
    const storage = new MemoryAppStorage();
    const template = marketSizingTemplates[0];
    const stepValues = {
      population: "3000000",
      coffee_drinker_rate: "60%",
      cups_per_day: "1",
      purchase_days_per_year: "365",
      price_per_cup: "$4",
      sense_check: true
    };
    const evaluation = evaluateMarketSizingDraft({ finalAnswer: "$2.628B", stepValues, template });
    const score = scoreMarketSizingAttempt({
      evaluation,
      interpretationId: "plausible",
      stepValues,
      template
    });

    await persistMarketSizingAttempt({
      completedAt: "2026-06-02T12:05:00.000Z",
      evaluation,
      finalAnswer: "  $2.628B  ",
      id: "attempt-1",
      interpretationId: "plausible",
      score,
      startedAt: "2026-06-02T12:00:00.000Z",
      stepValues,
      storage,
      template
    });

    const record = (await storage.getAll("market_sizing_attempts"))[0];

    expect(record).toMatchObject({
      calculatedValue: 2_628_000_000,
      completedAt: "2026-06-02T12:05:00.000Z",
      errorTypes: ["none"],
      finalAnswer: "$2.628B",
      id: "attempt-1",
      inputValues: { population: "3000000", sense_check: true },
      interpretationId: "plausible",
      maxScore: 100,
      normalizedFinalAnswer: 2_628_000_000,
      score: 100,
      startedAt: "2026-06-02T12:00:00.000Z",
      templateId: "market_coffee_city_001"
    });
    expect(record.scoreBreakdown).toHaveLength(6);
  });

  it("refuses to persist an attempt whose formula did not calculate", async () => {
    const storage = new MemoryAppStorage();
    const template = {
      ...marketSizingTemplates[0],
      finalFormula: { ...marketSizingTemplates[0].finalFormula, expression: "population / cupsPerDay" }
    };
    const stepValues = {
      population: "3000000",
      coffee_drinker_rate: "60%",
      cups_per_day: "0",
      purchase_days_per_year: "365",
      price_per_cup: "$4",
      sense_check: true
    };
    const evaluation = evaluateMarketSizingDraft({ finalAnswer: "$1B", stepValues, template });
    const score = scoreMarketSizingAttempt({ evaluation, stepValues, template });

    await expect(persistMarketSizingAttempt({
      evaluation,
      score,
      startedAt: "2026-06-02T12:00:00.000Z",
      stepValues,
      storage,
      template
    })).rejects.toThrow("cannot be saved until its formula calculates successfully");
    expect(storage.peekAll("market_sizing_attempts")).toEqual([]);
  });
});
