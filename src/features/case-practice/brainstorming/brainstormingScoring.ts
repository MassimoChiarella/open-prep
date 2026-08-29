export interface BrainstormingIdea {
  id: string;
  label: string;
  relevant: boolean;
}

export interface BrainstormingTheme {
  id: string;
  label: string;
  ideas: readonly BrainstormingIdea[];
}

export interface BrainstormingPrompt {
  id: string;
  title: string;
  context: string;
  question: string;
  selectionLimit: number;
  priorityLimit: number;
  priorityIdeaIds: readonly string[];
  themes: readonly BrainstormingTheme[];
}

export interface BrainstormingSubmission {
  selectedIdeaIds: readonly string[];
  priorityIdeaIds: readonly string[];
  note?: string;
}

export interface BrainstormingScoreDimension {
  score: number;
  maxScore: number;
}

export interface BrainstormingScore {
  totalScore: number;
  maxScore: number;
  coverage: BrainstormingScoreDimension & { coveredThemeIds: string[] };
  relevance: BrainstormingScoreDimension & {
    relevantIdeaIds: string[];
    irrelevantIdeaIds: string[];
  };
  prioritization: BrainstormingScoreDimension & {
    matchedIdeaIds: string[];
    misplacedIdeaIds: string[];
  };
}

const coverageMaxScore = 3;
const relevanceMaxScore = 4;
const prioritizationMaxScore = 3;

export function scoreBrainstorming(
  prompt: BrainstormingPrompt,
  submission: BrainstormingSubmission
): BrainstormingScore {
  const ideas = prompt.themes.flatMap((theme) => theme.ideas);
  const knownIdeaIds = new Set(ideas.map((idea) => idea.id));
  const selectedIds = new Set(submission.selectedIdeaIds.filter((id) => knownIdeaIds.has(id)));
  const priorityIds = new Set(
    submission.priorityIdeaIds.filter((id) => knownIdeaIds.has(id) && selectedIds.has(id))
  );
  const expectedPriorityIds = new Set(prompt.priorityIdeaIds);

  const coveredThemeIds = prompt.themes
    .filter((theme) => theme.ideas.some((idea) => idea.relevant && selectedIds.has(idea.id)))
    .map((theme) => theme.id);
  const relevantIdeaIds = ideas
    .filter((idea) => idea.relevant && selectedIds.has(idea.id))
    .map((idea) => idea.id);
  const irrelevantIdeaIds = ideas
    .filter((idea) => !idea.relevant && selectedIds.has(idea.id))
    .map((idea) => idea.id);
  const matchedIdeaIds = ideas
    .filter((idea) => priorityIds.has(idea.id) && expectedPriorityIds.has(idea.id))
    .map((idea) => idea.id);
  const misplacedIdeaIds = ideas
    .filter((idea) => priorityIds.has(idea.id) && !expectedPriorityIds.has(idea.id))
    .map((idea) => idea.id);

  const coverageScore = scaledScore(coverageMaxScore, coveredThemeIds.length, prompt.themes.length);
  const relevanceScore = scaledScore(
    relevanceMaxScore,
    relevantIdeaIds.length - irrelevantIdeaIds.length,
    ideas.filter((idea) => idea.relevant).length
  );
  const prioritizationScore = scaledScore(
    prioritizationMaxScore,
    matchedIdeaIds.length - misplacedIdeaIds.length,
    expectedPriorityIds.size
  );

  return {
    totalScore: coverageScore + relevanceScore + prioritizationScore,
    maxScore: coverageMaxScore + relevanceMaxScore + prioritizationMaxScore,
    coverage: {
      score: coverageScore,
      maxScore: coverageMaxScore,
      coveredThemeIds
    },
    relevance: {
      score: relevanceScore,
      maxScore: relevanceMaxScore,
      relevantIdeaIds,
      irrelevantIdeaIds
    },
    prioritization: {
      score: prioritizationScore,
      maxScore: prioritizationMaxScore,
      matchedIdeaIds,
      misplacedIdeaIds
    }
  };
}

function scaledScore(maxScore: number, earned: number, possible: number): number {
  if (possible <= 0) {
    return 0;
  }

  return Math.round(maxScore * Math.min(1, Math.max(0, earned / possible)));
}
