import { subscribeToLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import {
  appDatabaseName,
  appDatabaseVersion,
  appCoordinationStoreName,
  AppStorageConflictError,
  appStoreIndexNames,
  appStoreNames,
  type AppStorage,
  type AppStorageAtomicOptions,
  type AppStorageAtomicView,
  type AppStorageAtomicDecision,
  type AppStorageMutation,
  type AppStoragePage,
  type AppStoragePageOptions,
  type AppStorageReplacement,
  type AppStorageSnapshot,
  type AppIndexedStoreName,
  type AppStoreIndexName,
  type AppStoreKey,
  type AppStoreName,
  type AppStoreValue
} from "@/lib/storage/appStorageTypes";
import { createAtomicView, lifecycleMetadataKey, sessionRevisionKey } from "@/lib/storage/storageCoordination";
import { assertPersistableRecord } from "@/lib/validation/inputLimits";

// One document lifecycle, including adapters created later by an already-open form.
// A successful destructive action navigates through the existing invalidation shell.
const documentGenerations = new WeakMap<IDBFactory, Promise<number>>();

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
  private invalidated = false;
  private closedForWrites = false;
  private readonly writes = new Set<IDBTransaction>();
  private readonly unsubscribe: () => void;

  constructor(private readonly indexedDbFactory: IDBFactory) {
    this.unsubscribe = subscribeToLocalDataInvalidation(() => {
      this.invalidated = true;
      for (const transaction of this.writes) {
        try {
          transaction.abort();
        } catch {
          // Completed transactions cannot write again.
        }
      }
    });
  }

  getGeneration(): Promise<number> {
    let pending = documentGenerations.get(this.indexedDbFactory);
    if (pending === undefined) {
      pending = this.openDatabase().then((database) => new Promise<number>((resolve, reject) => {
        const transaction = database.transaction(appCoordinationStoreName, "readonly");
        const request = transaction.objectStore(appCoordinationStoreName).get(lifecycleMetadataKey);
        transaction.oncomplete = () => resolve(request.result?.generation ?? 0);
        transaction.onerror = () => reject(transaction.error ?? new Error("Unable to read local data generation."));
        transaction.onabort = () => reject(transaction.error ?? new Error("Generation read aborted."));
      }));
      documentGenerations.set(this.indexedDbFactory, pending);
      void pending.catch(() => {
        if (documentGenerations.get(this.indexedDbFactory) === pending) documentGenerations.delete(this.indexedDbFactory);
      });
    }
    return pending;
  }

  async getDrillSession(id: string) {
    await this.getGeneration();
    const database = await this.openDatabase();
    // Reads remain available to a stale page. Only an explicit recovery action may
    // carry this current token into a new write; the document default stays stale.
    return new Promise<{ session?: import("@/lib/storage/appStorageTypes").StoredDrillSession; token: import("@/lib/storage/appStorageTypes").DrillSessionWriteToken }>((resolve, reject) => {
      const transaction = database.transaction(["drill_sessions", appCoordinationStoreName], "readonly");
      const session = transaction.objectStore("drill_sessions").get(id);
      const metadata = transaction.objectStore(appCoordinationStoreName);
      const lifecycle = metadata.get(lifecycleMetadataKey);
      const revision = metadata.get(sessionRevisionKey(id));
      transaction.oncomplete = () => resolve({ session: session.result, token: {
        generation: lifecycle.result?.generation ?? 0, revision: revision.result?.revision ?? 0, exists: session.result !== undefined
      } });
      transaction.onerror = () => reject(transaction.error ?? new Error("Session read failed."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Session read aborted."));
    });
  }

  async get<TStore extends AppStoreName>(
    storeName: TStore,
    key: AppStoreKey<TStore>
  ): Promise<AppStoreValue<TStore> | undefined> {
    await this.getGeneration();
    return this.runStoreRequest(storeName, "readonly", (store) => store.get(key));
  }

  async getAll<TStore extends AppStoreName>(storeName: TStore): Promise<AppStoreValue<TStore>[]> {
    await this.getGeneration();
    return this.runStoreRequest(storeName, "readonly", (store) => store.getAll());
  }

  async scan<TStore extends AppStoreName>(
    storeName: TStore,
    visit: (value: AppStoreValue<TStore>) => void
  ): Promise<void> {
    await this.getGeneration();
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

    await this.getGeneration();
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

    await this.getGeneration();
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
    await this.mutate([{ storeName, type: "put", value } as AppStorageMutation]);
  }

  async delete<TStore extends AppStoreName>(storeName: TStore, key: AppStoreKey<TStore>): Promise<void> {
    await this.mutate([{ storeName, type: "delete", key } as AppStorageMutation]);
  }

  async clear<TStore extends AppStoreName>(storeName: TStore): Promise<void> {
    await this.mutate([{ storeName, type: "clear" }]);
  }

  async mutate(operations: readonly AppStorageMutation[], options: Pick<AppStorageAtomicOptions, "expectedGeneration" | "advanceGeneration"> = {}): Promise<void> {
    await this.atomic({ ...options, stores: [...new Set(operations.map(({ storeName }) => storeName))] }, () => ({ operations, result: undefined }));
  }

  async replaceSnapshot(snapshot: AppStorageReplacement, options: {
    preserve?: (current: AppStorageReplacement) => AppStorageReplacement;
    readStores?: readonly AppStoreName[];
  } = {}): Promise<void> {
    const storeNames = Object.keys(snapshot) as AppStoreName[];
    const readStores = options.readStores ?? [];
    await this.atomic({
      stores: storeNames, advanceGeneration: true,
      reads: Object.fromEntries(readStores.map((name) => [name, "all" as const]))
    }, (view) => {
      const current = Object.fromEntries(readStores.map((name) => [name, view.getAll(name)])) as AppStorageReplacement;
      const replacement = options.preserve?.(current) ?? snapshot;
      const operations: AppStorageMutation[] = [];
      for (const storeName of storeNames) {
        operations.push({ storeName, type: "clear" });
        for (const value of replacement[storeName] ?? []) operations.push({ storeName, type: "put", value } as AppStorageMutation);
      }
      return { operations, result: undefined };
    });
  }

  async clearAll(): Promise<void> {
    await this.mutate(appStoreNames.map((storeName) => ({ storeName, type: "clear" })), { advanceGeneration: true });
  }

  async atomic<TResult>(options: AppStorageAtomicOptions, decide: (view: AppStorageAtomicView) => AppStorageAtomicDecision<TResult>): Promise<TResult> {
    const database = await this.openDatabase();
    this.assertWritable();
    const expectedGeneration = options.expectedGeneration ?? await this.getGeneration();
    this.assertWritable();
    const reads = options.reads ?? {};
    const storeNames = [...new Set([...options.stores, ...Object.keys(reads) as AppStoreName[]])];
    return new Promise<TResult>((resolve, reject) => {
      const transaction = database.transaction([...storeNames, appCoordinationStoreName], "readwrite");
      this.trackWrite(transaction);
      const metadata = transaction.objectStore(appCoordinationStoreName);
      let result: TResult;
      let failure: unknown;
      const abort = (error: unknown) => { failure = error; try { transaction.abort(); } catch { reject(error); } };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(failure ?? transaction.error ?? new Error("IndexedDB mutation failed."));
      transaction.onabort = () => reject(failure ?? transaction.error ?? new Error("IndexedDB mutation was aborted."));
      const lifecycle = metadata.get(lifecycleMetadataKey);
      lifecycle.onsuccess = () => {
        try {
          const generation: number = lifecycle.result?.generation ?? 0;
          if (generation !== expectedGeneration) throw new AppStorageConflictError("generation");
          const records: AppStorageReplacement = {};
          const revisions = new Map<string, number>();
          let remaining = 1;
          const done = () => {
            remaining -= 1;
            if (remaining !== 0) return;
            try {
              const decision = decide(createAtomicView(records, reads, generation, revisions));
              if (typeof (decision as unknown as { then?: unknown }).then === "function") throw new Error("Atomic decisions must be synchronous.");
              for (const operation of decision.operations) if (operation.type === "put") assertPersistableRecord(operation.value);
              result = decision.result;
              const nextGeneration = generation + (options.advanceGeneration ? 1 : 0);
              let index = 0;
              const enqueue = () => {
                try {
                  let last: IDBRequest | undefined;
                  const end = Math.min(index + 250, decision.operations.length);
                  while (index < end) {
                    const operation = decision.operations[index++];
                    if (!options.stores.includes(operation.storeName)) throw new Error(`Atomic write store was not declared: ${operation.storeName}.`);
                    const store = transaction.objectStore(operation.storeName);
                    if (operation.type === "clear") {
                      last = store.clear();
                      if (operation.storeName === "drill_sessions") {
                        metadata.clear();
                        revisions.clear();
                        metadata.put({ id: lifecycleMetadataKey, generation: nextGeneration });
                      }
                    } else if (operation.type === "delete") {
                      last = store.delete(operation.key);
                      if (operation.storeName === "drill_sessions") metadata.delete(sessionRevisionKey(String(operation.key)));
                    } else {
                      last = store.put(operation.value);
                      if (operation.storeName === "drill_sessions") {
                        const id = operation.value.id;
                        const request = metadata.get(sessionRevisionKey(id));
                        request.onsuccess = () => {
                          const revision = (revisions.get(id) ?? request.result?.revision ?? 0) + 1;
                          revisions.set(id, revision);
                          metadata.put({ id: sessionRevisionKey(id), revision });
                        };
                      }
                    }
                  }
                  if (index < decision.operations.length && last !== undefined) last.onsuccess = enqueue;
                } catch (error) { abort(error); }
              };
              metadata.put({ id: lifecycleMetadataKey, generation: nextGeneration });
              enqueue();
            } catch (error) { abort(error); }
          };
          for (const storeName of Object.keys(reads) as AppStoreName[]) {
            const keys = reads[storeName]!;
            const values: unknown[] = [];
            (records as Record<string, unknown[]>)[storeName] = values;
            for (const key of keys === "all" ? [undefined] : keys) {
              remaining += 1;
              const request = key === undefined ? transaction.objectStore(storeName).getAll() : transaction.objectStore(storeName).get(key);
              request.onsuccess = () => {
                if (key === undefined) values.push(...request.result);
                else if (request.result !== undefined) values.push(request.result);
                done();
              };
            }
          }
          const sessionKeys = reads.drill_sessions;
          if (sessionKeys !== undefined) {
            remaining += 1;
            if (sessionKeys === "all") {
              const request = metadata.getAll();
              request.onsuccess = () => {
                for (const record of request.result) if (record.id.startsWith("session:")) revisions.set(record.id.slice(8), record.revision);
                done();
              };
            } else {
              for (const id of sessionKeys) {
                remaining += 1;
                const request = metadata.get(sessionRevisionKey(id));
                request.onsuccess = () => { revisions.set(id, request.result?.revision ?? 0); done(); };
              }
              done();
            }
          }
          done();
        } catch (error) { abort(error); }
      };
    });
  }

  close(): void {
    this.closedForWrites = true;
    this.unsubscribe();
    if (this.databasePromise === undefined) {
      return;
    }

    void this.databasePromise.then((database) => database.close(), () => undefined);
    this.databasePromise = undefined;
  }

  private async runStoreRequest<TStore extends AppStoreName, TResult>(
    storeName: TStore,
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<TResult>
  ): Promise<TResult> {
    const database = await this.openDatabase();
    if (mode === "readwrite") this.assertWritable();

    return new Promise<TResult>((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      if (mode === "readwrite") this.trackWrite(transaction);
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
    if (this.databasePromise === undefined) {
      const pending = openIndexedDbDatabase(this.indexedDbFactory, () => {
        if (this.databasePromise === pending) this.databasePromise = undefined;
      });
      this.databasePromise = pending;
      void pending.catch(() => {
        if (this.databasePromise === pending) this.databasePromise = undefined;
      });
    }

    return this.databasePromise;
  }

  private assertWritable(): void {
    if (this.invalidated) throw new Error("Local data changed. Reload before saving new work.");
    if (this.closedForWrites) throw new Error("Storage connection is closed. Open a new connection before saving.");
  }

  private trackWrite(transaction: IDBTransaction): void {
    this.writes.add(transaction);
    const remove = () => this.writes.delete(transaction);
    transaction.addEventListener("complete", remove, { once: true });
    transaction.addEventListener("abort", remove, { once: true });
  }
}

function openIndexedDbDatabase(indexedDbFactory: IDBFactory, onClosed: () => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDbFactory.open(appDatabaseName, appDatabaseVersion);
    let rejected = false;
    const fail = (error: Error | DOMException) => {
      rejected = true;
      reject(error);
    };

    request.onupgradeneeded = () => {
      upgradeDatabase(request.result, request.transaction);
    };
    request.onsuccess = () => {
      const database = request.result;

      if (rejected) {
        database.close();
        return;
      }

      database.onversionchange = () => {
        database.close();
        onClosed();
      };
      database.onclose = onClosed;
      resolve(database);
    };
    request.onerror = () => fail(request.error ?? new Error(`Unable to open IndexedDB database "${appDatabaseName}".`));
    request.onblocked = () => fail(new Error(`IndexedDB database "${appDatabaseName}" is blocked by another tab.`));
  });
}

function upgradeDatabase(database: IDBDatabase, transaction: IDBTransaction | null): void {
  if (!database.objectStoreNames.contains(appCoordinationStoreName)) {
    database.createObjectStore(appCoordinationStoreName, { keyPath: "id" }).put({ id: lifecycleMetadataKey, generation: 0 });
  }
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

  const drillSessionStore = transaction.objectStore("drill_sessions");
  if (!drillSessionStore.indexNames.contains(appStoreIndexNames.drill_sessions)) {
    drillSessionStore.createIndex(appStoreIndexNames.drill_sessions, ["updatedAt", "id"]);
  }

  const responseStore = transaction.objectStore("responses");
  if (!responseStore.indexNames.contains(appStoreIndexNames.responses)) {
    responseStore.createIndex(appStoreIndexNames.responses, ["submittedAt", "id"]);
  }

  const packStore = transaction.objectStore("question_packs");
  if (!packStore.indexNames.contains(appStoreIndexNames.question_packs)) {
    packStore.createIndex(appStoreIndexNames.question_packs, ["importedAt", "id"]);
  }
}
