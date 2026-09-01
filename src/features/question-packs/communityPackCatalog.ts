import type { Difficulty } from "@/lib/domain";
import type { QuestionPackRecord } from "@/lib/storage/appStorageTypes";
import {
  booleanValue,
  createQuestionPackValidationErrors,
  enumValue,
  finalizeQuestionPackValidationErrors,
  hasOwn,
  idValue,
  integer,
  numericEnumValue,
  objectValue,
  questionPackMaxFileBytes,
  readBoundedArray,
  rejectUnknown,
  text,
  textArray,
  uniqueEnumArray,
  type UnknownRecord
} from "@/features/question-packs/questionPackValidation";

const communityPackCatalogSourceRoot = "public/community-packs" as const;

export const communityPackCatalogKinds = [
  "fixed_numeric",
  "generated_template",
  "exhibit",
  "market_sizing",
  "benchmark",
  "case_practice"
] as const satisfies readonly QuestionPackRecord["kind"][];

export const communityPackCatalogTopics = [
  "arithmetic",
  "percentages",
  "fractions_decimals_ratios",
  "growth_compounding",
  "weighted_averages",
  "business_math",
  "case_math",
  "market_sizing",
  "exhibit_math",
  "brainstorming",
  "fit",
  "full_case",
  "lessons",
  "questioning",
  "structuring",
  "synthesis"
] as const;

export const communityPackCatalogDifficulties = [
  "beginner",
  "intermediate",
  "advanced",
  "expert"
] as const satisfies readonly Difficulty[];

export const communityPackContentLicenseIds = ["CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0"] as const;

export type CommunityPackCatalogKind = (typeof communityPackCatalogKinds)[number];
export type CommunityPackCatalogTopic = (typeof communityPackCatalogTopics)[number];
export type CommunityPackContentLicenseId = (typeof communityPackContentLicenseIds)[number];
export type CommunityPackRightsBasis = "original" | "licensed" | "mixed";
export type CommunityPackReviewResult = "pass" | "not_applicable";
export type CommunityPackLifecycleEventType = "accepted" | "corrected" | "deprecated" | "withdrawn";

export interface CommunityPackCatalogEntry {
  id: string;
  version: string;
  title: string;
  summary: string;
  kind: CommunityPackCatalogKind;
  topics: CommunityPackCatalogTopic[];
  difficulties: Difficulty[];
  language: string;
  publisher: { id: string; name: string };
  contentLicenseId: CommunityPackContentLicenseId;
  reviewDate: string;
  minimumAppVersion: string;
  packSchemaVersion: 2 | 3;
  file: string;
  bytes: number;
  sha256: string;
  repositoryReviewed: true;
  deprecated: boolean;
  deprecation?: CommunityPackCatalogLifecycleNotice;
}

export interface CommunityPackCatalogLifecycleNotice {
  date: string;
  reason: string;
  reference: string;
  replacementId?: string;
  replacementVersion?: string;
}

export interface CommunityPackCatalogTombstone extends CommunityPackCatalogLifecycleNotice {
  id: string;
  version: string;
  status: "withdrawn";
}

export interface CommunityPackCatalog {
  catalogSchemaVersion: 1;
  entries: CommunityPackCatalogEntry[];
  tombstones: CommunityPackCatalogTombstone[];
}

export type CommunityPackCatalogValidationResult =
  | { status: "valid"; catalog: CommunityPackCatalog }
  | { status: "invalid"; errors: string[] };

export interface CommunityPackReviewCheck {
  evidence: string;
  result: CommunityPackReviewResult;
}

export interface CommunityPackReviewMetadata {
  reviewSchemaVersion: 1;
  id: string;
  version: string;
  file: string;
  sha256: string;
  title: string;
  summary: string;
  kind: CommunityPackCatalogKind;
  topics: CommunityPackCatalogTopic[];
  difficulties: Difficulty[];
  language: string;
  publisher: {
    id: string;
    name: string;
  };
  contentLicenseId: CommunityPackContentLicenseId;
  rights: {
    basis: CommunityPackRightsBasis;
    declaration: string;
    evidenceReferences: string[];
  };
  provenance: {
    sourceNotes: string;
    sourceReferences: string[];
  };
  compatibility: {
    minimumAppVersion: string;
    packSchemaVersion: 2 | 3;
  };
  submissionReference: string;
  conflicts: {
    declared: boolean;
    statement: string;
  };
  review: {
    reviewDate: string;
    reviewerReference: string;
    evidenceReference: string;
    checks: {
      editorial: CommunityPackReviewCheck;
      factual: CommunityPackReviewCheck;
      answerKey: CommunityPackReviewCheck;
      accessibility: CommunityPackReviewCheck;
      rights: CommunityPackReviewCheck;
    };
    maintainerApprovalReference: string;
  };
  events: Array<{
    type: CommunityPackLifecycleEventType;
    date: string;
    reference: string;
    reason: string;
    replacementId?: string;
    replacementVersion?: string;
  }>;
}

