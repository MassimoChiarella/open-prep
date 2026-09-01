import { isLocalePreference, localePreferenceStorageKey, type LocalePreference } from "@/features/i18n/i18n";
import { validateQuestionPackPayload } from "@/features/question-packs/questionPack";
import {
  defaultQuestionPackPoolPreference,
  parseQuestionPackPoolPreference,
  questionPackPoolPreferenceStorageKey,
  serializeQuestionPackPoolPreference
} from "@/features/question-packs/questionPackPoolPreference";
import {
  completeBackupLimits,
  completeBackupStoreNames,
  type CompleteBackupOptionalScope
} from "@/features/settings/localDataInventory";
import {
  localProgressExportAppId,
  localProgressExportSchemaVersion,
  validateLocalProgressImportPayload,
  type LocalProgressExportV1,
  type LocalProgressExportStores
} from "@/features/settings/localProgressExport";
import { isThemePreference, themePreferenceStorageKey, type ThemePreference } from "@/features/theme/theme";
import {
  normalizeTimingAccommodation,
  timingAccommodationIds,
  type TimingAccommodation
} from "@/features/timing/timingAccommodation";
import { timingAccommodationPreferenceKey } from "@/features/timing/timingAccommodationPreference";
import {
  progressStoreNames,
  type AppStorageSnapshot,
  type QuestionPackRecord
} from "@/lib/storage/appStorageTypes";

export const completeBackupAppId = localProgressExportAppId;
export const completeBackupFormat = "open-prep-complete-backup" as const;
export const completeBackupSchemaVersion = 1 as const;
export const completeBackupChecksumAlgorithm = "SHA-256" as const;
export const completeBackupScopeOrder = ["progress", "private_text", "packs", "preferences"] as const;

const optionalScopeOrder = completeBackupScopeOrder.slice(1) as readonly CompleteBackupOptionalScope[];
const maximumValidationErrors = 50;
const maximumNestingDepth = 20;

export type CompleteBackupScope = (typeof completeBackupScopeOrder)[number];

export interface CompleteBackupPreferences {
  [localePreferenceStorageKey]: LocalePreference;
  [themePreferenceStorageKey]: ThemePreference;
  [timingAccommodationPreferenceKey]: TimingAccommodation;
  [questionPackPoolPreferenceStorageKey]: string;
}

export interface CompleteBackupSections {
  progress: LocalProgressExportV1;
  packs?: QuestionPackRecord[];
  preferences?: CompleteBackupPreferences;
}

export interface CompleteBackupChecksum {
  algorithm: typeof completeBackupChecksumAlgorithm;
  value: string;
}

export interface CompleteBackupV1 {
  app: typeof completeBackupAppId;
  format: typeof completeBackupFormat;
  schemaVersion: typeof completeBackupSchemaVersion;
  exportedAt: string;
  selectedScopes: CompleteBackupScope[];
  sections: CompleteBackupSections;
  checksum: CompleteBackupChecksum;
}

export type CompleteBackupSnapshot = AppStorageSnapshot<typeof completeBackupStoreNames>;

export interface CompleteBackupCreationOptions {
  exportedAt?: string;
  selectedOptionalScopes?: readonly CompleteBackupOptionalScope[];
  preferences?: Partial<Record<keyof CompleteBackupPreferences, unknown>>;
}

export interface CompleteBackupValidationOptions {
  sourceBytes?: number;
}

export type CompleteBackupValidationResult =
  | { backup: CompleteBackupV1; status: "valid" }
  | { errors: string[]; status: "invalid" };

type CompleteBackupUnsignedV1 = Omit<CompleteBackupV1, "checksum">;

