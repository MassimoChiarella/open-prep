import {
  appDatabaseName,
  progressStoreNames,
  type AppStorage,
  type AppStorageMutation,
  type AppStoreValue,
  type ProgressStoreName,
} from "@/lib/storage/appStorageTypes";

export const localProgressExportAppId = appDatabaseName;
export const localProgressExportSchemaVersion = 4;
export const localProgressExportStoreNames = progressStoreNames;
export const localProgressImportLimits = {
  maxFileBytes: 10 * 1024 * 1024,
  maxNestedCollectionItems: 10_000,
  maxRecordsPerStore: 10_000,
  maxStringLength: 100_000,
  maxTotalRecords: 20_000
} as const;

const legacyLocalProgressExportSchemaVersion = 3;
const maximumValidationErrors = 50;

export type LocalProgressExportPrivacyScope = "complete" | "standard";

export type LocalProgressExportStores = {
  [TStore in ProgressStoreName]: AppStoreValue<TStore>[];
};

export interface LocalProgressExportV1 {
  app: typeof localProgressExportAppId;
  exportedAt: string;
  privacyScope: LocalProgressExportPrivacyScope;
  schemaVersion: typeof localProgressExportSchemaVersion;
  stores: LocalProgressExportStores;
}

export type LocalProgressExport = LocalProgressExportV1;

export type LocalProgressImportValidationResult =
  | { errors: string[]; status: "invalid" }
  | { exportData: LocalProgressExportV1; status: "valid" };

export interface LocalProgressImportSummary {
  benchmarks: number;
  exhibitAttempts: number;
  marketSizingAttempts: number;
  practiceRecords: number;
  responses: number;
  sessions: number;
  settings: number;
  skillScores: number;
}

export interface LocalProgressImportValidationOptions {
  sourceBytes?: number;
}

export async function createLocalProgressExport(
  storage: AppStorage,
  exportedAt = new Date().toISOString(),
  privacyScope: LocalProgressExportPrivacyScope = "standard"
): Promise<LocalProgressExportV1> {
  const stores = Object.fromEntries(
    await Promise.all(localProgressExportStoreNames.map(async (storeName) => [storeName, await storage.getAll(storeName)]))
  ) as unknown as LocalProgressExportStores;

  if (privacyScope === "standard") {
    stores.practice_records = stores.practice_records.filter((record) => record.kind !== "fit_story");
  }

  return {
    app: localProgressExportAppId,
    exportedAt,
    privacyScope,
    schemaVersion: localProgressExportSchemaVersion,
    stores
  };
}

export async function replaceLocalProgressWithImport(
  storage: AppStorage,
  exportData: LocalProgressExportV1
): Promise<void> {
  const validation = validateLocalProgressImportPayload(exportData);

  if (validation.status === "invalid") {
    throw new Error(validation.errors[0] ?? "Local progress import is invalid.");
  }

  const operations: AppStorageMutation[] = localProgressExportStoreNames.map((storeName) => ({
    storeName,
    type: "clear"
  }));

  for (const storeName of localProgressExportStoreNames) {
    for (const record of validation.exportData.stores[storeName]) {
      operations.push({ storeName, type: "put", value: record } as AppStorageMutation);
    }
  }

  await storage.mutate(operations);
}

export function createLocalProgressImportSummary(exportData: LocalProgressExportV1): LocalProgressImportSummary {
  return {
    benchmarks: exportData.stores.benchmark_results.length,
    exhibitAttempts: exportData.stores.exhibit_attempts.length,
    marketSizingAttempts: exportData.stores.market_sizing_attempts.length,
    practiceRecords: exportData.stores.practice_records.length,
    responses: exportData.stores.responses.length,
    sessions: exportData.stores.drill_sessions.length,
    settings: exportData.stores.user_settings.length,
    skillScores: new Set(exportData.stores.responses.flatMap((response) => response.tags ?? [])).size
  };
}

export function buildLocalProgressExportFileName(exportedAt: string): string {
  return `open-prep-progress-${exportedAt.slice(0, 10)}.json`;
}

export function serializeLocalProgressExport(exported: LocalProgressExport): string {
  return `${JSON.stringify(exported, null, 2)}\n`;
}

