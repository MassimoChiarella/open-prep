import type {
  AnswerErrorChecks,
  AnswerSpec,
  Difficulty,
  DrillSession,
  ExplanationSpec,
  Question,
  RoundingRule,
  SkillCategory,
  SkillTag,
  ToleranceSpec,
  UnitType
} from "@/lib/domain";
import type { BenchmarkTest } from "@/features/benchmarks/benchmarkTypes";
import type { ExhibitDataset } from "@/features/exhibits/exhibitTypes";
import type { MarketSizingTemplate } from "@/features/market-sizing/marketSizingTypes";
import { generateQuestionsFromTemplates } from "@/features/questions/questionGenerator";
import { validateBenchmarkQuestionPackPayload } from "@/features/question-packs/questionPackBenchmark";
import { validateCasePracticeQuestionPackPayload } from "@/features/question-packs/questionPackCasePractice";
import { validateExhibitQuestionPackPayload } from "@/features/question-packs/questionPackExhibit";
import { validateMarketSizingQuestionPackPayload } from "@/features/question-packs/questionPackMarketSizing";
import { validateGeneratedTemplateQuestionPackPayload } from "@/features/question-packs/questionPackTemplate";
import {
  createQuestionPackValidationErrors,
  enumValue as readEnumValue,
  finiteNumber as readFiniteNumberValue,
  finalizeQuestionPackValidationErrors,
  hasOwn,
  objectValue as readObject,
  questionPackMaxFileBytes,
  readEnumProperty,
  readFiniteNumberProperty,
  readIdProperty,
  readLiteralProperty,
  readOptionalIntegerProperty,
  readOptionalTextProperty,
  readQuestionPackEnvelope,
  readTextProperty,
  readTextValue,
  rejectUnknown as rejectUnknownProperties,
  trackDuplicateId,
  type UnknownRecord
} from "@/features/question-packs/questionPackValidation";
import { createSeededRandom } from "@/lib/random/seededRandom";
import {
  appStoreIndexNames,
  type AppStorage,
  type AppStoragePage,
  type BenchmarkQuestionPackRecord,
  type CasePracticeQuestionPackRecord,
  type ExhibitQuestionPackRecord,
  type FixedNumericQuestionPackRecord,
  type MarketSizingQuestionPackRecord,
  type QuestionPackQuestionRecord,
  type QuestionPackRecord
} from "@/lib/storage/appStorageTypes";

const questionPackFormat = "math-drill-question-pack" as const;
const questionPackSchemaVersion = 2 as const;
export const questionPackSourceParam = "question_pack" as const;
export { questionPackMaxFileBytes };
export const questionPackMaxQuestions = 500;
export const questionPackMaxInstalledPacks = 200;
export const questionPackMaxInstalledBytes = 20 * 1024 * 1024;
export const questionPackListPageSize = 25;
const questionPackQuotaScanPageSize = 100;
const questionPackMaxTags = 10;
const questionPackMaxExplanationSteps = 10;
const questionPackMaxPromptLength = 2_000;
const questionPackMaxExplanationTextLength = 1_000;
const questionPackMaxExpectedTimeSeconds = 3_600;
const questionPackWriteLockName = "consulting-math-drill:question-pack-write";
let localQuestionPackWriteQueue: Promise<void> = Promise.resolve();

type QuestionPackValidationResult =
  | { status: "valid"; pack: QuestionPackRecord }
  | { status: "invalid"; errors: string[] };

export type QuestionPackQuotaReason = "bytes" | "count";

export class QuestionPackQuotaError extends Error {
  constructor(readonly reason: QuestionPackQuotaReason) {
    super(`Installed question-pack ${reason} quota exceeded.`);
    this.name = "QuestionPackQuotaError";
  }
}

export interface QuestionPackUsage {
  existingPackBytes?: number;
  installedCount: number;
  totalBytes: number;
}

export interface ProjectedQuestionPackUsage {
  installedCount: number;
  replaced: boolean;
  totalBytes: number;
}

interface CreateQuestionPackDrillSessionOptions {
  difficulty: Difficulty;
  questionCount: number;
  seed?: string | number;
  startedAt?: string;
  sessionId?: string;
}

