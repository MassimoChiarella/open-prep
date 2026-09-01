import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { validateLocalProgressImportPayload } from "../../features/settings/localProgressExport";
import {
  appDatabaseName,
  appDatabaseVersion,
  appStoreIndexNames,
  appStoreNames
} from "../../lib/storage/appStorageTypes";

type FixtureRecord = { id: string } & Record<string, unknown>;

interface HistoricalIndex {
  keyPath: string | string[];
  multiEntry: boolean;
  name: string;
  unique: boolean;
}

interface HistoricalStore {
  autoIncrement: boolean;
  indexes: HistoricalIndex[];
  keyPath: string;
  records: FixtureRecord[];
}

interface IndexedDbFixture {
  database: {
    name: string;
    stores: Record<string, HistoricalStore>;
    version: number;
  };
  fixtureFormat: "open-prep-indexeddb-fixture";
  fixtureFormatVersion: 1;
  sourceCommit: string;
}

interface StoreMetadata {
  autoIncrement: boolean;
  indexes: HistoricalIndex[];
  keyPath: string | string[] | null;
}

interface DatabaseSnapshot {
  indexOrder: Record<string, string[]>;
  records: Record<string, FixtureRecord[]>;
  storeMetadata: Record<string, StoreMetadata>;
  storeNames: string[];
  version: number;
}

const fixtureDirectory = resolve(process.cwd(), "src", "tests", "fixtures", "storage-history");
const indexedDbFixture = readJson<IndexedDbFixture>("indexeddb-v7.json");
const progressExportV3 = readJson<unknown>("progress-export-v3.json");
const progressExportV4 = readJson<unknown>("progress-export-v4.json");

const currentIndexes = [
  {
    keyPath: ["completedAt", "id"],
    name: appStoreIndexNames.benchmark_results,
    storeName: "benchmark_results"
  },
  {
    keyPath: ["importedAt", "id"],
    name: appStoreIndexNames.question_packs,
    storeName: "question_packs"
  }
] as const;

const supplementalRecords = {
  benchmark_results: [
    copyRecord("benchmark_results", "benchmark-order-a", { completedAt: "2026-08-30T12:00:00Z" }),
    copyRecord("benchmark_results", "benchmark-order-b", { completedAt: "2026-08-30T12:00:00Z" }),
    copyRecord("benchmark_results", "benchmark-order-c", { completedAt: "2026-08-31T12:00:00Z" })
  ],
  question_packs: [
    copyRecord("question_packs", "pack-order-a", { importedAt: "2026-08-30T12:00:00Z" }),
    copyRecord("question_packs", "pack-order-b", { importedAt: "2026-08-30T12:00:00Z" }),
    copyRecord("question_packs", "pack-order-c", { importedAt: "2026-08-31T12:00:00Z" })
  ]
} satisfies Record<string, FixtureRecord[]>;

test("@browser-smoke upgrades the authentic immediate-predecessor database without record loss", async ({ page }) => {
  expect(indexedDbFixture.fixtureFormat).toBe("open-prep-indexeddb-fixture");
  expect(indexedDbFixture.database.name).toBe(appDatabaseName);
  expect(indexedDbFixture.database.version).toBe(appDatabaseVersion - 1);
  expect(Object.keys(indexedDbFixture.database.stores).sort()).toEqual([...appStoreNames].sort());
  expect(Object.values(indexedDbFixture.database.stores).every((store) => store.indexes.length === 0)).toBe(true);

  await page.goto("/formulas");
  await deleteDatabase(page, appDatabaseName);
  await seedHistoricalDatabase(page, indexedDbFixture, supplementalRecords);

  await page.goto("/");
  await expect(page.getByTestId("dashboard-priority-panel")).toBeVisible();

  const migrated = await readDatabase(page);

  expect(migrated.version).toBe(appDatabaseVersion);
  expect(migrated.storeNames).toEqual([...appStoreNames].sort());
  expect(migrated.storeMetadata).toEqual(expectedStoreMetadata());

  for (const storeName of appStoreNames) {
    const expected = [
      ...indexedDbFixture.database.stores[storeName].records,
      ...(supplementalRecords[storeName as keyof typeof supplementalRecords] ?? [])
    ];
    expect(sortRecords(migrated.records[storeName]), `${storeName} records`).toEqual(sortRecords(expected));
  }

  expect(migrated.indexOrder.benchmark_results).toEqual([
    "benchmark-v7-001",
    "benchmark-order-a",
    "benchmark-order-b",
    "benchmark-order-c"
  ]);
  expect(migrated.indexOrder.question_packs).toEqual([
    "company-case-prep",
    "pack-order-a",
    "pack-order-b",
    "pack-order-c"
  ]);

  const session = findRecord(migrated, "drill_sessions", "session-v7-001");
  const responseIds = migrated.records.responses.map(({ id }) => id);
  const questionIds = session.questionIds as string[];

  for (const response of migrated.records.responses) {
    expect(response.sessionId).toBe(session.id);
    expect(questionIds).toContain(response.questionId);
  }
  expect(findRecord(migrated, "benchmark_results", "benchmark-v7-001").sessionId).toBe(session.id);
  const sourceResponseId = findRecord(migrated, "mistake_notebook", "mistake-v7-001").sourceResponseId;
  expect(typeof sourceResponseId).toBe("string");
  expect(responseIds).toContain(sourceResponseId);
  expect(findRecord(migrated, "mistake_notebook", "mistake-v7-001").sourceSessionId).toBe(session.id);
  expect(findRecord(migrated, "retry_schedules", "retry-v7-001").sourceId).toBe("mistake-v7-001");
});