export interface CommunityPackReviewContext {
  directoryId: string;
  directoryVersion: string;
  packFile: string;
  pack: Pick<QuestionPackRecord, "id" | "packVersion" | "title" | "kind" | "schemaVersion">;
}

export type CommunityPackReviewValidationResult =
  | { status: "valid"; metadata: CommunityPackReviewMetadata }
  | { status: "invalid"; errors: string[] };

const metadataProperties = [
  "reviewSchemaVersion",
  "id",
  "version",
  "file",
  "sha256",
  "title",
  "summary",
  "kind",
  "topics",
  "difficulties",
  "language",
  "publisher",
  "contentLicenseId",
  "rights",
  "provenance",
  "compatibility",
  "submissionReference",
  "conflicts",
  "review",
  "events"
] as const;
const selfDeclaredReviewProperties = ["badge", "repositoryReviewed", "reviewed", "reviewStatus"] as const;
const semVerPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const rightsBases = ["original", "licensed", "mixed"] as const;
const reviewResults = ["pass", "not_applicable"] as const;
const lifecycleEventTypes = ["accepted", "corrected", "deprecated", "withdrawn"] as const;

export function getCommunityPackFilePath(id: string, version: string): string {
  return `${communityPackCatalogSourceRoot}/${id}/${version}/pack.mathdrill.json`;
}

export function getCommunityPackDownloadPath(id: string, version: string): string {
  return `/${getCommunityPackFilePath(id, version).slice("public/".length)}`;
}

export function parseCommunityPackCatalog(payload: unknown): CommunityPackCatalogValidationResult {
  const errors = createQuestionPackValidationErrors();
  const value = objectValue(payload, "$", errors);
  if (value === undefined) return invalidCatalogResult(errors);

  rejectUnknown(value, ["catalogSchemaVersion", "entries", "tombstones"], "$", errors);
  if (value.catalogSchemaVersion !== 1) errors.push("$.catalogSchemaVersion must be 1.");
  const rawEntries = readBoundedArray(value.entries, "$.entries", 0, 10_000, errors);
  const rawTombstones = readBoundedArray(value.tombstones, "$.tombstones", 0, 10_000, errors);
  const entries = rawEntries?.flatMap((entry, index) => {
    const parsed = catalogEntry(entry, index, errors);
    return parsed === undefined ? [] : [parsed];
  });
  const tombstones = rawTombstones?.flatMap((entry, index) => {
    const parsed = catalogTombstone(entry, index, errors);
    return parsed === undefined ? [] : [parsed];
  });

  if (entries !== undefined && rawEntries !== undefined && entries.length === rawEntries.length) {
    validateCatalogIdentities(entries, tombstones ?? [], errors);
  }
  if (
    errors.length > 0 ||
    entries === undefined ||
    tombstones === undefined ||
    entries.length !== rawEntries?.length ||
    tombstones.length !== rawTombstones?.length
  ) {
    return invalidCatalogResult(errors);
  }

  return { status: "valid", catalog: { catalogSchemaVersion: 1, entries, tombstones } };
}