export interface CreatedQuestionPackDrillSession {
  session: DrillSession;
  questions: Question[];
  interviewMathMode: boolean;
}

type QuestionPackDifficultyCounts = Record<Difficulty, number>;

const skillCategories = [
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

const skillTags = [
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

export function validateQuestionPackPayload(
  payload: unknown,
  importedAt = new Date().toISOString()
): QuestionPackValidationResult {
  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    const kind = (payload as Record<string, unknown>).kind;
    if (kind === "generated_template") return validateGeneratedTemplateQuestionPackPayload(payload, importedAt);
    if (kind === "benchmark") return validateBenchmarkQuestionPackPayload(payload, importedAt);
    if (kind === "case_practice") return validateCasePracticeQuestionPackPayload(payload, importedAt);
    if (kind === "exhibit") return validateExhibitQuestionPackPayload(payload, importedAt);
    if (kind === "market_sizing") return validateMarketSizingQuestionPackPayload(payload, importedAt);
    if (kind !== "fixed_numeric") {
      return { status: "invalid", errors: ["$.kind is not a supported content kind."] };
    }
  }

  const errors = createQuestionPackValidationErrors();
  const envelope = readQuestionPackEnvelope(payload, "fixed_numeric", ["questions"], errors);
  if (envelope === undefined) return { status: "invalid", errors: finalizeQuestionPackValidationErrors(errors) };
  const { value, id, packVersion, title, description, publisher, license } = envelope;
  const questions = readQuestions(value, errors);

  if (
    errors.length > 0 ||
    packVersion === undefined ||
    id === undefined ||
    title === undefined ||
    questions === undefined
  ) {
    return { status: "invalid", errors: finalizeQuestionPackValidationErrors(errors) };
  }

  return {
    status: "valid",
    pack: {
      id,
      format: questionPackFormat,
      schemaVersion: questionPackSchemaVersion,
      kind: "fixed_numeric",
      packVersion,
      title,
      ...(description === undefined ? {} : { description }),
      ...(publisher === undefined ? {} : { publisher }),
      ...(license === undefined ? {} : { license }),
      questions,
      importedAt
    }
  };
}

export function toQuestionPackQuestions(pack: FixedNumericQuestionPackRecord): Question[] {
  return pack.questions.map((question) => toQuestionPackQuestion(pack.id, question));
}

export function toQuestionPackExhibitDatasets(pack: ExhibitQuestionPackRecord): ExhibitDataset[] {
  return pack.datasets.map((dataset) => ({
    ...dataset,
    id: `question-pack:${pack.id}:version:${encodeURIComponent(pack.packVersion)}:exhibit:${dataset.id}`
  }));
}

export function toQuestionPackMarketSizingTemplates(
  pack: MarketSizingQuestionPackRecord
): MarketSizingTemplate[] {
  return pack.templates.map((template) => ({
    ...template,
    id: `question-pack:${pack.id}:version:${encodeURIComponent(pack.packVersion)}:market-sizing:${template.id}`
  }));
}

export function toQuestionPackBenchmarkTests(pack: BenchmarkQuestionPackRecord): BenchmarkTest[] {
  return pack.benchmarks.map((benchmark) => {
    const questions = benchmark.questions.map((question) => {
      const converted = toQuestionPackQuestion(
        `${pack.id}:version:${encodeURIComponent(pack.packVersion)}:benchmark:${benchmark.id}`,
        question
      );
      return {
        ...converted,
        metadata: {
          ...converted.metadata,
          sourcePackId: pack.id,
          sourceQuestionId: `${benchmark.id}:${question.id}`,
          sourceType: "benchmark" as const
        }
      };
    });

    return {
      id: `question-pack:${pack.id}:version:${encodeURIComponent(pack.packVersion)}:benchmark:${benchmark.id}`,
      title: benchmark.title,
      description: benchmark.description,
      difficulty: benchmark.difficulty,
      questions,
      scoreBands: benchmark.scoreBands.map((band) => ({ ...band })),
      settings: {
        categories: Array.from(new Set(questions.map((question) => question.category))),
        difficulty: benchmark.difficulty,
        feedbackMode: "end_of_session",
        questionCount: questions.length,
        questionPackId: pack.id,
        timeMode: "session",
        totalSessionSeconds: benchmark.totalSessionSeconds
      }
    };
  });
}

export function toQuestionPackCasePracticeContent(pack: CasePracticeQuestionPackRecord) {
  const namespace = (kind: string, id: string) =>
    `question-pack:${pack.id}:version:${encodeURIComponent(pack.packVersion)}:${kind}:${id}`;

  return {
    ...(pack.structuringPrompts === undefined
      ? {}
      : {
          structuringPrompts: pack.structuringPrompts.map((prompt) => ({
            ...prompt,
            id: namespace("structuring", prompt.id)
          }))
        }),
    ...(pack.brainstormingPrompts === undefined
      ? {}
      : {
          brainstormingPrompts: pack.brainstormingPrompts.map((prompt) => ({
            ...prompt,
            id: namespace("brainstorming", prompt.id)
          }))
        }),
    ...(pack.synthesisPrompts === undefined
      ? {}
      : {
          synthesisPrompts: pack.synthesisPrompts.map((prompt) => ({
            ...prompt,
            id: namespace("synthesis", prompt.id)
          }))
        }),
    ...(pack.lessons === undefined
      ? {}
      : {
          lessons: pack.lessons.map((lesson) => ({
            ...lesson,
            id: namespace("lesson", lesson.id)
          }))
        }),
    ...(pack.fitPrompts === undefined
      ? {}
      : {
          fitPrompts: pack.fitPrompts.map((prompt) => ({
            ...prompt,
            id: namespace("fit", prompt.id)
          }))
        }),
    ...(pack.questioningPrompts === undefined
      ? {}
      : {
          questioningPrompts: pack.questioningPrompts.map((prompt) => ({
            ...prompt,
            id: namespace("questioning", prompt.id)
          }))
        }),
    ...(pack.fullCases === undefined
      ? {}
      : {
          fullCases: pack.fullCases.map((simulation) => ({
            ...simulation,
            id: namespace("full-case", simulation.id),
            ...(simulation.questioning === undefined
              ? {}
              : {
                  questioning: {
                    ...simulation.questioning,
                    id: namespace("full-case-questioning", simulation.questioning.id)
                  }
                }),
            structure: {
              ...simulation.structure,
              id: namespace("full-case-structure", simulation.structure.id)
            },
            brainstorming: {
              ...simulation.brainstorming,
              id: namespace("full-case-brainstorming", simulation.brainstorming.id)
            },
            synthesis: {
              ...simulation.synthesis,
              id: namespace("full-case-synthesis", simulation.synthesis.id)
            },
            exhibit: {
              ...simulation.exhibit,
              id: namespace("full-case-exhibit", simulation.exhibit.id)
            }
          }))
        })
  };
}

export function getQuestionPackDifficultyCounts(pack: QuestionPackRecord): QuestionPackDifficultyCounts {
  const counts: QuestionPackDifficultyCounts = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
    expert: 0
  };

  if (pack.kind === "fixed_numeric") {
    for (const question of pack.questions) counts[question.difficulty] += 1;
  } else if (pack.kind === "generated_template") {
    for (const template of pack.templates) {
      for (const difficulty of template.difficulty) counts[difficulty] += 1;
    }
  } else if (pack.kind === "exhibit") {
    for (const dataset of pack.datasets) for (const question of dataset.questions) counts[question.difficulty] += 1;
  } else if (pack.kind === "market_sizing") {
    for (const template of pack.templates) counts[template.difficulty] += 1;
  } else if (pack.kind === "benchmark") {
    for (const benchmark of pack.benchmarks) counts[benchmark.difficulty] += 1;
  }

  return counts;
}

