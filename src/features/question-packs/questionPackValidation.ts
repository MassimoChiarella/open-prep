export type UnknownRecord = Record<string, unknown>;

export const questionPackMaxFileBytes = 5 * 1024 * 1024;

const questionPackMaxFileMiB = questionPackMaxFileBytes / 1024 / 1024;

const idPattern = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const identifierPattern = /^[A-Za-z_][A-Za-z0-9_]{0,79}$/;
const reservedNames = new Set(["__proto__", "constructor", "prototype"]);
const reservedIdentifiers = new Set([...reservedNames, "answer"]);
const envelopeProperties = [
  "$schema",
  "format",
  "schemaVersion",
  "kind",
  "id",
  "packVersion",
  "title",
  "description",
  "publisher",
  "license"
] as const;

export interface QuestionPackEnvelope {
  value: UnknownRecord;
  schemaVersion: 2 | 3 | undefined;
  id: string | undefined;
  packVersion: string | undefined;
  title: string | undefined;
  description: string | undefined;
  publisher: string | undefined;
  license: string | undefined;
}

export function readQuestionPackEnvelope(
  payload: unknown,
  kind: string,
  contentProperties: readonly string[],
  errors: string[],
  allowedSchemaVersions: readonly (2 | 3)[] = [2]
): QuestionPackEnvelope | undefined {
  const bytes = serializedByteLength(payload);
  if (bytes === undefined) {
    errors.push("$ must be JSON-serializable.");
    return undefined;
  }
  if (bytes > questionPackMaxFileBytes) {
    errors.push(`$ exceeds the ${questionPackMaxFileMiB} MiB question-pack file limit.`);
    return undefined;
  }

  const value = objectValue(payload, "$", errors);
  if (value === undefined) return undefined;

  rejectUnknown(value, [...envelopeProperties, ...contentProperties], "$", errors);
  if (hasOwn(value, "$schema")) readTextValue(value.$schema, "$.$schema", 500, errors);
  literal(value.format, "math-drill-question-pack", "$.format", errors);
  let schemaVersion: 2 | 3 | undefined;
  if (allowedSchemaVersions.length === 1) {
    literal(value.schemaVersion, allowedSchemaVersions[0]!, "$.schemaVersion", errors);
    schemaVersion = value.schemaVersion === allowedSchemaVersions[0] ? allowedSchemaVersions[0] : undefined;
  } else {
    schemaVersion = numericEnumValue(value.schemaVersion, allowedSchemaVersions, "$.schemaVersion", errors);
  }
  literal(value.kind, kind, "$.kind", errors);

  return {
    value,
    schemaVersion,
    id: readIdProperty(value, "id", "$.id", errors),
    packVersion: readTextProperty(value, "packVersion", "$.packVersion", 100, errors),
    title: readTextProperty(value, "title", "$.title", 100, errors),
    description: readOptionalTextProperty(value, "description", "$.description", 500, errors),
    publisher: readOptionalTextProperty(value, "publisher", "$.publisher", 100, errors),
    license: readOptionalTextProperty(value, "license", "$.license", 100, errors)
  };
}

export function objectValue(value: unknown, path: string, errors: string[]): UnknownRecord | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    errors.push(`${path} must be an object.`);
    return undefined;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    errors.push(`${path} must be a plain JSON object.`);
    return undefined;
  }
  return value as UnknownRecord;
}

export function rejectUnknown(
  value: UnknownRecord,
  allowedProperties: readonly string[] | ReadonlySet<string>,
  path: string,
  errors: string[]
): void {
  const allowed = new Set(allowedProperties);
  for (const property of Object.keys(value)) {
    if (reservedNames.has(property)) errors.push(`${path}.${property} uses a reserved property name.`);
    else if (!allowed.has(property)) errors.push(`${path}.${property} is not an allowed property.`);
  }
}

export function boundedArray(
  value: unknown,
  path: string,
  min: number,
  max: number,
  errors: string[]
): value is unknown[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return false;
  }
  if (value.length < min || value.length > max) errors.push(`${path} must contain ${min} to ${max} items.`);
  return true;
}

export function readBoundedArray(
  value: unknown,
  path: string,
  min: number,
  max: number,
  errors: string[]
): unknown[] | undefined {
  if (!boundedArray(value, path, min, max, errors)) return undefined;
  return value.length < min || value.length > max ? undefined : value;
}

