import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { ExhibitChartRenderer } from "@/features/exhibits/ExhibitChartRenderer";
import {
  exhibitChartColors,
  getExhibitChartData,
  getExhibitChartSeries,
  isExhibitChartDataset,
} from "@/features/exhibits/exhibitChartData";
import type { ExhibitDataset } from "@/features/exhibits/exhibitTypes";

const barDataset = exhibitDatasets.find((dataset) => dataset.id === "exhibit_saas_segments_001");
const pieDataset = exhibitDatasets.find((dataset) => dataset.id === "exhibit_insurance_claims_001");
const tableDataset = exhibitDatasets.find((dataset) => dataset.id === "exhibit_retail_formats_001");
const waterfallDataset = exhibitDatasets.find((dataset) => dataset.id === "exhibit_consumer_profit_bridge_003");
const scatterDataset = exhibitDatasets.find((dataset) => dataset.id === "exhibit_regional_productivity_003");
const stackedDataset = exhibitDatasets.find((dataset) => dataset.id === "exhibit_meal_kit_mix_003");
const indexDataset = exhibitDatasets.find((dataset) => dataset.id === "exhibit_input_cost_index_003");

if (
  barDataset === undefined ||
  pieDataset === undefined ||
  tableDataset === undefined ||
  waterfallDataset === undefined ||
  scatterDataset === undefined ||
  stackedDataset === undefined ||
  indexDataset === undefined
) {
  throw new Error("Missing exhibit renderer test datasets.");
}