export function compareCommunityPackSemVer(left: string, right: string): number {
  const leftMatch = semVerPattern.exec(left);
  const rightMatch = semVerPattern.exec(right);
  if (leftMatch === null || rightMatch === null) throw new TypeError("Expected valid SemVer values.");

  for (const index of [1, 2, 3] as const) {
    const leftPart = BigInt(leftMatch[index]!);
    const rightPart = BigInt(rightMatch[index]!);
    if (leftPart !== rightPart) return leftPart < rightPart ? -1 : 1;
  }

  const leftPrerelease = leftMatch[4]?.split(".") ?? [];
  const rightPrerelease = rightMatch[4]?.split(".") ?? [];
  if (leftPrerelease.length === 0 || rightPrerelease.length === 0) {
    return leftPrerelease.length === rightPrerelease.length ? 0 : leftPrerelease.length === 0 ? 1 : -1;
  }
  for (let index = 0; index < Math.max(leftPrerelease.length, rightPrerelease.length); index += 1) {
    const leftPart = leftPrerelease[index];
    const rightPart = rightPrerelease[index];
    if (leftPart === undefined || rightPart === undefined) return leftPart === undefined ? -1 : 1;
    if (leftPart === rightPart) continue;
    const leftNumeric = /^\d+$/.test(leftPart);
    const rightNumeric = /^\d+$/.test(rightPart);
    if (leftNumeric && rightNumeric) return BigInt(leftPart) < BigInt(rightPart) ? -1 : 1;
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftPart < rightPart ? -1 : 1;
  }
  return 0;
}

export function parseCommunityPackReviewMetadata(
  payload: unknown,
  context: CommunityPackReviewContext
): CommunityPackReviewValidationResult {
  const errors = createQuestionPackValidationErrors();
  const value = objectValue(payload, "$", errors);
  if (value === undefined) return invalidResult(errors);

  for (const property of selfDeclaredReviewProperties) {
    if (hasOwn(value, property)) {
      errors.push(`$.${property} must not self-declare repository review or badge state.`);
    }
  }
  rejectUnknown(value, [...metadataProperties, ...selfDeclaredReviewProperties], "$", errors);

  if (value.reviewSchemaVersion !== 1) errors.push("$.reviewSchemaVersion must be 1.");
  const id = catalogId(value.id, "$.id", errors);
  const version = semVer(value.version, "$.version", errors);
  const file = sourceFile(value.file, id, version, "$.file", errors);
  const sha256 = checksum(value.sha256, "$.sha256", errors);
  const title = text(value.title, "$.title", 100, errors);
  const summary = text(value.summary, "$.summary", 500, errors);
  const kind = enumValue(value.kind, communityPackCatalogKinds, "$.kind", errors);
  const topics = uniqueEnumArray(
    value.topics,
    communityPackCatalogTopics,
    "$.topics",
    1,
    communityPackCatalogTopics.length,
    errors
  );
  const difficulties = uniqueEnumArray(
    value.difficulties,
    communityPackCatalogDifficulties,
    "$.difficulties",
    1,
    communityPackCatalogDifficulties.length,
    errors
  );
  const language = canonicalLanguage(value.language, "$.language", errors);
  const publisher = publisherMetadata(value.publisher, errors);
  const contentLicenseId = enumValue(
    value.contentLicenseId,
    communityPackContentLicenseIds,
    "$.contentLicenseId",
    errors
  );
  const rights = rightsMetadata(value.rights, errors);
  const provenance = provenanceMetadata(value.provenance, errors);
  const compatibility = compatibilityMetadata(value.compatibility, errors);
  const submissionReference = text(value.submissionReference, "$.submissionReference", 1_000, errors);
  const conflicts = conflictMetadata(value.conflicts, errors);
  const review = reviewMetadata(value.review, errors);
  const events = lifecycleEvents(value.events, errors);

  if (rights !== undefined && rights.basis !== "original" && rights.evidenceReferences.length === 0) {
    errors.push("$.rights.evidenceReferences may be empty only when $.rights.basis is original.");
  }

  if (
    id === undefined ||
    version === undefined ||
    file === undefined ||
    sha256 === undefined ||
    title === undefined ||
    summary === undefined ||
    kind === undefined ||
    topics === undefined ||
    difficulties === undefined ||
    language === undefined ||
    publisher === undefined ||
    contentLicenseId === undefined ||
    rights === undefined ||
    provenance === undefined ||
    compatibility === undefined ||
    submissionReference === undefined ||
    conflicts === undefined ||
    review === undefined ||
    events === undefined
  ) {
    return invalidResult(errors);
  }

  validateContext({ id, version, file, title, kind, compatibility }, context, errors);
  if (errors.length > 0) return invalidResult(errors);

  return {
    status: "valid",
    metadata: {
      reviewSchemaVersion: 1,
      id,
      version,
      file,
      sha256,
      title,
      summary,
      kind,
      topics,
      difficulties,
      language,
      publisher,
      contentLicenseId,
      rights,
      provenance,
      compatibility,
      submissionReference,
      conflicts,
      review,
      events
    }
  };
}

