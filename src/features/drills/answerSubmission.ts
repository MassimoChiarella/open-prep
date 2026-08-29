import type { DrillSession, Question, UnitType, UserResponse } from "@/lib/domain";
import {
  evaluateInterviewMath,
  type InterviewMathSubmission
} from "@/features/drills/interviewMathEvaluation";
import { validateAnswer, type ValidationResult } from "@/lib/validation/validateAnswer";

export interface SubmitAnswerInput {
  session: DrillSession;
  question: Question;
  rawInput: string;
  timeTakenSeconds: number;
  submittedAt?: string;
  selectedUnit?: UnitType;
  interviewMath?: InterviewMathSubmission;
  timedOut?: boolean;
}

export interface SubmitAnswerResult {
  session: DrillSession;
  response: UserResponse;
  validation: ValidationResult;
}

export function submitAnswer(input: SubmitAnswerInput): SubmitAnswerResult {
  validateSubmissionInput(input);

  const interviewEvaluation =
    input.interviewMath === undefined
      ? undefined
      : evaluateInterviewMath({
          ...input.interviewMath,
          question: input.question,
          rawInput: input.rawInput,
          selectedUnit: input.selectedUnit,
          timedOut: input.timedOut
        });
  const validation =
    interviewEvaluation?.validation ??
    validateAnswer(input.rawInput, input.question.answer, {
      selectedUnit: input.selectedUnit,
      timedOut: input.timedOut
    });

  const response: UserResponse = {
    questionId: input.question.id,
    rawInput: input.rawInput,
    normalizedValue: validation.normalizedUserValue,
    selectedUnit: input.selectedUnit,
    ...(interviewEvaluation === undefined ? {} : { interviewMath: interviewEvaluation.interviewMath }),
    isCorrect: validation.isCorrect,
    errorTypes: validation.errorTypes,
    timeTakenSeconds: input.timeTakenSeconds,
    submittedAt: input.submittedAt ?? new Date().toISOString()
  };

  return {
    response,
    validation,
    session: {
      ...input.session,
      responses: [...input.session.responses, response]
    }
  };
}

function validateSubmissionInput(input: SubmitAnswerInput): void {
  if (!input.session.questionIds.includes(input.question.id)) {
    throw new Error(`Question "${input.question.id}" does not belong to session "${input.session.id}".`);
  }

  if (!Number.isFinite(input.timeTakenSeconds) || input.timeTakenSeconds < 0) {
    throw new Error("Answer submission requires a non-negative finite timeTakenSeconds value.");
  }
}