export async function createCompleteBackup(
  snapshot: CompleteBackupSnapshot,
  options: CompleteBackupCreationOptions = {}
): Promise<CompleteBackupV1> {
  const selectedOptionalScopes = normalizeCreationScopes(options.selectedOptionalScopes ?? []);
  const includePrivateText = selectedOptionalScopes.includes("private_text");
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const normalizedSnapshot = toJsonValue(snapshot) as CompleteBackupSnapshot;
  const sections: CompleteBackupSections = {
    progress: createProgressSection(normalizedSnapshot, exportedAt, includePrivateText),
    ...(selectedOptionalScopes.includes("packs")
      ? { packs: normalizedSnapshot.question_packs }
      : {}),
    ...(selectedOptionalScopes.includes("preferences")
      ? { preferences: normalizePreferences(options.preferences) }
      : {})
  };
  const unsigned: CompleteBackupUnsignedV1 = {
    app: completeBackupAppId,
    format: completeBackupFormat,
    schemaVersion: completeBackupSchemaVersion,
    exportedAt,
    selectedScopes: ["progress", ...optionalScopeOrder.filter((scope) => selectedOptionalScopes.includes(scope))],
    sections
  };
  const backup: CompleteBackupV1 = {
    ...unsigned,
    checksum: {
      algorithm: completeBackupChecksumAlgorithm,
      value: await calculateCompleteBackupChecksum(unsigned)
    }
  };
  const sourceBytes = new TextEncoder().encode(serializeCompleteBackup(backup)).byteLength;
  const validation = await validateCompleteBackupPayload(backup, { sourceBytes });

  if (validation.status === "invalid") {
    throw new Error(validation.errors[0] ?? "Complete backup is invalid.");
  }

  return validation.backup;
}