export function validateLocalProgressImportPayload(
  payload: unknown,
  options: LocalProgressImportValidationOptions = {}
): LocalProgressImportValidationResult {
  const errors: string[] = [];
  const addError = (error: string) => {
    if (errors.length < maximumValidationErrors) {
      errors.push(error);
    }
  };

  if (options.sourceBytes !== undefined && options.sourceBytes > localProgressImportLimits.maxFileBytes) {
    addError(`Import file must be ${localProgressImportLimits.maxFileBytes} bytes or smaller.`);
  }

  validateResourceBounds(payload, addError);

  if (!isRecord(payload)) {
    addError("Import file must contain a JSON object.");
    return { errors, status: "invalid" };
  }

  if (payload.app !== localProgressExportAppId) {
    addError("Import file was not created by this app.");
  }

  if (
    payload.schemaVersion !== localProgressExportSchemaVersion &&
    payload.schemaVersion !== legacyLocalProgressExportSchemaVersion
  ) {
    addError(
      `Import schema version must be ${legacyLocalProgressExportSchemaVersion} or ${localProgressExportSchemaVersion}.`
    );
  }

  if (!isDateString(payload.exportedAt)) {
    addError("Import file must include a valid exportedAt timestamp.");
  }

  if (
    payload.schemaVersion === localProgressExportSchemaVersion &&
    payload.privacyScope !== "standard" &&
    payload.privacyScope !== "complete"
  ) {
    addError("Import file must include a valid privacy scope.");
  }

  if (!isRecord(payload.stores)) {
    addError("Import file must include a stores object.");
  } else {
    validateStores(payload.stores, addError);
  }

  if (errors.length > 0 || !isRecord(payload.stores)) {
    return { errors, status: "invalid" };
  }

  return {
    exportData: {
      app: localProgressExportAppId,
      exportedAt: payload.exportedAt as string,
      privacyScope:
        payload.schemaVersion === legacyLocalProgressExportSchemaVersion
          ? "complete"
          : (payload.privacyScope as LocalProgressExportPrivacyScope),
      schemaVersion: localProgressExportSchemaVersion,
      stores: payload.stores as unknown as LocalProgressExportStores
    },
    status: "valid"
  };
}

function validateStores(stores: Record<string, unknown>, addError: (error: string) => void): void {
  let totalRecords = 0;

  for (const storeName of localProgressExportStoreNames) {
    const records = stores[storeName];

    if (!Array.isArray(records)) {
      addError(`Store "${storeName}" must be an array.`);
      continue;
    }

    totalRecords += records.length;

    if (records.length > localProgressImportLimits.maxRecordsPerStore) {
      addError(
        `Store "${storeName}" must contain ${localProgressImportLimits.maxRecordsPerStore} records or fewer.`
      );
    }

    const ids = new Set<string>();

    records.forEach((record, index) => {
      if (!isRecord(record)) {
        addError(`Store "${storeName}" record ${index + 1} must be an object.`);
        return;
      }

      if (!isNonEmptyString(record.id)) {
        addError(`Store "${storeName}" record ${index + 1} must include an id.`);
        return;
      }

      if (ids.has(record.id)) {
        addError(`Store "${storeName}" record ${index + 1} has a duplicate id.`);
      }
      ids.add(record.id);

      if (!storeRecordValidators[storeName](record)) {
        addError(`Store "${storeName}" record ${index + 1} has invalid or missing fields.`);
      }
    });
  }

  if (totalRecords > localProgressImportLimits.maxTotalRecords) {
    addError(`Import file must contain ${localProgressImportLimits.maxTotalRecords} records or fewer.`);
  }
}

const storeRecordValidators: Record<ProgressStoreName, (record: Record<string, unknown>) => boolean> = {
  benchmark_results: isBenchmarkResult,
  drill_sessions: isStoredDrillSession,
  exhibit_attempts: isExhibitAttempt,
  market_sizing_attempts: isMarketSizingAttempt,
  mistake_notebook: isMistakeNotebookRecord,
  practice_records: isPracticeRecord,
  responses: isStoredUserResponse,
  retry_schedules: isRetryScheduleRecord,
  user_settings: isUserSettingsRecord
};

