import {
  appStoreNames,
  type AppDatabaseSchema,
  type AppStorage,
  type AppStoreKey,
  type AppStoreName,
  type AppStoreValue,
} from "@/lib/storage/appStorageTypes";

export class MemoryAppStorage implements AppStorage {
  private readonly stores = new Map<AppStoreName, Map<IDBValidKey, AppDatabaseSchema[AppStoreName]>>();

  constructor() {
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

  async put<TStore extends AppStoreName>(storeName: TStore, value: AppStoreValue<TStore>): Promise<void> {
    this.getStore(storeName).set(value.id, structuredClone(value));
  }

  async delete<TStore extends AppStoreName>(storeName: TStore, key: AppStoreKey<TStore>): Promise<void> {
    this.getStore(storeName).delete(key);
  }

  async clear<TStore extends AppStoreName>(storeName: TStore): Promise<void> {
    this.getStore(storeName).clear();
  }

  async clearAll(): Promise<void> {
    for (const store of this.stores.values()) {
      store.clear();
    }
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
