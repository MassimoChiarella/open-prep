import { generateQuestionFromTemplate } from "@/features/questions/questionGenerator";
import type {
  CaseCalculationStepCount,
  CaseIndustry,
  CaseStyleSpec,
  Difficulty,
  InterviewMathEquationOption,
  InterviewMathInterpretationOption,
  QuestionTemplate,
  RoundingRule,
  SkillCategory,
  SkillTag,
  ToleranceSpec,
  UnitType,
  VariableSpec
} from "@/lib/domain";
import { compileFormulaExpression } from "@/lib/math/formulaEvaluator";
import { createSeededRandom } from "@/lib/random/seededRandom";
import type { GeneratedTemplateQuestionPackRecord } from "@/lib/storage/appStorageTypes";
import {
  booleanValue,
  buildRepresentativeSamples,
  createQuestionPackValidationErrors,
  enumValue,
  finiteNumber,
  finalizeQuestionPackValidationErrors,
  hasOwn,
  idValue,
  identifier,
  isValidIdentifier,
  numericEnumValue,
  objectValue,
  optionalText,
  readQuestionPackEnvelope,
  representativeValues,
  rejectUnknown,
  text,
  textArray,
  uniqueEnumArray,
  type UnknownRecord
} from "@/features/question-packs/questionPackValidation";

const maxTemplates = 500;
const maxVariables = 20;
const maxVariableValues = 100;
const maxFormulaLength = 500;
const maxPromptLength = 2_000;
const maxTextLength = 1_000;

const categories = [
  "arithmetic",
  "percentages",
  "fractions_decimals_ratios",
  "growth_compounding",
  "weighted_averages",
  "business_math",
  "case_math",
  "market_sizing",
  "exhibit_math"
] as const satisfies readonly SkillCategory[];

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

const difficulties = ["beginner", "intermediate", "advanced", "expert"] as const satisfies readonly Difficulty[];
const variableTypes = ["integer", "decimal", "percentage", "currency"] as const;
const caseIndustries = [
  "airlines",
  "banking",
  "consumer_goods",
  "healthcare",
  "insurance",
  "manufacturing",
  "marketplaces",
  "retail",
  "saas",
  "telecom"
] as const satisfies readonly CaseIndustry[];
const caseCalculationStepCounts = [2, 3, 4, 5, 6] as const satisfies readonly CaseCalculationStepCount[];
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
const roundingRules = ["exact", "nearest_whole", "nearest_0_1", "nearest_1k", "nearest_1m"] as const satisfies readonly RoundingRule[];

export type GeneratedTemplatePackValidationResult =
  | { status: "valid"; pack: GeneratedTemplateQuestionPackRecord }
  | { status: "invalid"; errors: string[] };

