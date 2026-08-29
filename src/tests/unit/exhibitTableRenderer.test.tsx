import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { ExhibitTableRenderer, getExhibitTableColumns } from "@/features/exhibits/ExhibitTableRenderer";
import { formatExhibitCellValue } from "@/features/exhibits/exhibitFormatting";
import type { ExhibitColumn } from "@/features/exhibits/exhibitTypes";

const tableDataset = exhibitDatasets.find((dataset) => dataset.id === "exhibit_retail_formats_001");

if (tableDataset === undefined) {
  throw new Error("Missing retail format exhibit dataset.");
}

describe("ExhibitTableRenderer", () => {
  it("renders selected exhibit columns, formatted values, and source note", () => {
    render(<ExhibitTableRenderer dataset={tableDataset} />);

    const table = screen.getByTestId("exhibit-table-exhibit_retail_formats_001");

    expect(within(table).getByRole("heading", { name: "Retail Format Economics" })).toBeInTheDocument();
    expect(within(table).getByText("Rows")).toBeInTheDocument();
    expect(within(table).getByText("3")).toBeInTheDocument();
    expect(within(table).getByText("Synthetic local dataset authored for deterministic practice.")).toBeInTheDocument();
    expect(within(table).getByTestId("exhibit-table-scroll")).toHaveClass(
      "max-h-[32rem]",
      "overflow-auto"
    );

    const headers = within(table).getAllByRole("columnheader").map((header) => header.textContent);

    expect(headers).toEqual(["Format", "Stores", "Average revenue per store$", "Gross margin%"]);
    expect(within(table).getByRole("columnheader", { name: "Stores" })).toHaveClass("text-end");
    expect(within(table).getByRole("columnheader", { name: "Format" })).toHaveClass("sticky", "start-0", "top-0");
    expect(screen.getByTestId("exhibit-table-cell-downtown_flagship-format")).toHaveTextContent(
      "Downtown flagship"
    );
    expect(screen.getByTestId("exhibit-table-cell-downtown_flagship-format")).toHaveClass("sticky", "start-0", "text-start");
    expect(screen.getByTestId("exhibit-table-cell-downtown_flagship-stores")).toHaveTextContent("8");
    expect(screen.getByTestId("exhibit-table-cell-downtown_flagship-stores")).toHaveClass("text-end");
    expect(screen.getByTestId("exhibit-table-cell-downtown_flagship-average_revenue")).toHaveTextContent(
      "$12.5M"
    );
    expect(screen.getByTestId("exhibit-table-cell-downtown_flagship-average_revenue")).toHaveClass("tabular-nums");
    expect(screen.getByTestId("exhibit-table-cell-downtown_flagship-gross_margin")).toHaveTextContent("38%");
  });

  it("returns selected table columns in exhibit order", () => {
    expect(getExhibitTableColumns(tableDataset).map((column) => column.id)).toEqual([
      "format",
      "stores",
      "average_revenue",
      "gross_margin"
    ]);
  });

  it("formats table cells by column value type", () => {
    expect(formatExhibitCellValue(45_000_000, column("currency"))).toBe("$45M");
    expect(formatExhibitCellValue(12_500_000, column("currency"))).toBe("$12.5M");
    expect(formatExhibitCellValue(0.457, column("percentage"))).toBe("45.7%");
    expect(formatExhibitCellValue(18_500, column("number"))).toBe("18,500");
    expect(formatExhibitCellValue(2024, column("year"))).toBe("2024");
    expect(formatExhibitCellValue("Enterprise", column("text"))).toBe("Enterprise");
  });
});

function column(valueType: ExhibitColumn["valueType"]): ExhibitColumn {
  return {
    id: "sample",
    label: "Sample",
    role: valueType === "text" || valueType === "year" ? "dimension" : "metric",
    unit: valueType === "currency" ? "currency" : valueType === "percentage" ? "percentage" : "units",
    valueType
  };
}
