import {
  appDatabaseName,
  appDatabaseVersion,
  appStoreIndexNames,
  appStoreNames,
  type AppStorage,
  type AppStorageMutation,
  type AppStoragePage,
  type AppStoragePageOptions,
  type AppStorageSnapshot,
  type AppIndexedStoreName,
  type AppStoreIndexName,
  type AppStoreKey,
  type AppStoreName,
  type AppStoreValue
} from "@/lib/storage/appStorageTypes";

export interface IndexedDbAppStorageOptions {
  indexedDB?: IDBFactory | null;
}

export function createIndexedDbAppStorage(options: IndexedDbAppStorageOptions = {}): AppStorage {
  const indexedDbFactory = options.indexedDB === null ? undefined : options.indexedDB ?? globalThis.indexedDB;

  if (indexedDbFactory === undefined) {
    throw new Error("IndexedDB is not available in this environment.");
  }

  return new IndexedDbAppStorage(indexedDbFactory);
}

class IndexedDbAppStorage implements AppStorage {
  private databasePromise: Promise<IDBDatabase> | undefined;

  constructor(private readonly indexedDbFactory: IDBFactory) {}

  async get<TStore extends AppStoreName>(
    storeName: TStore,
    key: AppStoreKey<TStore>
  ): Promise<AppStoreValue<TStore> | undefined> {
    return this.runStoreRequest(storeName, "readonly", (store) => store.get(key));
  }

  async getAll<TStore extends AppStoreName>(storeName: TStore): Promise<AppStoreValue<TStore>[]> {
    return this.runStoreRequest(storeName, "readonly", (store) => store.getAll());
  }