describe("ExhibitChartRenderer", () => {
  it("renders a local bar chart with formatted value summaries", () => {
    const { container } = render(<ExhibitChartRenderer dataset={barDataset} />);

    const chart = screen.getByTestId("exhibit-chart-exhibit_saas_segments_001");

    expect(within(chart).getByRole("heading", { name: "SaaS Revenue by Segment" })).toBeInTheDocument();
    expect(within(chart).getByText("Bar Chart Exhibit")).toBeInTheDocument();
    expect(within(chart).getByTestId("exhibit-chart-canvas-exhibit_saas_segments_001")).toHaveAttribute(
      "role",
      "img"
    );
    expect(within(chart).getByTestId("exhibit-chart-canvas-exhibit_saas_segments_001")).toHaveClass(
      "h-[320px]",
      "w-[720px]",
      "shrink-0"
    );
    expect(within(chart).getByTestId("exhibit-chart-legend")).toHaveTextContent("Legend");
    expect(within(chart).getByTestId("exhibit-chart-legend")).toHaveTextContent("Recurring revenue");
    const values = within(chart).getByTestId("exhibit-chart-values");

    expect(chart).toHaveClass("break-words");
    expect(within(chart).getByRole("heading", { name: barDataset.title })).toHaveClass(
      "min-w-0",
      "[overflow-wrap:anywhere]"
    );
    expect(values).toHaveClass("max-h-[32rem]", "overflow-auto");
    expect(values).toHaveAttribute("aria-label", "Chart values");
    expect(values).toHaveAttribute("role", "region");
    expect(values).toHaveAttribute("tabindex", "0");
    expect(within(values).getByText("SMB")).toBeInTheDocument();
    expect(within(values).getByText("Recurring revenue: $18M")).toBeInTheDocument();
    expect(within(chart).getByText(barDataset.sourceNote!)).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("prepares chart series and rows from bundled exhibit data", () => {
    expect(isExhibitChartDataset(barDataset)).toBe(true);
    expect(isExhibitChartDataset(tableDataset)).toBe(false);
    expect(getExhibitChartSeries(barDataset).map((series) => series.column.id)).toEqual(["revenue"]);
    expect(getExhibitChartData(barDataset)).toEqual([
      { label: "SMB", values: { revenue: 18_000_000 } },
      { label: "Mid-market", values: { revenue: 27_000_000 } },
      { label: "Enterprise", values: { revenue: 45_000_000 } }
    ]);
  });

  it.each(["line_chart", "index_chart"] as const)(
    "preserves authored row order and values for %s without rebasing",
    (type) => {
      const dataset = structuredClone(indexDataset) as ExhibitDataset;
      if (dataset.visualization.type !== "index_chart") throw new Error("Expected index-chart dataset.");
      const xColumnId = dataset.visualization.xColumnId;
      const yColumnId = dataset.visualization.yColumnIds?.[0];
      if (xColumnId === undefined || yColumnId === undefined) throw new Error("Expected chart axes.");
      dataset.visualization = { ...dataset.visualization, type };
      dataset.rows = [
        { id: "third", cells: { [xColumnId]: "FY2027", [yColumnId]: 137 } },
        { id: "first", cells: { [xColumnId]: "FY2025", [yColumnId]: 91 } },
        { id: "second", cells: { [xColumnId]: "FY2026", [yColumnId]: 205 } }
      ];

      expect(getExhibitChartData(dataset)).toEqual([
        { label: "FY2027", values: { [yColumnId]: 137 } },
        { label: "FY2025", values: { [yColumnId]: 91 } },
        { label: "FY2026", values: { [yColumnId]: 205 } }
      ]);
    }
  );

  it("supports pie chart category and value columns", () => {
    const { container } = render(<ExhibitChartRenderer dataset={pieDataset} />);

    const chart = screen.getByTestId("exhibit-chart-exhibit_insurance_claims_001");

    expect(within(chart).getByText("Pie Chart Exhibit")).toBeInTheDocument();
    expect(within(chart).getByTestId("exhibit-chart-legend")).toHaveTextContent("Colors show categories.");
    expect(within(chart).getByTestId("exhibit-chart-legend")).toHaveTextContent("Auto");
    expect(getExhibitChartSeries(pieDataset).map((series) => series.column.id)).toEqual(["claim_dollars"]);
    expect(within(within(chart).getByTestId("exhibit-chart-values")).getByText("Auto")).toBeInTheDocument();
    expect(within(chart).getByText("Claim dollars: $32M")).toBeInTheDocument();

    const firstSlice = container.querySelector(".recharts-pie-sector");
    expect(firstSlice).not.toBeNull();
    fireEvent.mouseEnter(firstSlice!, { clientX: 360, clientY: 160 });
    expect(container.querySelector(".recharts-tooltip-wrapper")).toHaveTextContent("Auto");
    expect(container.querySelector(".recharts-tooltip-wrapper")).toHaveTextContent("$32M");
  });

  it("keeps practical precision in shared and waterfall tooltip routes", async () => {
    const exactBar = structuredClone(barDataset) as ExhibitDataset;
    exactBar.rows[0]!.cells.revenue = 1_350_000;
    const barRender = render(<ExhibitChartRenderer dataset={exactBar} />);
    const bar = barRender.container.querySelector(".recharts-bar-rectangle");
    expect(bar).not.toBeNull();
    fireEvent.mouseEnter(bar!, { clientX: 200, clientY: 160, pageX: 200, pageY: 160 });
    fireEvent.mouseMove(bar!, { clientX: 200, clientY: 160, pageX: 200, pageY: 160 });
    await waitFor(() => expect(barRender.container.querySelector(".recharts-tooltip-wrapper")).toHaveTextContent("$1.35M"));
    barRender.unmount();

    const exactWaterfall = structuredClone(waterfallDataset) as ExhibitDataset;
    if (exactWaterfall.visualization.type !== "waterfall") throw new Error("Expected waterfall dataset.");
    const valueColumnId = exactWaterfall.visualization.yColumnIds?.[0];
    if (valueColumnId === undefined) throw new Error("Expected waterfall value series.");
    exactWaterfall.rows.forEach((row) => {
      row.cells[valueColumnId] = 1_350_000;
    });
    const waterfallRender = render(<ExhibitChartRenderer dataset={exactWaterfall} />);
    const waterfall = waterfallRender.container.querySelector(".recharts-bar-rectangle");
    expect(waterfall).not.toBeNull();
    fireEvent.mouseEnter(waterfall!, { clientX: 200, clientY: 160, pageX: 200, pageY: 160 });
    fireEvent.mouseMove(waterfall!, { clientX: 200, clientY: 160, pageX: 200, pageY: 160 });
    await waitFor(() => expect(waterfallRender.container.querySelector(".recharts-tooltip-wrapper")).toHaveTextContent("$1.35M"));
  });

  it("keeps v2 waterfall totals absolute without seeding or resetting the running total", () => {
    const dataset = structuredClone(waterfallDataset) as ExhibitDataset;
    if (dataset.visualization.type !== "waterfall") throw new Error("Expected waterfall dataset.");
    const xColumnId = dataset.visualization.xColumnId;
    const yColumnId = dataset.visualization.yColumnIds?.[0];
    if (xColumnId === undefined || yColumnId === undefined) throw new Error("Expected waterfall axes.");
    const row = (id: string, label: string, value: number) => ({
      cells: { [xColumnId]: label, [yColumnId]: value },
      id
    });

    dataset.rows = [
      row("starting-delta", "Starting delta", 100),
      row("checkpoint-total", "Checkpoint total", 50),
      row("later-delta", "Later delta", -20)
    ];
    dataset.visualization.totalRowIds = ["checkpoint-total"];
    const resetCheck = render(<ExhibitChartRenderer dataset={dataset} />);
    const resetBars = resetCheck.container.querySelectorAll(".recharts-bar-rectangle");
    const startingDelta = readBarGeometry(resetBars[0]);
    const checkpointTotal = readBarGeometry(resetBars[1]);
    const laterDelta = readBarGeometry(resetBars[2]);

    expect(checkpointTotal.y + checkpointTotal.height).toBeCloseTo(startingDelta.y + startingDelta.height, 5);
    expect(laterDelta.y).toBeCloseTo(startingDelta.y, 5);
    resetCheck.unmount();

    dataset.rows = [
      row("opening-total", "Opening total", 100),
      row("first-delta", "First delta", 20)
    ];
    dataset.visualization.totalRowIds = ["opening-total"];
    const seedCheck = render(<ExhibitChartRenderer dataset={dataset} />);
    const seedBars = seedCheck.container.querySelectorAll(".recharts-bar-rectangle");
    const openingTotal = readBarGeometry(seedBars[0]);
    const firstDelta = readBarGeometry(seedBars[1]);

    expect(firstDelta.y + firstDelta.height).toBeCloseTo(openingTotal.y + openingTotal.height, 5);
  });

  it("does not render charts for table datasets", () => {
    const { container } = render(<ExhibitChartRenderer dataset={tableDataset} />);

    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    [waterfallDataset, "Waterfall Exhibit"],
    [scatterDataset, "Scatterplot Exhibit"],
    [stackedDataset, "Stacked Bar Exhibit"],
    [indexDataset, "Index Chart Exhibit"]
  ])("renders the new %s visualization", (dataset, label) => {
    const { container } = render(<ExhibitChartRenderer dataset={dataset} />);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByTestId(`exhibit-chart-canvas-${dataset.id}`)).toHaveAttribute("role", "img");
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector(".recharts-tooltip-wrapper")).not.toBeNull();
  });

  it("includes both axes as value series for scatterplots", () => {
    expect(getExhibitChartSeries(scatterDataset).map((series) => series.column.id)).toEqual([
      "monthly_visits",
      "conversion_rate"
    ]);
    expect(getExhibitChartData(scatterDataset)[0]).toEqual({
      label: "North",
      values: { conversion_rate: 0.18, monthly_visits: 120_000 }
    });
  });

  it("assigns a distinct color to every schema-permitted chart series", () => {
    const seriesIds = Array.from({ length: 8 }, (_, index) => `metric-${index + 1}`);
    const dataset: ExhibitDataset = {
      ...barDataset,
      columns: [
        { id: "category", label: "Category", role: "dimension", valueType: "text" },
        ...seriesIds.map((id, index) => ({
          id,
          label: `Metric ${index + 1}`,
          role: "metric" as const,
          unit: "units" as const,
          valueType: "number" as const
        }))
      ],
      rows: [{
        cells: Object.fromEntries([
          ["category", "One"],
          ...seriesIds.map((id, index) => [id, index + 1])
        ]),
        id: "one"
      }],
      visualization: { type: "bar_chart", xColumnId: "category", yColumnIds: seriesIds }
    };
    const colors = getExhibitChartSeries(dataset).map(({ color }) => color);

    expect(colors).toEqual(exhibitChartColors);
    expect(new Set(colors).size).toBe(8);
  });
});

function readBarGeometry(element: Element | undefined): { height: number; y: number } {
  if (element === undefined) throw new Error("Expected waterfall bar geometry.");
  const shape = element.querySelector("[height][y]");
  const heightAttribute = shape?.getAttribute("height");
  const yAttribute = shape?.getAttribute("y");
  if (heightAttribute === null || heightAttribute === undefined || yAttribute === null || yAttribute === undefined) {
    throw new Error("Expected waterfall geometry attributes.");
  }
  const height = Number(heightAttribute);
  const y = Number(yAttribute);
  if (!Number.isFinite(height) || !Number.isFinite(y)) throw new Error("Expected numeric waterfall geometry.");
  return { height, y };
}