export function serializeCompleteBackup(backup: CompleteBackupV1): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export async function calculateCompleteBackupChecksum(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest(completeBackupChecksumAlgorithm, bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function validateCompleteBackupPayload(
  payload: unknown,
  options: CompleteBackupValidationOptions = {}
): Promise<CompleteBackupValidationResult> {
  const errors: string[] = [];
  const addError = (error: string) => {
    if (errors.length < maximumValidationErrors) errors.push(error);
  };

  if (
    options.sourceBytes !== undefined &&
    (!Number.isSafeInteger(options.sourceBytes) || options.sourceBytes < 0)
  ) {
    addError("Complete backup source size must be a non-negative whole number of bytes.");
  } else if (options.sourceBytes !== undefined && options.sourceBytes > completeBackupLimits.maxFileBytes) {
    addError(`Complete backup must be ${completeBackupLimits.maxFileBytes} bytes or smaller.`);
  }

  const jsonCompatible = validateResourceBounds(payload, addError);
  if (!isPlainRecord(payload)) {
    addError("Complete backup must contain a JSON object.");
    return { errors, status: "invalid" };
  }

  rejectUnknownProperties(
    payload,
    ["app", "format", "schemaVersion", "exportedAt", "selectedScopes", "sections", "checksum"],
    "Complete backup",
    addError
  );

  if (payload.app !== completeBackupAppId) addError("Complete backup was not created by this app.");
  if (payload.format !== completeBackupFormat) addError(`Complete backup format must be "${completeBackupFormat}".`);
  if (payload.schemaVersion !== completeBackupSchemaVersion) {
    addError(`Complete backup schema version must be ${completeBackupSchemaVersion}.`);
  }
  if (!isDateString(payload.exportedAt)) addError("Complete backup must include a valid exportedAt timestamp.");

  const selectedScopes = validateSelectedScopes(payload.selectedScopes, addError);
  const sections = validateSections(payload.sections, selectedScopes, payload.exportedAt, addError);
  const checksum = validateChecksum(payload.checksum, addError);

  if (jsonCompatible && checksum !== undefined) {
    try {
      const unsigned = omitChecksum(payload);
      const expectedChecksum = await calculateCompleteBackupChecksum(unsigned);
      if (checksum.value !== expectedChecksum) addError("Complete backup checksum does not match its contents.");
    } catch {
      addError("Complete backup must contain checksum-compatible JSON data.");
    }
  }

  if (
    errors.length > 0 ||
    sections === undefined ||
    selectedScopes === undefined ||
    !isDateString(payload.exportedAt)
  ) {
    return { errors, status: "invalid" };
  }

  const normalizedUnsigned: CompleteBackupUnsignedV1 = {
    app: completeBackupAppId,
    format: completeBackupFormat,
    schemaVersion: completeBackupSchemaVersion,
    exportedAt: payload.exportedAt,
    selectedScopes,
    sections
  };

  return {
    backup: {
      ...normalizedUnsigned,
      checksum: {
        algorithm: completeBackupChecksumAlgorithm,
        value: await calculateCompleteBackupChecksum(normalizedUnsigned)
      }
    },
    status: "valid"
  };
}

function createProgressSection(
  snapshot: CompleteBackupSnapshot,
  exportedAt: string,
  includePrivateText: boolean
): LocalProgressExportV1 {
  const stores = Object.fromEntries(
    progressStoreNames.map((storeName) => [storeName, snapshot[storeName]])
  ) as LocalProgressExportStores;

  if (!includePrivateText) {
    stores.practice_records = stores.practice_records.filter(
      (record) => record.kind !== "fit_story" && record.kind !== "prep_profile"
    );
    stores.market_sizing_attempts = stores.market_sizing_attempts.map(({ note: _note, ...record }) => record);
  }

  return {
    app: localProgressExportAppId,
    exportedAt,
    privacyScope: includePrivateText ? "complete" : "standard",
    schemaVersion: localProgressExportSchemaVersion,
    stores
  };
}

function normalizeCreationScopes(scopes: readonly CompleteBackupOptionalScope[]): CompleteBackupOptionalScope[] {
  if (new Set(scopes).size !== scopes.length) throw new Error("Complete backup optional scopes must be unique.");
  if (scopes.some((scope) => !optionalScopeOrder.includes(scope))) {
    throw new Error("Complete backup includes an unsupported optional scope.");
  }
  return optionalScopeOrder.filter((scope) => scopes.includes(scope));
}

function normalizePreferences(
  preferences: CompleteBackupCreationOptions["preferences"]
): CompleteBackupPreferences {
  const locale = preferences?.[localePreferenceStorageKey];
  const theme = preferences?.[themePreferenceStorageKey];
  const timing = preferences?.[timingAccommodationPreferenceKey];
  const questionPackPool = preferences?.[questionPackPoolPreferenceStorageKey];

  return {
    [localePreferenceStorageKey]:
      typeof locale === "string" && isLocalePreference(locale) ? locale : "auto",
    [themePreferenceStorageKey]:
      typeof theme === "string" && isThemePreference(theme) ? theme : "system",
    [timingAccommodationPreferenceKey]: normalizeTimingAccommodation(timing),
    [questionPackPoolPreferenceStorageKey]: serializeQuestionPackPoolPreference(
      parseQuestionPackPoolPreference(typeof questionPackPool === "string" ? questionPackPool : null)
    )
  };
}

function validateSelectedScopes(
  value: unknown,
  addError: (error: string) => void
): CompleteBackupScope[] | undefined {
  if (!Array.isArray(value)) {
    addError("Complete backup selectedScopes must be an array.");
    return undefined;
  }

  const scopes: CompleteBackupScope[] = [];
  for (const scope of value) {
    if (typeof scope !== "string" || !(completeBackupScopeOrder as readonly string[]).includes(scope)) {
      addError("Complete backup selectedScopes contains an unsupported scope.");
      continue;
    }
    scopes.push(scope as CompleteBackupScope);
  }

  if (new Set(scopes).size !== scopes.length) addError("Complete backup selectedScopes must not contain duplicates.");
  if (!scopes.includes("progress")) addError('Complete backup must select the "progress" scope.');

  return completeBackupScopeOrder.filter((scope) => scopes.includes(scope));
}

function validateSections(
  value: unknown,
  selectedScopes: CompleteBackupScope[] | undefined,
  outerExportedAt: unknown,
  addError: (error: string) => void
): CompleteBackupSections | undefined {
  if (!isPlainRecord(value)) {
    addError("Complete backup sections must be an object.");
    return undefined;
  }

  rejectUnknownProperties(value, ["progress", "packs", "preferences"], "Complete backup sections", addError);
  const hasPacks = hasOwn(value, "packs");
  const hasPreferences = hasOwn(value, "preferences");
  const selectsPacks = selectedScopes?.includes("packs") ?? false;
  const selectsPreferences = selectedScopes?.includes("preferences") ?? false;
  const includesPrivateText = selectedScopes?.includes("private_text") ?? false;

  if (hasPacks !== selectsPacks) {
    addError('Complete backup packs section must be present exactly when the "packs" scope is selected.');
  }
  if (hasPreferences !== selectsPreferences) {
    addError('Complete backup preferences section must be present exactly when the "preferences" scope is selected.');
  }
  if (!hasOwn(value, "progress")) addError("Complete backup progress section is required.");

  const rawTotalRecords = countRawProgressRecords(value.progress) + (Array.isArray(value.packs) ? value.packs.length : 0);
  if (rawTotalRecords > completeBackupLimits.maxTotalRecords) {
    addError(`Complete backup must contain ${completeBackupLimits.maxTotalRecords} records or fewer.`);
    return undefined;
  }

  const progress = validateProgressSection(value.progress, includesPrivateText, outerExportedAt, addError);
  const packs = hasPacks ? validatePacks(value.packs, addError) : undefined;
  const preferences = hasPreferences ? validatePreferences(value.preferences, addError) : undefined;

  if (
    progress === undefined ||
    (hasPacks && packs === undefined) ||
    (hasPreferences && preferences === undefined)
  ) {
    return undefined;
  }

  return {
    progress,
    ...(hasPacks ? { packs: packs as QuestionPackRecord[] } : {}),
    ...(hasPreferences ? { preferences: preferences as CompleteBackupPreferences } : {})
  };
}

function countRawProgressRecords(value: unknown): number {
  if (!isPlainRecord(value) || !isPlainRecord(value.stores)) return 0;
  const stores = value.stores;
  return progressStoreNames.reduce(
    (total, storeName) => total + (Array.isArray(stores[storeName]) ? stores[storeName].length : 0),
    0
  );
}

function validateProgressSection(
  value: unknown,
  includesPrivateText: boolean,
  outerExportedAt: unknown,
  addError: (error: string) => void
): LocalProgressExportV1 | undefined {
  if (isPlainRecord(value)) {
    const allowed = value.schemaVersion === 3
      ? ["app", "exportedAt", "schemaVersion", "stores"]
      : ["app", "exportedAt", "privacyScope", "schemaVersion", "stores"];
    rejectUnknownProperties(value, allowed, "Complete backup progress section", addError);
    if (isPlainRecord(value.stores)) {
      rejectUnknownProperties(value.stores, progressStoreNames, "Complete backup progress stores", addError);
    }
  }

  const validation = validateLocalProgressImportPayload(value);
  if (validation.status === "invalid") {
    validation.errors.forEach((error) => addError(`Complete backup progress: ${error}`));
    return undefined;
  }

  const progress = validation.exportData;
  if (progress.exportedAt !== outerExportedAt) {
    addError("Complete backup and progress exportedAt timestamps must match.");
  }
  if ((progress.privacyScope === "complete") !== includesPrivateText) {
    addError('Complete backup progress privacyScope must match the "private_text" selection.');
  }
  if (!includesPrivateText) {
    if (progress.stores.practice_records.some((record) => record.kind === "fit_story" || record.kind === "prep_profile")) {
      addError("Complete backup without private text must not contain Fit stories or a preparation profile.");
    }
    if (progress.stores.market_sizing_attempts.some((record) => hasOwn(record, "note"))) {
      addError("Complete backup without private text must not contain market-sizing notes.");
    }
  }

  return progress;
}

function validatePacks(value: unknown, addError: (error: string) => void): QuestionPackRecord[] | undefined {
  if (!Array.isArray(value)) {
    addError("Complete backup packs section must be an array.");
    return undefined;
  }
  if (value.length > completeBackupLimits.maxQuestionPacks) {
    addError(`Complete backup must contain ${completeBackupLimits.maxQuestionPacks} question packs or fewer.`);
  }

  const packs: QuestionPackRecord[] = [];
  const ids = new Set<string>();
  value.slice(0, completeBackupLimits.maxQuestionPacks).forEach((candidate, index) => {
    const path = `Complete backup pack ${index + 1}`;
    if (!isPlainRecord(candidate)) {
      addError(`${path} must be an object.`);
      return;
    }
    if (!isDateString(candidate.importedAt)) {
      addError(`${path} must include a valid importedAt timestamp.`);
      return;
    }

    const { importedAt, catalogProvenance, ...packPayload } = candidate;
    const validation = validateQuestionPackPayload(packPayload, importedAt);
    if (validation.status === "invalid") {
      validation.errors.forEach((error) => addError(`${path}: ${error}`));
      return;
    }
    if (canonicalJson(validation.pack) !== canonicalJson({ ...packPayload, importedAt })) {
      addError(`${path} is not the canonical stored form of its validated content.`);
      return;
    }
    if (ids.has(validation.pack.id)) {
      addError(`${path} duplicates question-pack ID "${validation.pack.id}".`);
      return;
    }
    ids.add(validation.pack.id);

    const provenance = catalogProvenance === undefined
      ? undefined
      : validateCatalogProvenance(catalogProvenance, validation.pack, path, addError);
    if (catalogProvenance !== undefined && provenance === undefined) return;
    packs.push({
      ...validation.pack,
      ...(provenance === undefined ? {} : { catalogProvenance: provenance })
    });
  });

  return packs.length === value.length ? packs : undefined;
}

function validateCatalogProvenance(
  value: unknown,
  pack: QuestionPackRecord,
  path: string,
  addError: (error: string) => void
): QuestionPackRecord["catalogProvenance"] | undefined {
  if (!isPlainRecord(value)) {
    addError(`${path} catalogProvenance must be an object.`);
    return undefined;
  }
  const requiredProperties = ["file", "id", "publisherId", "reviewDate", "sha256", "source", "version"] as const;
  rejectUnknownProperties(value, [...requiredProperties, "language"], `${path} catalogProvenance`, addError);
  const valid = requiredProperties.every((property) => typeof value[property] === "string" && value[property].trim() !== "") &&
    (value.language === undefined || isCanonicalLanguageTag(value.language)) &&
    value.source === "repository_catalog" &&
    typeof value.sha256 === "string" && /^[a-f0-9]{64}$/.test(value.sha256) &&
    isDateString(value.reviewDate) &&
    value.id === pack.id &&
    value.version === pack.packVersion;

  if (!valid) {
    addError(`${path} catalogProvenance is invalid or inconsistent with the pack.`);
    return undefined;
  }
  return value as unknown as NonNullable<QuestionPackRecord["catalogProvenance"]>;
}

function isCanonicalLanguageTag(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() !== value || value === "") return false;
  try {
    return Intl.getCanonicalLocales(value)[0] === value;
  } catch {
    return false;
  }
}

function validatePreferences(
  value: unknown,
  addError: (error: string) => void
): CompleteBackupPreferences | undefined {
  if (!isPlainRecord(value)) {
    addError("Complete backup preferences section must be an object.");
    return undefined;
  }
  const requiredKeys = [localePreferenceStorageKey, themePreferenceStorageKey, timingAccommodationPreferenceKey] as const;
  const keys = [...requiredKeys, questionPackPoolPreferenceStorageKey] as const;
  rejectUnknownProperties(value, keys, "Complete backup preferences", addError);
  const locale = value[localePreferenceStorageKey];
  const theme = value[themePreferenceStorageKey];
  const timing = value[timingAccommodationPreferenceKey];
  const rawQuestionPackPool = value[questionPackPoolPreferenceStorageKey];
  const defaultQuestionPackPool = serializeQuestionPackPoolPreference(defaultQuestionPackPoolPreference);
  let questionPackPool = defaultQuestionPackPool;
  let valid = true;

  if (typeof locale !== "string" || !isLocalePreference(locale)) {
    addError("Complete backup locale preference is invalid.");
    valid = false;
  }
  if (typeof theme !== "string" || !isThemePreference(theme)) {
    addError("Complete backup theme preference is invalid.");
    valid = false;
  }
  if (typeof timing !== "string" || !(timingAccommodationIds as readonly string[]).includes(timing)) {
    addError("Complete backup timing preference is invalid.");
    valid = false;
  }
  if (rawQuestionPackPool !== undefined) {
    if (
      typeof rawQuestionPackPool !== "string" ||
      serializeQuestionPackPoolPreference(parseQuestionPackPoolPreference(rawQuestionPackPool)) !== rawQuestionPackPool
    ) {
      addError("Complete backup question-pool preference is invalid.");
      valid = false;
    } else {
      questionPackPool = rawQuestionPackPool;
    }
  }

  if (requiredKeys.some((key) => !hasOwn(value, key))) {
    addError("Complete backup preferences must represent every supported preference.");
    valid = false;
  }

  return valid ? {
    [localePreferenceStorageKey]: locale as LocalePreference,
    [themePreferenceStorageKey]: theme as ThemePreference,
    [timingAccommodationPreferenceKey]: timing as TimingAccommodation,
    [questionPackPoolPreferenceStorageKey]: questionPackPool
  } : undefined;
}

function validateChecksum(
  value: unknown,
  addError: (error: string) => void
): CompleteBackupChecksum | undefined {
  if (!isPlainRecord(value)) {
    addError("Complete backup checksum must be an object.");
    return undefined;
  }
  rejectUnknownProperties(value, ["algorithm", "value"], "Complete backup checksum", addError);
  if (value.algorithm !== completeBackupChecksumAlgorithm) {
    addError(`Complete backup checksum algorithm must be "${completeBackupChecksumAlgorithm}".`);
  }
  if (typeof value.value !== "string" || !/^[a-f0-9]{64}$/.test(value.value)) {
    addError("Complete backup checksum value must be a lowercase SHA-256 digest.");
  }
  return value.algorithm === completeBackupChecksumAlgorithm &&
    typeof value.value === "string" && /^[a-f0-9]{64}$/.test(value.value)
    ? value as unknown as CompleteBackupChecksum
    : undefined;
}

function validateResourceBounds(value: unknown, addError: (error: string) => void): boolean {
  const seen = new WeakSet<object>();
  let valid = true;

  const visit = (item: unknown, depth: number) => {
    if (typeof item === "string") {
      if (item.length > completeBackupLimits.maxStringLength) {
        addError(`Complete backup strings must be ${completeBackupLimits.maxStringLength} characters or shorter.`);
        valid = false;
      }
      return;
    }
    if (item === null || typeof item === "boolean") return;
    if (typeof item === "number") {
      if (!Number.isFinite(item)) {
        addError("Complete backup contains a non-finite number.");
        valid = false;
      }
      return;
    }
    if (typeof item !== "object") {
      addError("Complete backup must contain only JSON-compatible values.");
      valid = false;
      return;
    }
    if (seen.has(item)) {
      addError("Complete backup must not contain circular data.");
      valid = false;
      return;
    }
    seen.add(item);
    if (depth > maximumNestingDepth) {
      addError("Complete backup nesting is too deep.");
      valid = false;
      return;
    }
    if (!Array.isArray(item) && !isPlainRecord(item)) {
      addError("Complete backup must contain only plain JSON objects.");
      valid = false;
      return;
    }

    const entries = Array.isArray(item) ? item.map((child) => [undefined, child] as const) : Object.entries(item);
    if (entries.length > completeBackupLimits.maxNestedCollectionItems) {
      addError(
        `Complete backup collections must contain ${completeBackupLimits.maxNestedCollectionItems} items or fewer.`
      );
      valid = false;
      return;
    }
    entries.forEach(([key, child]) => {
      if (key !== undefined && key.length > completeBackupLimits.maxStringLength) {
        addError(`Complete backup strings must be ${completeBackupLimits.maxStringLength} characters or shorter.`);
        valid = false;
      }
      visit(child, depth + 1);
    });
  };

  visit(value, 0);
  if (valid) {
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
      if (bytes > completeBackupLimits.maxFileBytes) {
        addError(`Complete backup must be ${completeBackupLimits.maxFileBytes} bytes or smaller.`);
        valid = false;
      }
    } catch {
      addError("Complete backup must contain serializable JSON data.");
      valid = false;
    }
  }
  return valid;
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isPlainRecord(value)) {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    ).join(",")}}`;
  }
  throw new TypeError("Value is not canonical JSON.");
}

function toJsonValue<T>(value: T): T {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new TypeError("Complete backup source is not JSON-serializable.");
  return JSON.parse(serialized) as T;
}

function omitChecksum(value: Record<string, unknown>): Record<string, unknown> {
  const unsigned = { ...value };
  delete unsigned.checksum;
  return unsigned;
}

function rejectUnknownProperties(
  value: Record<string, unknown>,
  allowedProperties: readonly string[],
  label: string,
  addError: (error: string) => void
): void {
  const allowed = new Set(allowedProperties);
  Object.keys(value).filter((property) => !allowed.has(property)).forEach((property) => {
    addError(`${label} property "${property}" is not supported.`);
  });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isDateString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));
}

function hasOwn(value: object, property: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, property);
}
