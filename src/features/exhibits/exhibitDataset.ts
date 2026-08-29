import type {
  ExhibitColumn,
  ExhibitColumnValueType,
  ExhibitDataset,
  ExhibitMultipleChoiceQuestionSpec,
  ExhibitQuestion,
  ExhibitQuestionSpec
} from "@/features/exhibits/exhibitTypes";
import type { AnswerSpec } from "@/lib/domain";
import { validateAnswer, type ValidateAnswerOptions, type ValidationResult } from "@/lib/validation/validateAnswer";

const numericValueTypes: ReadonlySet<ExhibitColumnValueType> = new Set([
  "currency",
  "number",
  "percentage"
]);

export function getExhibitColumnById(
  dataset: ExhibitDataset,
  columnId: string
): ExhibitColumn | undefined {
  return dataset.columns.find((column) => column.id === columnId);
}

export function getExhibitDimensionColumnIds(dataset: ExhibitDataset): string[] {
  return dataset.columns.filter((column) => column.role === "dimension").map((column) => column.id);
}

export function getExhibitMetricColumnIds(dataset: ExhibitDataset): string[] {
  return dataset.columns.filter(isExhibitMetricColumn).map((column) => column.id);
}

export function isExhibitMetricColumn(column: ExhibitColumn): boolean {
  return column.role === "metric" && numericValueTypes.has(column.valueType);
}

export function toExhibitQuestion(dataset: ExhibitDataset, question: ExhibitQuestionSpec): ExhibitQuestion {
  return {
    answer: getExhibitAnswerSpec(question),
    category: "exhibit_math",
    difficulty: question.difficulty,
    explanation: question.explanation,
    id: `${dataset.id}:${question.id}`,
    metadata: {
      expectedTimeSeconds: question.expectedTimeSeconds,
      sourceType: "manual",
      variables: {
        exhibitId: dataset.id,
        exhibitQuestionId: question.id
      }
    },
    prompt: question.prompt,
    tags: [...question.tags],
    type: "exhibit"
  };
}

export function isExhibitMultipleChoiceQuestion(
  question: ExhibitQuestionSpec
): question is ExhibitMultipleChoiceQuestionSpec {
  return question.responseType === "multiple_choice";
}

export function getExhibitAnswerSpec(question: ExhibitQuestionSpec): AnswerSpec {
  if (!isExhibitMultipleChoiceQuestion(question)) {
    return question.answer;
  }

  return { value: Math.max(0, question.choices.findIndex((choice) => choice.id === question.correctChoiceId)) + 1 };
}

export function validateExhibitResponse(
  rawInput: string,
  question: ExhibitQuestionSpec,
  options: ValidateAnswerOptions = {}
): ValidationResult {
  if (!isExhibitMultipleChoiceQuestion(question)) {
    return validateAnswer(rawInput, question.answer, options);
  }

  const correctIndex = question.choices.findIndex((choice) => choice.id === question.correctChoiceId);
  const selectedIndex = question.choices.findIndex((choice) => choice.id === rawInput);
  const correctValue = correctIndex + 1;

  if (options.timedOut) {
    return {
      correctValue,
      errorTypes: ["timeout"],
      feedbackMessage: "No answer was submitted before time ran out.",
      isCorrect: false
    };
  }

  if (selectedIndex < 0) {
    return {
      correctValue,
      errorTypes: ["interpretation_error"],
      feedbackMessage: "Choose an answer before submitting.",
      isCorrect: false
    };
  }

  const isCorrect = selectedIndex === correctIndex;

  return {
    correctValue,
    errorTypes: isCorrect ? ["none"] : ["interpretation_error"],
    feedbackMessage: isCorrect ? "Correct." : "Recheck what the exhibit supports most directly.",
    isCorrect,
    normalizedUserValue: selectedIndex + 1
  };
}