export function validateGeneratedTemplateQuestionPackPayload(
  payload: unknown,
  importedAt = new Date().toISOString()
): GeneratedTemplatePackValidationResult {
  const errors = createQuestionPackValidationErrors();
  const envelope = readQuestionPackEnvelope(payload, "generated_template", ["templates"], errors);
  if (envelope === undefined) return { status: "invalid", errors: finalizeQuestionPackValidationErrors(errors) };
  const { value, id, packVersion, title, description, publisher, license } = envelope;
  const templates = readTemplates(value.templates, errors);

  if (errors.length > 0 || id === undefined || packVersion === undefined || title === undefined || templates === undefined) {
    return { status: "invalid", errors: finalizeQuestionPackValidationErrors(errors) };
  }

  return {
    status: "valid",
    pack: {
      format: "math-drill-question-pack",
      schemaVersion: 2,
      kind: "generated_template",
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

function readTemplates(value: unknown, errors: string[]): QuestionTemplate[] | undefined {
  if (!Array.isArray(value)) {
    errors.push("$.templates must be an array.");
    return undefined;
  }
  if (value.length === 0) errors.push("$.templates must contain at least one template.");
  if (value.length > maxTemplates) errors.push(`$.templates must contain at most ${maxTemplates} templates.`);

  const result: QuestionTemplate[] = [];
  const ids = new Set<string>();
  value.slice(0, maxTemplates).forEach((item, index) => {
    const template = readTemplate(item, `$.templates[${index}]`, errors);
    if (template === undefined) return;
    if (ids.has(template.id)) errors.push(`$.templates[${index}].id duplicates template ID "${template.id}".`);
    else {
      ids.add(template.id);
      result.push(template);
    }
  });
  const caseTemplateCount = result.filter((template) => template.caseStyle !== undefined).length;
  if (caseTemplateCount > 0 && caseTemplateCount < result.length) {
    errors.push("$.templates must either all define caseStyle or all omit caseStyle.");
  }
  return result;
}

function readTemplate(value: unknown, path: string, errors: string[]): QuestionTemplate | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, [
    "id",
    "category",
    "tags",
    "difficulty",
    "promptTemplate",
    "variables",
    "formula",
    "answerUnit",
    "tolerance",
    "roundingRule",
    "explanationTemplate",
    "caseStyle"
  ], path, errors);

  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const category = enumValue(item.category, categories, `${path}.category`, errors);
  const templateTags = uniqueEnumArray(item.tags, tags, `${path}.tags`, 1, 10, errors);
  const templateDifficulties = uniqueEnumArray(item.difficulty, difficulties, `${path}.difficulty`, 1, 4, errors);
  const promptTemplate = text(item.promptTemplate, `${path}.promptTemplate`, maxPromptLength, errors);
  const variables = readVariables(item.variables, `${path}.variables`, errors);
  const formula = readFormula(item.formula, variables, `${path}.formula`, errors);
  const answerUnit = hasOwn(item, "answerUnit")
    ? enumValue(item.answerUnit, units, `${path}.answerUnit`, errors)
    : undefined;
  const tolerance = hasOwn(item, "tolerance")
    ? readTolerance(item.tolerance, `${path}.tolerance`, errors)
    : undefined;
  const roundingRule = hasOwn(item, "roundingRule")
    ? enumValue(item.roundingRule, roundingRules, `${path}.roundingRule`, errors)
    : undefined;
  const explanationTemplate = readExplanationTemplate(item.explanationTemplate, `${path}.explanationTemplate`, errors);
  const caseStyle = hasOwn(item, "caseStyle")
    ? readCaseStyle(item.caseStyle, `${path}.caseStyle`, errors)
    : undefined;
  if (caseStyle !== undefined && category !== "case_math") {
    errors.push(`${path}.category must be "case_math" when caseStyle is defined.`);
  }
  if (caseStyle !== undefined && caseStyle.interviewMath.expectedUnit !== (answerUnit ?? "none")) {
    errors.push(`${path}.answerUnit must match ${path}.caseStyle.interviewMath.expectedUnit.`);
  }

  if (
    errors.length > before || id === undefined || category === undefined || templateTags === undefined ||
    templateDifficulties === undefined || promptTemplate === undefined || variables === undefined ||
    formula === undefined || explanationTemplate === undefined
  ) return undefined;

  const template: QuestionTemplate = {
    id,
    category,
    tags: templateTags,
    difficulty: templateDifficulties,
    promptTemplate,
    variables,
    formula,
    ...(answerUnit === undefined ? {} : { answerUnit }),
    ...(tolerance === undefined ? {} : { tolerance }),
    ...(roundingRule === undefined ? {} : { roundingRule }),
    explanationTemplate,
    ...(caseStyle === undefined ? {} : { caseStyle })
  };

  validatePlaceholders(template, path, errors);
  validateRepresentativeFormulaResults(template, path, errors);
  for (const difficulty of template.difficulty) {
    try {
      generateQuestionFromTemplate(template, {
        difficulty,
        random: createSeededRandom(`validate:${id}:${difficulty}`)
      });
    } catch (error) {
      errors.push(`${path} could not generate a finite ${difficulty} sample: ${errorMessage(error)}`);
    }
  }
  return template;
}

function readTolerance(value: unknown, path: string, errors: string[]): ToleranceSpec | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["type", "value", "min", "max"], path, errors);
  const before = errors.length;
  const type = enumValue(item.type, ["absolute", "percentage", "range"] as const, `${path}.type`, errors);
  if (type === undefined) return undefined;

  if (type === "range") {
    if (hasOwn(item, "value")) errors.push(`${path}.value is not allowed for range tolerance.`);
    const min = finiteNumber(item.min, `${path}.min`, errors);
    const max = finiteNumber(item.max, `${path}.max`, errors);
    if (min !== undefined && max !== undefined && min > max) errors.push(`${path}.min must be <= max.`);
    return errors.length > before || min === undefined || max === undefined
      ? undefined
      : { type, min, max };
  }

  if (hasOwn(item, "min") || hasOwn(item, "max")) {
    errors.push(`${path}.min and ${path}.max are only allowed for range tolerance.`);
  }
  const amount = finiteNumber(item.value, `${path}.value`, errors);
  if (amount !== undefined && amount < 0) errors.push(`${path}.value must be non-negative.`);
  if (type === "percentage" && amount !== undefined && amount > 1) errors.push(`${path}.value must be at most 1.`);
  if (type === "absolute" && amount !== undefined && amount > 1_000_000_000) {
    errors.push(`${path}.value must be at most 1000000000.`);
  }
  return errors.length > before || amount === undefined
    ? undefined
    : { type, value: amount };
}

