import { calculateSessionScore } from "@/features/scoring/scoringEngine";
import type { DrillSession, Question } from "@/lib/domain";

export interface CompleteDrillSessionOptions {
  session: DrillSession;
  questions: readonly Question[];
  endedAt?: string;
}

export function completeDrillSession(options: CompleteDrillSessionOptions): DrillSession {
  return {
    ...options.session,
    endedAt: options.endedAt ?? new Date().toISOString(),
    score: calculateSessionScore(options.session, options.questions)
  };
}
