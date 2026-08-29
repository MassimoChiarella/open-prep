import { describe, expect, it } from "vitest";

import { validateExhibitQuestionPackPayload } from "@/features/question-packs/questionPackExhibit";
import { questionPackMaxFileBytes } from "@/features/question-packs/questionPackValidation";

describe("validateExhibitQuestionPackPayload", () => {
  it("sanitizes a complete v2 exhibit pack with numeric and multiple-choice questions", () => {
    const payload = {
      $schema: " ./question-pack-v2.schema.json ",
      ...validPayload(),
      title: " Exhibit Practice ",
      description: " Synthetic practice data. ",
      publisher: " Example School ",
      license: " CC-BY-4.0 "
    };
    const result = validateExhibitQuestionPackPayload(payload, "2026-08-10T07:00:00.000Z");

    expect(result.status).toBe("valid");
    if (result.status === "invalid") throw new Error(result.errors.join("\n"));
    expect(result.pack).toMatchObject({
      format: "math-drill-question-pack",
      schemaVersion: 2,
      kind: "exhibit",
      id: "retail-exhibits",
      title: "Exhibit Practice",
      description: "Synthetic practice data.",
      publisher: "Example School",
      license: "CC-BY-4.0",
      importedAt: "2026-08-10T07:00:00.000Z"
    });
    expect(result.pack).not.toHaveProperty("$schema");
    expect(result.pack.datasets[0]).toMatchObject({
      columns: [
        { id: "segment", role: "dimension", valueType: "text" },
        { id: "revenue", role: "metric", valueType: "currency" }
      ],
      visualization: { type: "bar_chart", xColumnId: "segment", yColumnIds: ["revenue"] }
    });
    expect(result.pack.datasets[0].questions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "total-revenue", answer: expect.objectContaining({ value: 300, unit: "currency" }) }),
        expect.objectContaining({ id: "largest-segment", responseType: "multiple_choice", correctChoiceId: "enterprise" })
      ])
    );
  });

  it("rejects unknown fields and duplicate IDs throughout the pack", () => {
    const dataset = validDataset();
    const invalidDataset = {
      ...dataset,
      unexpected: true,
      columns: [
        { ...dimensionColumn(), unexpected: true },
        metricColumn(),
        { ...metricColumn(), description: "Duplicate ID with otherwise valid content." }
      ],
      rows: [validRow("shared-row", "SMB", 100), validRow("shared-row", "Enterprise", 200)],
      questions: [validNumericQuestion("shared-question"), validNumericQuestion("shared-question")]
    };
    const result = validateExhibitQuestionPackPayload({
      ...validPayload(),
      unexpected: true,
      datasets: [invalidDataset, { ...invalidDataset, id: dataset.id }]
    });
    const errors = expectInvalidErrors(result);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("$.unexpected is not an allowed property"),
        expect.stringContaining("datasets[0].unexpected is not an allowed property"),
        expect.stringContaining("columns[0].unexpected is not an allowed property"),
        expect.stringContaining("columns[2].id duplicates column ID"),
        expect.stringContaining("rows[1].id duplicates row ID"),
        expect.stringContaining("questions[1].id duplicates question ID"),
        expect.stringContaining("datasets[1].id duplicates dataset ID")
      ])
    );
  });

  it("validates row cells and visualization references", () => {
    const dataset = {
      ...validDataset(),
      rows: [
        { id: "bad-row", cells: { segment: 12, revenue: Number.NaN, extra: 1 } },
        { id: "missing-row", cells: { segment: "Enterprise" } }
      ],
      visualization: {
        type: "bar_chart",
        xColumnId: "revenue",
        yColumnIds: ["segment", "missing-column"]
      }
    };
    const errors = expectInvalidErrors(validateExhibitQuestionPackPayload({ ...validPayload(), datasets: [dataset] }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("cells.extra is not an allowed property"),
        expect.stringContaining("cells.segment must be non-empty text"),
        expect.stringContaining("cells.revenue must be a finite number"),
        expect.stringContaining("cells.revenue is required"),
        expect.stringContaining("xColumnId must reference a dimension column"),
        expect.stringContaining("yColumnIds[0] must reference a metric column"),
        expect.stringContaining("yColumnIds[1] must reference an existing column ID")
      ])
    );
  });

  it("rejects unsafe pie values and invalid visualization-specific properties", () => {
    const negativePie = {
      ...validDataset(),
      rows: [validRow("loss", "Loss", -10), validRow("gain", "Gain", 10)],
      visualization: {
        type: "pie_chart",
        categoryColumnId: "segment",
        valueColumnId: "revenue",
        yColumnIds: ["revenue"]
      }
    };
    const errors = expectInvalidErrors(
      validateExhibitQuestionPackPayload({ ...validPayload(), datasets: [negativePie] })
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("visualization.yColumnIds is not an allowed property"),
        expect.stringContaining("pie-chart values must be non-negative"),
        expect.stringContaining("pie-chart values must have a positive total")
      ])
    );

    const zeroPie = {
      ...negativePie,
      rows: [validRow("one", "One", 0), validRow("two", "Two", 0)],
      visualization: { type: "pie_chart", categoryColumnId: "segment", valueColumnId: "revenue" }
    };
    expect(expectInvalidErrors(validateExhibitQuestionPackPayload({ ...validPayload(), datasets: [zeroPie] }))).toContain(
      "$.datasets[0].visualization pie-chart values must have a positive total."
    );
  });

  it("rejects scatterplots with more than one Y series", () => {
    const dataset = {
      ...validDataset(),
      columns: [
        dimensionColumn(),
        metricColumn(),
        { id: "cost", label: "Cost", role: "metric", valueType: "currency", unit: "currency" },
        { id: "orders", label: "Orders", role: "metric", valueType: "number", unit: "units" }
      ],
      rows: [
        { id: "smb", cells: { segment: "SMB", revenue: 100, cost: 60, orders: 10 } },
        { id: "enterprise", cells: { segment: "Enterprise", revenue: 200, cost: 120, orders: 20 } }
      ],
      visualization: {
        type: "scatterplot",
        categoryColumnId: "segment",
        xColumnId: "revenue",
        yColumnIds: ["cost", "orders"]
      }
    };

    expect(
      expectInvalidErrors(validateExhibitQuestionPackPayload({ ...validPayload(), datasets: [dataset] }))
    ).toContain("$.datasets[0].visualization.yColumnIds must contain 1 to 1 items.");
  });

  it("validates numeric answers, explanations, and multiple-choice correctness", () => {
    const badNumeric = {
      ...validNumericQuestion("bad-numeric"),
      answer: {
        value: Number.POSITIVE_INFINITY,
        unit: "credits",
        tolerance: { type: "percentage", value: 1.1 },
        errorChecks: {},
        extra: true
      },
      explanation: { short: " ", steps: [] }
    };
    const badChoice = {
      ...validChoiceQuestion("bad-choice"),
      choices: [
        { id: "same", label: "Same" },
        { id: "same", label: "Same" }
      ],
      correctChoiceId: "missing",
      answer: { value: 1, unit: "none" }
    };
    const errors = expectInvalidErrors(
      validateExhibitQuestionPackPayload({
        ...validPayload(),
        datasets: [{ ...validDataset(), questions: [badNumeric, badChoice] }]
      })
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("answer.extra is not an allowed property"),
        expect.stringContaining("answer.value must be a finite number"),
        expect.stringContaining("answer.unit must be one of"),
        expect.stringContaining("tolerance.value must be at most 1"),
        expect.stringContaining("errorChecks must define at least one error check"),
        expect.stringContaining("explanation.short must be non-empty text"),
        expect.stringContaining("explanation.steps must contain 1 to 10 items"),
        expect.stringContaining("questions[1].answer is not an allowed property"),
        expect.stringContaining("choices[1].id duplicates choice ID"),
        expect.stringContaining("choices[1].label duplicates choice label"),
        expect.stringContaining("correctChoiceId must reference a choice ID")
      ])
    );
  });

  it("enforces collection, chart-series, and file caps", () => {
    const datasets = Array.from({ length: 101 }, (_, index) => ({ ...validDataset(), id: `dataset-${index}` }));
    expect(expectInvalidErrors(validateExhibitQuestionPackPayload({ ...validPayload(), datasets }))).toContain(
      "$.datasets must contain 1 to 100 items."
    );

    const tooManyRows = Array.from({ length: 501 }, (_, index) => validRow(`row-${index}`, `Row ${index}`, index + 1));
    expect(
      expectInvalidErrors(
        validateExhibitQuestionPackPayload({ ...validPayload(), datasets: [{ ...validDataset(), rows: tooManyRows }] })
      )
    ).toContain("$.datasets[0].rows must contain 1 to 500 items.");

    const tooManyQuestions = Array.from({ length: 51 }, (_, index) => validNumericQuestion(`question-${index}`));
    expect(
      expectInvalidErrors(
        validateExhibitQuestionPackPayload({
          ...validPayload(),
          datasets: [{ ...validDataset(), questions: tooManyQuestions }]
        })
      )
    ).toContain("$.datasets[0].questions must contain 1 to 50 items.");

    const series = Array.from({ length: 9 }, (_, index) => `metric-${index}`);
    expect(
      expectInvalidErrors(
        validateExhibitQuestionPackPayload({
          ...validPayload(),
          datasets: [{ ...validDataset(), visualization: { type: "bar_chart", xColumnId: "segment", yColumnIds: series } }]
        })
      )
    ).toContain("$.datasets[0].visualization.yColumnIds must contain 1 to 8 items.");

    expect(
      expectInvalidErrors(
        validateExhibitQuestionPackPayload({ ...validPayload(), padding: "x".repeat(questionPackMaxFileBytes) })
      )
    ).toContain("$ exceeds the 5 MiB question-pack file limit.");
  });

  it("accepts a realistic structured exhibit pack larger than the old 1 MiB limit", () => {
    const payload = largeValidExhibitPayload();
    const bytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;

    expect(bytes).toBeGreaterThan(1024 * 1024);
    expect(bytes).toBeLessThan(questionPackMaxFileBytes);
    expect(validateExhibitQuestionPackPayload(payload).status).toBe("valid");
  });
});