function catalogEntry(
  value: unknown,
  index: number,
  errors: string[]
): CommunityPackCatalogEntry | undefined {
  const path = `$.entries[${index}]`;
  const record = objectValue(value, path, errors);
  if (record === undefined) return undefined;
  rejectUnknown(record, [
    "id", "version", "title", "summary", "kind", "topics", "difficulties", "language",
    "publisher", "contentLicenseId", "reviewDate", "minimumAppVersion", "packSchemaVersion",
    "file", "bytes", "sha256", "repositoryReviewed", "deprecated", "deprecation"
  ], path, errors);

  const id = catalogId(record.id, `${path}.id`, errors);
  const version = semVer(record.version, `${path}.version`, errors);
  const title = exactText(record.title, `${path}.title`, 100, errors);
  const summary = exactText(record.summary, `${path}.summary`, 500, errors);
  const kind = enumValue(record.kind, communityPackCatalogKinds, `${path}.kind`, errors);
  const topics = uniqueEnumArray(
    record.topics,
    communityPackCatalogTopics,
    `${path}.topics`,
    1,
    communityPackCatalogTopics.length,
    errors
  );
  const difficulties = uniqueEnumArray(
    record.difficulties,
    communityPackCatalogDifficulties,
    `${path}.difficulties`,
    1,
    communityPackCatalogDifficulties.length,
    errors
  );
  const language = canonicalLanguage(record.language, `${path}.language`, errors);
  const publisher = catalogPublisher(record.publisher, `${path}.publisher`, errors);
  const contentLicenseId = enumValue(
    record.contentLicenseId,
    communityPackContentLicenseIds,
    `${path}.contentLicenseId`,
    errors
  );
  const reviewDate = calendarDate(record.reviewDate, `${path}.reviewDate`, errors);
  const minimumAppVersion = semVer(record.minimumAppVersion, `${path}.minimumAppVersion`, errors);
  const packSchemaVersion = numericEnumValue(
    record.packSchemaVersion,
    [2, 3] as const,
    `${path}.packSchemaVersion`,
    errors
  );
  const file = catalogDownloadFile(record.file, id, version, `${path}.file`, errors);
  const bytes = integer(record.bytes, `${path}.bytes`, 1, questionPackMaxFileBytes, errors);
  const sha256 = checksum(record.sha256, `${path}.sha256`, errors);
  if (record.repositoryReviewed !== true) {
    errors.push(`${path}.repositoryReviewed must be true and is controlled by the repository catalog.`);
  }
  const deprecated = booleanValue(record.deprecated, `${path}.deprecated`, errors);
  const hasDeprecation = hasOwn(record, "deprecation");
  if (deprecated !== undefined && deprecated !== hasDeprecation) {
    errors.push(`${path}.deprecation must be present exactly when ${path}.deprecated is true.`);
  }
  const deprecation = hasDeprecation
    ? catalogLifecycleNotice(record.deprecation, `${path}.deprecation`, errors)
    : undefined;

  if (
    id === undefined || version === undefined || title === undefined || summary === undefined ||
    kind === undefined || topics === undefined || difficulties === undefined || language === undefined ||
    publisher === undefined || contentLicenseId === undefined || reviewDate === undefined ||
    minimumAppVersion === undefined || packSchemaVersion === undefined || file === undefined ||
    bytes === undefined || sha256 === undefined || record.repositoryReviewed !== true ||
    deprecated === undefined || (hasDeprecation && deprecation === undefined)
  ) return undefined;

  return {
    id,
    version,
    title,
    summary,
    kind,
    topics,
    difficulties,
    language,
    publisher,
    contentLicenseId,
    reviewDate,
    minimumAppVersion,
    packSchemaVersion,
    file,
    bytes,
    sha256,
    repositoryReviewed: true,
    deprecated,
    ...(deprecation === undefined ? {} : { deprecation })
  };
}

function catalogTombstone(
  value: unknown,
  index: number,
  errors: string[]
): CommunityPackCatalogTombstone | undefined {
  const path = `$.tombstones[${index}]`;
  const record = objectValue(value, path, errors);
  if (record === undefined) return undefined;
  rejectUnknown(record, [
    "id", "version", "status", "date", "reason", "reference", "replacementId", "replacementVersion"
  ], path, errors);
  const id = catalogId(record.id, `${path}.id`, errors);
  const version = semVer(record.version, `${path}.version`, errors);
  if (record.status !== "withdrawn") errors.push(`${path}.status must be "withdrawn".`);
  const notice = catalogLifecycleNotice(record, path, errors, ["id", "version", "status"]);
  if (id === undefined || version === undefined || record.status !== "withdrawn" || notice === undefined) {
    return undefined;
  }
  return { id, version, status: "withdrawn", ...notice };
}

