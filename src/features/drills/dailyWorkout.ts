import { createDrillSettings } from "@/features/drills/drillSettings";
import {
  createRetryQuestionFromMistake,
  selectDueMistakes
} from "@/features/drills/mistakeRetry";
import { createDrillSession, type CreatedDrillSession } from "@/features/drills/sessionFactory";
import { deriveWeaknessDrillSettings } from "@/features/progress/weaknessAnalysis";
import type { Difficulty, Question, SkillCategory, SkillTag } from "@/lib/domain";
import type {
  MistakeNotebookRecord,
  RetryScheduleRecord,
  StoredUserResponse
} from "@/lib/storage/appStorageTypes";

export const dailyWorkoutSourceParam = "daily_workout";

const defaultQuestionCount = 10;
const minimumQuestionCount = 10;
const maximumQuestionCount = 20;
const balancedCategories: readonly SkillCategory[] = [
  "arithmetic",
  "percentages",
  "fractions_decimals_ratios",
  "business_math",
  "weighted_averages"
];

export interface DailyWorkoutData {
  mistakes: readonly MistakeNotebookRecord[];
  responses: readonly StoredUserResponse[];
  retrySchedules: readonly RetryScheduleRecord[];
}

export interface CreateDailyWorkoutSessionOptions {
  now?: string;
  questionCount?: number;
  seed?: string | number;
  sessionId?: string;
  startedAt?: string;
}

export function buildDailyWorkoutHref(questionCount = defaultQuestionCount): string {
  const params = new URLSearchParams({
    count: String(normalizeQuestionCount(questionCount)),
    source: dailyWorkoutSourceParam
  });

  return `/drills/session?${params.toString()}`;
}

export function createDailyWorkoutSession(
  data: DailyWorkoutData,
  options: CreateDailyWorkoutSessionOptions = {}
): CreatedDrillSession {
  const questionCount = normalizeQuestionCount(options.questionCount);
  const startedAt = options.startedAt ?? new Date().toISOString();
  const seed = options.seed ?? `daily-workout:${startedAt.slice(0, 10)}`;
  const dueQuestions = selectDueMistakes(
    data.mistakes,
    data.retrySchedules,
    options.now ?? startedAt
  )
    .slice(0, questionCount)
    .map(createRetryQuestionFromMistake);
  const questions = [...dueQuestions];
  const usedQuestionIds = new Set(questions.map((question) => question.id));
  const weaknessSettings = deriveWeaknessDrillSettings(data.responses);
  const availableCount = questionCount - questions.length;
  const weaknessCount = weaknessSettings === undefined
    ? 0
    : Math.min(5, Math.ceil(availableCount / 2));

  if (weaknessCount > 0 && weaknessSettings !== undefined) {
    const weakQuestions = createWeaknessQuestions(weaknessSettings, weaknessCount, seed);

    for (const question of weakQuestions) {
      if (!usedQuestionIds.has(question.id)) {
        usedQuestionIds.add(question.id);
        questions.push(question);
      }
    }
  }

  const weakestCategory = weaknessSettings?.categories[0];
  const fillCategories = balancedCategories.filter((category) => category !== weakestCategory);
  questions.push(
    ...createBalancedQuestions(
      questionCount - questions.length,
      seed,
      usedQuestionIds,
      fillCategories.length === 0 ? balancedCategories : fillCategories
    )
  );

  const settings = createDrillSettings({
    categories: unique(questions.map((question) => question.category)),
    difficulty: highestDifficulty(questions),
    feedbackMode: "instant",
    questionCount: questions.length,
    tags: unique(questions.flatMap((question) => question.tags)),
    timeMode: "untimed"
  });

  return {
    questions,
    session: {
      id: options.sessionId ?? buildSessionId(seed, startedAt),
      questionIds: questions.map((question) => question.id),
      responses: [],
      settings,
      startedAt
    }
  };
}

function createWeaknessQuestions(
  settings: ReturnType<typeof createDrillSettings>,
  questionCount: number,
  seed: string | number
): Question[] {
  const overrides = {
    ...settings,
    questionCount
  };

  try {
    return createDrillSession({ settings: overrides, seed: `${seed}:weak` }).questions;
  } catch {
    if (overrides.tags === undefined) {
      return [];
    }

    try {
      return createDrillSession({
        settings: { ...overrides, tags: undefined },
        seed: `${seed}:weak:category`
      }).questions;
    } catch {
      return [];
    }
  }
}

function createBalancedQuestions(
  questionCount: number,
  seed: string | number,
  usedQuestionIds: Set<string>,
  categories: readonly SkillCategory[]
): Question[] {
  const questions: Question[] = [];

  for (let index = 0; index < questionCount; index += 1) {
    const category = categories[index % categories.length];
    let question: Question | undefined;

    for (let attempt = 0; attempt < 25 && question === undefined; attempt += 1) {
      const candidate = createDrillSession({
        seed: `${seed}:balanced:${index}:${attempt}`,
        settings: createDrillSettings({
          categories: [category],
          difficulty: "beginner",
          feedbackMode: "instant",
          questionCount: 1,
          timeMode: "untimed"
        })
      }).questions[0];

      if (!usedQuestionIds.has(candidate.id)) {
        question = candidate;
      }
    }

    if (question === undefined) {
      throw new Error("Unable to generate enough unique Daily Workout questions.");
    }

    usedQuestionIds.add(question.id);
    questions.push(question);
  }

  return questions;
}

function normalizeQuestionCount(questionCount = defaultQuestionCount): number {
  if (!Number.isFinite(questionCount)) {
    return defaultQuestionCount;
  }

  return Math.max(minimumQuestionCount, Math.min(maximumQuestionCount, Math.floor(questionCount)));
}

function highestDifficulty(questions: readonly Question[]): Difficulty {
  const order: readonly Difficulty[] = ["beginner", "intermediate", "advanced", "expert"];

  return questions.reduce<Difficulty>(
    (highest, question) => order.indexOf(question.difficulty) > order.indexOf(highest)
      ? question.difficulty
      : highest,
    "beginner"
  );
}

function unique<TValue extends SkillCategory | SkillTag>(values: readonly TValue[]): TValue[] {
  return Array.from(new Set(values));
}

function buildSessionId(seed: string | number, startedAt: string): string {
  const safeSeed = String(seed).replace(/[^A-Za-z0-9_-]/g, "_");
  const safeStartedAt = startedAt.replace(/[^A-Za-z0-9]/g, "");
  return `daily-workout-${safeSeed}-${safeStartedAt}`;
}
