import { describe, expect, it } from "vitest";

import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import {
  type ExhibitDataset,
  type ExhibitNumericQuestionSpec,
  type ExhibitQuestionSpec,
  type ExhibitVisualizationType,
} from "@/features/exhibits/exhibitTypes";
import {
  isExhibitMetricColumn,
  isExhibitMultipleChoiceQuestion,
  toExhibitQuestion,
  validateExhibitResponse
} from "@/features/exhibits/exhibitDataset";

const datasets: readonly ExhibitDataset[] = exhibitDatasets;

describe("exhibit datasets", () => {
  it("bundles at least 15 original deterministic exhibit datasets", () => {
    expect(datasets.length).toBeGreaterThanOrEqual(15);
    expect(new Set(datasets.map((dataset) => dataset.id)).size).toBe(datasets.length);
    expect(new Set(datasets.map((dataset) => dataset.visualization.type))).toEqual(
      new Set<ExhibitVisualizationType>([
        "bar_chart",
        "index_chart",
        "line_chart",
        "pie_chart",
        "scatterplot",
        "stacked_bar",
        "table",
        "waterfall"
      ])
    );
  });

  it("defines complete local content for every exhibit", () => {
    for (const dataset of datasets) {
      expect(dataset.id, `${dataset.id} id`).toMatch(/^exhibit_[a-z0-9_]+_\d{3}$/);
      expect(dataset.title.trim(), `${dataset.id} title`).not.toHaveLength(0);
      expect(dataset.description.trim(), `${dataset.id} description`).not.toHaveLength(0);
      expect(dataset.sourceNote, `${dataset.id} source note`).toContain("Synthetic local dataset");
      expect(dataset.columns.length, `${dataset.id} columns`).toBeGreaterThanOrEqual(2);
      expect(dataset.rows.length, `${dataset.id} rows`).toBeGreaterThanOrEqual(3);
      expect(dataset.questions.length, `${dataset.id} questions`).toBeGreaterThanOrEqual(1);

      const columnIds = dataset.columns.map((column) => column.id);

      expect(new Set(columnIds).size, `${dataset.id} column IDs`).toBe(columnIds.length);
      expect(dataset.columns.some((column) => column.role === "dimension"), `${dataset.id} dimension`).toBe(true);
      expect(dataset.columns.some(isExhibitMetricColumn), `${dataset.id} metric`).toBe(true);

      for (const row of dataset.rows) {
        expect(Object.keys(row.cells).sort(), `${dataset.id}:${row.id} cells`).toEqual([...columnIds].sort());

        for (const column of dataset.columns.filter(isExhibitMetricColumn)) {
          expect(Number.isFinite(row.cells[column.id]), `${dataset.id}:${row.id}:${column.id}`).toBe(true);
        }
      }

      for (const columnId of visualizationColumnIds(dataset)) {
        expect(columnIds, `${dataset.id} visualization column ${columnId}`).toContain(columnId);
      }

      for (const totalRowId of dataset.visualization.totalRowIds ?? []) {
        expect(dataset.rows.some((row) => row.id === totalRowId), `${dataset.id} total row ${totalRowId}`).toBe(true);
      }
    }
  });

  it("keeps exhibit questions globally unique and compatible with the validation engine", () => {
    const questionIds = new Set<string>();

    for (const dataset of datasets) {
      for (const question of dataset.questions) {
        const globalQuestion = toExhibitQuestion(dataset, question);

        expect(questionIds.has(globalQuestion.id), `${globalQuestion.id} duplicate`).toBe(false);
        questionIds.add(globalQuestion.id);
        expect(globalQuestion.metadata.variables.exhibitId).toBe(dataset.id);
        expect(globalQuestion.metadata.sourceType).toBe("manual");
        expect(question.prompt.trim(), `${globalQuestion.id} prompt`).not.toHaveLength(0);
        expect(question.explanation.steps.length, `${globalQuestion.id} explanation`).toBeGreaterThanOrEqual(2);
        if (isExhibitMultipleChoiceQuestion(question)) {
          expect(new Set(question.choices.map((choice) => choice.id)).size).toBe(question.choices.length);
          expect(question.choices.some((choice) => choice.id === question.correctChoiceId)).toBe(true);
        }

        expect(validateExhibitResponse(correctInputFor(question), question).isCorrect, `${globalQuestion.id} answer`).toBe(true);
      }
    }

    expect(questionIds.size).toBeGreaterThanOrEqual(20);
  });
});

function visualizationColumnIds(dataset: ExhibitDataset): string[] {
  const visualization = dataset.visualization;

  return [
    visualization.categoryColumnId,
    ...(visualization.selectedColumnIds ?? []),
    visualization.valueColumnId,
    visualization.xColumnId,
    ...(visualization.yColumnIds ?? [])
  ].filter((columnId): columnId is string => columnId !== undefined);
}

function correctInputFor(question: ExhibitQuestionSpec): string {
  if (isExhibitMultipleChoiceQuestion(question)) {
    return question.correctChoiceId;
  }

  return correctNumericInputFor(question);
}

function correctNumericInputFor(question: ExhibitNumericQuestionSpec): string {
  if (question.answer.unit === "percentage") {
    return `${question.answer.value * 100}%`;
  }

  if (question.answer.unit === "currency") {
    return `$${question.answer.value}`;
  }

  return String(question.answer.value);
}
