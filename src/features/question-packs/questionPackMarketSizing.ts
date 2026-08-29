import type {
  MarketSizingChoiceOption,
  MarketSizingInputKind,
  MarketSizingInputStep,
  MarketSizingIndustry,
  MarketSizingRubricDimension,
  MarketSizingScoreDimension,
  MarketSizingTemplate,
  MarketSizingType
} from "@/features/market-sizing/marketSizingTypes";
import type { Difficulty, RoundingRule, ToleranceSpec, UnitType } from "@/lib/domain";
import { evaluateFormulaExpression } from "@/lib/math/formulaEvaluator";
import type { MarketSizingQuestionPackRecord } from "@/lib/storage/appStorageTypes";
import {
  booleanValue,
  enumValue,
  finiteNumber,
  hasOwn,
  idValue,
  identifier,
  objectValue,
  optionalText,
  readQuestionPackEnvelope,
  rejectUnknown,
  text,
  type UnknownRecord
} from "@/features/question-packs/questionPackValidation";

const difficulties = ["beginner", "intermediate", "advanced", "expert"] as const satisfies readonly Difficulty[];
const industries = [
  "airlines", "banking", "consumer_goods", "healthcare", "insurance", "manufacturing",
  "marketplaces", "retail", "saas", "telecom"
] as const satisfies readonly MarketSizingIndustry[];
const sizingTypes = ["capacity_based", "demand_side", "revenue_pool", "supply_side"] as const satisfies readonly MarketSizingType[];
const inputKinds = ["boolean", "choice", "currency", "integer", "note", "number", "percentage"] as const satisfies readonly MarketSizingInputKind[];
const numericInputKinds = new Set<MarketSizingInputKind>(["currency", "integer", "number", "percentage"]);
const units = [
  "none", "currency", "percentage", "percentage_points", "units", "customers", "users",
  "years", "months", "days", "stores", "k", "m", "b"
] as const satisfies readonly UnitType[];
const roundingRules = ["exact", "nearest_whole", "nearest_0_1", "nearest_1k", "nearest_1m"] as const satisfies readonly RoundingRule[];
const scoreDimensions = ["structure", "assumptions", "math", "units", "sense_check", "interpretation"] as const satisfies readonly MarketSizingScoreDimension[];

type ValidationResult =
  | { status: "valid"; pack: MarketSizingQuestionPackRecord }
  | { status: "invalid"; errors: string[] };

export function validateMarketSizingQuestionPackPayload(
  payload: unknown,
  importedAt = new Date().toISOString()
): ValidationResult {
  const errors: string[] = [];
  const envelope = readQuestionPackEnvelope(payload, "market_sizing", ["templates"], errors);
  if (envelope === undefined) return { status: "invalid", errors };
  const { value: root, id, packVersion, title, description, publisher, license } = envelope;
  const templates = readTemplates(root.templates, errors);
  if (errors.length || id === undefined || packVersion === undefined || title === undefined || templates === undefined) {
    return { status: "invalid", errors };
  }
  return {
    status: "valid",
    pack: {
      format: "math-drill-question-pack",
      schemaVersion: 2,
      kind: "market_sizing",
      id,
      packVersion,
      title,
      ...(description === undefined ? {} : { description }),
      ...(publisher === undefined ? {} : { publisher }),
      ...(license === undefined ? {} : { license }),
      templates,
      importedAt
    }
  };
}

function readTemplates(value: unknown, errors: string[]): MarketSizingTemplate[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
    errors.push("$.templates must contain 1 to 100 market-sizing templates.");
    return undefined;
  }
  const result: MarketSizingTemplate[] = [];
  const ids = new Set<string>();
  value.forEach((item, index) => {
    const template = readTemplate(item, `$.templates[${index}]`, errors);
    if (template === undefined) return;
    if (ids.has(template.id)) errors.push(`$.templates[${index}].id duplicates template ID "${template.id}".`);
    else {
      ids.add(template.id);
      result.push(template);
    }
  });
  return result;
}

function readTemplate(value: unknown, path: string, errors: string[]): MarketSizingTemplate | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "title", "prompt", "description", "difficulty", "industry", "sizingType", "inputSteps", "finalFormula", "outputUnit", "rubric", "senseCheck"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const title = text(item.title, `${path}.title`, 100, errors);
  const prompt = text(item.prompt, `${path}.prompt`, 2_000, errors);
  const description = text(item.description, `${path}.description`, 500, errors);
  const difficulty = enumValue(item.difficulty, difficulties, `${path}.difficulty`, errors);
  const industry = enumValue(item.industry, industries, `${path}.industry`, errors);
  const sizingType = enumValue(item.sizingType, sizingTypes, `${path}.sizingType`, errors);
  const inputSteps = readInputSteps(item.inputSteps, `${path}.inputSteps`, errors);
  const finalFormula = readFinalFormula(item.finalFormula, inputSteps, `${path}.finalFormula`, errors);
  const outputUnit = enumValue(item.outputUnit, units, `${path}.outputUnit`, errors);
  const rubric = readRubric(item.rubric, `${path}.rubric`, errors);
  const senseCheck = readSenseCheck(item.senseCheck, `${path}.senseCheck`, errors);
  if (
    errors.length > before || id === undefined || title === undefined || prompt === undefined ||
    description === undefined || difficulty === undefined || industry === undefined || sizingType === undefined ||
    inputSteps === undefined || finalFormula === undefined || outputUnit === undefined || rubric === undefined ||
    senseCheck === undefined
  ) return undefined;
  return { id, title, prompt, description, difficulty, industry, sizingType, inputSteps, finalFormula, outputUnit, rubric, senseCheck };
}

