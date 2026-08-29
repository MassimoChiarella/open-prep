import type { DrillSession, Question } from "@/lib/domain";

export interface DrillProgressSummary {
  totalQuestions: number;
  answeredCount: number;
  remainingCount: number;
  currentIndex: number;
  isComplete: boolean;
}

export function getAnsweredQuestionIds(session: DrillSession): Set<string> {
  return new Set(session.responses.map((response) => response.questionId));
}

export function getNextUnansweredQuestionId(session: DrillSession): string | undefined {
  const answeredQuestionIds = getAnsweredQuestionIds(session);
  return session.questionIds.find((questionId) => !answeredQuestionIds.has(questionId));
}

export function getCurrentQuestion(session: DrillSession, questions: readonly Question[]): Question | undefined {
  const nextQuestionId = getNextUnansweredQuestionId(session);

  if (nextQuestionId === undefined) {
    return undefined;
  }

  const questionById = createQuestionMap(questions);
  const question = questionById.get(nextQuestionId);

  if (question === undefined) {
    throw new Error(`Question "${nextQuestionId}" is missing from the generated question queue.`);
  }

  return question;
}

export function isDrillSessionComplete(session: DrillSession): boolean {
  return getNextUnansweredQuestionId(session) === undefined;
}

export function getDrillProgressSummary(session: DrillSession): DrillProgressSummary {
  const answeredQuestionIds = getAnsweredQuestionIds(session);
  const answeredCount = session.questionIds.filter((questionId) => answeredQuestionIds.has(questionId)).length;
  const currentQuestionId = getNextUnansweredQuestionId(session);
  const currentIndex =
    currentQuestionId === undefined ? session.questionIds.length : session.questionIds.indexOf(currentQuestionId);

  return {
    totalQuestions: session.questionIds.length,
    answeredCount,
    remainingCount: session.questionIds.length - answeredCount,
    currentIndex,
    isComplete: currentQuestionId === undefined
  };
}

function createQuestionMap(questions: readonly Question[]): Map<string, Question> {
  return new Map(questions.map((question) => [question.id, question]));
}