function validPayload() {
  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "exhibit",
    id: "retail-exhibits",
    packVersion: "1.0.0",
    title: "Retail Exhibits",
    datasets: [validDataset()]
  };
}

function validDataset() {
  return {
    id: "retail-revenue",
    title: "Retail Revenue",
    description: "Revenue by customer segment.",
    unit: "currency",
    sourceNote: "Synthetic local dataset.",
    visualization: {
      type: "bar_chart",
      title: "Revenue by segment",
      xColumnId: "segment",
      yColumnIds: ["revenue"]
    },
    columns: [dimensionColumn(), metricColumn()],
    rows: [validRow("smb", "SMB", 100), validRow("enterprise", "Enterprise", 200)],
    questions: [validNumericQuestion("total-revenue"), validChoiceQuestion("largest-segment")]
  };
}

function largeValidExhibitPayload() {
  const columns = [
    dimensionColumn(),
    ...Array.from({ length: 19 }, (_, index) => ({
      id: `metric-${index}`,
      label: `Metric ${index + 1}`,
      role: "metric",
      valueType: "number",
      unit: "none"
    }))
  ];
  const datasets = Array.from({ length: 8 }, (_, datasetIndex) => ({
    id: `dataset-${datasetIndex}`,
    title: `Operating Dataset ${datasetIndex + 1}`,
    description: "Synthetic operating metrics by segment for exhibit practice.",
    unit: "none",
    sourceNote: "Synthetic local dataset.",
    visualization: { type: "table", selectedColumnIds: ["segment", "metric-0"] },
    columns,
    rows: Array.from({ length: 500 }, (_, rowIndex) => ({
      id: `row-${rowIndex}`,
      cells: Object.fromEntries([
        ["segment", `Segment ${rowIndex + 1}`],
        ...Array.from({ length: 19 }, (_, metricIndex) => [
          `metric-${metricIndex}`,
          rowIndex + metricIndex + 1
        ])
      ])
    })),
    questions: [validNumericQuestion("first-metric")]
  }));

  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "exhibit",
    id: "large-structured-exhibit",
    packVersion: "1.0.0",
    title: "Large Structured Exhibit",
    datasets
  };
}

