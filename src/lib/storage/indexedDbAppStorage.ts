import {
  appDatabaseName,
  appDatabaseVersion,
  appStoreNames,
  type AppStorage,
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

  async put<TStore extends AppStoreName>(storeName: TStore, value: AppStoreValue<TStore>): Promise<void> {
    await this.runStoreRequest(storeName, "readwrite", (store) => store.put(value));
  }

  async delete<TStore extends AppStoreName>(storeName: TStore, key: AppStoreKey<TStore>): Promise<void> {
    await this.runStoreRequest(storeName, "readwrite", (store) => store.delete(key));
  }

  async clear<TStore extends AppStoreName>(storeName: TStore): Promise<void> {
    await this.runStoreRequest(storeName, "readwrite", (store) => store.clear());
  }

  async clearAll(): Promise<void> {
    const database = await this.openDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(appStoreNames, "readwrite");

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Unable to clear local data."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Unable to clear local data."));

      for (const storeName of appStoreNames) {
        transaction.objectStore(storeName).clear();
      }
    });
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
      upgradeDatabase(request.result);
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

function upgradeDatabase(database: IDBDatabase): void {
  if (database.objectStoreNames.contains("drill_presets")) {
    database.deleteObjectStore("drill_presets");
  }

  for (const storeName of appStoreNames) {
    if (!database.objectStoreNames.contains(storeName)) {
      database.createObjectStore(storeName, { keyPath: "id" });
    }
  }
}