function catalogPublisher(value: unknown, path: string, errors: string[]) {
  const record = objectValue(value, path, errors);
  if (record === undefined) return undefined;
  rejectUnknown(record, ["id", "name"], path, errors);
  const id = catalogId(record.id, `${path}.id`, errors);
  const name = exactText(record.name, `${path}.name`, 100, errors);
  return id === undefined || name === undefined ? undefined : { id, name };
}

function catalogLifecycleNotice(
  value: unknown,
  path: string,
  errors: string[],
  additionalProperties: readonly string[] = []
): CommunityPackCatalogLifecycleNotice | undefined {
  const record = objectValue(value, path, errors);
  if (record === undefined) return undefined;
  rejectUnknown(
    record,
    [...additionalProperties, "date", "reason", "reference", "replacementId", "replacementVersion"],
    path,
    errors
  );
  const date = calendarDate(record.date, `${path}.date`, errors);
  const reason = exactText(record.reason, `${path}.reason`, 2_000, errors);
  const reference = exactText(record.reference, `${path}.reference`, 1_000, errors);
  const hasReplacementId = hasOwn(record, "replacementId");
  const hasReplacementVersion = hasOwn(record, "replacementVersion");
  if (hasReplacementId !== hasReplacementVersion) {
    errors.push(`${path}.replacementId and ${path}.replacementVersion must be provided together.`);
  }
  const replacementId = hasReplacementId
    ? catalogId(record.replacementId, `${path}.replacementId`, errors)
    : undefined;
  const replacementVersion = hasReplacementVersion
    ? semVer(record.replacementVersion, `${path}.replacementVersion`, errors)
    : undefined;
  if (
    date === undefined || reason === undefined || reference === undefined ||
    (hasReplacementId && replacementId === undefined) ||
    (hasReplacementVersion && replacementVersion === undefined)
  ) return undefined;
  return {
    date,
    reason,
    reference,
    ...(replacementId === undefined ? {} : { replacementId, replacementVersion: replacementVersion! })
  };
}

function catalogDownloadFile(
  value: unknown,
  id: string | undefined,
  version: string | undefined,
  path: string,
  errors: string[]
): string | undefined {
  const result = exactText(value, path, 500, errors);
  if (result === undefined) return undefined;
  if (id !== undefined && version !== undefined && result !== getCommunityPackDownloadPath(id, version)) {
    errors.push(`${path} must be the matching same-origin pack path ${JSON.stringify(getCommunityPackDownloadPath(id, version))}.`);
  }
  return result;
}

function validateCatalogIdentities(
  entries: CommunityPackCatalogEntry[],
  tombstones: CommunityPackCatalogTombstone[],
  errors: string[]
): void {
  const identities = new Set<string>();
  const publisherById = new Map<string, string>();
  for (const [index, record] of [...entries, ...tombstones].entries()) {
    const identity = `${record.id}\u0000${record.version}`;
    if (identities.has(identity)) errors.push(`Catalog identity ${record.id}@${record.version} must be unique.`);
    identities.add(identity);
    if (index < entries.length) {
      const entry = record as CommunityPackCatalogEntry;
      const publisherId = publisherById.get(entry.id);
      if (publisherId !== undefined && publisherId !== entry.publisher.id) {
        errors.push(`Catalog lineage ${entry.id} must keep one publisher ID.`);
      }
      publisherById.set(entry.id, entry.publisher.id);
    }
  }
}

function exactText(value: unknown, path: string, max: number, errors: string[]): string | undefined {
  const result = text(value, path, max, errors);
  if (result !== undefined && value !== result) {
    errors.push(`${path} must not contain surrounding whitespace.`);
    return undefined;
  }
  return result;
}

function publisherMetadata(value: unknown, errors: string[]) {
  const record = objectValue(value, "$.publisher", errors);
  if (record === undefined) return undefined;
  rejectUnknown(record, ["id", "name"], "$.publisher", errors);
  const id = catalogId(record.id, "$.publisher.id", errors);
  const name = text(record.name, "$.publisher.name", 100, errors);
  return id === undefined || name === undefined ? undefined : { id, name };
}

