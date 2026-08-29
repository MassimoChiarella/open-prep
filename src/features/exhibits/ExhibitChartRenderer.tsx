"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  exhibitChartColors,
  getExhibitChartData,
  getExhibitChartSeries
} from "@/features/exhibits/exhibitChartData";
import { formatExhibitCellValue } from "@/features/exhibits/exhibitFormatting";
import type { ExhibitChartDatum, ExhibitChartSeries } from "@/features/exhibits/exhibitChartData";
import type { ExhibitDataset, ExhibitVisualizationType } from "@/features/exhibits/exhibitTypes";
import { useI18n } from "@/features/i18n/I18nProvider";

interface ExhibitChartRendererProps {
  dataset: ExhibitDataset;
}

const chartWidth = 720;
const chartHeight = 320;

export function ExhibitChartRenderer({ dataset }: ExhibitChartRendererProps) {
  const { formatNumber, t } = useI18n();
  const chartData = getExhibitChartData(dataset);
  const series = getExhibitChartSeries(dataset);
  const chartTypeLabel = t(chartTypeLabels[dataset.visualization.type]);

  if (chartData.length === 0 || series.length === 0 || dataset.visualization.type === "table") {
    return null;
  }

  return (
    <section
      aria-labelledby={`${dataset.id}-chart-heading`}
      className="grid min-w-0 gap-4 border border-ink/15 border-t-2 border-t-teal bg-white p-4 sm:p-6"
      data-testid={`exhibit-chart-${dataset.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-coral">{chartTypeLabel}</p>
          <h2 className="break-words text-2xl font-semibold text-ink" id={`${dataset.id}-chart-heading`}>
            {dataset.title}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-ink/70">{dataset.description}</p>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <ChartStat label={t("Rows")} value={formatNumber(dataset.rows.length)} />
          <ChartStat label={t("Series")} value={formatNumber(series.length)} />
        </dl>
      </div>

      <div className="max-w-full overflow-x-auto overscroll-x-contain border border-ink/15 bg-white">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/65 sm:hidden">
          {t("Scroll chart sideways to inspect axis labels.")}
        </p>
        <div
          aria-label={t("{title} {chartType}", { title: dataset.title, chartType: chartTypeLabel })}
          className="h-[320px] w-[720px] max-w-none shrink-0"
          data-testid={`exhibit-chart-canvas-${dataset.id}`}
          role="img"
        >
          {renderChart(dataset, chartData, series, t)}
        </div>
      </div>

      <ChartLegend chartData={chartData} dataset={dataset} series={series} />
      <ChartValueList chartData={chartData} series={series} />
      {dataset.sourceNote !== undefined ? (
        <p className="text-xs leading-5 text-ink/65">{dataset.sourceNote}</p>
      ) : null}
    </section>
  );
}

function renderChart(
  dataset: ExhibitDataset,
  chartData: readonly ExhibitChartDatum[],
  series: readonly ExhibitChartSeries[],
  t: ReturnType<typeof useI18n>["t"]
) {
  const rechartsData = chartData.map((datum) => ({
    label: datum.label,
    ...datum.values
  }));

  if (dataset.visualization.type === "bar_chart" || dataset.visualization.type === "stacked_bar") {
    const stacked = dataset.visualization.type === "stacked_bar";

    return (
      <BarChart data={rechartsData} height={chartHeight} margin={chartMargins} width={chartWidth}>
        <CartesianGrid stroke={chartGridColor} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="label" tick={chartTick} tickMargin={10} />
        <YAxis
          tick={chartTick}
          tickFormatter={(value) => formatAxisTick(value, series[0])}
          width={72}
        />
        <Tooltip
          {...chartTooltipProps}
          formatter={(value, name) => formatTooltipValue(value, name, series)}
          labelFormatter={(label) => t("Category: {label}", { label: String(label) })}
        />
        {series.map((item) => (
          <Bar
            dataKey={item.column.id}
            fill={item.color}
            isAnimationActive={false}
            key={item.column.id}
            stackId={stacked ? "total" : undefined}
          />
        ))}
      </BarChart>
    );
  }

  if (dataset.visualization.type === "line_chart" || dataset.visualization.type === "index_chart") {
    return (
      <LineChart data={rechartsData} height={chartHeight} margin={chartMargins} width={chartWidth}>
        <CartesianGrid stroke={chartGridColor} strokeDasharray="4 4" />
        <XAxis dataKey="label" tick={chartTick} tickMargin={10} />
        <YAxis
          tick={chartTick}
          tickFormatter={(value) => formatAxisTick(value, series[0])}
          width={72}
        />
        <Tooltip
          {...chartTooltipProps}
          formatter={(value, name) => formatTooltipValue(value, name, series)}
          labelFormatter={(label) => t("Category: {label}", { label: String(label) })}
        />
        {series.map((item) => (
          <Line
            dataKey={item.column.id}
            dot={{ fill: item.color, r: 4 }}
            isAnimationActive={false}
            key={item.column.id}
            stroke={item.color}
            strokeWidth={3}
            type="monotone"
          />
        ))}
      </LineChart>
    );
  }

  if (dataset.visualization.type === "scatterplot") {
    const xSeries = series.find((item) => item.column.id === dataset.visualization.xColumnId);
    const ySeries = series.find((item) => dataset.visualization.yColumnIds?.includes(item.column.id));

    if (xSeries === undefined || ySeries === undefined) {
      return null;
    }

    const scatterData = chartData.map((datum) => ({
      label: datum.label,
      x: datum.values[xSeries.column.id],
      y: datum.values[ySeries.column.id]
    }));

    return (
      <ScatterChart height={chartHeight} margin={chartMargins} width={chartWidth}>
        <CartesianGrid stroke={chartGridColor} strokeDasharray="4 4" />
        <XAxis
          dataKey="x"
          name={xSeries.column.label}
          tick={chartTick}
          tickFormatter={(value) => formatAxisTick(value, xSeries)}
          type="number"
          unit=""
        />
        <YAxis
          dataKey="y"
          name={ySeries.column.label}
          tick={chartTick}
          tickFormatter={(value) => formatAxisTick(value, ySeries)}
          type="number"
          width={72}
        />
        <Tooltip
          {...chartTooltipProps}
          cursor={{ fill: "transparent", stroke: chartGridColor, strokeDasharray: "4 4" }}
        />
        <Scatter data={scatterData} fill={ySeries.color} isAnimationActive={false} name={ySeries.column.label} />
      </ScatterChart>
    );
  }

  if (dataset.visualization.type === "waterfall") {
    const valueSeries = series[0];
    const totalRowIds = new Set(dataset.visualization.totalRowIds ?? []);
    let runningTotal = 0;
    const waterfallData = chartData.map((datum, index) => {
      const value = datum.values[valueSeries.column.id] ?? 0;
      const isTotal = totalRowIds.has(dataset.rows[index]?.id ?? "");
      const start = isTotal ? 0 : runningTotal;
      const end = isTotal ? value : runningTotal + value;

      if (!isTotal) {
        runningTotal = end;
      }

      return {
        fill: isTotal ? exhibitChartColors[3] : value >= 0 ? exhibitChartColors[0] : exhibitChartColors[1],
        label: datum.label,
        range: [Math.min(start, end), Math.max(start, end)]
      };
    });

    return (
      <BarChart data={waterfallData} height={chartHeight} margin={chartMargins} width={chartWidth}>
        <CartesianGrid stroke={chartGridColor} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="label" tick={chartTick} tickMargin={10} />
        <YAxis
          tick={chartTick}
          tickFormatter={(value) => formatAxisTick(value, valueSeries)}
          width={72}
        />
        <Bar dataKey="range" isAnimationActive={false}>
          {waterfallData.map((datum) => (
            <Cell fill={datum.fill} key={datum.label} />
          ))}
        </Bar>
      </BarChart>
    );
  }

  const pieSeries = series[0];

  if (dataset.visualization.type !== "pie_chart") {
    return null;
  }

  return (
    <PieChart height={chartHeight} margin={chartMargins} width={chartWidth}>
      <Tooltip
        {...chartTooltipProps}
        formatter={(value, name) => formatTooltipValue(value, name, series)}
        labelFormatter={(label) => t("Category: {label}", { label: String(label) })}
      />
      <Pie
        cx="50%"
        cy="50%"
        data={rechartsData}
        dataKey={pieSeries.column.id}
        isAnimationActive={false}
        nameKey="label"
        outerRadius={112}
      >
        {chartData.map((datum, index) => (
          <Cell fill={exhibitChartColors[index % exhibitChartColors.length]} key={datum.label} />
        ))}
      </Pie>
    </PieChart>
  );
}

function ChartLegend({
  chartData,
  dataset,
  series
}: {
  chartData: readonly ExhibitChartDatum[];
  dataset: ExhibitDataset;
  series: readonly ExhibitChartSeries[];
}) {
  const { t } = useI18n();
  const legendItems =
    dataset.visualization.type === "pie_chart"
      ? chartData.map((datum, index) => ({
          color: exhibitChartColors[index % exhibitChartColors.length],
          label: datum.label
        }))
      : dataset.visualization.type === "waterfall"
        ? [
            { color: exhibitChartColors[0], label: t("Increase") },
            { color: exhibitChartColors[1], label: t("Decrease") },
            { color: exhibitChartColors[3], label: t("Total") }
          ]
      : series.map((item) => ({ color: item.color, label: item.column.label }));

  return (
    <section className="grid gap-2 border-s-2 border-ink/15 bg-paper px-3 py-3" data-testid="exhibit-chart-legend">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Legend")}</p>
        <p className="text-xs leading-5 text-ink/65">
          {dataset.visualization.type === "pie_chart"
              ? t("Colors show categories.")
              : dataset.visualization.type === "waterfall"
                ? t("Colors show movement direction and totals.")
                : t("Colors show plotted series.")}
        </p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {legendItems.map((item) => (
          <li className="inline-flex items-center gap-2 border border-ink/10 bg-white px-2 py-1 text-xs font-semibold text-ink" key={item.label}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChartValueList({
  chartData,
  series
}: {
  chartData: readonly ExhibitChartDatum[];
  series: readonly ExhibitChartSeries[];
}) {
  return (
    <dl className="grid auto-rows-fr gap-2 sm:grid-cols-2" data-testid="exhibit-chart-values">
      {chartData.map((datum) => (
        <div className="border-s-2 border-ink/15 bg-paper px-3 py-2" key={datum.label}>
          <dt className="text-sm font-semibold text-ink">{datum.label}</dt>
          {series.map((item) => (
            <dd className="mt-1 text-sm text-ink/70" key={item.column.id}>
              {item.column.label}: {formatExhibitCellValue(datum.values[item.column.id] ?? 0, item.column)}
            </dd>
          ))}
        </div>
      ))}
    </dl>
  );
}

function ChartStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-s-2 border-ink/15 bg-paper px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}

function formatAxisTick(value: string | number, series: ExhibitChartSeries | undefined): string {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (series === undefined || !Number.isFinite(numericValue)) {
    return String(value);
  }

  return formatExhibitCellValue(numericValue, series.column);
}

function formatTooltipValue(
  value: unknown,
  name: unknown,
  series: readonly ExhibitChartSeries[]
): [string, string] {
  const columnId = String(name);
  const column = series.find((item) => item.column.id === columnId)?.column;
  const numericValue = typeof value === "number" ? value : Number(value);

  if (column === undefined || !Number.isFinite(numericValue)) {
    return [String(value), columnId];
  }

  return [formatExhibitCellValue(numericValue, column), column.label];
}

const chartMargins = { bottom: 20, left: 8, right: 24, top: 12 };
const chartGridColor = "rgb(var(--color-chart-grid))";
const chartTick = { fill: "rgb(var(--color-chart-tick))", fontSize: 12 };
const chartTooltipProps = {
  contentStyle: {
    backgroundColor: "rgb(var(--color-white))",
    borderColor: chartGridColor,
    color: "rgb(var(--color-ink))"
  },
  cursor: { fill: chartGridColor, fillOpacity: 0.35, stroke: chartGridColor },
  itemStyle: { color: "rgb(var(--color-ink))" },
  labelStyle: { color: "rgb(var(--color-ink))" }
};

const chartTypeLabels: Record<ExhibitVisualizationType, string> = {
  bar_chart: "Bar Chart Exhibit",
  index_chart: "Index Chart Exhibit",
  line_chart: "Line Chart Exhibit",
  pie_chart: "Pie Chart Exhibit",
  scatterplot: "Scatterplot Exhibit",
  stacked_bar: "Stacked Bar Exhibit",
  table: "Table Exhibit",
  waterfall: "Waterfall Exhibit"
};