export function buildQuestionPackDrillHref(packId: string, difficulty: Difficulty, count: number): string {
  const params = new URLSearchParams({
    source: questionPackSourceParam,
    pack: packId,
    difficulty,
    count: String(normalizeQuestionCount(count))
  });

  return `/drills/session?${params.toString()}`;
}

export function createQuestionPackDrillSession(
  pack: QuestionPackRecord,
  options: CreateQuestionPackDrillSessionOptions
): CreatedQuestionPackDrillSession {
  if (pack.kind !== "fixed_numeric") {
    if (pack.kind === "generated_template") return createGeneratedTemplatePackSession(pack, options);
    throw new Error(`Question pack "${pack.id}" does not contain drill questions.`);
  }

  const eligible = pack.questions.filter((question) => question.difficulty === options.difficulty);

  if (eligible.length === 0) {
    throw new Error(`Question pack "${pack.id}" has no ${options.difficulty} questions.`);
  }

  const questionCount = Math.min(normalizeQuestionCount(options.questionCount), eligible.length);
  const startedAt = options.startedAt ?? new Date().toISOString();
  const seed = options.seed ?? `${pack.id}:${pack.packVersion}:${options.difficulty}:${questionCount}:${startedAt}`;
  const selected = createSeededRandom(seed).shuffle(eligible).slice(0, questionCount);
  const questions = selected.map((question) => toQuestionPackQuestion(pack.id, question));

  return {
    session: {
      id: options.sessionId ?? buildQuestionPackSessionId(pack.id, options.difficulty, startedAt),
      startedAt,
      settings: {
        categories: Array.from(new Set(questions.map((question) => question.category))),
        difficulty: options.difficulty,
        questionCount: questions.length,
        questionPackId: pack.id,
        timeMode: "untimed",
        feedbackMode: "instant"
      },
      questionIds: questions.map((question) => question.id),
      responses: []
    },
    questions,
    interviewMathMode: false
  };
}