function rightsMetadata(value: unknown, errors: string[]) {
  const record = objectValue(value, "$.rights", errors);
  if (record === undefined) return undefined;
  rejectUnknown(record, ["basis", "declaration", "evidenceReferences"], "$.rights", errors);
  const basis = enumValue(record.basis, rightsBases, "$.rights.basis", errors);
  const declaration = text(record.declaration, "$.rights.declaration", 2_000, errors);
  const evidenceReferences = uniqueTextArray(
    record.evidenceReferences,
    "$.rights.evidenceReferences",
    0,
    50,
    errors
  );
  return basis === undefined || declaration === undefined || evidenceReferences === undefined
    ? undefined
    : { basis, declaration, evidenceReferences };
}

function provenanceMetadata(value: unknown, errors: string[]) {
  const record = objectValue(value, "$.provenance", errors);
  if (record === undefined) return undefined;
  rejectUnknown(record, ["sourceNotes", "sourceReferences"], "$.provenance", errors);
  const sourceNotes = text(record.sourceNotes, "$.provenance.sourceNotes", 5_000, errors);
  const sourceReferences = uniqueTextArray(
    record.sourceReferences,
    "$.provenance.sourceReferences",
    0,
    100,
    errors
  );
  return sourceNotes === undefined || sourceReferences === undefined
    ? undefined
    : { sourceNotes, sourceReferences };
}

function compatibilityMetadata(value: unknown, errors: string[]) {
  const record = objectValue(value, "$.compatibility", errors);
  if (record === undefined) return undefined;
  rejectUnknown(record, ["minimumAppVersion", "packSchemaVersion"], "$.compatibility", errors);
  const minimumAppVersion = semVer(record.minimumAppVersion, "$.compatibility.minimumAppVersion", errors);
  const packSchemaVersion = numericEnumValue(
    record.packSchemaVersion,
    [2, 3] as const,
    "$.compatibility.packSchemaVersion",
    errors
  );
  return minimumAppVersion === undefined || packSchemaVersion === undefined
    ? undefined
    : { minimumAppVersion, packSchemaVersion };
}

function conflictMetadata(value: unknown, errors: string[]) {
  const record = objectValue(value, "$.conflicts", errors);
  if (record === undefined) return undefined;
  rejectUnknown(record, ["declared", "statement"], "$.conflicts", errors);
  const declared = booleanValue(record.declared, "$.conflicts.declared", errors);
  const statement = text(record.statement, "$.conflicts.statement", 2_000, errors);
  if (declared === false && statement !== "None declared") {
    errors.push('$.conflicts.statement must be "None declared" when no conflict is declared.');
  } else if (declared === true && statement === "None declared") {
    errors.push("$.conflicts.statement must describe the conflict and mitigation when one is declared.");
  }
  return declared === undefined || statement === undefined ? undefined : { declared, statement };
}

function reviewMetadata(value: unknown, errors: string[]) {
  const record = objectValue(value, "$.review", errors);
  if (record === undefined) return undefined;
  rejectUnknown(
    record,
    ["reviewDate", "reviewerReference", "evidenceReference", "checks", "maintainerApprovalReference"],
    "$.review",
    errors
  );
  const reviewDate = calendarDate(record.reviewDate, "$.review.reviewDate", errors);
  const reviewerReference = text(record.reviewerReference, "$.review.reviewerReference", 1_000, errors);
  const evidenceReference = text(record.evidenceReference, "$.review.evidenceReference", 1_000, errors);
  const checks = reviewChecks(record.checks, errors);
  const maintainerApprovalReference = text(
    record.maintainerApprovalReference,
    "$.review.maintainerApprovalReference",
    1_000,
    errors
  );
  return reviewDate === undefined ||
    reviewerReference === undefined ||
    evidenceReference === undefined ||
    checks === undefined ||
    maintainerApprovalReference === undefined
    ? undefined
    : { reviewDate, reviewerReference, evidenceReference, checks, maintainerApprovalReference };
}