function isStoredDrillSession(value: Record<string, unknown>): boolean {
  return (
    isNonEmptyString(value.id) &&
    isDateString(value.startedAt) &&
    optional(value.endedAt, isDateString) &&
    isDrillSettings(value.settings) &&
    isArrayOf(value.questionIds, isNonEmptyString) &&
    isArrayOf(value.responses, isUserResponse) &&
    optional(value.score, isSessionScore) &&
    optional(value.draftKey, isString) &&
    optional(value.questions, (questions) => isArrayOf(questions, isQuestion)) &&
    isDateString(value.updatedAt)
  );
}

function isStoredUserResponse(value: Record<string, unknown>): boolean {
  return isNonEmptyString(value.id) && isNonEmptyString(value.sessionId) && isUserResponse(value) &&
    optional(value.category, (category) => isOneOf(category, skillCategories)) &&
    optional(value.tags, (tags) => isArrayOf(tags, (tag) => isOneOf(tag, skillTags)));
}

function isUserResponse(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.questionId) &&
    isString(value.rawInput) &&
    optional(value.normalizedValue, isFiniteNumber) &&
    optional(value.selectedUnit, (unit) => isOneOf(unit, unitTypes)) &&
    optional(value.interviewMath, isInterviewMathResponse) &&
    typeof value.isCorrect === "boolean" &&
    isArrayOf(value.errorTypes, (errorType) => isOneOf(errorType, errorTypes)) &&
    isNonNegativeFiniteNumber(value.timeTakenSeconds) &&
    isDateString(value.submittedAt)
  );
}

function isInterviewMathResponse(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.score)) {
    return false;
  }
  const score = value.score;

  return (
    optional(value.equationOptionId, isNonEmptyString) &&
    optional(value.interpretationOptionId, isNonEmptyString) &&
    ["formulaSelection", "equationSetup", "calculationAccuracy", "unitsMagnitude", "interpretationSelection", "total"]
      .every((field) => isFiniteNumber(score[field]))
  );
}

function isBenchmarkResult(value: Record<string, unknown>): boolean {
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.benchmarkId) &&
    isDateString(value.completedAt) &&
    isOneOf(value.difficulty, difficulties) &&
    isSessionScore(value.score) &&
    isNonEmptyString(value.sessionId)
  );
}

function isUserSettingsRecord(value: Record<string, unknown>): boolean {
  return value.id === "default" && isDrillSettings(value.settings) && isDateString(value.updatedAt);
}

function isMarketSizingAttempt(value: Record<string, unknown>): boolean {
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.templateId) &&
    isDateString(value.startedAt) &&
    optional(value.completedAt, isDateString) &&
    optional(value.calculatedValue, isFiniteNumber) &&
    optional(value.errorTypes, (items) => isArrayOf(items, (item) => isOneOf(item, errorTypes))) &&
    optional(value.finalAnswer, isString) &&
    optional(value.inputValues, isMarketSizingInputValues) &&
    optional(value.interpretationId, isString) &&
    optional(value.maxScore, isFiniteNumber) &&
    optional(value.normalizedFinalAnswer, isFiniteNumber) &&
    optional(value.note, isString) &&
    optional(value.score, isFiniteNumber) &&
    optional(value.scoreBreakdown, (items) => isArrayOf(items, isMarketSizingScoreDimension))
  );
}

function isMarketSizingInputValues(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every((item) =>
    item === undefined || typeof item === "boolean" || typeof item === "string"
  );
}

function isMarketSizingScoreDimension(value: unknown): boolean {
  return isRecord(value) && isFiniteNumber(value.awardedPoints) && isNonEmptyString(value.id) &&
    isString(value.label) && isFiniteNumber(value.maxPoints) && isString(value.message);
}

function isExhibitAttempt(value: Record<string, unknown>): boolean {
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.exhibitId) &&
    optional(value.questionId, isNonEmptyString) &&
    isDateString(value.startedAt) &&
    optional(value.completedAt, isDateString) &&
    optional(value.correctValue, isFiniteNumber) &&
    optional(value.errorTypes, (items) => isArrayOf(items, (item) => isOneOf(item, errorTypes))) &&
    optional(value.feedbackMessage, isString) &&
    optional(value.isCorrect, isBoolean) &&
    optional(value.normalizedValue, isFiniteNumber) &&
    optional(value.rawInput, isString) &&
    optional(value.score, isFiniteNumber)
  );
}

