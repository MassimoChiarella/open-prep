import type {
  ExhibitDataset,
  ExhibitQuestionSpec,
  ExhibitVisualizationType
} from "@/features/exhibits/exhibitTypes";

export interface ExhibitSprintItem {
  dataset: ExhibitDataset;
  question: ExhibitQuestionSpec;
}

export const exhibitSprintQuestionCounts = [3, 4, 5] as const;

const visualizationOrder: readonly ExhibitVisualizationType[] = [
  "waterfall",
  "scatterplot",
  "stacked_bar",
  "index_chart",
  "table",
  "bar_chart",
  "line_chart",
  "pie_chart"
];

export function buildExhibitSprintItems(
  datasets: readonly ExhibitDataset[],
  requestedCount: number
): ExhibitSprintItem[] {
  const count = Number.isFinite(requestedCount)
    ? Math.min(5, Math.max(3, Math.trunc(requestedCount)))
    : 3;
  const items: ExhibitSprintItem[] = [];

  for (const [index, visualizationType] of visualizationOrder.entries()) {
    const dataset = datasets.find(
      (candidate) => candidate.visualization.type === visualizationType && candidate.questions.length > 0
    );

    if (dataset !== undefined) {
      items.push({ dataset, question: dataset.questions[index % dataset.questions.length] });
    }

    if (items.length === count) {
      return items;
    }
  }

  for (const dataset of datasets) {
    for (const question of dataset.questions) {
      if (!items.some((item) => item.dataset.id === dataset.id && item.question.id === question.id)) {
        items.push({ dataset, question });
      }

      if (items.length === count) {
        return items;
      }
    }
  }

  return items;
}