function dimensionColumn() {
  return { id: "segment", label: "Segment", role: "dimension", valueType: "text" };
}

function metricColumn() {
  return { id: "revenue", label: "Revenue", role: "metric", valueType: "currency", unit: "currency" };
}

function validRow(id: string, segment: string, revenue: number) {
  return { id, cells: { segment, revenue } };
}

function validNumericQuestion(id: string) {
  return {
    id,
    prompt: "What is total revenue?",
    difficulty: "beginner",
    expectedTimeSeconds: 45,
    tags: ["addition", "revenue"],
    responseType: "numeric",
    answer: {
      value: 300,
      unit: "currency",
      tolerance: { type: "absolute", value: 1 },
      roundingRule: "exact"
    },
    explanation: { short: "Add both segments.", steps: ["100 + 200 = 300."] }
  };
}

function validChoiceQuestion(id: string) {
  return {
    id,
    prompt: "Which segment is largest?",
    difficulty: "beginner",
    tags: ["revenue"],
    responseType: "multiple_choice",
    choices: [
      { id: "smb", label: "SMB" },
      { id: "enterprise", label: "Enterprise" }
    ],
    correctChoiceId: "enterprise",
    explanation: { short: "Compare the segment values.", steps: ["Enterprise revenue is higher."] }
  };
}

function expectInvalidErrors(result: ReturnType<typeof validateExhibitQuestionPackPayload>): string[] {
  expect(result.status).toBe("invalid");
  if (result.status === "valid") throw new Error("Expected an invalid exhibit pack.");
  return result.errors;
}