function isMistakeNotebookRecord(value: Record<string, unknown>): boolean {
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.sourceQuestionId) &&
    optional(value.sourceResponseId, isNonEmptyString) &&
    optional(value.sourceSessionId, isNonEmptyString) &&
    isOneOf(value.sourceType, mistakeSourceTypes) &&
    isString(value.prompt) &&
    isAnswerSpec(value.answer) &&
    isOneOf(value.category, skillCategories) &&
    isArrayOf(value.tags, (tag) => isOneOf(tag, skillTags)) &&
    isOneOf(value.difficulty, difficulties) &&
    isExplanation(value.explanation) &&
    optional(value.metadata, isQuestionMetadata) &&
    isString(value.rawInput) &&
    optional(value.normalizedValue, isFiniteNumber) &&
    isArrayOf(value.errorTypes, (errorType) => isOneOf(errorType, errorTypes)) &&
    isDateString(value.missedAt) &&
    optional(value.lastRetriedAt, isDateString) &&
    optional(value.resolvedAt, isDateString) &&
    isNonNegativeInteger(value.retryCount) &&
    isOneOf(value.status, ["resolved", "unresolved"])
  );
}

function isRetryScheduleRecord(value: Record<string, unknown>): boolean {
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.sourceId) &&
    value.sourceType === "mistake_notebook" &&
    isDateString(value.dueAt) &&
    isNonNegativeFiniteNumber(value.intervalDays) &&
    isNonNegativeInteger(value.attemptCount) &&
    isDateString(value.createdAt) &&
    isDateString(value.updatedAt) &&
    optional(value.lastReviewedAt, isDateString)
  );
}

function isPracticeRecord(value: Record<string, unknown>): boolean {
  if (!isNonEmptyString(value.id)) {
    return false;
  }

  if (value.kind === "attempt") {
    return isOneOf(value.module, practiceModules) && isNonEmptyString(value.itemId) &&
      isDateString(value.completedAt) && isFiniteNumber(value.score) && isFiniteNumber(value.maxScore) &&
      optional(value.durationSeconds, isNonNegativeFiniteNumber);
  }

  if (value.kind === "prep_profile") {
    return value.id === "prep-profile" && isOneOf(value.experienceLevel, ["beginner", "intermediate", "advanced"]) &&
      optional(value.interviewDate, isDateString) && isArrayOf(value.targetFirms, isString) &&
      isNonNegativeInteger(value.weeklySessions) && isDateString(value.updatedAt);
  }

  if (value.kind === "fit_story") {
    return isOneOf(value.competency, ["conflict", "failure", "impact", "leadership"]) &&
      ["title", "situation", "task", "action", "result", "reflection"].every((field) => isString(value[field])) &&
      isDateString(value.updatedAt);
  }

  return false;
}

function isDrillSettings(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isArrayOf(value.categories, (category) => isOneOf(category, skillCategories)) &&
    value.categories.length > 0 &&
    optional(value.tags, (tags) => isArrayOf(tags, (tag) => isOneOf(tag, skillTags))) &&
    isOneOf(value.difficulty, difficulties) &&
    Number.isInteger(value.questionCount) &&
    (value.questionCount as number) > 0 &&
    optional(value.arithmeticTermCount, (count) => [2, 3, 4, 5].includes(count as number)) &&
    optional(value.arithmeticNumberFormat, (format) => isOneOf(format, ["integer", "decimal"])) &&
    optional(value.arithmeticOperandSize, (size) => isOneOf(size, ["small", "medium", "large"])) &&
    optional(value.arithmeticAllowNegatives, isBoolean) &&
    optional(value.arithmeticMultiplicationStyle, (style) => isOneOf(style, multiplicationStyles)) &&
    optional(value.arithmeticDivisionMode, (mode) => isOneOf(mode, ["exact", "approximate", "remainder"])) &&
    optional(value.arithmeticDivisionRounding, (rounding) => isOneOf(rounding, ["nearest_whole", "nearest_0_1"])) &&
    optional(value.arithmeticMixedOperators, (operators) => isArrayOf(operators, (operator) => isOneOf(operator, mixedOperators))) &&
    optional(value.arithmeticUseParentheses, isBoolean) &&
    optional(value.caseIndustry, (industry) => isOneOf(industry, caseIndustries)) &&
    optional(value.caseCalculationStepCount, (count) => [2, 3, 4, 5, 6].includes(count as number)) &&
    optional(value.caseRequireEquationSetup, isBoolean) &&
    optional(value.caseRequireInterpretation, isBoolean) &&
    optional(value.unitPreference, (unit) => isOneOf(unit, unitTypes)) &&
    optional(value.hintsEnabled, isBoolean) &&
    optional(value.questionPackId, isNonEmptyString) &&
    isOneOf(value.timeMode, ["untimed", "per_question", "session"]) &&
    optional(value.secondsPerQuestion, isNonNegativeFiniteNumber) &&
    optional(value.totalSessionSeconds, isNonNegativeFiniteNumber) &&
    isOneOf(value.feedbackMode, ["instant", "end_of_session", "retry_first"])
  );
}

