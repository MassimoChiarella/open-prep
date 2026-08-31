import type {
  CategoryScore,
  DrillSession,
  ErrorBreakdown,
  ErrorType,
  Question,
  SessionScore,
  SkillCategory,
  UserResponse
} from "@/lib/domain";

export interface ScoringRules {
  correct: number;
  withinTolerance: number;
  wrongUnitPenalty: number;
  magnitudeErrorPenalty: number;
  roundingErrorPenalty: number;
  maxSpeedBonus: number;
  targetTimeSeconds: number;
}

export const defaultScoringRules: ScoringRules = {
  correct: 100,
  withinTolerance: 80,
  wrongUnitPenalty: 30,
  magnitudeErrorPenalty: 40,
  roundingErrorPenalty: 15,
  maxSpeedBonus: 25,
  targetTimeSeconds: 30
};

export function scoreResponse(response: UserResponse, rules: ScoringRules = defaultScoringRules): number {
  if (response.errorTypes.includes("timeout")) {
    return 0;
  }

  if (!response.isCorrect && response.errorTypes.includes("none")) {
    return 0;
  }

  if (response.interviewMath !== undefined) {
    return response.interviewMath.score.total;
  }

  const baseScore = response.isCorrect ? rules.correct : baseIncorrectScore(response, rules);
  const scoreWithBonus = baseScore + speedBonus(response, rules);

  return Math.max(0, Math.round(scoreWithBonus));
}

export function calculateSessionScore(
  session: DrillSession,
  questions: readonly Question[],
  rules: ScoringRules = defaultScoringRules
): SessionScore {
  const questionById = createQuestionMap(questions);
  const questionCount = session.responses.length;
  const correctCount = session.responses.filter((response) => response.isCorrect).length;
  const totalTimeSeconds = sum(session.responses.map((response) => response.timeTakenSeconds));

  return {
    totalScore: sum(session.responses.map((response) => scoreResponse(response, rules))),
    accuracy: questionCount === 0 ? 0 : correctCount / questionCount,
    averageTimeSeconds: questionCount === 0 ? 0 : totalTimeSeconds / questionCount,
    correctCount,
    incorrectCount: questionCount - correctCount,
    categoryBreakdown: calculateCategoryBreakdown(session.responses, questionById),
    errorBreakdown: calculateErrorBreakdown(session.responses)
  };
}

function baseIncorrectScore(response: UserResponse, rules: ScoringRules): number {
  let score = rules.withinTolerance;

  if (response.errorTypes.includes("unit_error")) {
    score -= rules.wrongUnitPenalty;
  }

  if (response.errorTypes.includes("magnitude_error")) {
    score -= rules.magnitudeErrorPenalty;
  }

  if (response.errorTypes.includes("rounding_error")) {
    score -= rules.roundingErrorPenalty;
  }

  if (response.errorTypes.includes("arithmetic_error") || response.errorTypes.includes("percentage_point_error")) {
    score = Math.min(score, 0);
  }

  return Math.max(0, score);
}

function speedBonus(response: UserResponse, rules: ScoringRules): number {
  if (!response.isCorrect || response.timeTakenSeconds >= rules.targetTimeSeconds) {
    return 0;
  }

  const speedRatio = 1 - response.timeTakenSeconds / rules.targetTimeSeconds;
  return rules.maxSpeedBonus * speedRatio;
}

function calculateCategoryBreakdown(
  responses: readonly UserResponse[],
  questionById: Map<string, Question>
): CategoryScore[] {
  const statsByCategory = new Map<
    SkillCategory,
    {
      correctCount: number;
      totalTimeSeconds: number;
      questionCount: number;
    }
  >();

  for (const response of responses) {
    const question = questionById.get(response.questionId);
    if (question === undefined) {
      throw new Error(`Question "${response.questionId}" is missing from scoring inputs.`);
    }

    const stats = statsByCategory.get(question.category) ?? {
      correctCount: 0,
      totalTimeSeconds: 0,
      questionCount: 0
    };

    stats.questionCount += 1;
    stats.totalTimeSeconds += response.timeTakenSeconds;
    stats.correctCount += response.isCorrect ? 1 : 0;
    statsByCategory.set(question.category, stats);
  }

  return Array.from(statsByCategory.entries()).map(([category, stats]) => ({
    category,
    accuracy: stats.questionCount === 0 ? 0 : stats.correctCount / stats.questionCount,
    averageTimeSeconds: stats.questionCount === 0 ? 0 : stats.totalTimeSeconds / stats.questionCount,
    questionCount: stats.questionCount
  }));
}

function calculateErrorBreakdown(responses: readonly UserResponse[]): ErrorBreakdown[] {
  const counts = new Map<ErrorType, number>();

  for (const response of responses) {
    for (const errorType of response.errorTypes) {
      if (errorType === "none") {
        continue;
      }

      counts.set(errorType, (counts.get(errorType) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries()).map(([errorType, count]) => ({
    errorType,
    count
  }));
}

function createQuestionMap(questions: readonly Question[]): Map<string, Question> {
  return new Map(questions.map((question) => [question.id, question]));
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
