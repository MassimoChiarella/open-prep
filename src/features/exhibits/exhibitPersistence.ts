import type { ExhibitDataset, ExhibitQuestionSpec } from "@/features/exhibits/exhibitTypes";
import {
  normalizeTimingAccommodation,
  type TimingAccommodation
} from "@/features/timing/timingAccommodation";
import type { ValidationResult } from "@/lib/validation/validateAnswer";
import type { AppStorage, ExhibitAttemptRecord } from "@/lib/storage/appStorageTypes";

export interface PersistExhibitAttemptOptions {
  completedAt?: string;
  dataset: ExhibitDataset;
  id?: string;
  question: ExhibitQuestionSpec;
  rawInput: string;
  startedAt: string;
  storage: AppStorage;
  timingAccommodation?: TimingAccommodation;
  validation: ValidationResult;
}

export async function persistExhibitAttempt(options: PersistExhibitAttemptOptions): Promise<void> {
  const completedAt = options.completedAt ?? new Date().toISOString();
  const record: ExhibitAttemptRecord = {
    id: options.id ?? `exhibit-attempt-${options.dataset.id}-${options.question.id}-${Date.parse(completedAt)}`,
    exhibitId: options.dataset.id,
    questionId: options.question.id,
    startedAt: options.startedAt,
    completedAt,
    correctValue: options.validation.correctValue,
    errorTypes: options.validation.errorTypes,
    feedbackMessage: options.validation.feedbackMessage,
    isCorrect: options.validation.isCorrect,
    normalizedValue: options.validation.normalizedUserValue,
    rawInput: options.rawInput.trim(),
    score: options.validation.isCorrect ? 100 : 0,
    timingAccommodation: normalizeTimingAccommodation(options.timingAccommodation)
  };

  await options.storage.put("exhibit_attempts", record);
}
