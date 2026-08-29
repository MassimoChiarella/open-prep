import type { AnswerSpec, Difficulty, ExplanationSpec, Question, SkillTag, UnitType } from "@/lib/domain";

export type ExhibitVisualizationType =
  | "bar_chart"
  | "index_chart"
  | "line_chart"
  | "pie_chart"
  | "scatterplot"
  | "stacked_bar"
  | "table"
  | "waterfall";

export type ExhibitColumnRole = "dimension" | "metric";

export type ExhibitColumnValueType = "currency" | "number" | "percentage" | "text" | "year";

export type ExhibitCellValue = number | string;

export interface ExhibitColumn {
  description?: string;
  id: string;
  label: string;
  role: ExhibitColumnRole;
  unit?: UnitType;
  valueType: ExhibitColumnValueType;
}

export interface ExhibitDataRow {
  cells: Record<string, ExhibitCellValue>;
  id: string;
  label?: string;
}

export interface ExhibitVisualizationSpec {
  categoryColumnId?: string;
  selectedColumnIds?: readonly string[];
  title?: string;
  totalRowIds?: readonly string[];
  type: ExhibitVisualizationType;
  valueColumnId?: string;
  xColumnId?: string;
  yColumnIds?: readonly string[];
}

interface ExhibitQuestionBase {
  difficulty: Difficulty;
  expectedTimeSeconds?: number;
  explanation: ExplanationSpec;
  id: string;
  prompt: string;
  tags: readonly SkillTag[];
}

export interface ExhibitNumericQuestionSpec extends ExhibitQuestionBase {
  answer: AnswerSpec;
  responseType?: "numeric";
}

export interface ExhibitChoice {
  id: string;
  label: string;
}

export interface ExhibitMultipleChoiceQuestionSpec extends ExhibitQuestionBase {
  choices: readonly ExhibitChoice[];
  correctChoiceId: string;
  responseType: "multiple_choice";
}

export type ExhibitQuestionSpec = ExhibitMultipleChoiceQuestionSpec | ExhibitNumericQuestionSpec;

export interface ExhibitDataset {
  columns: readonly ExhibitColumn[];
  description: string;
  id: string;
  questions: readonly ExhibitQuestionSpec[];
  rows: readonly ExhibitDataRow[];
  sourceNote?: string;
  title: string;
  unit: UnitType;
  visualization: ExhibitVisualizationSpec;
}

export interface ExhibitQuestion extends Question {
  metadata: NonNullable<Question["metadata"]> & {
    variables: {
      exhibitId: string;
      exhibitQuestionId: string;
    };
  };
  type: "exhibit";
}
