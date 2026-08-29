import type { BenchmarkScoreBand } from "@/features/benchmarks/benchmarkTypes";
import type {
  AnswerErrorChecks,
  AnswerSpec,
  Difficulty,
  ExplanationSpec,
  RoundingRule,
  SkillCategory,
  SkillTag,
  ToleranceSpec,
  UnitType
} from "@/lib/domain";
import type {
  BenchmarkQuestionPackRecord,
  QuestionPackBenchmarkRecord,
  QuestionPackQuestionRecord
} from "@/lib/storage/appStorageTypes";
import {
  enumValue as readEnumValue,
  finiteNumber as readFiniteNumberValue,
  hasOwn,
  integer as readIntegerValue,
  objectValue as readObject,
  readBoundedArray,
  readEnumProperty,
  readFiniteNumberProperty,
  readIdProperty,
  readIntegerProperty,
  readLiteralProperty,
  readOptionalTextProperty,
  readQuestionPackEnvelope,
  readTextProperty,
  readTextValue,
  rejectUnknown as rejectUnknownProperties,
  trackDuplicateId,
  type UnknownRecord
} from "@/features/question-packs/questionPackValidation";

const maxBenchmarks = 25;
const maxQuestions = 50;
const maxTags = 10;
const maxExplanationSteps = 10;

const difficulties = ["beginner", "intermediate", "advanced", "expert"] as const satisfies readonly Difficulty[];
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
const roundingRules = [
  "exact",
  "nearest_whole",
  "nearest_0_1",
  "nearest_1k",
  "nearest_1m"
] as const satisfies readonly RoundingRule[];
const scoreLabels = ["needs_work", "developing", "strong", "excellent"] as const satisfies readonly BenchmarkScoreBand["label"][];

export type BenchmarkQuestionPackValidationResult =
  | { status: "valid"; pack: BenchmarkQuestionPackRecord }
  | { status: "invalid"; errors: string[] };

export function validateBenchmarkQuestionPackPayload(
  payload: unknown,
  importedAt = new Date().toISOString()
): BenchmarkQuestionPackValidationResult {
  const errors: string[] = [];
  const envelope = readQuestionPackEnvelope(payload, "benchmark", ["benchmarks"], errors);
  if (envelope === undefined) return { status: "invalid", errors };
  const { value, id, packVersion, title, description, publisher, license } = envelope;
  const benchmarks = readBenchmarks(value, errors);

  if (
    errors.length > 0 ||
    id === undefined ||
    packVersion === undefined ||
    title === undefined ||
    benchmarks === undefined
  ) {
    return { status: "invalid", errors };
  }

  return {
    status: "valid",
    pack: {
      format: "math-drill-question-pack",
      schemaVersion: 2,
      kind: "benchmark",
      id,
      packVersion,
      title,
      ...(description === undefined ? {} : { description }),
      ...(publisher === undefined ? {} : { publisher }),
      ...(license === undefined ? {} : { license }),
      benchmarks,
      importedAt
    }
  };
}

function readBenchmarks(value: UnknownRecord, errors: string[]): QuestionPackBenchmarkRecord[] | undefined {
  if (!hasOwn(value, "benchmarks")) {
    errors.push("$.benchmarks is required.");
    return undefined;
  }

  const entries = readBoundedArray(value.benchmarks, "$.benchmarks", 1, maxBenchmarks, errors);
  if (entries === undefined) return undefined;

  const benchmarks: QuestionPackBenchmarkRecord[] = [];
  const benchmarkIds = new Set<string>();
  const questionIds = new Set<string>();

  entries.forEach((entry, index) => {
    const path = `$.benchmarks[${index}]`;
    trackDuplicateId(entry, `${path}.id`, "benchmark", benchmarkIds, errors);
    const benchmark = readBenchmark(entry, path, questionIds, errors);
    if (benchmark !== undefined) benchmarks.push(benchmark);
  });

  return benchmarks;
}

