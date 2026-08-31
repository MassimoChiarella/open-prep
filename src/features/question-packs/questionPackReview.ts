import { analyzeBenchmarkReachability } from "@/features/benchmarks/benchmarkScoring";
import {
  analyzeCaseQuestioningReferences,
  type CaseQuestioningPrompt
} from "@/features/case-practice/questioning/questioningScoring";
import type { ExhibitDataset } from "@/features/exhibits/exhibitTypes";
import type { QuestionTemplate, VariableSpec } from "@/lib/domain";
import type { QuestionPackRecord } from "@/lib/storage/appStorageTypes";

export type QuestionPackReviewSeverity = "attention" | "warning";

export interface QuestionPackReviewWarning {
  code: string;
  message: string;
  path: string;
  severity: QuestionPackReviewSeverity;
}

export interface QuestionPackReview {
  warnings: readonly QuestionPackReviewWarning[];
}

const generatedFormulaProbeLimit = 256;
const visualRowGuidance = {
  bar_chart: 20,
  index_chart: 50,
  line_chart: 50,
  pie_chart: 8,
  scatterplot: 200,
  stacked_bar: 20,
  waterfall: 20
} as const;

export function reviewQuestionPack(pack: QuestionPackRecord): QuestionPackReview {
  const warnings: QuestionPackReviewWarning[] = [
    {
      code: "human-answer-review-required",
      message: "Structure and runtime safety passed, but factual accuracy, answer keys, permissions, and qualitative judgment are not automatically verified.",
      path: "$",
      severity: "attention"
    }
  ];

  if (pack.kind === "generated_template") reviewGeneratedTemplates(pack, warnings);
  else if (pack.kind === "exhibit") reviewExhibits(pack, warnings);
  else if (pack.kind === "market_sizing") reviewMarketSizing(pack, warnings);
  else if (pack.kind === "benchmark") reviewBenchmarks(pack, warnings);
  else if (pack.kind === "case_practice") reviewCasePractice(pack, warnings);

  return {
    warnings: [...warnings].sort(
      (left, right) =>
        severityOrder(left.severity) - severityOrder(right.severity) ||
        left.path.localeCompare(right.path) ||
        left.code.localeCompare(right.code)
    )
  };
}

export function getGeneratedTemplateCombinationCount(template: QuestionTemplate): number {
  let count = 1;

  for (const variable of Object.values(template.variables)) {
    const variableCount = getVariableValueCount(variable);
    if (count > Number.MAX_SAFE_INTEGER / variableCount) return Number.MAX_SAFE_INTEGER;
    count *= variableCount;
  }

  return count;
}

function getVariableValueCount(variable: VariableSpec): number {
  if (variable.values !== undefined) return variable.values.length;

  const min = variable.min as number;
  const max = variable.max as number;
  const step = variable.step ?? (variable.type === "integer" ? 1 : 0.1);
  return Math.floor((max - min) / step) + 1;
}

function reviewGeneratedTemplates(
  pack: Extract<QuestionPackRecord, { kind: "generated_template" }>,
  warnings: QuestionPackReviewWarning[]
): void {
  pack.templates.forEach((template, index) => {
    const count = getGeneratedTemplateCombinationCount(template);
    if (count > generatedFormulaProbeLimit) {
      warnings.push({
        code: "generated-combinations-exceed-probes",
        message: `${formatCount(count)} independent Cartesian combinations exceed the ${generatedFormulaProbeLimit} deterministic formula probes. Review dependent variables and every reachable answer; arrays are not paired or zipped.`,
        path: `$.templates[${index}]`,
        severity: "warning"
      });
    }
  });
}

function reviewExhibits(
  pack: Extract<QuestionPackRecord, { kind: "exhibit" }>,
  warnings: QuestionPackReviewWarning[]
): void {
  pack.datasets.forEach((dataset, index) => {
    reviewExhibitDataset(dataset, `$.datasets[${index}]`, warnings);
  });
}

