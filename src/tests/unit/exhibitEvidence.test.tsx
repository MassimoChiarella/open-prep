import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { ExhibitQuestionFlow } from "@/features/exhibits/ExhibitQuestionFlow";
import { validateExhibitResponse } from "@/features/exhibits/exhibitDataset";
import { formatExhibitAnswerValue } from "@/features/exhibits/exhibitFormatting";
import type { ExhibitDataset } from "@/features/exhibits/exhibitTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const datasets: readonly ExhibitDataset[] = exhibitDatasets;

const calculations: Array<[string, string, string[], (cells: Record<string, number>) => number]> = [
  ["west_route_revenue", "west", ["passengers", "average_fare"], (r) => r.passengers * r.average_fare],
  ["plant_c_utilization", "plant_c", ["actual_output", "capacity"], (r) => r.actual_output / r.capacity],
  ["outpatient_revenue", "outpatient", ["visits", "average_revenue"], (r) => r.visits * r.average_revenue],
  ["lunch_revenue", "lunch", ["transactions", "average_ticket"], (r) => r.transactions * r.average_ticket],
  ["dinner_labor_cost", "dinner", ["transactions", "average_ticket", "labor_cost_rate"], (r) => r.transactions * r.average_ticket * r.labor_cost_rate],
  ["april_total_shipping_cost", "apr", ["shipments", "cost_per_shipment"], (r) => r.shipments * r.cost_per_shipment],
  ["wealth_revenue_per_customer", "wealth", ["revenue", "customers"], (r) => r.revenue / r.customers],
  ["plant_c_yield", "plant_c", ["good_units", "input_units"], (r) => r.good_units / r.input_units],
  ["plant_b_defects", "plant_b", ["input_units", "good_units"], (r) => r.input_units - r.good_units]
];

describe("independent exhibit evidence", () => {
  it.each(calculations)("shows the operands and accepts the independently calculated %s answer", (questionId, rowId, operands, calculate) => {
    const dataset = datasets.find((item) => item.questions.some((question) => question.id === questionId))!;
    const question = dataset.questions.find((item) => item.id === questionId)!;
    if (question.responseType === "multiple_choice") throw new Error("Expected numeric question");
    const row = dataset.rows.find((item) => item.id === rowId)!;
    const cells = Object.fromEntries(Object.entries(row.cells).filter((cell): cell is [string, number] => typeof cell[1] === "number"));
    render(<ExhibitQuestionFlow datasets={[dataset]} storageFactory={() => new MemoryAppStorage()} />);
    const evidence = screen.getByTestId("exhibit-chart-values");
    const rowEvidence = [...evidence.querySelectorAll("dl > div")].find((node) =>
      node.querySelector("dt")?.textContent === String(row.cells[dataset.visualization.categoryColumnId ?? dataset.visualization.xColumnId!])
    )!;
    for (const operand of operands) {
      const column = dataset.columns.find((item) => item.id === operand)!;
      const expected = column.valueType === "currency" ? `$${cells[operand].toLocaleString("en-US")}`
        : column.valueType === "percentage" ? `${cells[operand] * 100}%` : cells[operand].toLocaleString("en-US");
      expect(rowEvidence).toHaveTextContent(`${column.label}: ${expected}`);
    }
    expect(screen.queryByTestId("exhibit-solution-panel")).not.toBeInTheDocument();
    const expectedAnswer = calculate(cells);
    expect(question.answer.value).toBeCloseTo(expectedAnswer, 8);
    expect(validateExhibitResponse(formatExhibitAnswerValue(expectedAnswer, question.answer.unit), question).isCorrect).toBe(true);
  });

  it("grades the North-West gap in percentage points", () => {
    const dataset = datasets.find((item) => item.id === "exhibit_regional_productivity_003")!;
    const question = dataset.questions.find((item) => item.id === "north_west_conversion_gap")!;
    if (question.responseType === "multiple_choice") throw new Error("Expected numeric question");
    const north = Number(dataset.rows.find((row) => row.id === "north")!.cells.conversion_rate);
    const west = Number(dataset.rows.find((row) => row.id === "west")!.cells.conversion_rate);
    expect(question.answer.value).toBeCloseTo((north - west) * 100, 12);
    expect(formatExhibitAnswerValue(question.answer.value, question.answer.unit)).toBe("4 pp");
    expect(validateExhibitResponse("4", question).isCorrect).toBe(true);
    expect(validateExhibitResponse("4 pp", question).isCorrect).toBe(true);
    expect(validateExhibitResponse("0.04", question).isCorrect).toBe(false);
  });

  it.each([
    [1234567, "currency", "$1,234,567"],
    [12.3456789, "none", "12.3456789"],
    [0.123456789, "percentage", "12.3456789%"],
    [0.0000001234, "none", "0.0000001234"]
  ] as const)("preserves exact %s values in evidence and solutions", (value, unit, displayed) => {
    const dataset: ExhibitDataset = {
      ...exhibitDatasets[0],
      visualization: { type: "table" },
      columns: [{ id: "segment", label: "Segment", role: "dimension", valueType: "text" },
        { id: "value", label: "Value", role: "metric", valueType: unit === "none" ? "number" : unit, unit }],
      rows: [{ id: "north", cells: { segment: "North", value } }],
      questions: [{ id: "read-value", prompt: "What is the North value?", difficulty: "beginner", tags: ["revenue"],
        answer: { value, unit, roundingRule: "exact", tolerance: { type: "absolute", value: 0 } },
        explanation: { short: "Read North.", steps: ["Read the North row."] } }]
    };
    render(<ExhibitQuestionFlow datasets={[dataset]} storageFactory={() => new MemoryAppStorage()} />);
    expect(within(screen.getByTestId("exhibit-table-scroll")).getByText(displayed)).toBeInTheDocument();
    expect(formatExhibitAnswerValue(value, unit)).toBe(displayed);
    expect(validateExhibitResponse(displayed, dataset.questions[0]).isCorrect).toBe(true);
  });
});
