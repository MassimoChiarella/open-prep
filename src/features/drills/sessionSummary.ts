import type {
  DrillSession,
  DrillSettings,
  ErrorType,
  ExplanationSpec,
  InterviewMathResponse,
  Question,
  SessionScore,
  SkillCategory,
  SkillTag,
  UnitType
} from "@/lib/domain";

export interface SessionSummaryInterviewMathResult extends InterviewMathResponse {
  equationLabel?: string;
  expectedUnit?: UnitType;
  interpretationLabel?: string;
}

export interface SessionSummaryQuestionResult {
  answerUnit?: UnitType;
  category?: SkillCategory;
  correctValue: number;
  errorTypes: ErrorType[];
  explanation: ExplanationSpec;
  interviewMath?: SessionSummaryInterviewMathResult;
  isCorrect: boolean;
  prompt: string;
  rawInput: string;
  selectedUnit?: UnitType;
  tags?: SkillTag[];
  timeTakenSeconds: number;
}

export interface SessionSummarySnapshot {
  endedAt?: string;
  id: string;
  questionResults: SessionSummaryQuestionResult[];
  score: SessionScore;
  settings: DrillSettings & {
    interviewMathMode?: true;
  };
  startedAt: string;
}

export function createSessionSummarySnapshot(
  session: DrillSession,
  questions: readonly Question[]
): SessionSummarySnapshot {
  if (session.score === undefined) {
    throw new Error("A session summary requires a completed session score.");
  }

  const questionById = new Map(questions.map((question) => [question.id, question]));

  return {
    id: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    settings: {
      ...session.settings,
      ...(session.responses.some((response) => response.interviewMath !== undefined)
        ? { interviewMathMode: true as const }
        : {})
    },
    score: session.score,
    questionResults: session.responses.map((response) => {
      const question = questionById.get(response.questionId);

      if (question === undefined) {
        throw new Error(`Question "${response.questionId}" is missing from summary inputs.`);
      }

      const interviewSpec = question.metadata?.caseStyle?.interviewMath;
      const interviewMath =
        response.interviewMath === undefined
          ? undefined
          : {
              ...response.interviewMath,
              equationLabel: interviewSpec?.equationOptions.find(
                (option) => option.id === response.interviewMath?.equationOptionId
              )?.label,
              expectedUnit: interviewSpec?.expectedUnit,
              interpretationLabel: interviewSpec?.interpretationOptions.find(
                (option) => option.id === response.interviewMath?.interpretationOptionId
              )?.label,
              score: { ...response.interviewMath.score }
            };

      return {
        answerUnit: question.answer.unit,
        category: question.category,
        prompt: question.prompt,
        rawInput: response.rawInput,
        correctValue: question.answer.value,
        explanation: {
          ...question.explanation,
          steps: [...question.explanation.steps]
        },
        ...(interviewMath === undefined ? {} : { interviewMath }),
        ...(response.selectedUnit === undefined ? {} : { selectedUnit: response.selectedUnit }),
        isCorrect: response.isCorrect,
        errorTypes: response.errorTypes,
        tags: [...question.tags],
        timeTakenSeconds: response.timeTakenSeconds
      };
    })
  };
}
