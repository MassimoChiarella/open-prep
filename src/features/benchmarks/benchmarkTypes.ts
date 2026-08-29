import type { Difficulty, DrillSettings, Question } from "@/lib/domain";

export type BenchmarkId = string;

export type BenchmarkScoreLabel = "developing" | "excellent" | "needs_work" | "strong";

export interface BenchmarkScoreBand {
  label: BenchmarkScoreLabel;
  minAccuracy: number;
  title: string;
}

export interface BenchmarkTest {
  description: string;
  difficulty: Difficulty;
  id: BenchmarkId;
  questions: Question[];
  scoreBands: readonly BenchmarkScoreBand[];
  settings: DrillSettings;
  title: string;
}
