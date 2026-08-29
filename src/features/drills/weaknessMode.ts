import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import { createDrillSession, type CreatedDrillSession } from "@/features/drills/sessionFactory";
import { getEligibleQuestionTemplates } from "@/features/questions/templateSelection";
import { deriveWeaknessDrillSettings } from "@/features/progress/weaknessAnalysis";
import type { StoredUserResponse } from "@/lib/storage/appStorageTypes";

export const weaknessModeSourceParam = "weakness_mode";

export interface CreateWeaknessModeDrillSessionOptions {
  questionCount?: number;
  seed: string | number;
  sessionId?: string;
  startedAt?: string;
}

export function buildWeaknessModeDrillHref(questionCount = 5): string {
  const params = new URLSearchParams({
    count: String(normalizeQuestionCount(questionCount)),
    source: weaknessModeSourceParam
  });

  return `/drills/session?${params.toString()}`;
}

export function createWeaknessModeDrillSession(
  responses: readonly StoredUserResponse[],
  options: CreateWeaknessModeDrillSessionOptions
): CreatedDrillSession {
  const derivedSettings = deriveWeaknessDrillSettings(responses);

  if (derivedSettings === undefined) {
    throw new Error("Weakness Mode requires usable practice history.");
  }

  const focusedSettings = {
    ...derivedSettings,
    questionCount: normalizeQuestionCount(options.questionCount)
  };
  const settings =
    focusedSettings.tags !== undefined &&
    getEligibleQuestionTemplates(starterQuestionTemplates, focusedSettings).length === 0
      ? { ...focusedSettings, tags: undefined }
      : focusedSettings;

  return createDrillSession({
    seed: options.seed,
    sessionId: options.sessionId,
    settings,
    startedAt: options.startedAt
  });
}

function normalizeQuestionCount(questionCount: number | undefined): number {
  if (questionCount === undefined || !Number.isFinite(questionCount)) {
    return 5;
  }

  return Math.max(1, Math.min(10, Math.trunc(questionCount)));
}
