import type {
  ExhibitChoice,
  ExhibitColumn,
  ExhibitColumnRole,
  ExhibitColumnValueType,
  ExhibitDataRow,
  ExhibitDataset,
  ExhibitQuestionSpec,
  ExhibitVisualizationSpec,
  ExhibitVisualizationType
} from "@/features/exhibits/exhibitTypes";
import type {
  AnswerErrorChecks,
  AnswerSpec,
  Difficulty,
  ExplanationSpec,
  RoundingRule,
  SkillTag,
  ToleranceSpec,
  UnitType
} from "@/lib/domain";
import type { ExhibitQuestionPackRecord } from "@/lib/storage/appStorageTypes";
import {
  boundedArray,
  enumValue,
  finiteNumber,
  hasOwn,
  idArray,
  idValue,
  integer,
  literal,
  objectValue,
  optionalText,
  readQuestionPackEnvelope,
  rejectUnknown,
  text,
  textArray,
  trackDuplicateId,
  uniqueEnumArray,
  type UnknownRecord
} from "@/features/question-packs/questionPackValidation";

const maxDatasets = 100;
const maxColumns = 20;
const maxRows = 500;
const maxQuestions = 50;
const maxChartSeries = 8;
const maxTags = 10;
const maxExplanationSteps = 10;
const maxChoices = 10;

const difficulties = ["beginner", "intermediate", "advanced", "expert"] as const satisfies readonly Difficulty[];
const units = [
  "none",
  "currency",
  "percentage",
  "percentage_points",
  "units",
  "customers",
  "users",
  "years",
  "months",
  "days",
  "stores",
  "k",
  "m",
  "b"
] as const satisfies readonly UnitType[];
const tags = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "mixed_operations",
  "percentage_of_number",
  "percentage_change",
  "reverse_percentage",
  "percentage_points",
  "margin",
  "fraction_conversion",
  "ratio_conversion",
  "simple_growth",
  "compound_growth",
  "cagr",
  "rule_of_72",
  "weighted_average",
  "revenue",
  "profit",
  "cost",
  "contribution_margin",
  "breakeven",
  "roi",
  "payback",
  "market_share",
  "capacity_utilization",
  "k_m_b_conversion",
  "unit_conversion"
] as const satisfies readonly SkillTag[];
const roundingRules = [
  "exact",
  "nearest_whole",
  "nearest_0_1",
  "nearest_1k",
  "nearest_1m"
] as const satisfies readonly RoundingRule[];
const visualizationTypes = [
  "bar_chart",
  "index_chart",
  "line_chart",
  "pie_chart",
  "scatterplot",
  "stacked_bar",
  "table",
  "waterfall"
] as const satisfies readonly ExhibitVisualizationType[];
const columnRoles = ["dimension", "metric"] as const satisfies readonly ExhibitColumnRole[];
const columnValueTypes = [
  "currency",
  "number",
  "percentage",
  "text",
  "year"
] as const satisfies readonly ExhibitColumnValueType[];
const numericColumnValueTypes = new Set<ExhibitColumnValueType>(["currency", "number", "percentage"]);

export type ExhibitQuestionPackValidationResult =
  | { status: "valid"; pack: ExhibitQuestionPackRecord }
  | { status: "invalid"; errors: string[] };

export function validateExhibitQuestionPackPayload(
  payload: unknown,
  importedAt = new Date().toISOString()
): ExhibitQuestionPackValidationResult {
  const errors: string[] = [];
  const envelope = readQuestionPackEnvelope(payload, "exhibit", ["datasets"], errors);
  if (envelope === undefined) return { status: "invalid", errors };
  const { value, id, packVersion, title, description, publisher, license } = envelope;
  const datasets = readDatasets(value.datasets, errors);

  if (errors.length > 0 || id === undefined || packVersion === undefined || title === undefined || datasets === undefined) {
    return { status: "invalid", errors };
  }
  return {
    status: "valid",
    pack: {
      format: "math-drill-question-pack",
      schemaVersion: 2,
      kind: "exhibit",
      id,
      packVersion,
      title,
      ...(description === undefined ? {} : { description }),
      ...(publisher === undefined ? {} : { publisher }),
      ...(license === undefined ? {} : { license }),
      datasets,
      importedAt
    }
  };
}