test("a native aborted upgrade rolls back and can be reopened and upgraded cleanly", async ({ page }) => {
  await page.goto("/formulas");

  const result = await page.evaluate(async (databaseName) => {
    const deleteTestDatabase = () => new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error(`Deletion blocked for ${databaseName}.`));
    });
    const openDatabase = (version: number, upgrade: (request: IDBOpenDBRequest) => void) =>
      new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName, version);
        request.onupgradeneeded = () => upgrade(request);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error(`Open blocked for ${databaseName}.`));
      });
    const inspect = () => new Promise<{ indexes: string[]; records: FixtureRecord[]; version: number }>(
      (resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("records", "readonly");
          const store = transaction.objectStore("records");
          const recordsRequest = store.getAll();
          let records: FixtureRecord[] = [];

          recordsRequest.onsuccess = () => {
            records = recordsRequest.result as FixtureRecord[];
          };
          recordsRequest.onerror = () => reject(recordsRequest.error);
          transaction.oncomplete = () => {
            const result = {
              indexes: Array.from(store.indexNames),
              records,
              version: database.version
            };
            database.close();
            resolve(result);
          };
          transaction.onerror = () => {
            database.close();
            reject(transaction.error);
          };
        };
      }
    );

    await deleteTestDatabase();
    const initial = await openDatabase(1, (request) => {
      const store = request.result.createObjectStore("records", { keyPath: "id" });
      store.put({ createdAt: "2026-08-31T00:00:00Z", id: "retained-record" });
    });
    initial.close();

    const abortError = await new Promise<string>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onupgradeneeded = () => {
        const transaction = request.transaction;
        if (transaction === null) {
          reject(new Error("Upgrade transaction was unavailable."));
          return;
        }
        transaction.objectStore("records").createIndex("created_at_id", ["createdAt", "id"]);
        transaction.abort();
      };
      request.onerror = (event) => {
        event.preventDefault();
        resolve(request.error?.name ?? "UnknownError");
      };
      request.onsuccess = () => {
        request.result.close();
        reject(new Error("The intentionally aborted upgrade unexpectedly succeeded."));
      };
    });

    const afterAbort = await inspect();
    const upgraded = await openDatabase(2, (request) => {
      request.transaction?.objectStore("records").createIndex("created_at_id", ["createdAt", "id"]);
    });
    upgraded.close();
    const afterReopen = await inspect();
    await deleteTestDatabase();

    return { abortError, afterAbort, afterReopen };
  }, `${appDatabaseName}_phase_8_4_abort`);

  expect(result.abortError).toBe("AbortError");
  expect(result.afterAbort).toEqual({
    indexes: [],
    records: [{ createdAt: "2026-08-31T00:00:00Z", id: "retained-record" }],
    version: 1
  });
  expect(result.afterReopen).toEqual({
    indexes: ["created_at_id"],
    records: [{ createdAt: "2026-08-31T00:00:00Z", id: "retained-record" }],
    version: 2
  });
});

test("authentic supported progress exports pass the current import validator", () => {
  const legacy = validateLocalProgressImportPayload(progressExportV3);
  const current = validateLocalProgressImportPayload(progressExportV4);

  expect(legacy.status).toBe("valid");
  expect(current.status).toBe("valid");
  if (legacy.status === "valid") {
    expect(legacy.exportData).toMatchObject({ privacyScope: "complete", schemaVersion: 4 });
  }
  if (current.status === "valid") {
    expect(current.exportData).toMatchObject({ privacyScope: "standard", schemaVersion: 4 });
  }
});