function isSessionScore(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    ["totalScore", "accuracy", "averageTimeSeconds", "correctCount", "incorrectCount"].every((field) =>
      isFiniteNumber(value[field])
    ) &&
    isArrayOf(value.categoryBreakdown, isCategoryScore) &&
    isArrayOf(value.errorBreakdown, isErrorBreakdown)
  );
}

function isCategoryScore(value: unknown): boolean {
  return isRecord(value) && isOneOf(value.category, skillCategories) && isFiniteNumber(value.accuracy) &&
    isFiniteNumber(value.averageTimeSeconds) && isNonNegativeInteger(value.questionCount);
}

function isErrorBreakdown(value: unknown): boolean {
  return isRecord(value) && isOneOf(value.errorType, errorTypes) && isNonNegativeInteger(value.count);
}

function isQuestion(value: unknown): boolean {
  return isRecord(value) && isNonEmptyString(value.id) && isOneOf(value.type, ["numeric", "exhibit"]) &&
    isOneOf(value.category, skillCategories) && isArrayOf(value.tags, (tag) => isOneOf(tag, skillTags)) &&
    isOneOf(value.difficulty, difficulties) && isString(value.prompt) && isAnswerSpec(value.answer) &&
    isExplanation(value.explanation) && optional(value.metadata, isQuestionMetadata);
}

function isAnswerSpec(value: unknown): boolean {
  return isRecord(value) && isFiniteNumber(value.value) && optional(value.unit, (unit) => isOneOf(unit, unitTypes)) &&
    optional(value.tolerance, isTolerance) && optional(value.roundingRule, (rule) => isOneOf(rule, roundingRules)) &&
    optional(value.errorChecks, isAnswerErrorChecks);
}

function isTolerance(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  if (value.type === "range") {
    return value.value === undefined && isFiniteNumber(value.min) && isFiniteNumber(value.max) && value.min <= value.max;
  }

  if (value.type === "absolute") {
    return value.min === undefined && value.max === undefined && isFiniteNumber(value.value) &&
      value.value >= 0 && value.value <= 1_000_000_000;
  }

  return value.type === "percentage" && value.min === undefined && value.max === undefined &&
    isFiniteNumber(value.value) && value.value >= 0 && value.value <= 1;
}

function isAnswerErrorChecks(value: unknown): boolean {
  return isRecord(value) && optional(value.percentagePointValue, isFiniteNumber) &&
    optional(value.roundingTolerance, isTolerance);
}

function isExplanation(value: unknown): boolean {
  return isRecord(value) && isString(value.short) && isArrayOf(value.steps, isString) &&
    optional(value.shortcut, isString);
}

function isQuestionMetadata(value: unknown): boolean {
  return isRecord(value) && isOneOf(value.sourceType, ["generated", "manual", "benchmark"]) &&
    optional(value.expectedTimeSeconds, isNonNegativeFiniteNumber) && optional(value.sourcePackId, isNonEmptyString) &&
    optional(value.sourceQuestionId, isNonEmptyString) && optional(value.variables, isMetadataVariables) &&
    optional(value.caseStyle, isCaseStyle);
}

function isMetadataVariables(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string" || isFiniteNumber(item));
}

function isCaseStyle(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.interviewMath)) {
    return false;
  }

  return [2, 3, 4, 5, 6].includes(value.calculationStepCount as number) &&
    isOneOf(value.industry, caseIndustries) && isOneOf(value.interviewMath.expectedUnit, unitTypes) &&
    isArrayOf(value.interviewMath.equationOptions, isEquationOption) &&
    isArrayOf(value.interviewMath.interpretationOptions, isInterpretationOption);
}