function readDatasets(value: unknown, errors: string[]): ExhibitDataset[] | undefined {
  if (!boundedArray(value, "$.datasets", 1, maxDatasets, errors)) return undefined;
  const result: ExhibitDataset[] = [];
  const ids = new Set<string>();
  value.slice(0, maxDatasets).forEach((entry, index) => {
    trackDuplicateId(entry, `$.datasets[${index}].id`, "dataset", ids, errors);
    const dataset = readDataset(entry, `$.datasets[${index}]`, errors);
    if (dataset !== undefined) result.push(dataset);
  });
  return result;
}

function readDataset(value: unknown, path: string, errors: string[]): ExhibitDataset | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "title", "description", "unit", "sourceNote", "visualization", "columns", "rows", "questions"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const title = text(item.title, `${path}.title`, 100, errors);
  const description = text(item.description, `${path}.description`, 500, errors);
  const unit = enumValue(item.unit, units, `${path}.unit`, errors);
  const sourceNote = optionalText(item, "sourceNote", 500, errors, path);
  const columns = readColumns(item.columns, `${path}.columns`, errors);
  const rows = readRows(item.rows, columns, `${path}.rows`, errors);
  const questions = readQuestions(item.questions, `${path}.questions`, errors);
  const visualization = readVisualization(item.visualization, columns, rows, `${path}.visualization`, errors);

  if (columns !== undefined) {
    if (!columns.some(({ role }) => role === "dimension")) errors.push(`${path}.columns must include a dimension column.`);
    if (!columns.some(isNumericMetricColumn)) errors.push(`${path}.columns must include a numeric metric column.`);
  }
  if (
    errors.length > before ||
    id === undefined ||
    title === undefined ||
    description === undefined ||
    unit === undefined ||
    columns === undefined ||
    rows === undefined ||
    questions === undefined ||
    visualization === undefined
  ) return undefined;
  return {
    id,
    title,
    description,
    unit,
    ...(sourceNote === undefined ? {} : { sourceNote }),
    visualization,
    columns,
    rows,
    questions
  };
}

function readColumns(value: unknown, path: string, errors: string[]): ExhibitColumn[] | undefined {
  if (!boundedArray(value, path, 2, maxColumns, errors)) return undefined;
  const result: ExhibitColumn[] = [];
  const ids = new Set<string>();
  value.slice(0, maxColumns).forEach((entry, index) => {
    trackDuplicateId(entry, `${path}[${index}].id`, "column", ids, errors);
    const column = readColumn(entry, `${path}[${index}]`, errors);
    if (column !== undefined) result.push(column);
  });
  return result;
}

function readColumn(value: unknown, path: string, errors: string[]): ExhibitColumn | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "label", "description", "role", "unit", "valueType"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const label = text(item.label, `${path}.label`, 100, errors);
  const description = optionalText(item, "description", 500, errors, path);
  const role = enumValue(item.role, columnRoles, `${path}.role`, errors);
  const unit = hasOwn(item, "unit") ? enumValue(item.unit, units, `${path}.unit`, errors) : undefined;
  const valueType = enumValue(item.valueType, columnValueTypes, `${path}.valueType`, errors);
  if (role === "dimension" && valueType !== undefined && valueType !== "text" && valueType !== "year") {
    errors.push(`${path}.valueType must be text or year for a dimension column.`);
  }
  if (role === "metric" && valueType !== undefined && !numericColumnValueTypes.has(valueType)) {
    errors.push(`${path}.valueType must be currency, number, or percentage for a metric column.`);
  }
  if (errors.length > before || id === undefined || label === undefined || role === undefined || valueType === undefined) {
    return undefined;
  }
  return { id, label, role, valueType, ...(description === undefined ? {} : { description }), ...(unit === undefined ? {} : { unit }) };
}

function readRows(
  value: unknown,
  columns: readonly ExhibitColumn[] | undefined,
  path: string,
  errors: string[]
): ExhibitDataRow[] | undefined {
  if (!boundedArray(value, path, 1, maxRows, errors)) return undefined;
  if (columns === undefined) return undefined;
  const result: ExhibitDataRow[] = [];
  const ids = new Set<string>();
  value.slice(0, maxRows).forEach((entry, index) => {
    trackDuplicateId(entry, `${path}[${index}].id`, "row", ids, errors);
    const row = readRow(entry, columns, `${path}[${index}]`, errors);
    if (row !== undefined) result.push(row);
  });
  return result;
}