function readBenchmark(
  value: unknown,
  path: string,
  questionIds: Set<string>,
  errors: string[]
): QuestionPackBenchmarkRecord | undefined {
  const item = readObject(value, path, errors);
  if (item === undefined) return undefined;

  const errorCount = errors.length;
  rejectUnknownProperties(
    item,
    ["id", "title", "description", "difficulty", "totalSessionSeconds", "scoreBands", "questions"],
    path,
    errors
  );
  const id = readIdProperty(item, "id", `${path}.id`, errors);
  const title = readTextProperty(item, "title", `${path}.title`, 100, errors);
  const description = readTextProperty(item, "description", `${path}.description`, 500, errors);
  const difficulty = readEnumProperty(item, "difficulty", difficulties, `${path}.difficulty`, errors);
  const totalSessionSeconds = readIntegerProperty(
    item,
    "totalSessionSeconds",
    `${path}.totalSessionSeconds`,
    30,
    7_200,
    errors
  );
  const scoreBands = readScoreBands(item, path, errors);
  const questions = readQuestions(item, path, questionIds, errors);

  if (
    errors.length > errorCount ||
    id === undefined ||
    title === undefined ||
    description === undefined ||
    difficulty === undefined ||
    totalSessionSeconds === undefined ||
    scoreBands === undefined ||
    questions === undefined
  ) {
    return undefined;
  }

  return { id, title, description, difficulty, totalSessionSeconds, scoreBands, questions };
}

function readScoreBands(
  value: UnknownRecord,
  benchmarkPath: string,
  errors: string[]
): BenchmarkScoreBand[] | undefined {
  const path = `${benchmarkPath}.scoreBands`;
  if (!hasOwn(value, "scoreBands")) {
    errors.push(`${path} is required.`);
    return undefined;
  }

  if (!Array.isArray(value.scoreBands)) {
    errors.push(`${path} must be an array.`);
    return undefined;
  }
  if (value.scoreBands.length !== scoreLabels.length) {
    errors.push(`${path} must contain exactly ${scoreLabels.length} items.`);
    return undefined;
  }

  const bands: BenchmarkScoreBand[] = [];
  const seenLabels = new Set<BenchmarkScoreBand["label"]>();

  value.scoreBands.forEach((entry, index) => {
    const bandPath = `${path}[${index}]`;
    const band = readScoreBand(entry, bandPath, errors);
    if (band === undefined) return;

    if (seenLabels.has(band.label)) {
      errors.push(`${bandPath}.label duplicates score-band label "${band.label}".`);
      return;
    }
    seenLabels.add(band.label);
    bands.push(band);
  });

  if (bands.length === scoreLabels.length) {
    const byLabel = new Map(bands.map((band) => [band.label, band]));
    const needsWork = byLabel.get("needs_work");
    if (needsWork?.minAccuracy !== 0) {
      errors.push(`${path} needs_work minAccuracy must be 0.`);
    }

    for (let index = 1; index < scoreLabels.length; index += 1) {
      const previous = byLabel.get(scoreLabels[index - 1]);
      const current = byLabel.get(scoreLabels[index]);
      if (previous !== undefined && current !== undefined && current.minAccuracy <= previous.minAccuracy) {
        errors.push(`${path} minAccuracy thresholds must strictly increase from needs_work through excellent.`);
        break;
      }
    }
  }

  return bands;
}

function readScoreBand(value: unknown, path: string, errors: string[]): BenchmarkScoreBand | undefined {
  const item = readObject(value, path, errors);
  if (item === undefined) return undefined;

  const errorCount = errors.length;
  rejectUnknownProperties(item, ["label", "minAccuracy", "title"], path, errors);
  const label = readEnumProperty(item, "label", scoreLabels, `${path}.label`, errors);
  const minAccuracy = readFiniteNumberProperty(item, "minAccuracy", `${path}.minAccuracy`, errors);
  const title = readTextProperty(item, "title", `${path}.title`, 100, errors);
  if (minAccuracy !== undefined && (minAccuracy < 0 || minAccuracy > 1)) {
    errors.push(`${path}.minAccuracy must be from 0 to 1.`);
  }

  if (errors.length > errorCount || label === undefined || minAccuracy === undefined || title === undefined) {
    return undefined;
  }
  return { label, minAccuracy, title };
}

