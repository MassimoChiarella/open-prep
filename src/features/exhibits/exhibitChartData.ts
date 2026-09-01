import { getExhibitColumnById, isExhibitMetricColumn } from "@/features/exhibits/exhibitDataset";
import type { ExhibitColumn, ExhibitDataset } from "@/features/exhibits/exhibitTypes";

export interface ExhibitChartSeries {
  color: string;
  column: ExhibitColumn;
}

export interface ExhibitChartDatum {
  label: string;
  values: Record<string, number>;
}

export const exhibitChartColors = Array.from(
  { length: 8 },
  (_, index) => `rgb(var(--color-chart-${index + 1}))`
);

export function getExhibitChartData(dataset: ExhibitDataset): ExhibitChartDatum[] {
  const categoryColumnId = getChartCategoryColumnId(dataset);
  const series = getExhibitChartSeries(dataset);

  if (categoryColumnId === undefined || series.length === 0) {
    return [];
  }

  return dataset.rows.map((row) => {
    const categoryValue = row.cells[categoryColumnId];
    const values: Record<string, number> = {};

    for (const item of series) {
      const value = row.cells[item.column.id];

      if (typeof value === "number" && Number.isFinite(value)) {
        values[item.column.id] = value;
      }
    }

    return {
      label: String(categoryValue),
      values
    };
  });
}

export function getExhibitChartSeries(dataset: ExhibitDataset): ExhibitChartSeries[] {
  const columnIds = getChartMetricColumnIds(dataset);

  return columnIds
    .map((columnId, index) => {
      const column = getExhibitColumnById(dataset, columnId);

      if (column === undefined || !isExhibitMetricColumn(column)) {
        return undefined;
      }

      return {
        color: exhibitChartColors[index % exhibitChartColors.length],
        column
      };
    })
    .filter((series): series is ExhibitChartSeries => series !== undefined);
}

export function isExhibitChartDataset(dataset: ExhibitDataset): boolean {
  return dataset.visualization.type !== "table";
}

function getChartCategoryColumnId(dataset: ExhibitDataset): string | undefined {
  if (dataset.visualization.type === "pie_chart") {
    return dataset.visualization.categoryColumnId;
  }

  if (dataset.visualization.type === "scatterplot") {
    return dataset.visualization.categoryColumnId ?? dataset.visualization.xColumnId;
  }

  return dataset.visualization.xColumnId;
}

function getChartMetricColumnIds(dataset: ExhibitDataset): readonly string[] {
  if (dataset.visualization.type === "pie_chart") {
    return dataset.visualization.valueColumnId === undefined ? [] : [dataset.visualization.valueColumnId];
  }

  if (dataset.visualization.type === "scatterplot") {
    return [dataset.visualization.xColumnId, ...(dataset.visualization.yColumnIds ?? [])].filter(
      (columnId, index, columnIds): columnId is string =>
        columnId !== undefined && columnIds.indexOf(columnId) === index
    );
  }

  return dataset.visualization.yColumnIds ?? [];
}