function readRow(
  value: unknown,
  columns: readonly ExhibitColumn[],
  path: string,
  errors: string[]
): ExhibitDataRow | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "label", "cells"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const label = optionalText(item, "label", 100, errors, path);
  const cellsValue = objectValue(item.cells, `${path}.cells`, errors);
  const cells: ExhibitDataRow["cells"] = Object.create(null) as ExhibitDataRow["cells"];
  if (cellsValue !== undefined) {
    rejectUnknown(cellsValue, columns.map(({ id: columnId }) => columnId), `${path}.cells`, errors);
    for (const column of columns) {
      if (!hasOwn(cellsValue, column.id)) {
        errors.push(`${path}.cells.${column.id} is required.`);
        continue;
      }
      const cell = readCell(cellsValue[column.id], column, `${path}.cells.${column.id}`, errors);
      if (cell !== undefined) cells[column.id] = cell;
    }
  }
  if (errors.length > before || id === undefined || cellsValue === undefined) return undefined;
  return { id, cells, ...(label === undefined ? {} : { label }) };
}

function readCell(
  value: unknown,
  column: ExhibitColumn,
  path: string,
  errors: string[]
): number | string | undefined {
  if (column.valueType === "text") return text(value, path, 500, errors);
  const number = finiteNumber(value, path, errors);
  if (number !== undefined && column.valueType === "year" && !Number.isInteger(number)) {
    errors.push(`${path} must be a whole-number year.`);
    return undefined;
  }
  return number;
}

function readQuestions(value: unknown, path: string, errors: string[]): ExhibitQuestionSpec[] | undefined {
  if (!boundedArray(value, path, 1, maxQuestions, errors)) return undefined;
  const result: ExhibitQuestionSpec[] = [];
  const ids = new Set<string>();
  value.slice(0, maxQuestions).forEach((entry, index) => {
    trackDuplicateId(entry, `${path}[${index}].id`, "question", ids, errors);
    const question = readQuestion(entry, `${path}[${index}]`, errors);
    if (question !== undefined) result.push(question);
  });
  return result;
}

function readQuestion(value: unknown, path: string, errors: string[]): ExhibitQuestionSpec | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  return item.responseType === "multiple_choice"
    ? readMultipleChoiceQuestion(item, path, errors)
    : readNumericQuestion(item, path, errors);
}

function readNumericQuestion(item: UnknownRecord, path: string, errors: string[]): ExhibitQuestionSpec | undefined {
  rejectUnknown(item, ["id", "prompt", "difficulty", "expectedTimeSeconds", "tags", "explanation", "responseType", "answer"], path, errors);
  const before = errors.length;
  if (hasOwn(item, "responseType")) literal(item.responseType, "numeric", `${path}.responseType`, errors);
  const base = readQuestionBase(item, path, errors);
  const answer = readAnswer(item.answer, `${path}.answer`, errors);
  if (errors.length > before || base === undefined || answer === undefined) return undefined;
  return { ...base, ...(hasOwn(item, "responseType") ? { responseType: "numeric" as const } : {}), answer };
}

function readMultipleChoiceQuestion(
  item: UnknownRecord,
  path: string,
  errors: string[]
): ExhibitQuestionSpec | undefined {
  rejectUnknown(item, ["id", "prompt", "difficulty", "expectedTimeSeconds", "tags", "explanation", "responseType", "choices", "correctChoiceId"], path, errors);
  const before = errors.length;
  literal(item.responseType, "multiple_choice", `${path}.responseType`, errors);
  const base = readQuestionBase(item, path, errors);
  const choices = readChoices(item.choices, `${path}.choices`, errors);
  const correctChoiceId = idValue(item.correctChoiceId, `${path}.correctChoiceId`, errors);
  if (choices !== undefined && correctChoiceId !== undefined && !choices.some(({ id }) => id === correctChoiceId)) {
    errors.push(`${path}.correctChoiceId must reference a choice ID.`);
  }
  if (errors.length > before || base === undefined || choices === undefined || correctChoiceId === undefined) {
    return undefined;
  }
  return { ...base, responseType: "multiple_choice", choices, correctChoiceId };
}