function readQuestions(
  value: UnknownRecord,
  benchmarkPath: string,
  questionIds: Set<string>,
  errors: string[]
): QuestionPackQuestionRecord[] | undefined {
  const path = `${benchmarkPath}.questions`;
  if (!hasOwn(value, "questions")) {
    errors.push(`${path} is required.`);
    return undefined;
  }

  const entries = readBoundedArray(value.questions, path, 1, maxQuestions, errors);
  if (entries === undefined) return undefined;

  const questions: QuestionPackQuestionRecord[] = [];
  entries.forEach((entry, index) => {
    const questionPath = `${path}[${index}]`;
    trackDuplicateId(entry, `${questionPath}.id`, "question", questionIds, errors);
    const question = readQuestion(entry, questionPath, errors);
    if (question !== undefined) questions.push(question);
  });
  return questions;
}

function readQuestion(value: unknown, path: string, errors: string[]): QuestionPackQuestionRecord | undefined {
  const item = readObject(value, path, errors);
  if (item === undefined) return undefined;

  const errorCount = errors.length;
  rejectUnknownProperties(
    item,
    ["id", "type", "category", "tags", "difficulty", "prompt", "answer", "explanation", "expectedTimeSeconds"],
    path,
    errors
  );
  const id = readIdProperty(item, "id", `${path}.id`, errors);
  const type = readLiteralProperty(item, "type", "numeric", `${path}.type`, errors);
  const category = readEnumProperty(item, "category", categories, `${path}.category`, errors);
  const questionTags = readTags(item, path, errors);
  const difficulty = readEnumProperty(item, "difficulty", difficulties, `${path}.difficulty`, errors);
  const prompt = readTextProperty(item, "prompt", `${path}.prompt`, 2_000, errors);
  const answer = readAnswer(item, path, errors);
  const explanation = readExplanation(item, path, errors);
  const expectedTimeSeconds = hasOwn(item, "expectedTimeSeconds")
    ? readIntegerValue(item.expectedTimeSeconds, `${path}.expectedTimeSeconds`, 1, 3_600, errors)
    : undefined;

  if (
    errors.length > errorCount ||
    id === undefined ||
    type === undefined ||
    category === undefined ||
    questionTags === undefined ||
    difficulty === undefined ||
    prompt === undefined ||
    answer === undefined ||
    explanation === undefined
  ) {
    return undefined;
  }

  return {
    id,
    type,
    category,
    tags: questionTags,
    difficulty,
    prompt,
    answer,
    explanation,
    ...(expectedTimeSeconds === undefined ? {} : { expectedTimeSeconds })
  };
}

function readTags(value: UnknownRecord, questionPath: string, errors: string[]): SkillTag[] | undefined {
  const path = `${questionPath}.tags`;
  if (!hasOwn(value, "tags")) {
    errors.push(`${path} is required.`);
    return undefined;
  }

  const entries = readBoundedArray(value.tags, path, 1, maxTags, errors);
  if (entries === undefined) return undefined;

  const result: SkillTag[] = [];
  const seen = new Set<SkillTag>();
  entries.forEach((entry, index) => {
    const tag = readEnumValue(entry, tags, `${path}[${index}]`, errors);
    if (tag === undefined) return;
    if (seen.has(tag)) errors.push(`${path}[${index}] duplicates tag "${tag}".`);
    else {
      seen.add(tag);
      result.push(tag);
    }
  });
  return result;
}

function readAnswer(value: UnknownRecord, questionPath: string, errors: string[]): AnswerSpec | undefined {
  const path = `${questionPath}.answer`;
  if (!hasOwn(value, "answer")) {
    errors.push(`${path} is required.`);
    return undefined;
  }

  const item = readObject(value.answer, path, errors);
  if (item === undefined) return undefined;
  const errorCount = errors.length;
  rejectUnknownProperties(item, ["value", "unit", "tolerance", "errorChecks", "roundingRule"], path, errors);
  const answerValue = readFiniteNumberProperty(item, "value", `${path}.value`, errors);
  const unit = readEnumProperty(item, "unit", units, `${path}.unit`, errors);
  const tolerance = hasOwn(item, "tolerance") ? readTolerance(item.tolerance, `${path}.tolerance`, errors) : undefined;
  const errorChecks = hasOwn(item, "errorChecks")
    ? readErrorChecks(item.errorChecks, `${path}.errorChecks`, errors)
    : undefined;
  const roundingRule = hasOwn(item, "roundingRule")
    ? readEnumValue(item.roundingRule, roundingRules, `${path}.roundingRule`, errors)
    : undefined;

  if (errors.length > errorCount || answerValue === undefined || unit === undefined) return undefined;
  return {
    value: answerValue,
    unit,
    ...(tolerance === undefined ? {} : { tolerance }),
    ...(errorChecks === undefined ? {} : { errorChecks }),
    ...(roundingRule === undefined ? {} : { roundingRule })
  };
}