function reviewExhibitDataset(
  dataset: ExhibitDataset,
  path: string,
  warnings: QuestionPackReviewWarning[]
): void {
  const visualization = dataset.visualization;

  if (visualization.type !== "table") {
    const guidance = visualRowGuidance[visualization.type];
    if (dataset.rows.length > guidance) {
      warnings.push({
        code: "exhibit-row-density",
        message: `${dataset.rows.length} rows exceed the readability guidance of ${guidance} for ${formatLabel(visualization.type)}. The package remains valid, but the chart and accessible value list may be difficult to use.`,
        path: `${path}.rows`,
        severity: "warning"
      });
    }
  }

  const seriesCount = visualization.yColumnIds?.length ?? (visualization.type === "pie_chart" ? 1 : 0);
  if (seriesCount > 4) {
    warnings.push({
      code: "exhibit-series-density",
      message: `${seriesCount} plotted series exceed the readability guidance of 4. Every series is labeled, but comparison may be difficult.`,
      path: `${path}.visualization.yColumnIds`,
      severity: "warning"
    });
  }

  if (visualization.type === "pie_chart") {
    const valueColumnId = visualization.valueColumnId;
    const column = dataset.columns.find(({ id }) => id === valueColumnId);
    if (valueColumnId !== undefined && column?.valueType === "percentage") {
      const total = dataset.rows.reduce((sum, row) => {
        const value = row.cells[valueColumnId];
        return sum + (typeof value === "number" ? value : 0);
      }, 0);
      if (total < 0.99 || total > 1.01) {
        warnings.push({
          code: "exhibit-pie-percentage-total",
          message: `Percentage slices total ${formatPercent(total)}, outside the 99%–101% composition review range.`,
          path: `${path}.rows`,
          severity: "warning"
        });
      }
    }
  }

  if (
    visualization.type === "waterfall" &&
    dataset.rows[0] !== undefined &&
    visualization.totalRowIds?.includes(dataset.rows[0].id)
  ) {
    warnings.push({
      code: "exhibit-waterfall-opening-total",
      message: "The first row is an absolute total. In schema v2, total rows do not seed or reset the running total, so later deltas still begin from zero.",
      path: `${path}.visualization.totalRowIds`,
      severity: "warning"
    });
  }
}

function reviewMarketSizing(
  pack: Extract<QuestionPackRecord, { kind: "market_sizing" }>,
  warnings: QuestionPackReviewWarning[]
): void {
  pack.templates.forEach((template, index) => {
    const variablesWithoutRanges = template.inputSteps.flatMap((step) =>
      step.variableName !== undefined && step.assumptionRange === undefined ? [step.variableName] : []
    );
    if (variablesWithoutRanges.length > 0) {
      warnings.push({
        code: "market-sizing-unbounded-variable",
        message: `No authored assumption range is available for ${variablesWithoutRanges.join(", ")}; import validation can only use neutral samples for those variables. Runtime calculation errors remain blocked.`,
        path: `$.templates[${index}].inputSteps`,
        severity: "attention"
      });
    }
  });
}

function reviewBenchmarks(
  pack: Extract<QuestionPackRecord, { kind: "benchmark" }>,
  warnings: QuestionPackReviewWarning[]
): void {
  pack.benchmarks.forEach((benchmark, benchmarkIndex) => {
    const total = benchmark.questions.length;
    const reachability = analyzeBenchmarkReachability(total, benchmark.scoreBands);

    reachability.scoreBands.forEach((band, bandIndex) => {
      const rawCutoff = band.minAccuracy * total;
      if (!band.isThresholdAttainable) {
        const effectiveCorrect = Math.ceil(rawCutoff);
        warnings.push({
          code: "benchmark-threshold-not-exact",
          message: `${formatPercent(band.minAccuracy)} cannot be attained with ${total} questions; the effective cutoff is ${effectiveCorrect}/${total} (${formatPercent(effectiveCorrect / total)}).`,
          path: `$.benchmarks[${benchmarkIndex}].scoreBands[${bandIndex}].minAccuracy`,
          severity: "attention"
        });
      }
      if (!band.isSelectable) {
        warnings.push({
          code: "benchmark-band-unreachable",
          message: `No possible raw score awards the ${formatLabel(band.label)} band with ${total} questions and the configured thresholds.`,
          path: `$.benchmarks[${benchmarkIndex}].scoreBands[${bandIndex}]`,
          severity: "warning"
        });
      }
    });
  });
}

