"use client";

import { memo } from "react";

import { getExhibitColumnById, isExhibitMetricColumn } from "@/features/exhibits/exhibitDataset";
import {
  formatExhibitCellValue,
  unitLabelForExhibitColumn
} from "@/features/exhibits/exhibitFormatting";
import type { ExhibitColumn, ExhibitDataset } from "@/features/exhibits/exhibitTypes";
import { useI18n } from "@/features/i18n/I18nProvider";

interface ExhibitTableRendererProps {
  dataset: ExhibitDataset;
}

export const ExhibitTableRenderer = memo(function ExhibitTableRenderer({ dataset }: ExhibitTableRendererProps) {
  const { formatNumber, t } = useI18n();
  const columns = getExhibitTableColumns(dataset);

  return (
    <section
      aria-labelledby={`${dataset.id}-heading`}
      className="grid min-w-0 gap-4 border border-ink/15 border-t-2 border-t-teal bg-white p-4 sm:p-6"
      data-testid={`exhibit-table-${dataset.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal">{t("Table Exhibit")}</p>
          <h2 className="min-w-0 break-words text-2xl font-semibold text-ink [overflow-wrap:anywhere]" id={`${dataset.id}-heading`}>
            {dataset.title}
          </h2>
          <p className="min-w-0 max-w-3xl text-sm leading-6 text-ink/70 [overflow-wrap:anywhere]">{dataset.description}</p>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <TableStat label={t("Rows")} value={formatNumber(dataset.rows.length)} />
          <TableStat label={t("Questions")} value={formatNumber(dataset.questions.length)} />
        </dl>
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/65 sm:hidden">
          {t("Scroll table sideways to compare all columns.")}
        </p>
        <div
          aria-label={t("Scrollable exhibit table: {title}", {
            title: dataset.visualization.title ?? dataset.title
          })}
          className="max-h-[32rem] max-w-full overflow-auto overscroll-contain border border-ink/15"
          data-testid="exhibit-table-scroll"
          role="region"
          tabIndex={0}
        >
          <table className="min-w-[42rem] w-full border-separate border-spacing-0 text-start text-sm">
            <caption className="sr-only">{dataset.visualization.title ?? dataset.title}</caption>
            <thead className="bg-white text-xs font-semibold uppercase tracking-wide text-ink/65">
              <tr>
                {columns.map((column) => (
                  <th className={tableHeaderClass(column)} key={column.id} scope="col">
                    <span className="grid gap-1">
                      <span>{column.label}</span>
                      {unitLabelForExhibitColumn(column) !== undefined ? (
                        <span className="font-medium normal-case tracking-normal text-ink/65">
                          {unitLabelForExhibitColumn(column)}
                        </span>
                      ) : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataset.rows.map((row) => (
                <tr
                  className="border-t border-ink/10 bg-paper text-ink/75"
                  data-testid={`exhibit-table-row-${row.id}`}
                  key={row.id}
                >
                  {columns.map((column, columnIndex) => {
                    const className = tableCellClass(column, columnIndex);
                    const value = formatExhibitCellValue(row.cells[column.id], column);
                    const testId = `exhibit-table-cell-${row.id}-${column.id}`;

                    return columnIndex === 0 ? (
                      <th className={className} data-testid={testId} key={column.id} scope="row">
                        {value}
                      </th>
                    ) : (
                      <td className={className} data-testid={testId} key={column.id}>
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dataset.sourceNote !== undefined ? (
        <p className="min-w-0 text-xs leading-5 text-ink/65 [overflow-wrap:anywhere]">{dataset.sourceNote}</p>
      ) : null}
    </section>
  );
});

function tableHeaderClass(column: ExhibitColumn): string {
  return [
    "sticky top-0 bg-white border-b border-ink/10 px-3 py-2 align-bottom",
    isExhibitMetricColumn(column)
      ? "z-10 min-w-28 text-end tabular-nums"
      : "sticky start-0 z-20 min-w-36 bg-white text-start"
  ].join(" ");
}

function tableCellClass(column: ExhibitColumn, columnIndex: number): string {
  return [
    "border-t border-white px-3 py-2 align-middle",
    isExhibitMetricColumn(column)
      ? "text-end font-semibold tabular-nums text-ink"
      : "min-w-36 text-start font-normal text-ink/80",
    columnIndex === 0 ? "sticky start-0 z-10 bg-paper" : ""
  ].join(" ");
}

export function getExhibitTableColumns(dataset: ExhibitDataset): ExhibitColumn[] {
  const selectedColumnIds = dataset.visualization.selectedColumnIds;

  if (selectedColumnIds === undefined) {
    return [...dataset.columns];
  }

  return selectedColumnIds
    .map((columnId) => getExhibitColumnById(dataset, columnId))
    .filter((column): column is ExhibitColumn => column !== undefined);
}

function TableStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-s-2 border-ink/15 bg-paper px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}
