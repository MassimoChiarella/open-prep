import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { fitPracticePrompts } from "@/data/casePractice/fitPrompts";
import {
  getGeneratedTemplateCombinationCount,
  reviewQuestionPack
} from "@/features/question-packs/questionPackReview";
import { validateQuestionPackPayload } from "@/features/question-packs/questionPack";
import type { QuestionPackRecord } from "@/lib/storage/appStorageTypes";

const representativeAssets = [
  "question-pack-example.mathdrill.json",
  "question-pack-template-example.mathdrill.json",
  "question-pack-exhibit-example.mathdrill.json",
  "question-pack-market-sizing-example.mathdrill.json",
  "question-pack-benchmark-example.mathdrill.json",
  "question-pack-v3-full-case-example.mathdrill.json"
] as const;

describe("question-pack review", () => {
  it.each(representativeAssets)("reviews %s deterministically without mutating it", (assetName) => {
    const pack = validatedPublicPack(assetName);
    const before = JSON.stringify(pack);

    expect(reviewQuestionPack(pack)).toEqual(reviewQuestionPack(pack));
    expect(reviewQuestionPack(pack).warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "human-answer-review-required", path: "$" })
      ])
    );
    expect(JSON.stringify(pack)).toBe(before);
  });

  it("counts independent generated combinations without expanding them", () => {
    const pack = validatedPublicPack("question-pack-template-example.mathdrill.json");
    expect(pack.kind).toBe("generated_template");
    if (pack.kind !== "generated_template") return;

    const template = structuredClone(pack.templates[0]!);
    expect(getGeneratedTemplateCombinationCount(template)).toBe(15);
    template.variables.units = { type: "integer", values: Array.from({ length: 17 }, (_, index) => index + 1) };
    template.variables.price = { type: "currency", values: Array.from({ length: 17 }, (_, index) => index + 1) };
    pack.templates = [template];

    expect(getGeneratedTemplateCombinationCount(template)).toBe(289);
    expect(reviewQuestionPack(pack).warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "generated-combinations-exceed-probes", path: "$.templates[0]" })
      ])
    );

    const boundaryTemplate = structuredClone(template);
    boundaryTemplate.variables = {
      probe: { type: "integer", min: 1, max: 256, step: 1 }
    };
    pack.templates = [boundaryTemplate];
    expect(getGeneratedTemplateCombinationCount(boundaryTemplate)).toBe(256);
    expect(reviewQuestionPack(pack).warnings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "generated-combinations-exceed-probes" })
    ]));
    boundaryTemplate.variables = {
      probe: { type: "integer", min: 1, max: 257, step: 1 }
    };
    expect(getGeneratedTemplateCombinationCount(boundaryTemplate)).toBe(257);
    expect(reviewQuestionPack(pack).warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "generated-combinations-exceed-probes", path: "$.templates[0]" })
    ]));

    template.variables = {
      decimalRange: { type: "decimal", min: 0, max: 0.3, step: 0.1 }
    };
    expect(getGeneratedTemplateCombinationCount(template)).toBe(3);

    template.variables = Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [
        `value${index}`,
        { type: "integer" as const, values: Array.from({ length: 100 }, (_, value) => value) }
      ])
    );
    expect(getGeneratedTemplateCombinationCount(template)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it.each([
    ["bar_chart", 20],
    ["index_chart", 50],
    ["line_chart", 50],
    ["pie_chart", 8],
    ["scatterplot", 200],
    ["stacked_bar", 20],
    ["waterfall", 20]
  ] as const)("warns above, but not at, the %s row guidance of %i", (visualizationType, limit) => {
    const pack = validatedPublicPack("question-pack-visualization-cookbook.mathdrill.json");
    if (pack.kind !== "exhibit") throw new Error("Expected an exhibit cookbook.");
    const dataset = pack.datasets.find(({ visualization }) => visualization.type === visualizationType);
    if (dataset === undefined) throw new Error(`Expected ${visualizationType}.`);
    const sourceRows = structuredClone(dataset.rows);
    const resize = (count: number) => Array.from({ length: count }, (_, index) => ({
      ...structuredClone(sourceRows[index % sourceRows.length]!),
      id: `${visualizationType}-${index}`
    }));

    dataset.rows = resize(limit);
    expect(reviewQuestionPack(pack).warnings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "exhibit-row-density", path: expect.stringContaining(".rows") })
    ]));

    dataset.rows = resize(limit + 1);
    expect(reviewQuestionPack(pack).warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "exhibit-row-density", path: expect.stringContaining(".rows") })
    ]));
  });

  it("uses inclusive pie-total and plotted-series review boundaries", () => {
    const pack = validatedPublicPack("question-pack-visualization-cookbook.mathdrill.json");
    if (pack.kind !== "exhibit") throw new Error("Expected an exhibit cookbook.");
    const pie = pack.datasets.find(({ visualization }) => visualization.type === "pie_chart");
    const bar = pack.datasets.find(({ visualization }) => visualization.type === "bar_chart");
    if (pie === undefined || pie.visualization.type !== "pie_chart" || bar === undefined || bar.visualization.type !== "bar_chart") {
      throw new Error("Expected pie and bar datasets.");
    }
    const valueColumnId = pie.visualization.valueColumnId;
    const valueColumn = pie.columns.find(({ id }) => id === valueColumnId);
    if (valueColumnId === undefined || valueColumn === undefined) throw new Error("Expected pie value column.");
    valueColumn.valueType = "percentage";
    const setPieTotal = (total: number) => pie.rows.forEach((row, index) => {
      row.cells[valueColumnId] = index === 0 ? total : 0;
    });

    for (const total of [0.99, 1.01]) {
      setPieTotal(total);
      expect(reviewQuestionPack(pack).warnings).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ code: "exhibit-pie-percentage-total" })
      ]));
    }
    for (const total of [0.989, 1.011]) {
      setPieTotal(total);
      expect(reviewQuestionPack(pack).warnings).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: "exhibit-pie-percentage-total" })
      ]));
    }

    bar.visualization.yColumnIds = ["a", "b", "c", "d"];
    expect(reviewQuestionPack(pack).warnings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "exhibit-series-density" })
    ]));
    bar.visualization.yColumnIds = ["a", "b", "c", "d", "e"];
    expect(reviewQuestionPack(pack).warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "exhibit-series-density" })
    ]));
  });

  it("flags percentage composition, chart density, series density, and opening waterfall totals", () => {
    const pack = validatedPublicPack("question-pack-visualization-cookbook.mathdrill.json");
    expect(pack.kind).toBe("exhibit");
    if (pack.kind !== "exhibit") return;

    const pie = pack.datasets.find(({ visualization }) => visualization.type === "pie_chart");
    const waterfall = pack.datasets.find(({ visualization }) => visualization.type === "waterfall");
    const series = pack.datasets.find(({ visualization }) =>
      "yColumnIds" in visualization && (visualization.yColumnIds?.length ?? 0) > 1
    );
    expect(pie).toBeDefined();
    expect(waterfall).toBeDefined();
    expect(series).toBeDefined();
    if (pie === undefined || pie.visualization.type !== "pie_chart" || waterfall === undefined || waterfall.visualization.type !== "waterfall" || series === undefined || !("yColumnIds" in series.visualization)) return;

    expect(reviewQuestionPack(pack).warnings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "exhibit-waterfall-opening-total",
        path: expect.stringContaining(".visualization.totalRowIds")
      })
    ]));

    const pieColumn = pie.columns.find(({ id }) => id === pie.visualization.valueColumnId);
    expect(pieColumn).toBeDefined();
    if (pieColumn === undefined) return;
    const pieValueColumnId = pie.visualization.valueColumnId;
    if (pieValueColumnId === undefined) return;
    pieColumn.valueType = "percentage";
    pie.rows.forEach((row) => {
      row.cells[pieValueColumnId] = 1.05 / pie.rows.length;
    });
    pie.rows = Array.from({ length: 9 }, (_, index) => ({
      ...structuredClone(pie.rows[index % pie.rows.length]!),
      id: `pie-row-${index}`
    }));
    waterfall.visualization.totalRowIds = [waterfall.rows[0]!.id];
    series.visualization.yColumnIds = ["series-a", "series-b", "series-c", "series-d", "series-e"];

    const codes = reviewQuestionPack(pack).warnings.map(({ code }) => code);
    expect(codes).toContain("exhibit-pie-percentage-total");
    expect(codes).toContain("exhibit-row-density");
    expect(codes).toContain("exhibit-series-density");
    expect(codes).toContain("exhibit-waterfall-opening-total");
  });

  it("flags unbounded market variables and benchmark outcomes", () => {
    const marketPack = validatedPublicPack("question-pack-market-sizing-example.mathdrill.json");
    expect(marketPack.kind).toBe("market_sizing");
    if (marketPack.kind !== "market_sizing") return;
    expect(reviewQuestionPack(marketPack).warnings).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "market-sizing-unbounded-variable" })])
    );
    const numericStep = marketPack.templates[0]!.inputSteps.find(({ variableName }) => variableName !== undefined);
    expect(numericStep).toBeDefined();
    if (numericStep !== undefined) delete numericStep.assumptionRange;
    expect(reviewQuestionPack(marketPack).warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "market-sizing-unbounded-variable" })])
    );

    const benchmarkPack = validatedPublicPack("question-pack-benchmark-example.mathdrill.json");
    expect(benchmarkPack.kind).toBe("benchmark");
    if (benchmarkPack.kind !== "benchmark") return;
    const reachableBenchmarkCodes = reviewQuestionPack(benchmarkPack).warnings.map(({ code }) => code);
    expect(reachableBenchmarkCodes).not.toContain("benchmark-threshold-not-exact");
    expect(reachableBenchmarkCodes).not.toContain("benchmark-band-unreachable");
    benchmarkPack.benchmarks[0]!.questions = benchmarkPack.benchmarks[0]!.questions.slice(0, 2);
    benchmarkPack.benchmarks[0]!.scoreBands = [
      { label: "needs_work", minAccuracy: 0, title: "Needs work" },
      { label: "developing", minAccuracy: 0.25, title: "Developing" },
      { label: "strong", minAccuracy: 0.5, title: "Strong" },
      { label: "excellent", minAccuracy: 0.75, title: "Excellent" }
    ];
    const benchmarkCodes = reviewQuestionPack(benchmarkPack).warnings.map(({ code }) => code);
    expect(benchmarkCodes).toContain("benchmark-threshold-not-exact");
    expect(benchmarkCodes).toContain("benchmark-band-unreachable");
  });

  it("surfaces deterministic case stage and fit-story behavior", () => {
    const pack = validatedPublicPack("question-pack-v3-full-case-example.mathdrill.json");
    expect(pack.kind).toBe("case_practice");
    if (pack.kind !== "case_practice") return;
    pack.fitPrompts = fitPracticePrompts.slice(0, 1);
    const exhibitPack = validatedPublicPack("question-pack-visualization-cookbook.mathdrill.json");
    if (exhibitPack.kind !== "exhibit") throw new Error("Expected an exhibit cookbook.");
    const waterfall = exhibitPack.datasets.find(({ visualization }) => visualization.type === "waterfall");
    const fullCase = pack.fullCases?.[0];
    if (waterfall === undefined || waterfall.visualization.type !== "waterfall" || fullCase === undefined) {
      throw new Error("Expected a full case and waterfall example.");
    }
    waterfall.visualization.totalRowIds = [waterfall.rows[0]!.id];
    fullCase.exhibit = structuredClone(waterfall);
    if (fullCase.questioning === undefined) throw new Error("Expected full-case questioning.");
    fullCase.questioning.concepts = [{
      aliases: ["when", "timing", "cohort"],
      id: "timing",
      label: "Timing"
    }];
    fullCase.questioning.intents = [{
      feedback: "Locate the change in time.",
      id: "timing",
      label: "Timing",
      priority: true,
      referenceQuestions: ["When did churn rise?"],
      requiredConceptGroups: [["timing"]],
      weight: 1
    }];

    const warnings = reviewQuestionPack(pack).warnings;
    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "case-fixed-stage-order" }),
        expect.objectContaining({ code: "case-fit-local-story-required" }),
        expect.objectContaining({
          code: "case-single-accepted-hypothesis",
          path: "$.fullCases[0].structure.acceptedHypothesisId"
        }),
        expect.objectContaining({
          code: "exhibit-waterfall-opening-total",
          path: "$.fullCases[0].exhibit.visualization.totalRowIds"
        }),
        expect.objectContaining({
          code: "case-reference-question-concept-gap",
          path: "$.fullCases[0].questioning.intents[0].referenceQuestions[0]"
        })
      ])
    );

    const structure = pack.fullCases?.[0]?.structure;
    const alternative = structure?.hypotheses.find(({ id }) => id !== structure.acceptedHypothesisId);
    if (structure === undefined || alternative === undefined) throw new Error("Expected a full-case hypothesis alternative.");
    structure.acceptedHypothesisIds = [structure.acceptedHypothesisId, alternative.id];
    expect(reviewQuestionPack(pack).warnings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "$.fullCases[0].structure.acceptedHypothesisId" })
      ])
    );

    fullCase.questioning.intents[0]!.referenceQuestions = ["How does churn vary by timing or cohort?"];
    expect(reviewQuestionPack(pack).warnings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "case-reference-question-concept-gap",
        path: "$.fullCases[0].questioning.intents[0].referenceQuestions[0]"
      })
    ]));
  });
});

function validatedPublicPack(assetName: string): QuestionPackRecord {
  const payload = JSON.parse(
    readFileSync(resolve(process.cwd(), "public", assetName), "utf8")
  ) as unknown;
  const result = validateQuestionPackPayload(payload, "2026-08-29T12:00:00.000Z");
  if (result.status === "invalid") throw new Error(result.errors.join("\n"));
  return result.pack;
}