function reviewCasePractice(
  pack: Extract<QuestionPackRecord, { kind: "case_practice" }>,
  warnings: QuestionPackReviewWarning[]
): void {
  pack.questioningPrompts?.forEach((prompt, index) => {
    reviewQuestioningReferences(prompt, `$.questioningPrompts[${index}]`, warnings);
  });

  pack.structuringPrompts?.forEach((prompt, index) => {
    reviewAcceptedHypotheses(prompt, `$.structuringPrompts[${index}]`, warnings);
  });

  pack.fitPrompts?.forEach((prompt, index) => {
    warnings.push({
      code: "case-fit-local-story-required",
      message: `This prompt appears only when the learner has saved a local ${formatLabel(prompt.competency)} story. Scoring records the learner's checklist self-review, not story-text quality.`,
      path: `$.fitPrompts[${index}]`,
      severity: "attention"
    });
  });

  pack.fullCases?.forEach((fullCase, index) => {
    if (fullCase.questioning !== undefined) {
      reviewQuestioningReferences(fullCase.questioning, `$.fullCases[${index}].questioning`, warnings);
    }
    reviewAcceptedHypotheses(fullCase.structure, `$.fullCases[${index}].structure`, warnings);
    reviewExhibitDataset(fullCase.exhibit, `$.fullCases[${index}].exhibit`, warnings);
    warnings.push({
      code: "case-fixed-stage-order",
      message: `Runtime stage order is ${"questioning" in fullCase ? "Questioning → Structure → Exhibit/math → Brainstorming → Synthesize" : "Structure → Exhibit/math → Brainstorming → Synthesize"}; JSON property order does not change it.`,
      path: `$.fullCases[${index}]`,
      severity: "attention"
    });
  });
}

function reviewQuestioningReferences(
  prompt: CaseQuestioningPrompt,
  path: string,
  warnings: QuestionPackReviewWarning[]
): void {
  for (const issue of analyzeCaseQuestioningReferences(prompt)) {
    warnings.push({
      code: "case-reference-question-concept-gap",
      message: `This reference question does not contain enough explicit aliases to satisfy its own ${formatLabel(issue.intentId)} intent. Common question words such as when, where, and how are ignored by deterministic matching.`,
      path: `${path}.intents[${issue.intentIndex}].referenceQuestions[${issue.referenceIndex}]`,
      severity: "warning"
    });
  }
}

function reviewAcceptedHypotheses(
  prompt: { acceptedHypothesisIds?: readonly string[] },
  path: string,
  warnings: QuestionPackReviewWarning[]
): void {
  if (prompt.acceptedHypothesisIds !== undefined) return;

  warnings.push({
    code: "case-single-accepted-hypothesis",
    message: "Only the primary accepted hypothesis earns hypothesis points. Confirm that other reasonable starting hypotheses are intentionally treated as alternatives rather than equally correct answers.",
    path: `${path}.acceptedHypothesisId`,
    severity: "attention"
  });
}

function severityOrder(severity: QuestionPackReviewSeverity): number {
  return severity === "warning" ? 0 : 1;
}

function formatCount(value: number): string {
  return value >= Number.MAX_SAFE_INTEGER ? `${Number.MAX_SAFE_INTEGER}+` : String(value);
}

function formatLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function formatPercent(value: number): string {
  return `${Number((value * 100).toFixed(1))}%`;
}
