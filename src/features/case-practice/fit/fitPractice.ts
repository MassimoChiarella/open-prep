import type { FitCompetency, FitStoryRecord } from "@/features/case-practice/practiceTypes";

export interface FitPracticePrompt {
  id: string;
  competency: FitCompetency;
  prompt: string;
  followUps: readonly string[];
}

export interface FitStoryDraft {
  competency: FitCompetency;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
}

export type FitStoryValidationErrors = Partial<Record<keyof FitStoryDraft, string>>;

export const fitCompetencyLabels = {
  leadership: "Leadership",
  conflict: "Conflict",
  failure: "Failure",
  impact: "Impact"
} as const satisfies Record<FitCompetency, string>;

export const fitReviewCriteria = [
  { id: "answer_first", label: "I answered the question directly before adding context." },
  { id: "clear_context", label: "I made the situation and my responsibility clear." },
  { id: "specific_actions", label: "I described specific actions that I personally took." },
  { id: "reasoning", label: "I explained the reasoning behind my choices." },
  { id: "concrete_result", label: "I gave a concrete result or outcome." },
  { id: "reflection", label: "I closed with a candid lesson or reflection." }
] as const;

export type FitReviewCriterionId = (typeof fitReviewCriteria)[number]["id"];

export interface FitReviewScore {
  completedCriteria: FitReviewCriterionId[];
  maxScore: number;
  percentage: number;
  score: number;
}

const fitCompetencies = Object.keys(fitCompetencyLabels) as FitCompetency[];
const storyTextLimits = {
  title: 80,
  situation: 1_200,
  task: 1_200,
  action: 1_200,
  result: 1_200,
  reflection: 1_200
} as const;

export function scoreFitReview(completedCriteria: readonly FitReviewCriterionId[]): FitReviewScore {
  const completed = new Set(completedCriteria);
  const validCriteria = fitReviewCriteria
    .filter((criterion) => completed.has(criterion.id))
    .map((criterion) => criterion.id);
  const maxScore = fitReviewCriteria.length;

  return {
    completedCriteria: validCriteria,
    maxScore,
    percentage: Math.round((validCriteria.length / maxScore) * 100),
    score: validCriteria.length
  };
}

export function validateFitStoryDraft(draft: FitStoryDraft): FitStoryValidationErrors {
  const errors: FitStoryValidationErrors = {};

  if (!fitCompetencies.includes(draft.competency)) {
    errors.competency = "Choose a valid competency.";
  }

  for (const field of Object.keys(storyTextLimits) as Array<keyof typeof storyTextLimits>) {
    const value = draft[field].trim();
    const label = field === "title" ? "Story title" : `${field[0].toUpperCase()}${field.slice(1)}`;

    if (value === "") {
      errors[field] = `${label} is required.`;
    } else if (value.length > storyTextLimits[field]) {
      errors[field] = `${label} must be ${storyTextLimits[field]} characters or fewer.`;
    }
  }

  return errors;
}

export function createFitStoryRecord(
  draft: FitStoryDraft,
  updatedAt: string,
  existingId?: string
): FitStoryRecord {
  const errors = validateFitStoryDraft(draft);

  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors).join(" "));
  }

  if (Number.isNaN(Date.parse(updatedAt))) {
    throw new Error("A valid update timestamp is required.");
  }

  return {
    ...draft,
    title: draft.title.trim(),
    situation: draft.situation.trim(),
    task: draft.task.trim(),
    action: draft.action.trim(),
    result: draft.result.trim(),
    reflection: draft.reflection.trim(),
    id: existingId ?? `fit-story-${updatedAt.replace(/[^0-9]/g, "")}`,
    kind: "fit_story",
    updatedAt
  };
}