function readTolerance(value: unknown, path: string, errors: string[]): ToleranceSpec | undefined {
  const item = readObject(value, path, errors);
  if (item === undefined) return undefined;
  const errorCount = errors.length;
  const type = readEnumProperty(item, "type", ["absolute", "percentage", "range"] as const, `${path}.type`, errors);

  if (type === "absolute" || type === "percentage") {
    rejectUnknownProperties(item, ["type", "value"], path, errors);
    const amount = readFiniteNumberProperty(item, "value", `${path}.value`, errors);
    if (amount !== undefined && amount < 0) errors.push(`${path}.value must be non-negative.`);
    if (type === "percentage" && amount !== undefined && amount > 1) {
      errors.push(`${path}.value must be at most 1 (100%).`);
    }
    return errors.length === errorCount && amount !== undefined ? { type, value: amount } : undefined;
  }

  if (type === "range") {
    rejectUnknownProperties(item, ["type", "min", "max"], path, errors);
    const min = readFiniteNumberProperty(item, "min", `${path}.min`, errors);
    const max = readFiniteNumberProperty(item, "max", `${path}.max`, errors);
    if (min !== undefined && max !== undefined && min > max) {
      errors.push(`${path}.min must be less than or equal to ${path}.max.`);
    }
    return errors.length === errorCount && min !== undefined && max !== undefined ? { type, min, max } : undefined;
  }

  rejectUnknownProperties(item, ["type", "value", "min", "max"], path, errors);
  return undefined;
}

function readErrorChecks(value: unknown, path: string, errors: string[]): AnswerErrorChecks | undefined {
  const item = readObject(value, path, errors);
  if (item === undefined) return undefined;
  const errorCount = errors.length;
  rejectUnknownProperties(item, ["percentagePointValue", "roundingTolerance"], path, errors);
  if (!hasOwn(item, "percentagePointValue") && !hasOwn(item, "roundingTolerance")) {
    errors.push(`${path} must define at least one error check.`);
  }
  const percentagePointValue = hasOwn(item, "percentagePointValue")
    ? readFiniteNumberValue(item.percentagePointValue, `${path}.percentagePointValue`, errors)
    : undefined;
  const roundingTolerance = hasOwn(item, "roundingTolerance")
    ? readTolerance(item.roundingTolerance, `${path}.roundingTolerance`, errors)
    : undefined;

  if (errors.length > errorCount) return undefined;
  return {
    ...(percentagePointValue === undefined ? {} : { percentagePointValue }),
    ...(roundingTolerance === undefined ? {} : { roundingTolerance })
  };
}

function readExplanation(value: UnknownRecord, questionPath: string, errors: string[]): ExplanationSpec | undefined {
  const path = `${questionPath}.explanation`;
  if (!hasOwn(value, "explanation")) {
    errors.push(`${path} is required.`);
    return undefined;
  }

  const item = readObject(value.explanation, path, errors);
  if (item === undefined) return undefined;
  const errorCount = errors.length;
  rejectUnknownProperties(item, ["short", "steps", "shortcut"], path, errors);
  const short = readTextProperty(item, "short", `${path}.short`, 1_000, errors);
  const steps = readExplanationSteps(item, path, errors);
  const shortcut = readOptionalTextProperty(item, "shortcut", `${path}.shortcut`, 1_000, errors);

  if (errors.length > errorCount || short === undefined || steps === undefined) return undefined;
  return { short, steps, ...(shortcut === undefined ? {} : { shortcut }) };
}

function readExplanationSteps(
  value: UnknownRecord,
  explanationPath: string,
  errors: string[]
): string[] | undefined {
  const path = `${explanationPath}.steps`;
  if (!hasOwn(value, "steps")) {
    errors.push(`${path} is required.`);
    return undefined;
  }

  const entries = readBoundedArray(value.steps, path, 1, maxExplanationSteps, errors);
  if (entries === undefined) return undefined;
  const steps: string[] = [];
  entries.forEach((entry, index) => {
    const step = readTextValue(entry, `${path}[${index}]`, 1_000, errors);
    if (step !== undefined) steps.push(step);
  });
  return steps;
}