function readVariables(value: unknown, path: string, errors: string[]): Record<string, VariableSpec> | undefined {
  const record = objectValue(value, path, errors);
  if (record === undefined) return undefined;
  const entries = Object.entries(record);
  if (entries.length === 0) errors.push(`${path} must define at least one variable.`);
  if (entries.length > maxVariables) errors.push(`${path} must define at most ${maxVariables} variables.`);

  const result: Record<string, VariableSpec> = Object.create(null) as Record<string, VariableSpec>;
  for (const [name, raw] of entries.slice(0, maxVariables)) {
    if (!isValidIdentifier(name)) {
      errors.push(`${path}.${name} uses an invalid or reserved variable name.`);
      continue;
    }
    const spec = readVariable(raw, `${path}.${name}`, errors);
    if (spec !== undefined) result[name] = spec;
  }
  return result;
}

function readVariable(value: unknown, path: string, errors: string[]): VariableSpec | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["type", "values", "min", "max", "step", "unit"], path, errors);
  const before = errors.length;
  const type = enumValue(item.type, variableTypes, `${path}.type`, errors);
  const unit = hasOwn(item, "unit") ? enumValue(item.unit, units, `${path}.unit`, errors) : undefined;
  const hasValues = hasOwn(item, "values");
  const hasRange = hasOwn(item, "min") || hasOwn(item, "max") || hasOwn(item, "step");
  if (hasValues === hasRange) errors.push(`${path} must define either values or a min/max range, but not both.`);

  let values: number[] | undefined;
  let min: number | undefined;
  let max: number | undefined;
  let step: number | undefined;
  if (hasValues) {
    if (!Array.isArray(item.values) || item.values.length === 0 || item.values.length > maxVariableValues) {
      errors.push(`${path}.values must contain 1 to ${maxVariableValues} numbers.`);
    } else {
      values = item.values.flatMap((entry, index) => {
        const number = finiteNumber(entry, `${path}.values[${index}]`, errors);
        return number === undefined ? [] : [number];
      });
      if (new Set(values).size !== values.length) errors.push(`${path}.values must not contain duplicates.`);
    }
  } else if (hasRange) {
    min = finiteNumber(item.min, `${path}.min`, errors);
    max = finiteNumber(item.max, `${path}.max`, errors);
    step = hasOwn(item, "step") ? finiteNumber(item.step, `${path}.step`, errors) : undefined;
    if (min !== undefined && max !== undefined && min > max) errors.push(`${path}.min must be <= max.`);
    if (step !== undefined && step <= 0) errors.push(`${path}.step must be positive.`);
    const effectiveStep = step ?? (type === "integer" ? 1 : 0.1);
    if (
      min !== undefined &&
      max !== undefined &&
      effectiveStep > 0 &&
      Math.floor((max - min) / effectiveStep) + 1 > 10_001
    ) {
      errors.push(`${path} range must contain at most 10001 values.`);
    }
  }

  if (type === "integer") {
    for (const [label, number] of [["min", min], ["max", max], ["step", step]] as const) {
      if (number !== undefined && !Number.isInteger(number)) errors.push(`${path}.${label} must be a whole number.`);
    }
    if (values?.some((number) => !Number.isInteger(number))) errors.push(`${path}.values must contain whole numbers.`);
  }
  if (errors.length > before || type === undefined) return undefined;
  return {
    type,
    ...(values === undefined ? {} : { values }),
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
    ...(step === undefined ? {} : { step }),
    ...(unit === undefined ? {} : { unit })
  };
}