function isEquationOption(value: unknown): boolean {
  return isRecord(value) && isNonEmptyString(value.id) && isString(value.label) &&
    typeof value.formulaCorrect === "boolean" && typeof value.setupCorrect === "boolean";
}

function isInterpretationOption(value: unknown): boolean {
  return isRecord(value) && isNonEmptyString(value.id) && isString(value.label) && typeof value.isCorrect === "boolean";
}

function validateResourceBounds(value: unknown, addError: (error: string) => void): void {
  const seen = new WeakSet<object>();

  const visit = (item: unknown, depth: number) => {
    if (typeof item === "number" && !Number.isFinite(item)) {
      addError("Import file contains a non-finite number.");
      return;
    }

    if (typeof item === "string" && item.length > localProgressImportLimits.maxStringLength) {
      addError(`Import file strings must be ${localProgressImportLimits.maxStringLength} characters or shorter.`);
      return;
    }

    if (item === null || typeof item !== "object") {
      return;
    }

    if (seen.has(item)) {
      addError("Import file must not contain circular data.");
      return;
    }
    seen.add(item);

    if (depth > 20) {
      addError("Import file nesting is too deep.");
      return;
    }

    const children = Array.isArray(item) ? item : Object.values(item);

    if (children.length > localProgressImportLimits.maxNestedCollectionItems) {
      addError(
        `Import file collections must contain ${localProgressImportLimits.maxNestedCollectionItems} items or fewer.`
      );
      return;
    }

    children.forEach((child) => visit(child, depth + 1));
  };

  visit(value, 0);

  try {
    const serialized = JSON.stringify(value);
    const bytes = new TextEncoder().encode(serialized).byteLength;

    if (bytes > localProgressImportLimits.maxFileBytes) {
      addError(`Import file must be ${localProgressImportLimits.maxFileBytes} bytes or smaller.`);
    }
  } catch {
    addError("Import file must contain serializable JSON data.");
  }
}

function optional(value: unknown, validator: (value: unknown) => boolean): boolean {
  return value === undefined || validator(value);
}

function isArrayOf(value: unknown, validator: (value: unknown) => boolean): value is unknown[] {
  return Array.isArray(value) && value.every(validator);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDateString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isOneOf(value: unknown, choices: readonly unknown[]): boolean {
  return choices.includes(value);
}

const difficulties = ["beginner", "intermediate", "advanced", "expert"] as const;
const skillCategories = [
  "arithmetic", "percentages", "fractions_decimals_ratios", "growth_compounding", "weighted_averages",
  "business_math", "case_math", "market_sizing", "exhibit_math"
] as const;
const skillTags = [
  "addition", "subtraction", "multiplication", "division", "mixed_operations", "percentage_of_number",
  "percentage_change", "reverse_percentage", "percentage_points", "margin", "fraction_conversion",
  "ratio_conversion", "simple_growth", "compound_growth", "cagr", "rule_of_72", "weighted_average",
  "revenue", "profit", "cost", "contribution_margin", "breakeven", "roi", "payback", "market_share",
  "capacity_utilization", "k_m_b_conversion", "unit_conversion"
] as const;
const unitTypes = [
  "none", "currency", "percentage", "percentage_points", "units", "customers", "users", "years",
  "months", "days", "stores", "k", "m", "b"
] as const;
const errorTypes = [
  "none", "arithmetic_error", "magnitude_error", "unit_error", "percentage_point_error", "formula_error",
  "rounding_error", "timeout", "setup_error", "interpretation_error"
] as const;
const roundingRules = ["exact", "nearest_whole", "nearest_0_1", "nearest_1k", "nearest_1m"] as const;
const mistakeSourceTypes = ["benchmark", "drill", "exhibit", "market_sizing"] as const;
const practiceModules = ["brainstorming", "fit", "full_case", "lessons", "questioning", "structuring", "synthesis"] as const;
const multiplicationStyles = [
  "difficulty_scaled", "single_digit", "double_digit", "triple_digit", "multiple_5", "multiple_10",
  "multiple_25", "multiple_50"
] as const;
const mixedOperators = ["addition", "subtraction", "multiplication", "division"] as const;
const caseIndustries = [
  "airlines", "banking", "consumer_goods", "healthcare", "insurance", "manufacturing", "marketplaces",
  "retail", "saas", "telecom"
] as const;