function createGeneratedTemplatePackSession(
  pack: Extract<QuestionPackRecord, { kind: "generated_template" }>,
  options: CreateQuestionPackDrillSessionOptions
): CreatedQuestionPackDrillSession {
  const templates = pack.templates.filter((template) => template.difficulty.includes(options.difficulty));
  if (templates.length === 0) {
    throw new Error(`Question pack "${pack.id}" has no ${options.difficulty} templates.`);
  }

  const questionCount = normalizeQuestionCount(options.questionCount);
  const startedAt = options.startedAt ?? new Date().toISOString();
  const seed = options.seed ?? `${pack.id}:${pack.packVersion}:${options.difficulty}:${questionCount}:${startedAt}`;
  const settings: DrillSession["settings"] = {
    categories: Array.from(new Set(templates.map((template) => template.category))),
    difficulty: options.difficulty,
    questionCount,
    questionPackId: pack.id,
    timeMode: "untimed",
    feedbackMode: "instant"
  };
  let questions: Question[];
  try {
    questions = generateQuestionsFromTemplates(templates, settings, seed, true).map((question) => {
      const sourceQuestionId = question.id;
      return {
        ...question,
        id: `question-pack:${pack.id}:${sourceQuestionId}`,
        tags: [...question.tags],
        answer: cloneAnswer(question.answer),
        explanation: {
          ...question.explanation,
          steps: [...question.explanation.steps]
        },
        metadata: {
          ...question.metadata,
          ...(question.metadata?.variables === undefined
            ? {}
            : { variables: { ...question.metadata.variables } }),
          sourcePackId: pack.id,
          sourceQuestionId,
          sourceType: "generated" as const
        }
      };
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Generation failed.";
    throw new Error(
      `Question pack "${pack.title}" could not generate a safe ${options.difficulty} drill. Review its formulas and variable ranges. ${detail}`
    );
  }
  const interviewMathMode = templates.every((template) => template.caseStyle !== undefined);

  return {
    session: {
      id: options.sessionId ?? buildQuestionPackSessionId(pack.id, options.difficulty, startedAt),
      startedAt,
      settings: { ...settings, questionCount: questions.length },
      questionIds: questions.map((question) => question.id),
      responses: []
    },
    questions,
    interviewMathMode
  };
}

export async function loadQuestionPackPage(
  storage: AppStorage,
  afterKey?: IDBValidKey
): Promise<AppStoragePage<QuestionPackRecord>> {
  return storage.getPage("question_packs", appStoreIndexNames.question_packs, {
    ...(afterKey === undefined ? {} : { afterKey }),
    direction: "prev",
    limit: questionPackListPageSize
  });
}

export async function loadQuestionPacks(storage: AppStorage): Promise<QuestionPackRecord[]> {
  const packs: QuestionPackRecord[] = [];
  let afterKey: IDBValidKey | undefined;

  do {
    const page = await loadQuestionPackPage(storage, afterKey);
    packs.push(...page.values);
    afterKey = page.continuationKey;
  } while (afterKey !== undefined);

  return packs;
}

export async function saveQuestionPack(
  storage: AppStorage,
  pack: QuestionPackRecord
): Promise<ProjectedQuestionPackUsage> {
  return withQuestionPackWriteLock(async () => {
    const usage = await inspectQuestionPackUsage(storage, pack.id);
    const projected = projectQuestionPackUsage(usage, getQuestionPackStoredBytes(pack));
    await storage.put("question_packs", pack);
    return projected;
  });
}

export async function deleteQuestionPack(storage: AppStorage, id: string): Promise<number> {
  return withQuestionPackWriteLock(async () => {
    await storage.delete("question_packs", id);
    return storage.count("question_packs");
  });
}

export function serializeQuestionPack(pack: QuestionPackRecord): string {
  const { catalogProvenance: _catalogProvenance, importedAt: _importedAt, ...payload } = pack;
  return `${JSON.stringify({ $schema: `./question-pack-v${pack.schemaVersion}.schema.json`, ...payload }, null, 2)}\n`;
}

export function getQuestionPackStoredBytes(pack: QuestionPackRecord): number {
  return new TextEncoder().encode(JSON.stringify(pack)).byteLength;
}

export function projectQuestionPackUsage(
  usage: QuestionPackUsage,
  candidateBytes: number
): ProjectedQuestionPackUsage {
  if (!Number.isSafeInteger(usage.installedCount) || usage.installedCount < 0) {
    throw new RangeError("Installed question-pack count must be a non-negative safe integer.");
  }
  for (const value of [usage.totalBytes, usage.existingPackBytes, candidateBytes]) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
      throw new RangeError("Question-pack byte counts must be non-negative safe integers.");
    }
  }

  const replaced = usage.existingPackBytes !== undefined;
  const installedCount = usage.installedCount + (replaced ? 0 : 1);
  const totalBytes = usage.totalBytes - (usage.existingPackBytes ?? 0) + candidateBytes;

  if (!replaced && installedCount > questionPackMaxInstalledPacks) {
    throw new QuestionPackQuotaError("count");
  }
  if (
    totalBytes > questionPackMaxInstalledBytes &&
    (!replaced || totalBytes > usage.totalBytes)
  ) {
    throw new QuestionPackQuotaError("bytes");
  }

  return { installedCount, replaced, totalBytes };
}