function readInputSteps(value: unknown, path: string, errors: string[]): MarketSizingInputStep[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) {
    errors.push(`${path} must contain 1 to 30 steps.`);
    return undefined;
  }
  const result: MarketSizingInputStep[] = [];
  const ids = new Set<string>();
  const variables = new Set<string>();
  value.forEach((item, index) => {
    const step = readInputStep(item, `${path}[${index}]`, errors);
    if (step === undefined) return;
    if (ids.has(step.id)) errors.push(`${path}[${index}].id duplicates step ID "${step.id}".`);
    else ids.add(step.id);
    if (step.variableName !== undefined) {
      if (variables.has(step.variableName)) errors.push(`${path}[${index}].variableName duplicates "${step.variableName}".`);
      else variables.add(step.variableName);
    }
    result.push(step);
  });
  return result;
}

function readInputStep(value: unknown, path: string, errors: string[]): MarketSizingInputStep | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "label", "inputKind", "required", "helperText", "unit", "variableName", "assumptionRange", "options"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const label = text(item.label, `${path}.label`, 200, errors);
  const inputKind = enumValue(item.inputKind, inputKinds, `${path}.inputKind`, errors);
  const required = booleanValue(item.required, `${path}.required`, errors);
  const helperText = optionalText(item, "helperText", 500, errors, path);
  const unit = hasOwn(item, "unit") ? enumValue(item.unit, units, `${path}.unit`, errors) : undefined;
  const variableName = hasOwn(item, "variableName") ? identifier(item.variableName, `${path}.variableName`, errors) : undefined;
  const assumptionRange = hasOwn(item, "assumptionRange") ? readRange(item.assumptionRange, `${path}.assumptionRange`, errors) : undefined;
  const options = hasOwn(item, "options") ? readChoices(item.options, `${path}.options`, errors) : undefined;
  if (inputKind !== undefined) {
    if (numericInputKinds.has(inputKind) && variableName === undefined) errors.push(`${path}.variableName is required for numeric inputs.`);
    if (numericInputKinds.has(inputKind) && required === false) errors.push(`${path}.required must be true for numeric inputs.`);
    if (!numericInputKinds.has(inputKind) && variableName !== undefined) errors.push(`${path}.variableName is only allowed for numeric inputs.`);
    if (inputKind === "choice" && options === undefined) errors.push(`${path}.options is required for choice inputs.`);
    if (inputKind !== "choice" && options !== undefined) errors.push(`${path}.options is only allowed for choice inputs.`);
    if (!numericInputKinds.has(inputKind) && assumptionRange !== undefined) errors.push(`${path}.assumptionRange is only allowed for numeric inputs.`);
  }
  if (errors.length > before || id === undefined || label === undefined || inputKind === undefined || required === undefined) return undefined;
  return {
    id, label, inputKind, required,
    ...(helperText === undefined ? {} : { helperText }),
    ...(unit === undefined ? {} : { unit }),
    ...(variableName === undefined ? {} : { variableName }),
    ...(assumptionRange === undefined ? {} : { assumptionRange }),
    ...(options === undefined ? {} : { options })
  };
}

function readRange(value: unknown, path: string, errors: string[]) {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["min", "max", "unit"], path, errors);
  const before = errors.length;
  const min = finiteNumber(item.min, `${path}.min`, errors);
  const max = finiteNumber(item.max, `${path}.max`, errors);
  const unit = hasOwn(item, "unit") ? enumValue(item.unit, units, `${path}.unit`, errors) : undefined;
  if (min !== undefined && max !== undefined && min > max) errors.push(`${path}.min must be <= max.`);
  return errors.length > before || min === undefined || max === undefined ? undefined : { min, max, ...(unit === undefined ? {} : { unit }) };
}

function readChoices(value: unknown, path: string, errors: string[]): MarketSizingChoiceOption[] | undefined {
  if (!Array.isArray(value) || value.length < 2 || value.length > 20) {
    errors.push(`${path} must contain 2 to 20 choices.`);
    return undefined;
  }
  const result = value.flatMap((entry, index) => {
    const item = objectValue(entry, `${path}[${index}]`, errors);
    if (item === undefined) return [];
    rejectUnknown(item, ["id", "label"], `${path}[${index}]`, errors);
    const id = idValue(item.id, `${path}[${index}].id`, errors);
    const label = text(item.label, `${path}[${index}].label`, 500, errors);
    return id === undefined || label === undefined ? [] : [{ id, label }];
  });
  if (new Set(result.map(({ id }) => id)).size !== result.length) errors.push(`${path} choice IDs must be unique.`);
  if (new Set(result.map(({ label }) => label)).size !== result.length) errors.push(`${path} choice labels must be unique.`);
  return result;
}

