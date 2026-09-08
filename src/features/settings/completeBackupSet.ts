import {
  calculateCompleteBackupChecksum,
  createCompleteBackup,
  validateCompleteBackupPayload,
  type CompleteBackupCreationOptions,
  type CompleteBackupSnapshot,
  type CompleteBackupV1
} from "@/features/settings/completeBackup";
import { isPrivatePracticeRecord } from "@/features/settings/privateDataPreservation";
import { completeBackupLimits } from "@/features/settings/localDataInventory";
import { appStoreNames, type AppStoreName } from "@/lib/storage/appStorageTypes";

export const completeBackupSetLimits = { maxBytes: 128 * 1024 * 1024, maxParts: 64 } as const;
const partFormat = "open-prep-complete-backup-part";
const recordsPerPart = 5_000;
const targetPartBytes = 8 * 1024 * 1024;

export interface CompleteBackupPart {
  format: typeof partFormat;
  schemaVersion: 1;
  setId: string;
  part: number;
  parts: number;
  backup: CompleteBackupV1;
  checksum: { algorithm: "SHA-256"; value: string };
}

export type CompleteBackupFile = CompleteBackupV1 | CompleteBackupPart;
export type CompleteBackupSetValidation =
  | { backups: CompleteBackupV1[]; files: CompleteBackupFile[]; sourceBytes: number; status: "valid" }
  | { errors: string[]; status: "invalid" };