function readFormula(
  value: unknown,
  variables: Record<string, VariableSpec> | undefined,
  path: string,
  errors: string[]
): QuestionTemplate["formula"] | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["expression", "outputVariable"], path, errors);
  const expression = text(item.expression, `${path}.expression`, maxFormulaLength, errors);
  const outputVariable = hasOwn(item, "outputVariable")
    ? identifier(item.outputVariable, `${path}.outputVariable`, errors)
    : undefined;
  if (outputVariable !== undefined && variables !== undefined && hasOwn(variables, outputVariable)) {
    errors.push(`${path}.outputVariable must not duplicate a declared variable.`);
  }
  if (expression !== undefined && variables !== undefined) {
    const identifiers = expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
    for (const name of new Set(identifiers)) {
      if (!hasOwn(variables, name)) errors.push(`${path}.expression references undeclared variable "${name}".`);
    }
  }
  return expression === undefined ? undefined : { expression, ...(outputVariable === undefined ? {} : { outputVariable }) };
}

function readExplanationTemplate(
  value: unknown,
  path: string,
  errors: string[]
): QuestionTemplate["explanationTemplate"] | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["steps", "shortcut"], path, errors);
  const steps = textArray(item.steps, `${path}.steps`, 1, 10, maxTextLength, errors);
  const shortcut = optionalText(item, "shortcut", maxTextLength, errors, path);
  return steps === undefined ? undefined : { steps, ...(shortcut === undefined ? {} : { shortcut }) };
}

function readCaseStyle(value: unknown, path: string, errors: string[]): CaseStyleSpec | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["calculationStepCount", "industry", "interviewMath"], path, errors);
  const before = errors.length;
  const calculationStepCount = numericEnumValue(
    item.calculationStepCount,
    caseCalculationStepCounts,
    `${path}.calculationStepCount`,
    errors
  );
  const industry = enumValue(item.industry, caseIndustries, `${path}.industry`, errors);
  const interviewMath = readInterviewMath(item.interviewMath, `${path}.interviewMath`, errors);
  if (
    errors.length > before ||
    calculationStepCount === undefined ||
    industry === undefined ||
    interviewMath === undefined
  ) return undefined;
  return { calculationStepCount, industry, interviewMath };
}

function readInterviewMath(
  value: unknown,
  path: string,
  errors: string[]
): CaseStyleSpec["interviewMath"] | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["expectedUnit", "equationOptions", "interpretationOptions"], path, errors);
  const before = errors.length;
  const expectedUnit = enumValue(item.expectedUnit, units, `${path}.expectedUnit`, errors);
  const equationOptions = readEquationOptions(item.equationOptions, `${path}.equationOptions`, errors);
  const interpretationOptions = readInterpretationOptions(
    item.interpretationOptions,
    `${path}.interpretationOptions`,
    errors
  );
  if (
    errors.length > before ||
    expectedUnit === undefined ||
    equationOptions === undefined ||
    interpretationOptions === undefined
  ) return undefined;
  return { expectedUnit, equationOptions, interpretationOptions };
}

function readEquationOptions(
  value: unknown,
  path: string,
  errors: string[]
): InterviewMathEquationOption[] | undefined {
  if (!Array.isArray(value) || value.length < 2 || value.length > 10) {
    errors.push(`${path} must contain 2 to 10 choices.`);
    return undefined;
  }
  const options = value.flatMap((entry, index) => {
    const option = readEquationOption(entry, `${path}[${index}]`, errors);
    return option === undefined ? [] : [option];
  });
  validateUniqueChoices(options, path, errors);
  for (const [index, option] of options.entries()) {
    if (option.setupCorrect && !option.formulaCorrect) {
      errors.push(`${path}[${index}].setupCorrect requires formulaCorrect to be true.`);
    }
  }
  if (options.filter((option) => option.formulaCorrect && option.setupCorrect).length !== 1) {
    errors.push(`${path} must contain exactly one formula-correct and setup-correct choice.`);
  }
  return options;
}

function readEquationOption(
  value: unknown,
  path: string,
  errors: string[]
): InterviewMathEquationOption | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "label", "formulaCorrect", "setupCorrect"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const label = text(item.label, `${path}.label`, maxTextLength, errors);
  const formulaCorrect = booleanValue(item.formulaCorrect, `${path}.formulaCorrect`, errors);
  const setupCorrect = booleanValue(item.setupCorrect, `${path}.setupCorrect`, errors);
  if (
    errors.length > before ||
    id === undefined ||
    label === undefined ||
    formulaCorrect === undefined ||
    setupCorrect === undefined
  ) return undefined;
  return { id, label, formulaCorrect, setupCorrect };
}