async function inspectQuestionPackUsage(storage: AppStorage, packId: string): Promise<QuestionPackUsage> {
  const expectedCount = await storage.count("question_packs");
  let afterKey: IDBValidKey | undefined;
  let existingPackBytes: number | undefined;
  let installedCount = 0;
  let totalBytes = 0;

  do {
    const page = await storage.getPage("question_packs", appStoreIndexNames.question_packs, {
      ...(afterKey === undefined ? {} : { afterKey }),
      direction: "prev",
      limit: questionPackQuotaScanPageSize
    });

    for (const installedPack of page.values) {
      const bytes = getQuestionPackStoredBytes(installedPack);
      installedCount += 1;
      totalBytes += bytes;
      if (installedPack.id === packId) existingPackBytes = bytes;
    }
    afterKey = page.continuationKey;
  } while (afterKey !== undefined);

  if (installedCount !== expectedCount) {
    throw new Error("Installed question-pack index is incomplete; no changes were saved.");
  }

  return {
    ...(existingPackBytes === undefined ? {} : { existingPackBytes }),
    installedCount,
    totalBytes
  };
}

function withQuestionPackWriteLock<TResult>(action: () => Promise<TResult>): Promise<TResult> {
  const lockManager = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (lockManager !== undefined) {
    return lockManager.request(questionPackWriteLockName, action);
  }

  const result = localQuestionPackWriteQueue.then(action, action);
  localQuestionPackWriteQueue = result.then(() => undefined, () => undefined);
  return result;
}

