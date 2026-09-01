import {
  appStoreNames,
  appStoreIndexNames,
  type AppDatabaseSchema,
  type AppStorage,
  type AppStorageMutation,
  type AppStoragePage,
  type AppStoragePageOptions,
  type AppStorageSnapshot,
  type AppIndexedStoreName,
  type AppStoreIndexName,
  type AppStoreKey,
  type AppStoreName,
  type AppStoreValue,
} from "@/lib/storage/appStorageTypes";

export class MemoryAppStorage implements AppStorage {
  private readonly stores = new Map<AppStoreName, Map<IDBValidKey, AppDatabaseSchema[AppStoreName]>>();

  constructor(private readonly failMutationAt?: number) {
    for (const storeName of appStoreNames) {
      this.stores.set(storeName, new Map());
    }
  }

  async get<TStore extends AppStoreName>(
    storeName: TStore,
    key: AppStoreKey<TStore>
  ): Promise<AppStoreValue<TStore> | undefined> {
    const value = this.getStore(storeName).get(key);

    return value === undefined ? undefined : structuredClone(value);
  }

  async getAll<TStore extends AppStoreName>(storeName: TStore): Promise<AppStoreValue<TStore>[]> {
    return this.peekAll(storeName);
  }

  async scan<TStore extends AppStoreName>(
    storeName: TStore,
    visit: (value: AppStoreValue<TStore>) => void
  ): Promise<void> {
    for (const value of this.getStore(storeName).values()) visit(structuredClone(value));
  }

  async count<TStore extends AppStoreName>(storeName: TStore): Promise<number> {
    return this.getStore(storeName).size;
  }

  async getSnapshot<const TStores extends readonly AppStoreName[]>(
    storeNames: TStores
  ): Promise<AppStorageSnapshot<TStores>> {
    if (new Set(storeNames).size !== storeNames.length) {
      throw new Error("Storage snapshot store names must be unique.");
    }
    return Object.fromEntries(
      storeNames.map((storeName) => [storeName, this.peekAll(storeName)])
    ) as AppStorageSnapshot<TStores>;
  }

  async getPage<TStore extends AppIndexedStoreName>(
    storeName: TStore,
    indexName: AppStoreIndexName<TStore>,
    options: AppStoragePageOptions
  ): Promise<AppStoragePage<AppStoreValue<TStore>>> {
    if (!Number.isInteger(options.limit) || options.limit <= 0) {
      throw new Error("IndexedDB pages require a positive whole-number limit.");
    }

    const direction = options.direction ?? "next";
    const records = this.peekAll(storeName)
      .map((value) => ({ key: indexKey(storeName, indexName, value), value }))
      .sort((first, second) => compareKeys(first.key, second.key) * (direction === "prev" ? -1 : 1))
      .filter(({ key }) => options.afterKey === undefined || (
        direction === "prev"
          ? compareKeys(key, options.afterKey) < 0
          : compareKeys(key, options.afterKey) > 0
      ));
    const selected = records.slice(0, options.limit);

    return {
      ...(records.length > selected.length && selected.length > 0
        ? { continuationKey: structuredClone(selected[selected.length - 1].key) }
        : {}),
      values: selected.map(({ value }) => structuredClone(value))
    };
  }

  async put<TStore extends AppStoreName>(storeName: TStore, value: AppStoreValue<TStore>): Promise<void> {
    this.getStore(storeName).set(value.id, structuredClone(value));
  }

  async delete<TStore extends AppStoreName>(storeName: TStore, key: AppStoreKey<TStore>): Promise<void> {
    this.getStore(storeName).delete(key);
  }

  async clear<TStore extends AppStoreName>(storeName: TStore): Promise<void> {
    this.getStore(storeName).clear();
  }

  async mutate(operations: readonly AppStorageMutation[]): Promise<void> {
    const staged = new Map<AppStoreName, Map<IDBValidKey, AppDatabaseSchema[AppStoreName]>>();

    for (const storeName of new Set(operations.map((operation) => operation.storeName))) {
      staged.set(storeName, new Map(this.getStore(storeName)));
    }

    for (const [index, operation] of operations.entries()) {
      if (index === this.failMutationAt) {
        throw new Error(`Injected atomic mutation failure at operation ${index}.`);
      }

      const store = staged.get(operation.storeName);

      if (store === undefined) {
        throw new Error(`Unknown staged store "${operation.storeName}".`);
      }

      if (operation.type === "clear") {
        store.clear();
      } else if (operation.type === "delete") {
        store.delete(operation.key);
      } else {
        store.set(operation.value.id, structuredClone(operation.value));
      }
    }

    for (const [storeName, store] of staged) {
      this.stores.set(storeName, store);
    }
  }

  async clearAll(): Promise<void> {
    await this.mutate(appStoreNames.map((storeName) => ({ storeName, type: "clear" })));
  }

  close(): void {
    return undefined;
  }

  peekAll<TStore extends AppStoreName>(storeName: TStore): AppStoreValue<TStore>[] {
    return Array.from(this.getStore(storeName).values(), (value) => structuredClone(value));
  }

  private getStore<TStore extends AppStoreName>(storeName: TStore): Map<IDBValidKey, AppStoreValue<TStore>> {
    const store = this.stores.get(storeName);

    if (store === undefined) {
      throw new Error(`Unknown store "${storeName}".`);
    }

    return store as Map<IDBValidKey, AppStoreValue<TStore>>;
  }
}

function indexKey<TStore extends AppIndexedStoreName>(
  storeName: TStore,
  indexName: AppStoreIndexName<TStore>,
  value: AppStoreValue<TStore>
): IDBValidKey {
  if (storeName === "benchmark_results" && indexName === appStoreIndexNames.benchmark_results) {
    const result = value as AppStoreValue<"benchmark_results">;
    return [result.completedAt, result.id];
  }
  if (storeName === "question_packs" && indexName === appStoreIndexNames.question_packs) {
    const pack = value as AppStoreValue<"question_packs">;
    return [pack.importedAt, pack.id];
  }
  throw new Error(`Unknown index "${String(indexName)}" for store "${storeName}".`);
}

function compareKeys(first: IDBValidKey, second: IDBValidKey): number {
  if (Array.isArray(first) && Array.isArray(second)) {
    for (let index = 0; index < Math.min(first.length, second.length); index += 1) {
      const compared = compareKeys(first[index], second[index]);
      if (compared !== 0) return compared;
    }
    return first.length - second.length;
  }
  if (typeof first === "number" && typeof second === "number") return first - second;
  const firstText = String(first);
  const secondText = String(second);
  return firstText < secondText ? -1 : firstText > secondText ? 1 : 0;
}