export function text(value: unknown, path: string, max: number, errors: string[]): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${path} must be non-empty text.`);
    return undefined;
  }
  const result = value.trim();
  if (result.length > max) {
    errors.push(`${path} must contain at most ${max} characters.`);
    return undefined;
  }
  return result;
}

export function optionalText(
  value: UnknownRecord,
  key: string,
  max: number,
  errors: string[],
  base = "$"
): string | undefined {
  return hasOwn(value, key) ? text(value[key], `${base}.${key}`, max, errors) : undefined;
}

export function idValue(value: unknown, path: string, errors: string[]): string | undefined {
  const result = text(value, path, 80, errors);
  if (result !== undefined && (!idPattern.test(result) || reservedNames.has(result))) {
    errors.push(`${path} must be a lowercase ID and must not be reserved.`);
    return undefined;
  }
  return result;
}

export function identifier(value: unknown, path: string, errors: string[]): string | undefined {
  const result = text(value, path, 80, errors);
  if (result !== undefined && !isValidIdentifier(result)) {
    errors.push(`${path} must be a valid non-reserved identifier.`);
    return undefined;
  }
  return result;
}

export function isValidIdentifier(value: string): boolean {
  return identifierPattern.test(value) && !reservedIdentifiers.has(value);
}

export function idArray(
  value: unknown,
  path: string,
  min: number,
  max: number,
  errors: string[]
): string[] | undefined {
  if (!boundedArray(value, path, min, max, errors)) return undefined;
  const result = value.flatMap((entry, index) => {
    const parsed = idValue(entry, `${path}[${index}]`, errors);
    return parsed === undefined ? [] : [parsed];
  });
  if (new Set(result).size !== result.length) errors.push(`${path} must not contain duplicate IDs.`);
  return result;
}

export function textArray(
  value: unknown,
  path: string,
  min: number,
  max: number,
  maxText: number,
  errors: string[]
): string[] | undefined {
  if (!boundedArray(value, path, min, max, errors)) return undefined;
  return value.flatMap((entry, index) => {
    const parsed = text(entry, `${path}[${index}]`, maxText, errors);
    return parsed === undefined ? [] : [parsed];
  });
}

export function enumValue<const TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
  path: string,
  errors: string[]
): TValue | undefined {
  if (typeof value !== "string" || !allowed.includes(value as TValue)) {
    errors.push(`${path} must be one of: ${allowed.join(", ")}.`);
    return undefined;
  }
  return value as TValue;
}

export function numericEnumValue<const TValue extends number>(
  value: unknown,
  allowed: readonly TValue[],
  path: string,
  errors: string[]
): TValue | undefined {
  if (typeof value !== "number" || !allowed.includes(value as TValue)) {
    errors.push(`${path} must be one of: ${allowed.join(", ")}.`);
    return undefined;
  }
  return value as TValue;
}

export function uniqueEnumArray<const TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
  path: string,
  min: number,
  max: number,
  errors: string[]
): TValue[] | undefined {
  if (!boundedArray(value, path, min, max, errors)) return undefined;
  const result = value.flatMap((entry, index) => {
    const parsed = enumValue(entry, allowed, `${path}[${index}]`, errors);
    return parsed === undefined ? [] : [parsed];
  });
  if (new Set(result).size !== result.length) errors.push(`${path} must not contain duplicates.`);
  return result;
}

export function finiteNumber(value: unknown, path: string, errors: string[]): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${path} must be a finite number.`);
    return undefined;
  }
  return value;
}

export function integer(
  value: unknown,
  path: string,
  min: number,
  max: number,
  errors: string[]
): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    errors.push(`${path} must be a whole number from ${min} to ${max}.`);
    return undefined;
  }
  return value;
}

export function booleanValue(value: unknown, path: string, errors: string[]): boolean | undefined {
  if (typeof value !== "boolean") {
    errors.push(`${path} must be a boolean.`);
    return undefined;
  }
  return value;
}

export function literal(value: unknown, expected: string | number, path: string, errors: string[]): void {
  if (value !== expected) errors.push(`${path} must be ${JSON.stringify(expected)}.`);
}

export function trackDuplicateId(
  value: unknown,
  path: string,
  label: string,
  ids: Set<string>,
  errors: string[]
): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return;
  const rawId = (value as UnknownRecord).id;
  if (typeof rawId !== "string") return;
  const id = rawId.trim();
  if (!idPattern.test(id) || reservedNames.has(id)) return;
  if (ids.has(id)) errors.push(`${path} duplicates ${label} ID "${id}".`);
  else ids.add(id);
}