function readQuestionBase(
  item: UnknownRecord,
  path: string,
  errors: string[]
): Omit<ExhibitQuestionSpec, "answer" | "choices" | "correctChoiceId" | "responseType"> | undefined {
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const prompt = text(item.prompt, `${path}.prompt`, 2_000, errors);
  const difficulty = enumValue(item.difficulty, difficulties, `${path}.difficulty`, errors);
  const expectedTimeSeconds = hasOwn(item, "expectedTimeSeconds")
    ? integer(item.expectedTimeSeconds, `${path}.expectedTimeSeconds`, 1, 3_600, errors)
    : undefined;
  const questionTags = uniqueEnumArray(item.tags, tags, `${path}.tags`, 1, maxTags, errors);
  const explanation = readExplanation(item.explanation, `${path}.explanation`, errors);
  if (
    errors.length > before ||
    id === undefined ||
    prompt === undefined ||
    difficulty === undefined ||
    questionTags === undefined ||
    explanation === undefined
  ) return undefined;
  return {
    id,
    prompt,
    difficulty,
    tags: questionTags,
    explanation,
    ...(expectedTimeSeconds === undefined ? {} : { expectedTimeSeconds })
  };
}

function readChoices(value: unknown, path: string, errors: string[]): ExhibitChoice[] | undefined {
  if (!boundedArray(value, path, 2, maxChoices, errors)) return undefined;
  const result: ExhibitChoice[] = [];
  const ids = new Set<string>();
  const labels = new Set<string>();
  value.forEach((entry, index) => {
    trackDuplicateId(entry, `${path}[${index}].id`, "choice", ids, errors);
    const item = objectValue(entry, `${path}[${index}]`, errors);
    if (item === undefined) return;
    rejectUnknown(item, ["id", "label"], `${path}[${index}]`, errors);
    const before = errors.length;
    const id = idValue(item.id, `${path}[${index}].id`, errors);
    const label = text(item.label, `${path}[${index}].label`, 500, errors);
    if (label !== undefined && labels.has(label)) errors.push(`${path}[${index}].label duplicates choice label "${label}".`);
    else if (label !== undefined) labels.add(label);
    if (errors.length === before && id !== undefined && label !== undefined) result.push({ id, label });
  });
  return result;
}

function readAnswer(value: unknown, path: string, errors: string[]): AnswerSpec | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["value", "unit", "tolerance", "errorChecks", "roundingRule"], path, errors);
  const before = errors.length;
  const answerValue = finiteNumber(item.value, `${path}.value`, errors);
  const unit = enumValue(item.unit, units, `${path}.unit`, errors);
  const tolerance = hasOwn(item, "tolerance") ? readTolerance(item.tolerance, `${path}.tolerance`, errors) : undefined;
  const errorChecks = hasOwn(item, "errorChecks") ? readErrorChecks(item.errorChecks, `${path}.errorChecks`, errors) : undefined;
  const roundingRule = hasOwn(item, "roundingRule")
    ? enumValue(item.roundingRule, roundingRules, `${path}.roundingRule`, errors)
    : undefined;
  if (errors.length > before || answerValue === undefined || unit === undefined) return undefined;
  return {
    value: answerValue,
    unit,
    ...(tolerance === undefined ? {} : { tolerance }),
    ...(errorChecks === undefined ? {} : { errorChecks }),
    ...(roundingRule === undefined ? {} : { roundingRule })
  };
}

function readTolerance(value: unknown, path: string, errors: string[]): ToleranceSpec | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  const before = errors.length;
  const type = enumValue(item.type, ["absolute", "percentage", "range"] as const, `${path}.type`, errors);
  if (type === "absolute" || type === "percentage") {
    rejectUnknown(item, ["type", "value"], path, errors);
    const amount = finiteNumber(item.value, `${path}.value`, errors);
    if (amount !== undefined && amount < 0) errors.push(`${path}.value must be non-negative.`);
    if (type === "percentage" && amount !== undefined && amount > 1) errors.push(`${path}.value must be at most 1.`);
    return errors.length === before && amount !== undefined ? { type, value: amount } : undefined;
  }
  if (type === "range") {
    rejectUnknown(item, ["type", "min", "max"], path, errors);
    const min = finiteNumber(item.min, `${path}.min`, errors);
    const max = finiteNumber(item.max, `${path}.max`, errors);
    if (min !== undefined && max !== undefined && min > max) errors.push(`${path}.min must be less than or equal to max.`);
    return errors.length === before && min !== undefined && max !== undefined ? { type, min, max } : undefined;
  }
  rejectUnknown(item, ["type", "value", "min", "max"], path, errors);
  return undefined;
}

