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
  requestedCount: number,
  seed?: string | number
): ExhibitSprintItem[] {
  const count = Number.isFinite(requestedCount)
    ? Math.min(5, Math.max(3, Math.trunc(requestedCount)))
    : 3;
  const items: ExhibitSprintItem[] = [];
  const itemIds = new Set<string>();

  const addItem = (dataset: ExhibitDataset, question: ExhibitQuestionSpec) => {
    const id = `${dataset.id}:${question.id}`;

    if (!itemIds.has(id)) {
      itemIds.add(id);
      items.push({ dataset, question });
    }
  };

  for (const [index, visualizationType] of visualizationOrder.entries()) {
    const dataset = datasets.find(
      (candidate) => candidate.visualization.type === visualizationType && candidate.questions.length > 0
    );

    if (dataset !== undefined) {
      addItem(dataset, dataset.questions[index % dataset.questions.length]);
    }
  }

  for (const dataset of datasets) {
    for (const question of dataset.questions) {
      addItem(dataset, question);
    }
  }

  const offset = seed === undefined || items.length === 0 ? 0 : rotationOffset(seed, items.length);
  return [...items.slice(offset), ...items.slice(0, offset)].slice(0, count);
}

function rotationOffset(seed: string | number, itemCount: number): number {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return Math.abs(Math.trunc(seed)) % itemCount;
  }

  let hash = 2_166_136_261;

  for (const character of String(seed)) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619);
  }

  return (hash >>> 0) % itemCount;
}