export function readCollection<T>(
  value: unknown,
  path: string,
  max: number,
  label: string,
  reader: (value: unknown, path: string, errors: string[]) => T | undefined,
  errors: string[],
  min = 1
): T[] | undefined {
  if (!boundedArray(value, path, min, max, errors)) return undefined;
  const ids = new Set<string>();
  return value.slice(0, max).flatMap((entry, index) => {
    const itemPath = `${path}[${index}]`;
    trackDuplicateId(entry, `${itemPath}.id`, label, ids, errors);
    const parsed = reader(entry, itemPath, errors);
    return parsed === undefined ? [] : [parsed];
  });
}

export function readTextValue(
  value: unknown,
  path: string,
  maxLength: number,
  errors: string[]
): string | undefined {
  if (typeof value !== "string") {
    errors.push(`${path} must be a string.`);
    return undefined;
  }
  const result = value.trim();
  if (result.length === 0) {
    errors.push(`${path} must not be blank.`);
    return undefined;
  }
  if (result.length > maxLength) {
    errors.push(`${path} must contain at most ${maxLength} characters.`);
    return undefined;
  }
  return result;
}

export function readTextProperty(
  value: UnknownRecord,
  property: string,
  path: string,
  maxLength: number,
  errors: string[]
): string | undefined {
  if (!hasOwn(value, property)) {
    errors.push(`${path} is required.`);
    return undefined;
  }
  return readTextValue(value[property], path, maxLength, errors);
}

export function readOptionalTextProperty(
  value: UnknownRecord,
  property: string,
  path: string,
  maxLength: number,
  errors: string[]
): string | undefined {
  return hasOwn(value, property) ? readTextValue(value[property], path, maxLength, errors) : undefined;
}

export function readIdProperty(
  value: UnknownRecord,
  property: string,
  path: string,
  errors: string[]
): string | undefined {
  const id = readTextProperty(value, property, path, 80, errors);
  if (id !== undefined && !idPattern.test(id)) {
    errors.push(`${path} must match ${idPattern.source}.`);
    return undefined;
  }
  if (id !== undefined && reservedNames.has(id)) {
    errors.push(`${path} must not use the reserved ID "${id}".`);
    return undefined;
  }
  return id;
}

export function readLiteralProperty<const TValue extends string | number>(
  value: UnknownRecord,
  property: string,
  expected: TValue,
  path: string,
  errors: string[]
): TValue | undefined {
  if (!hasOwn(value, property)) {
    errors.push(`${path} is required.`);
    return undefined;
  }
  if (value[property] !== expected) {
    errors.push(`${path} must be ${JSON.stringify(expected)}.`);
    return undefined;
  }
  return expected;
}

export function readEnumProperty<const TValue extends string>(
  value: UnknownRecord,
  property: string,
  allowed: readonly TValue[],
  path: string,
  errors: string[]
): TValue | undefined {
  if (!hasOwn(value, property)) {
    errors.push(`${path} is required.`);
    return undefined;
  }
  return enumValue(value[property], allowed, path, errors);
}

export function readFiniteNumberProperty(
  value: UnknownRecord,
  property: string,
  path: string,
  errors: string[]
): number | undefined {
  if (!hasOwn(value, property)) {
    errors.push(`${path} is required.`);
    return undefined;
  }
  return finiteNumber(value[property], path, errors);
}

export function readIntegerProperty(
  value: UnknownRecord,
  property: string,
  path: string,
  min: number,
  max: number,
  errors: string[]
): number | undefined {
  if (!hasOwn(value, property)) {
    errors.push(`${path} is required.`);
    return undefined;
  }
  return integer(value[property], path, min, max, errors);
}

export function readOptionalIntegerProperty(
  value: UnknownRecord,
  property: string,
  path: string,
  min: number,
  max: number,
  errors: string[]
): number | undefined {
  return hasOwn(value, property) ? integer(value[property], path, min, max, errors) : undefined;
}

export function serializedByteLength(value: unknown): number | undefined {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? undefined : new TextEncoder().encode(serialized).byteLength;
  } catch {
    return undefined;
  }
}

export function hasOwn(value: object, property: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, property);
}
