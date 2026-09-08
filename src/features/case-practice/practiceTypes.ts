export type PracticeModuleId =
  | "brainstorming"
  | "fit"
  | "full_case"
  | "lessons"
  | "questioning"
  | "structuring"
  | "synthesis";

export interface PracticeAttemptRecord {
  id: string;
  kind: "attempt";
  module: PracticeModuleId;
  itemId: string;
  completedAt: string;
  score: number;
  maxScore: number;
  durationSeconds?: number;
  timingAccommodation?: import("@/features/timing/timingAccommodation").TimingAccommodation;
}

export type PrepExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface PrepProfileRecord {
  id: "prep-profile";
  kind: "prep_profile";
  experienceLevel: PrepExperienceLevel;
  interviewDate?: string;
  targetFirms: string[];
  weeklySessions: number;
  updatedAt: string;
}

export type FitCompetency = "conflict" | "failure" | "impact" | "leadership";

export interface FitStoryRecord {
  id: string;
  kind: "fit_story";
  competency: FitCompetency;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
  updatedAt: string;
}

export interface FullCaseDraftRecord {
  id: string;
  kind: "full_case_draft";
  simulationId: string;
  contentKey: string;
  updatedAt: string;
  startedAt: string;
  completedAt?: string;
  locale: string;
  stage: number;
  questions: Array<{ id: string; text: string }>;
  includeQuestionRanking: boolean;
  hypothesisId: string;
  branchIds: string[];
  calculationInput: string;
  ideaIds: string[];
  priorityIdeaIds: string[];
  synthesis: Partial<import("@/features/case-practice/synthesis/synthesisScoring").SynthesisResponse>;
}

export type PracticeRecord = FitStoryRecord | PracticeAttemptRecord | PrepProfileRecord | FullCaseDraftRecord;
