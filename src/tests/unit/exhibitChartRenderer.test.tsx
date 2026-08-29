import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { ExhibitChartRenderer } from "@/features/exhibits/ExhibitChartRenderer";
import {
  getExhibitChartData,
  getExhibitChartSeries,
  isExhibitChartDataset,
} from "@/features/exhibits/exhibitChartData";

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

  it("supports pie chart category and value columns", () => {
    render(<ExhibitChartRenderer dataset={pieDataset} />);

    const chart = screen.getByTestId("exhibit-chart-exhibit_insurance_claims_001");

    expect(within(chart).getByText("Pie Chart Exhibit")).toBeInTheDocument();
    expect(within(chart).getByTestId("exhibit-chart-legend")).toHaveTextContent("Colors show categories.");
    expect(within(chart).getByTestId("exhibit-chart-legend")).toHaveTextContent("Auto");
    expect(getExhibitChartSeries(pieDataset).map((series) => series.column.id)).toEqual(["claim_dollars"]);
    expect(within(within(chart).getByTestId("exhibit-chart-values")).getByText("Auto")).toBeInTheDocument();
    expect(within(chart).getByText("Claim dollars: $32M")).toBeInTheDocument();
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
});