function readQuestions(value: UnknownRecord, errors: string[]): QuestionPackQuestionRecord[] | undefined {
  if (!hasOwn(value, "questions")) {
    errors.push("$.questions is required.");
    return undefined;
  }

  const rawQuestions = value.questions;
  if (!Array.isArray(rawQuestions)) {
    errors.push("$.questions must be an array.");
    return undefined;
  }

  if (rawQuestions.length === 0) {
    errors.push("$.questions must contain at least one question.");
  }

  if (rawQuestions.length > questionPackMaxQuestions) {
    errors.push(`$.questions must contain at most ${questionPackMaxQuestions} questions.`);
  }

  const questions: QuestionPackQuestionRecord[] = [];
  const questionIds = new Set<string>();

  for (let index = 0; index < Math.min(rawQuestions.length, questionPackMaxQuestions); index += 1) {
    const question = readQuestion(rawQuestions[index], index, errors);
    trackDuplicateId(rawQuestions[index], `$.questions[${index}].id`, "question", questionIds, errors);

    if (question !== undefined) {
      questions.push(question);
    }
  }

  return questions;
}

function readQuestion(
  value: unknown,
  index: number,
  errors: string[]
): QuestionPackQuestionRecord | undefined {
  const path = `$.questions[${index}]`;
  const errorCount = errors.length;
  const question = readObject(value, path, errors);

  if (question === undefined) {
    return undefined;
  }

  rejectUnknownProperties(
    question,
    new Set([
      "id",
      "type",
      "category",
      "tags",
      "difficulty",
      "prompt",
      "answer",
      "explanation",
      "expectedTimeSeconds"
    ]),
    path,
    errors
  );

  const id = readIdProperty(question, "id", `${path}.id`, errors);
  const type = readLiteralProperty(question, "type", "numeric", `${path}.type`, errors);
  const category = readEnumProperty(question, "category", skillCategories, `${path}.category`, errors);
  const tags = readTags(question, `${path}.tags`, errors);
  const difficulty = readEnumProperty(question, "difficulty", difficulties, `${path}.difficulty`, errors);
  const prompt = readTextProperty(question, "prompt", `${path}.prompt`, questionPackMaxPromptLength, errors);
  const answer = readAnswer(question, `${path}.answer`, errors);
  const explanation = readExplanation(question, `${path}.explanation`, errors);
  const expectedTimeSeconds = readOptionalIntegerProperty(
    question,
    "expectedTimeSeconds",
    `${path}.expectedTimeSeconds`,
    1,
    questionPackMaxExpectedTimeSeconds,
    errors
  );

  if (
    errors.length > errorCount ||
    id === undefined ||
    type === undefined ||
    category === undefined ||
    tags === undefined ||
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
    tags,
    difficulty,
    prompt,
    answer,
    explanation,
    ...(expectedTimeSeconds === undefined ? {} : { expectedTimeSeconds })
  };
}

