import type { MarketSizingEvaluation, MarketSizingStepValueMap } from "@/features/market-sizing/marketSizingEvaluation";
import { hasSavedMarketSizingNote } from "@/features/market-sizing/marketSizingNote";
import type { MarketSizingAttemptScore } from "@/features/market-sizing/marketSizingScoring";
import type { MarketSizingTemplate } from "@/features/market-sizing/marketSizingTypes";
import type { AppStorage, MarketSizingAttemptRecord } from "@/lib/storage/appStorageTypes";
import { assertNumericInput } from "@/lib/validation/inputLimits";

export interface PersistMarketSizingAttemptOptions {
  completedAt?: string;
  evaluation: MarketSizingEvaluation;
  finalAnswer?: string;
  id?: string;
  interpretationId?: string;
  note?: string;
  score: MarketSizingAttemptScore;
  startedAt: string;
  storage: AppStorage;
  stepValues: MarketSizingStepValueMap;
  template: MarketSizingTemplate;
}

export async function persistMarketSizingAttempt(options: PersistMarketSizingAttemptOptions): Promise<void> {
  assertNumericInput(options.finalAnswer ?? "");
  for (const step of options.template.inputSteps) {
    const value = options.stepValues[step.id];
    if (["currency", "integer", "number", "percentage"].includes(step.inputKind) && typeof value === "string") {
      assertNumericInput(value);
    }
  }
  if (options.evaluation.calculatedValue === undefined || options.evaluation.calculationError !== undefined) {
    throw new Error("A market-sizing attempt cannot be saved until its formula calculates successfully.");
  }

  const completedAt = options.completedAt ?? new Date().toISOString();
  const record: MarketSizingAttemptRecord = {
    id: options.id ?? `market-sizing-attempt-${options.template.id}-${Date.parse(completedAt)}`,
    templateId: options.template.id,
    startedAt: options.startedAt,
    completedAt,
    calculatedValue: options.evaluation.calculatedValue,
    errorTypes: options.score.errorTypes,
    finalAnswer: normalizeOptionalText(options.finalAnswer),
    inputValues: { ...options.stepValues },
    interpretationId: normalizeOptionalText(options.interpretationId),
    maxScore: options.score.maxScore,
    normalizedFinalAnswer: options.evaluation.finalAnswer.normalizedValue,
    ...(hasSavedMarketSizingNote(options.note) ? { note: options.note } : {}),
    score: options.score.totalScore,
    scoreBreakdown: options.score.breakdown.map((dimension) => ({
      awardedPoints: dimension.awardedPoints,
      id: dimension.id,
      label: dimension.label,
      maxPoints: dimension.maxPoints,
      message: dimension.message
    }))
  };

  await options.storage.put("market_sizing_attempts", record);
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}