function readJson<T>(fileName: string): T {
  return JSON.parse(readFileSync(resolve(fixtureDirectory, fileName), "utf8")) as T;
}

function copyRecord(storeName: string, id: string, changes: Record<string, unknown>): FixtureRecord {
  const source = indexedDbFixture.database.stores[storeName].records[0];
  if (source === undefined) throw new Error(`Fixture store ${storeName} has no representative record.`);
  return { ...source, ...changes, id };
}

function sortRecords(records: FixtureRecord[]): FixtureRecord[] {
  return [...records].sort((left, right) => left.id.localeCompare(right.id));
}

function findRecord(snapshot: DatabaseSnapshot, storeName: string, id: string): FixtureRecord {
  const record = snapshot.records[storeName].find((candidate) => candidate.id === id);
  if (record === undefined) throw new Error(`Missing ${storeName} record ${id}.`);
  return record;
}

function expectedStoreMetadata(): Record<string, StoreMetadata> {
  return Object.fromEntries(appStoreNames.map((storeName) => {
    const indexes = currentIndexes
      .filter((index) => index.storeName === storeName)
      .map(({ keyPath, name }) => ({ keyPath: [...keyPath], multiEntry: false, name, unique: false }));
    return [storeName, { autoIncrement: false, indexes, keyPath: "id" }];
  }));
}

async function deleteDatabase(page: Page, databaseName: string): Promise<void> {
  await page.evaluate((name) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Deletion blocked for ${name}.`));
  }), databaseName);
}

async function seedHistoricalDatabase(
  page: Page,
  fixture: IndexedDbFixture,
  extraRecords: Record<string, FixtureRecord[]>
): Promise<void> {
  await page.evaluate(({ extraRecords, fixture }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(fixture.database.name, fixture.database.version);

    request.onupgradeneeded = () => {
      for (const [storeName, definition] of Object.entries(fixture.database.stores)) {
        const store = request.result.createObjectStore(storeName, {
          autoIncrement: definition.autoIncrement,
          keyPath: definition.keyPath
        });
        for (const index of definition.indexes) {
          store.createIndex(index.name, index.keyPath, {
            multiEntry: index.multiEntry,
            unique: index.unique
          });
        }
        for (const record of [...definition.records, ...(extraRecords[storeName] ?? [])]) {
          store.put(record);
        }
      }
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Seeding blocked for ${fixture.database.name}.`));
  }), { extraRecords, fixture });
}

async function readDatabase(page: Page): Promise<DatabaseSnapshot> {
  return page.evaluate(({ databaseName, indexContracts, storeNames }) =>
    new Promise<DatabaseSnapshot>((resolve, reject) => {
      const request = indexedDB.open(databaseName);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(storeNames, "readonly");
        const indexOrder: Record<string, string[]> = {};
        const records: Record<string, FixtureRecord[]> = {};
        const storeMetadata: Record<string, StoreMetadata> = {};

        for (const storeName of storeNames) {
          const store = transaction.objectStore(storeName);
          storeMetadata[storeName] = {
            autoIncrement: store.autoIncrement,
            indexes: Array.from(store.indexNames).map((name) => {
              const index = store.index(name);
              return {
                keyPath: Array.isArray(index.keyPath) ? [...index.keyPath] : index.keyPath,
                multiEntry: index.multiEntry,
                name: index.name,
                unique: index.unique
              };
            }),
            keyPath: Array.isArray(store.keyPath) ? [...store.keyPath] : store.keyPath
          };

          const allRequest = store.getAll();
          allRequest.onsuccess = () => {
            records[storeName] = allRequest.result as FixtureRecord[];
          };
          allRequest.onerror = () => reject(allRequest.error);
        }

        for (const contract of indexContracts) {
          const orderedIds: string[] = [];
          indexOrder[contract.storeName] = orderedIds;
          const cursorRequest = transaction
            .objectStore(contract.storeName)
            .index(contract.name)
            .openCursor();
          cursorRequest.onerror = () => reject(cursorRequest.error);
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor === null) return;
            orderedIds.push((cursor.value as FixtureRecord).id);
            cursor.continue();
          };
        }

        transaction.oncomplete = () => {
          const snapshot = {
            indexOrder,
            records,
            storeMetadata,
            storeNames: Array.from(database.objectStoreNames),
            version: database.version
          };
          database.close();
          resolve(snapshot);
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error ?? new Error("Migration inspection transaction aborted."));
        };
      };
    }), {
    databaseName: appDatabaseName,
    indexContracts: currentIndexes,
    storeNames: appStoreNames
  });
}