function reviewChecks(value: unknown, errors: string[]) {
  const record = objectValue(value, "$.review.checks", errors);
  if (record === undefined) return undefined;
  const areas = ["editorial", "factual", "answerKey", "accessibility", "rights"] as const;
  rejectUnknown(record, areas, "$.review.checks", errors);
  const editorial = reviewCheck(record.editorial, "$.review.checks.editorial", errors);
  const factual = reviewCheck(record.factual, "$.review.checks.factual", errors);
  const answerKey = reviewCheck(record.answerKey, "$.review.checks.answerKey", errors);
  const accessibility = reviewCheck(record.accessibility, "$.review.checks.accessibility", errors);
  const rights = reviewCheck(record.rights, "$.review.checks.rights", errors);
  return editorial === undefined ||
    factual === undefined ||
    answerKey === undefined ||
    accessibility === undefined ||
    rights === undefined
    ? undefined
    : { editorial, factual, answerKey, accessibility, rights };
}

function reviewCheck(value: unknown, path: string, errors: string[]): CommunityPackReviewCheck | undefined {
  const record = objectValue(value, path, errors);
  if (record === undefined) return undefined;
  rejectUnknown(record, ["result", "evidence"], path, errors);
  const result = enumValue(record.result, reviewResults, `${path}.result`, errors);
  const evidence = text(record.evidence, `${path}.evidence`, 2_000, errors);
  return result === undefined || evidence === undefined ? undefined : { result, evidence };
}

function lifecycleEvents(value: unknown, errors: string[]): CommunityPackReviewMetadata["events"] | undefined {
  const entries = readBoundedArray(value, "$.events", 1, 100, errors);
  if (entries === undefined) return undefined;
  const events = entries.flatMap((entry, index) => {
    const event = lifecycleEvent(entry, index, errors);
    return event === undefined ? [] : [event];
  });
  if (events[0]?.type !== "accepted") errors.push("$.events[0].type must be accepted.");
  if (events.slice(1).some((event) => event.type === "accepted")) {
    errors.push("$.events may contain accepted only as the first lifecycle event.");
  }
  for (let index = 1; index < events.length; index += 1) {
    if (events[index]!.date < events[index - 1]!.date) {
      errors.push(`$.events[${index}].date must not precede the previous lifecycle event.`);
    }
  }
  return events.length === entries.length ? events : undefined;
}

function lifecycleEvent(
  value: unknown,
  index: number,
  errors: string[]
): CommunityPackReviewMetadata["events"][number] | undefined {
  const path = `$.events[${index}]`;
  const record = objectValue(value, path, errors);
  if (record === undefined) return undefined;
  rejectUnknown(record, ["type", "date", "reference", "reason", "replacementId", "replacementVersion"], path, errors);
  const type = enumValue(record.type, lifecycleEventTypes, `${path}.type`, errors);
  const date = calendarDate(record.date, `${path}.date`, errors);
  const reference = text(record.reference, `${path}.reference`, 1_000, errors);
  const reason = text(record.reason, `${path}.reason`, 2_000, errors);
  const hasReplacementId = hasOwn(record, "replacementId");
  const hasReplacementVersion = hasOwn(record, "replacementVersion");
  if (hasReplacementId !== hasReplacementVersion) {
    errors.push(`${path}.replacementId and ${path}.replacementVersion must be provided together.`);
  }
  if (type === "accepted" && (hasReplacementId || hasReplacementVersion)) {
    errors.push(`${path} must not attach a replacement to an accepted event.`);
  }
  const replacementId = hasReplacementId
    ? catalogId(record.replacementId, `${path}.replacementId`, errors)
    : undefined;
  const replacementVersion = hasReplacementVersion
    ? semVer(record.replacementVersion, `${path}.replacementVersion`, errors)
    : undefined;
  if (type === undefined || date === undefined || reference === undefined || reason === undefined) return undefined;
  return {
    type,
    date,
    reference,
    reason,
    ...(replacementId === undefined ? {} : { replacementId }),
    ...(replacementVersion === undefined ? {} : { replacementVersion })
  };
}