function readFinalFormula(
  value: unknown,
  steps: MarketSizingInputStep[] | undefined,
  path: string,
  errors: string[]
): MarketSizingTemplate["finalFormula"] | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["expression", "outputVariable", "roundingRule", "tolerance"], path, errors);
  const before = errors.length;
  const expression = text(item.expression, `${path}.expression`, 500, errors);
  const outputVariable = hasOwn(item, "outputVariable") ? identifier(item.outputVariable, `${path}.outputVariable`, errors) : undefined;
  const roundingRule = enumValue(item.roundingRule, roundingRules, `${path}.roundingRule`, errors);
  const tolerance = readTolerance(item.tolerance, `${path}.tolerance`, errors);
  if (steps !== undefined && expression !== undefined) {
    const variables = steps.flatMap((step) => step.variableName ?? []);
    const used = new Set(expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []);
    for (const name of used) if (!variables.includes(name)) errors.push(`${path}.expression references undeclared variable "${name}".`);
    for (const name of variables) if (!used.has(name)) errors.push(`${path}.expression does not use declared variable "${name}".`);
    if (outputVariable !== undefined && variables.includes(outputVariable)) errors.push(`${path}.outputVariable must not duplicate an input variable.`);
    if (used.size > 0 && [...used].every((name) => variables.includes(name))) {
      const sample = Object.fromEntries(steps.flatMap((step) => step.variableName === undefined ? [] : [[step.variableName, step.assumptionRange === undefined ? 1 : (step.assumptionRange.min + step.assumptionRange.max) / 2]]));
      try { evaluateFormulaExpression(expression, sample); } catch (error) { errors.push(`${path}.expression could not produce a finite sample: ${errorMessage(error)}`); }
    }
  }
  if (errors.length > before || expression === undefined || roundingRule === undefined || tolerance === undefined) return undefined;
  return { expression, ...(outputVariable === undefined ? {} : { outputVariable }), roundingRule, tolerance };
}

function readTolerance(value: unknown, path: string, errors: string[]): ToleranceSpec | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  const type = enumValue(item.type, ["absolute", "percentage", "range"] as const, `${path}.type`, errors);
  if (type === "range") {
    rejectUnknown(item, ["type", "min", "max"], path, errors);
    const min = finiteNumber(item.min, `${path}.min`, errors);
    const max = finiteNumber(item.max, `${path}.max`, errors);
    if (min !== undefined && max !== undefined && min > max) errors.push(`${path}.min must be <= max.`);
    return min === undefined || max === undefined ? undefined : { type, min, max };
  }
  rejectUnknown(item, ["type", "value"], path, errors);
  const amount = finiteNumber(item.value, `${path}.value`, errors);
  if (amount !== undefined && (amount < 0 || (type === "percentage" && amount > 1))) errors.push(`${path}.value is outside the supported range.`);
  return type === undefined || amount === undefined ? undefined : { type, value: amount };
}

function readRubric(value: unknown, path: string, errors: string[]): MarketSizingRubricDimension[] | undefined {
  if (!Array.isArray(value) || value.length !== scoreDimensions.length) {
    errors.push(`${path} must define all ${scoreDimensions.length} score dimensions.`);
    return undefined;
  }
  const result = value.flatMap((entry, index) => {
    const item = objectValue(entry, `${path}[${index}]`, errors);
    if (item === undefined) return [];
    rejectUnknown(item, ["id", "label", "maxPoints"], `${path}[${index}]`, errors);
    const id = enumValue(item.id, scoreDimensions, `${path}[${index}].id`, errors);
    const label = text(item.label, `${path}[${index}].label`, 100, errors);
    const maxPoints = finiteNumber(item.maxPoints, `${path}[${index}].maxPoints`, errors);
    if (maxPoints !== undefined && (maxPoints <= 0 || maxPoints > 100)) errors.push(`${path}[${index}].maxPoints must be > 0 and <= 100.`);
    return id === undefined || label === undefined || maxPoints === undefined ? [] : [{ id, label, maxPoints }];
  });
  if (new Set(result.map(({ id }) => id)).size !== scoreDimensions.length) errors.push(`${path} must contain each score dimension exactly once.`);
  return result;
}

function readSenseCheck(value: unknown, path: string, errors: string[]): MarketSizingTemplate["senseCheck"] | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["prompt", "required", "interpretationOptions"], path, errors);
  const prompt = text(item.prompt, `${path}.prompt`, 1_000, errors);
  const required = booleanValue(item.required, `${path}.required`, errors);
  const interpretationOptions = hasOwn(item, "interpretationOptions") ? readChoices(item.interpretationOptions, `${path}.interpretationOptions`, errors) : undefined;
  return prompt === undefined || required === undefined ? undefined : { prompt, required, ...(interpretationOptions === undefined ? {} : { interpretationOptions }) };
}

function errorMessage(error: unknown) { return error instanceof Error ? error.message : "evaluation failed."; }