function readInterpretationOptions(
  value: unknown,
  path: string,
  errors: string[]
): InterviewMathInterpretationOption[] | undefined {
  if (!Array.isArray(value) || value.length < 2 || value.length > 10) {
    errors.push(`${path} must contain 2 to 10 choices.`);
    return undefined;
  }
  const options = value.flatMap((entry, index) => {
    const option = readInterpretationOption(entry, `${path}[${index}]`, errors);
    return option === undefined ? [] : [option];
  });
  validateUniqueChoices(options, path, errors);
  if (options.filter((option) => option.isCorrect).length !== 1) {
    errors.push(`${path} must contain exactly one correct choice.`);
  }
  return options;
}

function readInterpretationOption(
  value: unknown,
  path: string,
  errors: string[]
): InterviewMathInterpretationOption | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "label", "isCorrect"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const label = text(item.label, `${path}.label`, maxTextLength, errors);
  const isCorrect = booleanValue(item.isCorrect, `${path}.isCorrect`, errors);
  if (errors.length > before || id === undefined || label === undefined || isCorrect === undefined) return undefined;
  return { id, label, isCorrect };
}

function validateUniqueChoices(
  choices: readonly { id: string; label: string }[],
  path: string,
  errors: string[]
): void {
  if (new Set(choices.map(({ id }) => id)).size !== choices.length) {
    errors.push(`${path} choice IDs must be unique.`);
  }
  if (new Set(choices.map(({ label }) => label)).size !== choices.length) {
    errors.push(`${path} choice labels must be unique.`);
  }
}

function validatePlaceholders(template: QuestionTemplate, path: string, errors: string[]): void {
  const allowed = new Set([...Object.keys(template.variables), "answer"]);
  if (template.formula.outputVariable !== undefined) allowed.add(template.formula.outputVariable);
  const texts = [
    template.promptTemplate,
    ...template.explanationTemplate.steps,
    template.explanationTemplate.shortcut ?? "",
    ...(template.caseStyle?.interviewMath.equationOptions.map(({ label }) => label) ?? []),
    ...(template.caseStyle?.interviewMath.interpretationOptions.map(({ label }) => label) ?? [])
  ];
  texts.forEach((value, index) => {
    for (const match of value.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)) {
      if (!allowed.has(match[1])) errors.push(`${path} text ${index + 1} references unresolved placeholder "{${match[1]}}".`);
    }
    const textWithoutValidPlaceholders = value.replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, "");
    if (textWithoutValidPlaceholders.includes("{") || textWithoutValidPlaceholders.includes("}")) {
      errors.push(`${path} text ${index + 1} contains an invalid placeholder.`);
    }
  });
}

function validateRepresentativeFormulaResults(template: QuestionTemplate, path: string, errors: string[]): void {
  const entries = Object.entries(template.variables).map(([name, spec]) => [
    name,
    representativeVariableValues(spec)
  ] as const);
  const samples = buildRepresentativeSamples(entries);
  let evaluateFormula: ReturnType<typeof compileFormulaExpression> | undefined;

  for (const variables of samples) {
    try {
      evaluateFormula ??= compileFormulaExpression(template.formula.expression);
      evaluateFormula(variables);
    } catch (error) {
      const values = Object.entries(variables).map(([name, value]) => `${name}=${value}`).join(", ");
      errors.push(
        `${path}.formula.expression fails for representative values (${values}): ${errorMessage(error)}`
      );
      return;
    }
  }
}

function representativeVariableValues(spec: VariableSpec): number[] {
  if (spec.values !== undefined) {
    return representativeValues(spec.values);
  }

  const min = spec.min as number;
  const max = spec.max as number;
  const step = spec.step ?? (spec.type === "integer" ? 1 : 0.1);
  const stepCount = Math.floor((max - min) / step);
  const valueAt = (index: number) => Number((min + index * step).toFixed(12));
  const closestToZeroIndex = Math.max(0, Math.min(stepCount, Math.round(-min / step)));

  return representativeValues([
    valueAt(0),
    valueAt(stepCount),
    valueAt(Math.floor(stepCount / 2)),
    valueAt(closestToZeroIndex)
  ]);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "generation failed.";
}
