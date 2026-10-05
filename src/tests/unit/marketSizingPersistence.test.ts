import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { marketSizingTemplates } from "@/data/marketSizing/marketSizingTemplates";
import { evaluateMarketSizingDraft } from "@/features/market-sizing/marketSizingEvaluation";
import { persistMarketSizingAttempt } from "@/features/market-sizing/marketSizingPersistence";
import { scoreMarketSizingAttempt } from "@/features/market-sizing/marketSizingScoring";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";
import { deleteQuestionPack, saveQuestionPack, toQuestionPackMarketSizingTemplates, validateQuestionPackPayload } from "@/features/question-packs/questionPack";
import { createLocalProgressExport, replaceLocalProgressWithImport } from "@/features/settings/localProgressExport";
import { createCompleteBackupFilesFromStorage, restoreCompleteBackupFiles } from "@/features/settings/completeBackupStorage";
import { clearPersonalData, previewPersonalDataClear } from "@/features/settings/personalDataClear";

describe("market sizing persistence", () => {
  it.each(["Private analogy for adoption", "123"])("classifies a shipped cookbook note %j through persistence, exports, restore and clearing after pack removal", async (note) => {
    const result = validateQuestionPackPayload(JSON.parse(readFileSync("public/question-pack-market-sizing-cookbook.mathdrill.json", "utf8")));
    if (result.status !== "valid") throw new Error(result.errors.join("\n"));
    if (result.pack.kind !== "market_sizing") throw new Error("Expected the shipped sizing cookbook.");
    const storage = new MemoryAppStorage();
    await saveQuestionPack(storage, result.pack);
    const template = toQuestionPackMarketSizingTemplates(result.pack)[0];
    const stepValues = {
      "eligible-households": "500000", "household-adoption": "10%", "annual-pickups": "8", "pickup-fee": "$6",
      "demand-rationale": note
    };
    const evaluation = evaluateMarketSizingDraft({ template, stepValues, finalAnswer: "$2.4M" });
    const score = scoreMarketSizingAttempt({ template, stepValues, evaluation, interpretationId: "compare-household-spend" });
    await persistMarketSizingAttempt({
      template, stepValues, evaluation, score, interpretationId: "compare-household-spend", finalAnswer: "$2.4M",
      id: "cookbook-private-attempt", startedAt: "2026-10-04T12:00:00.000Z", completedAt: "2026-10-04T12:05:00.000Z", storage
    });
    const saved = await storage.get("market_sizing_attempts", "cookbook-private-attempt");
    expect(saved).toMatchObject({ noteInputIds: ["demand-rationale"], score: 100, calculatedValue: 2_400_000 });
    await deleteQuestionPack(storage, result.pack.id);
    expect(storage.peekAll("question_packs")).toEqual([]);
    expect((await previewPersonalDataClear(storage)).marketSizingNotes).toBe(1);
    const standard = await createLocalProgressExport(storage);
    expect(standard.stores.market_sizing_attempts[0].inputValues).toEqual({
      "eligible-households": "500000", "household-adoption": "10%", "annual-pickups": "8", "pickup-fee": "$6"
    });
    const publicFiles = await createCompleteBackupFilesFromStorage(storage);
    const privateFiles = await createCompleteBackupFilesFromStorage(storage, { selectedOptionalScopes: ["private_text"] });
    const target = new MemoryAppStorage();
    await restoreCompleteBackupFiles(target, publicFiles);
    expect((await target.get("market_sizing_attempts", "cookbook-private-attempt"))?.inputValues?.["demand-rationale"]).toBeUndefined();
    await restoreCompleteBackupFiles(target, privateFiles);
    expect((await target.get("market_sizing_attempts", "cookbook-private-attempt"))?.inputValues?.["demand-rationale"]).toBe(note);
    await restoreCompleteBackupFiles(target, publicFiles);
    await replaceLocalProgressWithImport(target, standard);
    expect((await target.get("market_sizing_attempts", "cookbook-private-attempt"))?.inputValues?.["demand-rationale"]).toBe(note);
    await clearPersonalData(target);
    expect((await target.get("market_sizing_attempts", "cookbook-private-attempt"))?.inputValues).toEqual(standard.stores.market_sizing_attempts[0].inputValues);
    expect((await target.get("market_sizing_attempts", "cookbook-private-attempt"))?.score).toBe(100);
    expect((await previewPersonalDataClear(target)).marketSizingNotes).toBe(0);
  });

  it.each([undefined, "", " \n\t ", "  Explain the assumption.  "])("persists a scored attempt with note %j", async (note) => {
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
      note,
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
      noteInputIds: [],
      interpretationId: "plausible",
      maxScore: 100,
      normalizedFinalAnswer: 2_628_000_000,
      score: 100,
      startedAt: "2026-06-02T12:00:00.000Z",
      templateId: "market_coffee_city_001"
    });
    expect(record.scoreBreakdown).toHaveLength(6);
    if (note?.trim()) expect(record.note).toBe(note);
    else expect(Object.hasOwn(record, "note")).toBe(false);
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
