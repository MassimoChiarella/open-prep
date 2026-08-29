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

export type PracticeRecord = FitStoryRecord | PracticeAttemptRecord | PrepProfileRecord;
