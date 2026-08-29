import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import { generateQuestionsFromTemplates } from "@/features/questions/questionGenerator";
import type { DrillSession, DrillSettings, Question, QuestionTemplate } from "@/lib/domain";

import { createDrillSettings } from "@/features/drills/drillSettings";

export interface CreateDrillSessionOptions {
  settings?: Partial<DrillSettings>;
  seed: string | number;
  startedAt?: string;
  sessionId?: string;
  templates?: readonly QuestionTemplate[];
}

export interface CreatedDrillSession {
  session: DrillSession;
  questions: Question[];
}

export function createDrillSession(options: CreateDrillSessionOptions): CreatedDrillSession {
  const settings = createDrillSettings(options.settings);
  validateDrillSettings(settings);

  const questions = generateQuestionsFromTemplates(options.templates ?? starterQuestionTemplates, settings, options.seed);
  const startedAt = options.startedAt ?? new Date().toISOString();
  const sessionId = options.sessionId ?? buildSessionId(options.seed, startedAt);

  return {
    session: {
      id: sessionId,
      startedAt,
      settings,
      questionIds: questions.map((question) => question.id),
      responses: []
    },
    questions
  };
}

function validateDrillSettings(settings: DrillSettings): void {
  if (settings.categories.length === 0) {
    throw new Error("A drill session requires at least one category.");
  }

  if (!Number.isInteger(settings.questionCount) || settings.questionCount <= 0) {
    throw new Error("A drill session requires a positive whole-number question count.");
  }

  if (settings.questionCount > 50) {
    throw new Error("A drill session supports up to 50 questions.");
  }

  if (
    settings.arithmeticTermCount !== undefined &&
    ![2, 3, 4, 5].includes(settings.arithmeticTermCount)
  ) {
    throw new Error("Arithmetic drills support between 2 and 5 terms.");
  }

  if (settings.timeMode === "per_question" && !isPositiveNumber(settings.secondsPerQuestion)) {
    throw new Error("Timed-per-question drills require positive secondsPerQuestion.");
  }

  if (settings.timeMode === "session" && !isPositiveNumber(settings.totalSessionSeconds)) {
    throw new Error("Session-timed drills require positive totalSessionSeconds.");
  }
}

function isPositiveNumber(value: number | undefined): boolean {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

function buildSessionId(seed: string | number, startedAt: string): string {
  const safeSeed = String(seed).replace(/[^A-Za-z0-9_-]/g, "_");
  const safeStartedAt = startedAt.replace(/[^A-Za-z0-9]/g, "");
  return `drill-${safeSeed}-${safeStartedAt}`;
}