function validateContext(
  metadata: Pick<CommunityPackReviewMetadata, "id" | "version" | "file" | "title" | "kind" | "compatibility">,
  context: CommunityPackReviewContext,
  errors: string[]
): void {
  const directoryId = catalogId(context.directoryId, "$context.directoryId", errors);
  const directoryVersion = semVer(context.directoryVersion, "$context.directoryVersion", errors);
  if (directoryId !== undefined && directoryVersion !== undefined) {
    const expectedFile = getCommunityPackFilePath(directoryId, directoryVersion);
    if (context.packFile !== expectedFile) {
      errors.push(`$context.packFile must be the matching repository path ${JSON.stringify(expectedFile)}.`);
    }
  }
  if (metadata.id !== context.directoryId) errors.push("$.id must match the repository directory ID.");
  if (metadata.version !== context.directoryVersion) errors.push("$.version must match the repository version directory.");
  if (metadata.file !== context.packFile) errors.push("$.file must match the contextual pack file path.");
  if (metadata.id !== context.pack.id) errors.push("$.id must match the pack envelope ID.");
  if (metadata.version !== context.pack.packVersion) errors.push("$.version must match the pack envelope packVersion.");
  if (metadata.title !== context.pack.title) errors.push("$.title must match the pack envelope title.");
  if (metadata.kind !== context.pack.kind) errors.push("$.kind must match the pack envelope kind.");
  if (metadata.compatibility.packSchemaVersion !== context.pack.schemaVersion) {
    errors.push("$.compatibility.packSchemaVersion must match the pack envelope schemaVersion.");
  }
}

function sourceFile(
  value: unknown,
  id: string | undefined,
  version: string | undefined,
  path: string,
  errors: string[]
): string | undefined {
  const result = text(value, path, 500, errors);
  if (result === undefined) return undefined;
  if (value !== result) errors.push(`${path} must not contain surrounding whitespace.`);
  if (
    result.startsWith("/") ||
    result.includes("\\") ||
    result.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    errors.push(`${path} must be a safe POSIX repository-relative path.`);
  }
  if (id !== undefined && version !== undefined) {
    const expected = getCommunityPackFilePath(id, version);
    if (result !== expected) errors.push(`${path} must be the matching pack path ${JSON.stringify(expected)}.`);
  }
  return result;
}

function semVer(value: unknown, path: string, errors: string[]): string | undefined {
  const result = text(value, path, 100, errors);
  if (result !== undefined && (value !== result || !semVerPattern.test(result))) {
    errors.push(`${path} must be a valid SemVer value.`);
    return undefined;
  }
  return result;
}

function checksum(value: unknown, path: string, errors: string[]): string | undefined {
  const result = text(value, path, 64, errors);
  if (result !== undefined && (value !== result || !sha256Pattern.test(result))) {
    errors.push(`${path} must be a lowercase 64-character SHA-256 checksum.`);
    return undefined;
  }
  return result;
}

function canonicalLanguage(value: unknown, path: string, errors: string[]): string | undefined {
  const result = text(value, path, 100, errors);
  if (result === undefined) return undefined;
  try {
    if (value !== result || Intl.getCanonicalLocales(result)[0] !== result) {
      errors.push(`${path} must be a canonical BCP-47 language tag.`);
      return undefined;
    }
  } catch {
    errors.push(`${path} must be a canonical BCP-47 language tag.`);
    return undefined;
  }
  return result;
}

function calendarDate(value: unknown, path: string, errors: string[]): string | undefined {
  const result = text(value, path, 10, errors);
  if (
    result === undefined ||
    value !== result ||
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    Number.isNaN(Date.parse(`${result}T00:00:00Z`)) ||
    new Date(`${result}T00:00:00Z`).toISOString().slice(0, 10) !== result
  ) {
    if (result !== undefined) errors.push(`${path} must be a valid date in YYYY-MM-DD form.`);
    return undefined;
  }
  return result;
}

function catalogId(value: unknown, path: string, errors: string[]): string | undefined {
  const result = idValue(value, path, errors);
  if (result !== undefined && value !== result) {
    errors.push(`${path} must not contain surrounding whitespace.`);
    return undefined;
  }
  return result;
}

function uniqueTextArray(
  value: unknown,
  path: string,
  min: number,
  max: number,
  errors: string[]
): string[] | undefined {
  const result = textArray(value, path, min, max, 1_000, errors);
  if (result !== undefined && new Set(result).size !== result.length) {
    errors.push(`${path} must not contain duplicates.`);
  }
  return result;
}

function invalidResult(errors: string[]): CommunityPackReviewValidationResult {
  return { status: "invalid", errors: finalizeQuestionPackValidationErrors(errors) };
}

function invalidCatalogResult(errors: string[]): CommunityPackCatalogValidationResult {
  return { status: "invalid", errors: finalizeQuestionPackValidationErrors(errors) };
}