function readTags(question: UnknownRecord, path: string, errors: string[]): SkillTag[] | undefined {
  if (!hasOwn(question, "tags")) {
    errors.push(`${path} is required.`);
    return undefined;
  }

  const value = question.tags;
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return undefined;
  }

  if (value.length === 0) {
    errors.push(`${path} must contain at least one tag.`);
  }

  if (value.length > questionPackMaxTags) {
    errors.push(`${path} must contain at most ${questionPackMaxTags} tags.`);
  }

  const tags: SkillTag[] = [];
  const seen = new Set<SkillTag>();

  for (let index = 0; index < Math.min(value.length, questionPackMaxTags); index += 1) {
    const tag = readEnumValue(value[index], skillTags, `${path}[${index}]`, errors);

    if (tag === undefined) {
      continue;
    }

    if (seen.has(tag)) {
      errors.push(`${path}[${index}] duplicates tag "${tag}".`);
      continue;
    }

    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

function readAnswer(question: UnknownRecord, path: string, errors: string[]): AnswerSpec | undefined {
  if (!hasOwn(question, "answer")) {
    errors.push(`${path} is required.`);
    return undefined;
  }

  const errorCount = errors.length;
  const answer = readObject(question.answer, path, errors);
  if (answer === undefined) {
    return undefined;
  }

  rejectUnknownProperties(
    answer,
    new Set(["value", "unit", "tolerance", "errorChecks", "roundingRule"]),
    path,
    errors
  );

  const value = readFiniteNumberProperty(answer, "value", `${path}.value`, errors);
  const unit = readEnumProperty(answer, "unit", units, `${path}.unit`, errors);
  const tolerance = hasOwn(answer, "tolerance")
    ? readTolerance(answer.tolerance, `${path}.tolerance`, errors)
    : undefined;
  const errorChecks = hasOwn(answer, "errorChecks")
    ? readErrorChecks(answer.errorChecks, `${path}.errorChecks`, errors)
    : undefined;
  const roundingRule = hasOwn(answer, "roundingRule")
    ? readEnumValue(answer.roundingRule, roundingRules, `${path}.roundingRule`, errors)
    : undefined;

  if (errors.length > errorCount || value === undefined || unit === undefined) {
    return undefined;
  }

  return {
    value,
    unit,
    ...(tolerance === undefined ? {} : { tolerance }),
    ...(errorChecks === undefined ? {} : { errorChecks }),
    ...(roundingRule === undefined ? {} : { roundingRule })
  };
}

function readTolerance(value: unknown, path: string, errors: string[]): ToleranceSpec | undefined {
  const errorCount = errors.length;
  const tolerance = readObject(value, path, errors);
  if (tolerance === undefined) {
    return undefined;
  }

  const type = readEnumProperty(
    tolerance,
    "type",
    ["absolute", "percentage", "range"] as const,
    `${path}.type`,
    errors
  );

  if (type === "absolute" || type === "percentage") {
    rejectUnknownProperties(tolerance, new Set(["type", "value"]), path, errors);
    const amount = readFiniteNumberProperty(tolerance, "value", `${path}.value`, errors);

    if (amount !== undefined && amount < 0) {
      errors.push(`${path}.value must be non-negative.`);
    }

    if (type === "percentage" && amount !== undefined && amount > 1) {
      errors.push(`${path}.value must be at most 1 (100%).`);
    }

    return errors.length === errorCount && amount !== undefined ? { type, value: amount } : undefined;
  }

  if (type === "range") {
    rejectUnknownProperties(tolerance, new Set(["type", "min", "max"]), path, errors);
    const min = readFiniteNumberProperty(tolerance, "min", `${path}.min`, errors);
    const max = readFiniteNumberProperty(tolerance, "max", `${path}.max`, errors);

    if (min !== undefined && max !== undefined && min > max) {
      errors.push(`${path}.min must be less than or equal to ${path}.max.`);
    }

    return errors.length === errorCount && min !== undefined && max !== undefined
      ? { type, min, max }
      : undefined;
  }

  rejectUnknownProperties(tolerance, new Set(["type", "value", "min", "max"]), path, errors);
  return undefined;
}

function readErrorChecks(value: unknown, path: string, errors: string[]): AnswerErrorChecks | undefined {
  const errorCount = errors.length;
  const errorChecks = readObject(value, path, errors);
  if (errorChecks === undefined) {
    return undefined;
  }

  rejectUnknownProperties(errorChecks, new Set(["percentagePointValue", "roundingTolerance"]), path, errors);

  if (!hasOwn(errorChecks, "percentagePointValue") && !hasOwn(errorChecks, "roundingTolerance")) {
    errors.push(`${path} must define at least one error check.`);
  }

  const percentagePointValue = hasOwn(errorChecks, "percentagePointValue")
    ? readFiniteNumberValue(errorChecks.percentagePointValue, `${path}.percentagePointValue`, errors)
    : undefined;
  const roundingTolerance = hasOwn(errorChecks, "roundingTolerance")
    ? readTolerance(errorChecks.roundingTolerance, `${path}.roundingTolerance`, errors)
    : undefined;

  if (errors.length > errorCount) {
    return undefined;
  }

  return {
    ...(percentagePointValue === undefined ? {} : { percentagePointValue }),
    ...(roundingTolerance === undefined ? {} : { roundingTolerance })
  };
}

function readExplanation(question: UnknownRecord, path: string, errors: string[]): ExplanationSpec | undefined {
  if (!hasOwn(question, "explanation")) {
    errors.push(`${path} is required.`);
    return undefined;
  }

  const errorCount = errors.length;
  const explanation = readObject(question.explanation, path, errors);
  if (explanation === undefined) {
    return undefined;
  }

  rejectUnknownProperties(explanation, new Set(["short", "steps", "shortcut"]), path, errors);

  const short = readTextProperty(
    explanation,
    "short",
    `${path}.short`,
    questionPackMaxExplanationTextLength,
    errors
  );
  const steps = readExplanationSteps(explanation, `${path}.steps`, errors);
  const shortcut = readOptionalTextProperty(
    explanation,
    "shortcut",
    `${path}.shortcut`,
    questionPackMaxExplanationTextLength,
    errors
  );

  if (errors.length > errorCount || short === undefined || steps === undefined) {
    return undefined;
  }

  return {
    short,
    steps,
    ...(shortcut === undefined ? {} : { shortcut })
  };
}

function readExplanationSteps(
  explanation: UnknownRecord,
  path: string,
  errors: string[]
): string[] | undefined {
  if (!hasOwn(explanation, "steps")) {
    errors.push(`${path} is required.`);
    return undefined;
  }

  const value = explanation.steps;
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return undefined;
  }

  if (value.length === 0) {
    errors.push(`${path} must contain at least one step.`);
  }

  if (value.length > questionPackMaxExplanationSteps) {
    errors.push(`${path} must contain at most ${questionPackMaxExplanationSteps} steps.`);
  }

  const steps: string[] = [];
  for (let index = 0; index < Math.min(value.length, questionPackMaxExplanationSteps); index += 1) {
    const step = readTextValue(
      value[index],
      `${path}[${index}]`,
      questionPackMaxExplanationTextLength,
      errors
    );

    if (step !== undefined) {
      steps.push(step);
    }
  }

  return steps;
}