function readErrorChecks(value: unknown, path: string, errors: string[]): AnswerErrorChecks | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["percentagePointValue", "roundingTolerance"], path, errors);
  const before = errors.length;
  if (!hasOwn(item, "percentagePointValue") && !hasOwn(item, "roundingTolerance")) {
    errors.push(`${path} must define at least one error check.`);
  }
  const percentagePointValue = hasOwn(item, "percentagePointValue")
    ? finiteNumber(item.percentagePointValue, `${path}.percentagePointValue`, errors)
    : undefined;
  const roundingTolerance = hasOwn(item, "roundingTolerance")
    ? readTolerance(item.roundingTolerance, `${path}.roundingTolerance`, errors)
    : undefined;
  if (errors.length > before) return undefined;
  return {
    ...(percentagePointValue === undefined ? {} : { percentagePointValue }),
    ...(roundingTolerance === undefined ? {} : { roundingTolerance })
  };
}

function readExplanation(value: unknown, path: string, errors: string[]): ExplanationSpec | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["short", "steps", "shortcut"], path, errors);
  const before = errors.length;
  const short = text(item.short, `${path}.short`, 1_000, errors);
  const steps = textArray(item.steps, `${path}.steps`, 1, maxExplanationSteps, 1_000, errors);
  const shortcut = optionalText(item, "shortcut", 1_000, errors, path);
  if (errors.length > before || short === undefined || steps === undefined) return undefined;
  return { short, steps, ...(shortcut === undefined ? {} : { shortcut }) };
}

function readVisualization(
  value: unknown,
  columns: readonly ExhibitColumn[] | undefined,
  rows: readonly ExhibitDataRow[] | undefined,
  path: string,
  errors: string[]
): ExhibitVisualizationSpec | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  const before = errors.length;
  const type = enumValue(item.type, visualizationTypes, `${path}.type`, errors);
  const title = optionalText(item, "title", 100, errors, path);
  if (type === undefined) {
    rejectUnknown(item, ["type", "title", "categoryColumnId", "selectedColumnIds", "totalRowIds", "valueColumnId", "xColumnId", "yColumnIds"], path, errors);
    return undefined;
  }
  if (type === "table") {
    rejectUnknown(item, ["type", "title", "selectedColumnIds"], path, errors);
    const selectedColumnIds = hasOwn(item, "selectedColumnIds")
      ? idArray(item.selectedColumnIds, `${path}.selectedColumnIds`, 1, maxColumns, errors)
      : undefined;
    validateColumnReferences(selectedColumnIds, columns, `${path}.selectedColumnIds`, undefined, errors);
    if (errors.length > before) return undefined;
    return { type, ...(title === undefined ? {} : { title }), ...(selectedColumnIds === undefined ? {} : { selectedColumnIds }) };
  }
  if (type === "pie_chart") {
    rejectUnknown(item, ["type", "title", "categoryColumnId", "valueColumnId"], path, errors);
    const categoryColumnId = idValue(item.categoryColumnId, `${path}.categoryColumnId`, errors);
    const valueColumnId = idValue(item.valueColumnId, `${path}.valueColumnId`, errors);
    validateColumnReference(categoryColumnId, columns, `${path}.categoryColumnId`, "dimension", errors);
    validateColumnReference(valueColumnId, columns, `${path}.valueColumnId`, "metric", errors);
    validatePieValues(valueColumnId, rows, path, errors);
    if (errors.length > before || categoryColumnId === undefined || valueColumnId === undefined) return undefined;
    return { type, categoryColumnId, valueColumnId, ...(title === undefined ? {} : { title }) };
  }
  if (type === "scatterplot") {
    rejectUnknown(item, ["type", "title", "categoryColumnId", "xColumnId", "yColumnIds"], path, errors);
    const categoryColumnId = hasOwn(item, "categoryColumnId")
      ? idValue(item.categoryColumnId, `${path}.categoryColumnId`, errors)
      : undefined;
    const xColumnId = idValue(item.xColumnId, `${path}.xColumnId`, errors);
    const yColumnIds = idArray(item.yColumnIds, `${path}.yColumnIds`, 1, 1, errors);
    validateColumnReference(categoryColumnId, columns, `${path}.categoryColumnId`, "dimension", errors);
    validateColumnReference(xColumnId, columns, `${path}.xColumnId`, "metric", errors);
    validateColumnReferences(yColumnIds, columns, `${path}.yColumnIds`, "metric", errors);
    if (xColumnId !== undefined && yColumnIds?.includes(xColumnId)) errors.push(`${path}.yColumnIds must not include xColumnId.`);
    if (errors.length > before || xColumnId === undefined || yColumnIds === undefined) return undefined;
    return { type, xColumnId, yColumnIds, ...(categoryColumnId === undefined ? {} : { categoryColumnId }), ...(title === undefined ? {} : { title }) };
  }

  rejectUnknown(item, type === "waterfall" ? ["type", "title", "xColumnId", "yColumnIds", "totalRowIds"] : ["type", "title", "xColumnId", "yColumnIds"], path, errors);
  const xColumnId = idValue(item.xColumnId, `${path}.xColumnId`, errors);
  const yColumnIds = idArray(item.yColumnIds, `${path}.yColumnIds`, 1, type === "waterfall" ? 1 : maxChartSeries, errors);
  const totalRowIds = type === "waterfall" && hasOwn(item, "totalRowIds")
    ? idArray(item.totalRowIds, `${path}.totalRowIds`, 1, maxRows, errors)
    : undefined;
  validateColumnReference(xColumnId, columns, `${path}.xColumnId`, "dimension", errors);
  validateColumnReferences(yColumnIds, columns, `${path}.yColumnIds`, "metric", errors);
  validateRowReferences(totalRowIds, rows, `${path}.totalRowIds`, errors);
  if (errors.length > before || xColumnId === undefined || yColumnIds === undefined) return undefined;
  return { type, xColumnId, yColumnIds, ...(title === undefined ? {} : { title }), ...(totalRowIds === undefined ? {} : { totalRowIds }) };
}