export function serializeCompleteBackupFile(file: CompleteBackupFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

export function backupFromFile(file: CompleteBackupFile): CompleteBackupV1 {
  return file.format === partFormat ? file.backup : file;
}

export function buildCompleteBackupPartFileName(file: CompleteBackupFile): string {
  const backup = backupFromFile(file);
  const suffix = file.format === partFormat ? `-${file.setId.slice(0, 12)}-part-${file.part}-of-${file.parts}` : "";
  return `open-prep-complete-backup-${backup.exportedAt.slice(0, 10)}${suffix}.json`;
}

/** Every record stays intact; all parts are validated together before any restore writes. */
export async function createCompleteBackupSet(
  snapshot: CompleteBackupSnapshot,
  options: CompleteBackupCreationOptions = {}
): Promise<CompleteBackupFile[]> {
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const scopes = options.selectedOptionalScopes ?? [];
  const chunks: CompleteBackupSnapshot[] = [];
  let chunk = emptySnapshot();
  let count = 0;
  let estimatedBytes = 0;
  const flush = () => {
    chunks.push(chunk);
    if (chunks.length > completeBackupSetLimits.maxParts) throw capacityError();
    chunk = emptySnapshot();
    count = 0;
    estimatedBytes = 0;
  };

  for (const storeName of appStoreNames) {
    if (storeName === "question_packs" && !scopes.includes("packs")) continue;
    for (const record of snapshot[storeName]) {
      if (!scopes.includes("private_text") && storeName === "practice_records" &&
        "kind" in record && isPrivatePracticeRecord(record)) continue;
      const includedRecord = !scopes.includes("private_text") && storeName === "market_sizing_attempts" && "note" in record
        ? Object.fromEntries(Object.entries(record).filter(([key]) => key !== "note"))
        : record;
      const serialized = JSON.stringify(includedRecord, null, 2);
      const recordBytes = new TextEncoder().encode(serialized).byteLength + serialized.split("\n").length * 10;
      if (count > 0 && (count >= recordsPerPart || estimatedBytes + recordBytes > targetPartBytes ||
        (storeName === "question_packs" && chunk.question_packs.length >= completeBackupLimits.maxQuestionPacks))) flush();
      (chunk[storeName] as unknown[]).push(includedRecord);
      count += 1;
      estimatedBytes += recordBytes;
    }
  }
  if (count > 0 || chunks.length === 0) flush();

  const backups: CompleteBackupV1[] = [];
  for (const partSnapshot of chunks) {
    backups.push(await createCompleteBackup(partSnapshot, { ...options, exportedAt }));
  }
  if (backups.length === 1) {
    const files = [backups[0]];
    ensureSetBounds(files);
    return files;
  }

  const setId = await calculateCompleteBackupChecksum(backups.map((backup) => backup.checksum.value));
  const files: CompleteBackupPart[] = [];
  for (const [index, backup] of backups.entries()) {
    const unsigned = { format: partFormat, schemaVersion: 1, setId, part: index + 1, parts: backups.length, backup } as const;
    files.push({ ...unsigned, checksum: { algorithm: "SHA-256", value: await calculateCompleteBackupChecksum(unsigned) } });
  }
  ensureSetBounds(files);
  return files;
}

export async function validateCompleteBackupSet(
  payloads: readonly unknown[],
  sourceSizes?: readonly number[]
): Promise<CompleteBackupSetValidation> {
  try {
    if (payloads.length === 0 || payloads.length > completeBackupSetLimits.maxParts) throw capacityError();
    if (sourceSizes !== undefined && (sourceSizes.length !== payloads.length || sourceSizes.some((size) =>
      !Number.isSafeInteger(size) || size < 0 || size > completeBackupLimits.maxFileBytes))) {
      throw new Error(`Complete backup must be ${completeBackupLimits.maxFileBytes} bytes or smaller.`);
    }
    if (sourceSizes !== undefined && sourceSizes.reduce((total, size) => total + size, 0) > completeBackupSetLimits.maxBytes) {
      throw capacityError();
    }
    const parts: CompleteBackupPart[] = [];
    const backups: CompleteBackupV1[] = [];
    const normalizedParts = new Map<CompleteBackupPart, CompleteBackupV1>();
    let sourceBytes = 0;
    for (const [index, payload] of payloads.entries()) {
      const bytes = sourceSizes?.[index] ?? new TextEncoder().encode(JSON.stringify(payload)).byteLength;
      sourceBytes += bytes;
      if (sourceBytes > completeBackupSetLimits.maxBytes) throw capacityError();
      const isPart = isRecord(payload) && payload.format === partFormat;
      if (payloads.length > 1 && !isPart) throw new Error("Select one complete backup, or every numbered part of one backup set.");
      const candidate = isPart ? payload.backup : payload;
      const validation = await validateCompleteBackupPayload(candidate, { sourceBytes: bytes });
      if (validation.status === "invalid") return validation;
      backups.push(validation.backup);
      if (isPart) {
        if (Object.keys(payload).sort().join(",") !== "backup,checksum,format,part,parts,schemaVersion,setId" ||
          payload.schemaVersion !== 1 || typeof payload.setId !== "string" || !/^[a-f0-9]{64}$/.test(payload.setId) ||
          !Number.isSafeInteger(payload.part) || !Number.isSafeInteger(payload.parts) ||
          (payload.part as number) < 1 || (payload.parts as number) < 2 ||
          (payload.part as number) > (payload.parts as number) || (payload.parts as number) > completeBackupSetLimits.maxParts ||
          !isRecord(payload.checksum) || payload.checksum.algorithm !== "SHA-256") {
          throw new Error("Backup part metadata is invalid.");
        }
        const { checksum, ...unsigned } = payload;
        if ((checksum as { value: unknown }).value !== await calculateCompleteBackupChecksum(unsigned)) {
          throw new Error("Backup part checksum does not match its contents.");
        }
        const part = payload as unknown as CompleteBackupPart;
        parts.push(part);
        normalizedParts.set(part, validation.backup);
      }
    }
    if (parts.length > 0) {
      parts.sort((first, second) => first.part - second.part);
      const first = parts[0];
      if (parts.length !== first.parts || parts.some((part, index) =>
        part.setId !== first.setId || part.parts !== first.parts || part.part !== index + 1 ||
        part.backup.exportedAt !== first.backup.exportedAt ||
        JSON.stringify(part.backup.selectedScopes) !== JSON.stringify(first.backup.selectedScopes) ||
        JSON.stringify(part.backup.sections.preferences) !== JSON.stringify(first.backup.sections.preferences))) {
        throw new Error("Select every numbered part from the same backup set exactly once.");
      }
      if (first.setId !== await calculateCompleteBackupChecksum(parts.map((part) => part.backup.checksum.value))) {
        throw new Error("Backup parts do not match their set identifier.");
      }
      backups.splice(0, backups.length, ...parts.map((part) => normalizedParts.get(part)!));
    }
    for (const storeName of appStoreNames) {
      const ids = new Set<string>();
      let recordsSinceYield = 0;
      for (const backup of backups) {
        const records = storeName === "question_packs" ? backup.sections.packs ?? [] : backup.sections.progress.stores[storeName];
        for (const record of records) {
          if (ids.has(record.id)) throw new Error(`Backup parts contain duplicate records in "${storeName}".`);
          ids.add(record.id);
          recordsSinceYield += 1;
          if (recordsSinceYield === 1_000) {
            recordsSinceYield = 0;
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }
      }
    }
    return { backups, files: parts.length > 0 ? parts : backups, sourceBytes, status: "valid" };
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : "Complete backup set is invalid."], status: "invalid" };
  }
}

function ensureSetBounds(files: CompleteBackupFile[]) {
  let bytes = 0;
  for (const file of files) {
    const fileBytes = new TextEncoder().encode(serializeCompleteBackupFile(file)).byteLength;
    if (fileBytes > completeBackupLimits.maxFileBytes) throw new Error("A backup record exceeds the 40 MiB file limit.");
    bytes += fileBytes;
  }
  if (files.length > completeBackupSetLimits.maxParts || bytes > completeBackupSetLimits.maxBytes) throw capacityError();
}

function capacityError(): Error {
  return new Error("Complete backups support up to 64 files and 128 MiB per set. Keep existing backups before removing any history or large installed packs.");
}

function emptySnapshot(): CompleteBackupSnapshot {
  return Object.fromEntries(appStoreNames.map((storeName: AppStoreName) => [storeName, []])) as unknown as CompleteBackupSnapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
