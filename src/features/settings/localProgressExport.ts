import {
  appDatabaseName,
  progressStoreNames,
  type AppStorage,
  type AppStoreValue,
  type ProgressStoreName,
} from "@/lib/storage/appStorageTypes";

export const localProgressExportAppId = appDatabaseName;
export const localProgressExportSchemaVersion = 3;
export const localProgressExportStoreNames = progressStoreNames;

export type LocalProgressExportStores = {
  [TStore in ProgressStoreName]: AppStoreValue<TStore>[];
};

export interface LocalProgressExportV1 {
  app: typeof localProgressExportAppId;
  exportedAt: string;
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

export async function createLocalProgressExport(
  storage: AppStorage,
  exportedAt = new Date().toISOString()
): Promise<LocalProgressExportV1> {
  const stores = Object.fromEntries(
    await Promise.all(localProgressExportStoreNames.map(async (storeName) => [storeName, await storage.getAll(storeName)]))
  ) as unknown as LocalProgressExportStores;

  return {
    app: localProgressExportAppId,
    exportedAt,
    schemaVersion: localProgressExportSchemaVersion,
    stores
  };
}

export async function replaceLocalProgressWithImport(
  storage: AppStorage,
  exportData: LocalProgressExportV1
): Promise<void> {
  await Promise.all(localProgressExportStoreNames.map((storeName) => storage.clear(storeName)));

  for (const storeName of localProgressExportStoreNames) {
    for (const record of exportData.stores[storeName]) {
      await storage.put(storeName, record);
    }
  }
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
  return `math-drill-progress-${exportedAt.slice(0, 10)}.json`;
}

export function serializeLocalProgressExport(exported: LocalProgressExport): string {
  return `${JSON.stringify(exported, null, 2)}\n`;
}

export function validateLocalProgressImportPayload(payload: unknown): LocalProgressImportValidationResult {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return { errors: ["Import file must contain a JSON object."], status: "invalid" };
  }

  if (payload.app !== localProgressExportAppId) {
    errors.push("Import file was not created by this app.");
  }

  if (payload.schemaVersion !== localProgressExportSchemaVersion) {
    errors.push(`Import schema version must be ${localProgressExportSchemaVersion}.`);
  }

  if (typeof payload.exportedAt !== "string" || Number.isNaN(Date.parse(payload.exportedAt))) {
    errors.push("Import file must include a valid exportedAt timestamp.");
  }

  if (!isRecord(payload.stores)) {
    errors.push("Import file must include a stores object.");
  } else {
    for (const storeName of localProgressExportStoreNames) {
      const records = payload.stores[storeName];

      if (!Array.isArray(records)) {
        errors.push(`Store "${storeName}" must be an array.`);
        continue;
      }

      records.forEach((record, index) => {
        if (!isRecord(record)) {
          errors.push(`Store "${storeName}" record ${index + 1} must be an object.`);
        } else if (typeof record.id !== "string" || record.id.trim() === "") {
          errors.push(`Store "${storeName}" record ${index + 1} must include an id.`);
        }
      });
    }
  }

  if (errors.length > 0) {
    return { errors, status: "invalid" };
  }

  return { exportData: payload as unknown as LocalProgressExportV1, status: "valid" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