function validateColumnReference(
  id: string | undefined,
  columns: readonly ExhibitColumn[] | undefined,
  path: string,
  role: ExhibitColumnRole | undefined,
  errors: string[]
): void {
  if (id === undefined || columns === undefined) return;
  const column = columns.find((candidate) => candidate.id === id);
  if (column === undefined) errors.push(`${path} must reference an existing column ID.`);
  else if (role !== undefined && column.role !== role) errors.push(`${path} must reference a ${role} column.`);
  else if (role === "metric" && !isNumericMetricColumn(column)) errors.push(`${path} must reference a numeric metric column.`);
}

function validateColumnReferences(
  ids: readonly string[] | undefined,
  columns: readonly ExhibitColumn[] | undefined,
  path: string,
  role: ExhibitColumnRole | undefined,
  errors: string[]
): void {
  ids?.forEach((id, index) => validateColumnReference(id, columns, `${path}[${index}]`, role, errors));
}

function validateRowReferences(
  ids: readonly string[] | undefined,
  rows: readonly ExhibitDataRow[] | undefined,
  path: string,
  errors: string[]
): void {
  if (rows === undefined) return;
  ids?.forEach((id, index) => {
    if (!rows.some((row) => row.id === id)) errors.push(`${path}[${index}] must reference an existing row ID.`);
  });
}

function validatePieValues(
  valueColumnId: string | undefined,
  rows: readonly ExhibitDataRow[] | undefined,
  path: string,
  errors: string[]
): void {
  if (valueColumnId === undefined || rows === undefined) return;
  const values = rows.map(({ cells }) => cells[valueColumnId]).filter((value): value is number => typeof value === "number");
  if (values.some((value) => value < 0)) errors.push(`${path} pie-chart values must be non-negative.`);
  if (values.length === rows.length && values.reduce((sum, value) => sum + value, 0) <= 0) {
    errors.push(`${path} pie-chart values must have a positive total.`);
  }
}

function isNumericMetricColumn(column: ExhibitColumn): boolean {
  return column.role === "metric" && numericColumnValueTypes.has(column.valueType);
}