function toQuestionPackQuestion(packId: string, question: QuestionPackQuestionRecord): Question {
  return {
    id: `question-pack:${packId}:${question.id}`,
    type: "numeric",
    category: question.category,
    tags: [...question.tags],
    difficulty: question.difficulty,
    prompt: question.prompt,
    answer: cloneAnswer(question.answer),
    explanation: {
      short: question.explanation.short,
      steps: [...question.explanation.steps],
      ...(question.explanation.shortcut === undefined ? {} : { shortcut: question.explanation.shortcut })
    },
    metadata: {
      sourceType: "manual",
      sourcePackId: packId,
      sourceQuestionId: question.id,
      ...(question.expectedTimeSeconds === undefined
        ? {}
        : { expectedTimeSeconds: question.expectedTimeSeconds })
    }
  };
}

function cloneAnswer(answer: AnswerSpec): AnswerSpec {
  return {
    value: answer.value,
    ...(answer.unit === undefined ? {} : { unit: answer.unit }),
    ...(answer.tolerance === undefined ? {} : { tolerance: { ...answer.tolerance } }),
    ...(answer.errorChecks === undefined
      ? {}
      : {
          errorChecks: {
            ...(answer.errorChecks.percentagePointValue === undefined
              ? {}
              : { percentagePointValue: answer.errorChecks.percentagePointValue }),
            ...(answer.errorChecks.roundingTolerance === undefined
              ? {}
              : { roundingTolerance: { ...answer.errorChecks.roundingTolerance } })
          }
        }),
    ...(answer.roundingRule === undefined ? {} : { roundingRule: answer.roundingRule })
  };
}

function buildQuestionPackSessionId(packId: string, difficulty: Difficulty, startedAt: string): string {
  const safeStartedAt = startedAt.replace(/[^A-Za-z0-9]/g, "");
  return `question-pack-${packId}-${difficulty}-${safeStartedAt}`;
}

function normalizeQuestionCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 5;
  }

  return Math.min(50, Math.max(1, Math.trunc(value)));
}