  async scan<TStore extends AppStoreName>(
    storeName: TStore,
    visit: (value: AppStoreValue<TStore>) => void
  ): Promise<void> {
    const database = await this.openDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).openCursor();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error(`IndexedDB scan failed: ${storeName}.`));
      transaction.onabort = () => reject(transaction.error ?? new Error(`IndexedDB scan failed: ${storeName}.`));
      request.onerror = () => reject(request.error ?? new Error(`IndexedDB scan request failed: ${storeName}.`));
      request.onsuccess = () => {
        const cursor = request.result;

        if (cursor === null) return;

        try {
          visit(cursor.value as AppStoreValue<TStore>);
          cursor.continue();
        } catch (error) {
          transaction.abort();
          reject(error);
        }
      };
    });
  }

  async count<TStore extends AppStoreName>(storeName: TStore): Promise<number> {
    return this.runStoreRequest(storeName, "readonly", (store) => store.count());
  }

  async getSnapshot<const TStores extends readonly AppStoreName[]>(
    storeNames: TStores
  ): Promise<AppStorageSnapshot<TStores>> {
    const uniqueStoreNames = [...new Set(storeNames)];
    if (uniqueStoreNames.length !== storeNames.length) {
      throw new Error("IndexedDB snapshot store names must be unique.");
    }
    if (uniqueStoreNames.length === 0) return {} as AppStorageSnapshot<TStores>;

    const database = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(uniqueStoreNames, "readonly");
      const snapshot: Partial<Record<AppStoreName, unknown[]>> = {};

      transaction.oncomplete = () => resolve(snapshot as AppStorageSnapshot<TStores>);
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB snapshot failed."));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB snapshot was aborted."));

      for (const storeName of uniqueStoreNames) {
        const request = transaction.objectStore(storeName).getAll();
        request.onsuccess = () => {
          snapshot[storeName] = request.result;
        };
        request.onerror = () => reject(request.error ?? new Error(`IndexedDB snapshot request failed: ${storeName}.`));
      }
    });
  }

  async getPage<TStore extends AppIndexedStoreName>(
    storeName: TStore,
    indexName: AppStoreIndexName<TStore>,
    options: AppStoragePageOptions
  ): Promise<AppStoragePage<AppStoreValue<TStore>>> {
    if (!Number.isInteger(options.limit) || options.limit <= 0) {
      throw new Error("IndexedDB pages require a positive whole-number limit.");
    }

    const database = await this.openDatabase();
    const direction = options.direction ?? "next";

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const values: AppStoreValue<TStore>[] = [];
      let continuationKey: IDBValidKey | undefined;
      let hasMore = false;

      transaction.oncomplete = () => resolve({
        ...(hasMore && continuationKey !== undefined ? { continuationKey } : {}),
        values
      });
      transaction.onerror = () => reject(transaction.error ?? new Error(`IndexedDB page failed: ${storeName}.`));
      transaction.onabort = () => reject(transaction.error ?? new Error(`IndexedDB page failed: ${storeName}.`));

      try {
        const range = options.afterKey === undefined
          ? undefined
          : direction === "prev"
            ? IDBKeyRange.upperBound(options.afterKey, true)
            : IDBKeyRange.lowerBound(options.afterKey, true);
        const request = transaction.objectStore(storeName).index(indexName).openCursor(range, direction);

        request.onerror = () => reject(request.error ?? new Error(`IndexedDB page request failed: ${storeName}.`));
        request.onsuccess = () => {
          const cursor = request.result;

          if (cursor === null) {
            return;
          }
          if (values.length === options.limit) {
            hasMore = true;
            return;
          }

          values.push(cursor.value as AppStoreValue<TStore>);
          continuationKey = cursor.key;
          cursor.continue();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async put<TStore extends AppStoreName>(storeName: TStore, value: AppStoreValue<TStore>): Promise<void> {
    await this.runStoreRequest(storeName, "readwrite", (store) => store.put(value));
  }

  async delete<TStore extends AppStoreName>(storeName: TStore, key: AppStoreKey<TStore>): Promise<void> {
    await this.runStoreRequest(storeName, "readwrite", (store) => store.delete(key));
  }

  async clear<TStore extends AppStoreName>(storeName: TStore): Promise<void> {
    await this.runStoreRequest(storeName, "readwrite", (store) => store.clear());
  }

  async mutate(operations: readonly AppStorageMutation[]): Promise<void> {
    if (operations.length === 0) {
      return;
    }

    const database = await this.openDatabase();
    const storeNames = [...new Set(operations.map((operation) => operation.storeName))];

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeNames, "readwrite");

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB mutation failed."));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB mutation was aborted."));

      try {
        for (const operation of operations) {
          const store = transaction.objectStore(operation.storeName);

          if (operation.type === "clear") {
            store.clear();
          } else if (operation.type === "delete") {
            store.delete(operation.key);
          } else {
            store.put(operation.value);
          }
        }
      } catch (error) {
        try {
          transaction.abort();
        } catch {
          // The transaction may already have aborted because of the synchronous request failure.
        }
        reject(error);
      }
    });
  }

  async clearAll(): Promise<void> {
    await this.mutate(appStoreNames.map((storeName) => ({ storeName, type: "clear" })));
  }

  close(): void {
    if (this.databasePromise === undefined) {
      return;
    }

    void this.databasePromise.then((database) => database.close());
    this.databasePromise = undefined;
  }

  private async runStoreRequest<TStore extends AppStoreName, TResult>(
    storeName: TStore,
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<TResult>
  ): Promise<TResult> {
    const database = await this.openDatabase();

    return new Promise<TResult>((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      let result: TResult;

      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error ?? new Error(`IndexedDB transaction failed: ${storeName}.`));
      transaction.onabort = () => reject(transaction.error ?? new Error(`IndexedDB transaction failed: ${storeName}.`));

      try {
        const request = action(transaction.objectStore(storeName));

        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () => {
          reject(request.error ?? new Error(`IndexedDB request failed: ${storeName}.`));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private openDatabase(): Promise<IDBDatabase> {
    this.databasePromise ??= openIndexedDbDatabase(this.indexedDbFactory);

    return this.databasePromise;
  }
}

function openIndexedDbDatabase(indexedDbFactory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDbFactory.open(appDatabaseName, appDatabaseVersion);

    request.onupgradeneeded = () => {
      upgradeDatabase(request.result, request.transaction);
    };
    request.onsuccess = () => {
      const database = request.result;

      database.onversionchange = () => {
        database.close();
      };
      resolve(database);
    };
    request.onerror = () => reject(request.error ?? new Error(`Unable to open IndexedDB database "${appDatabaseName}".`));
    request.onblocked = () => reject(new Error(`IndexedDB database "${appDatabaseName}" is blocked by another tab.`));
  });
}

function upgradeDatabase(database: IDBDatabase, transaction: IDBTransaction | null): void {
  if (database.objectStoreNames.contains("drill_presets")) {
    database.deleteObjectStore("drill_presets");
  }

  for (const storeName of appStoreNames) {
    if (!database.objectStoreNames.contains(storeName)) {
      database.createObjectStore(storeName, { keyPath: "id" });
    }
  }

  if (transaction === null) {
    throw new Error("IndexedDB upgrade transaction is unavailable.");
  }

  const benchmarkStore = transaction.objectStore("benchmark_results");
  if (!benchmarkStore.indexNames.contains(appStoreIndexNames.benchmark_results)) {
    benchmarkStore.createIndex(appStoreIndexNames.benchmark_results, ["completedAt", "id"]);
  }

  const packStore = transaction.objectStore("question_packs");
  if (!packStore.indexNames.contains(appStoreIndexNames.question_packs)) {
    packStore.createIndex(appStoreIndexNames.question_packs, ["importedAt", "id"]);
  }
}
