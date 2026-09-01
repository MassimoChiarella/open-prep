import { describe, expect, it, vi } from "vitest";

import { clearAllSavedAppData, previewAllSavedAppData } from "@/features/settings/localDataClear";
import { localPreferenceKeys } from "@/features/settings/localDataInventory";
import { appStoreNames, type AppStoreName } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("clear all saved app data", () => {
  it("previews every affected data category from one storage snapshot", async () => {
    const storage = new MemoryAppStorage();
    const preferences = new TestPreferenceStorage();
    await seedEveryStore(storage);
    await storage.put("practice_records", {
      id: "fit-story-2",
      kind: "fit_story"
    } as never);
    await storage.put("practice_records", {
      id: "prep-profile-2",
      kind: "prep_profile"
    } as never);
    await storage.put("market_sizing_attempts", {
      id: "market-note-2",
      note: "Private note"
    } as never);
    preferences.setItem(localPreferenceKeys[0], "fr");
    preferences.setItem(localPreferenceKeys[2], "untimed");

    await expect(previewAllSavedAppData(storage, { preferenceStorage: preferences })).resolves.toEqual({
      indexedDbRecords: appStoreNames.length + 3,
      installedPacks: 1,
      personalItems: 3,
      preferenceCount: 2,
      preferencesAvailable: true
    });
  });

  it("atomically clears every store, then every preference, and publishes success", async () => {
    const storage = new MemoryAppStorage();
    const preferences = new TestPreferenceStorage();
    const publishInvalidation = vi.fn(() => "broadcast_channel" as const);
    await seedEveryStore(storage);
    for (const key of localPreferenceKeys) preferences.setItem(key, `value:${key}`);

    const result = await clearAllSavedAppData(storage, {
      preferenceStorage: preferences,
      publishInvalidation
    });

    for (const storeName of appStoreNames) expect(await storage.count(storeName)).toBe(0);
    for (const key of localPreferenceKeys) expect(preferences.getItem(key)).toBeNull();
    expect(preferences.removalAttempts).toEqual(localPreferenceKeys);
    expect(publishInvalidation).toHaveBeenCalledOnce();
    expect(publishInvalidation).toHaveBeenCalledWith("all_data_cleared");
    expect(result).toEqual({
      database: "cleared",
      invalidation: { delivery: "broadcast_channel", status: "published" },
      preferences: { failedKeys: [], status: "cleared" },
      status: "complete"
    });
  });

  it("leaves all stores and preferences untouched when the atomic database clear fails", async () => {
    const storage = new MemoryAppStorage(1);
    const preferences = new TestPreferenceStorage();
    const publishInvalidation = vi.fn(() => "broadcast_channel" as const);
    await seedEveryStore(storage);
    for (const key of localPreferenceKeys) preferences.setItem(key, `value:${key}`);

    await expect(clearAllSavedAppData(storage, {
      preferenceStorage: preferences,
      publishInvalidation
    })).rejects.toThrow("Injected atomic mutation failure at operation 1.");

    for (const storeName of appStoreNames) expect(await storage.count(storeName)).toBe(1);
    for (const key of localPreferenceKeys) {
      expect(preferences.getItem(key)).toBe(`value:${key}`);
    }
    expect(preferences.removalAttempts).toEqual([]);
    expect(publishInvalidation).not.toHaveBeenCalled();
  });

  it("reports every failed preference removal and does not publish partial success", async () => {
    const storage = new MemoryAppStorage();
    const failedKey = localPreferenceKeys[1];
    const preferences = new TestPreferenceStorage(new Set([failedKey]));
    const publishInvalidation = vi.fn(() => "storage" as const);
    await seedEveryStore(storage);
    for (const key of localPreferenceKeys) preferences.setItem(key, `value:${key}`);

    const result = await clearAllSavedAppData(storage, {
      preferenceStorage: preferences,
      publishInvalidation
    });

    for (const storeName of appStoreNames) expect(await storage.count(storeName)).toBe(0);
    expect(preferences.removalAttempts).toEqual(localPreferenceKeys);
    expect(preferences.getItem(failedKey)).toBe(`value:${failedKey}`);
    expect(preferences.getItem(localPreferenceKeys[0])).toBeNull();
    expect(preferences.getItem(localPreferenceKeys[2])).toBeNull();
    expect(publishInvalidation).not.toHaveBeenCalled();
    expect(result).toEqual({
      database: "cleared",
      invalidation: { status: "not_published" },
      preferences: { failedKeys: [failedKey], status: "partial" },
      status: "partial"
    });
  });

  it("reports an unavailable or failed invalidation without claiming complete success", async () => {
    const unavailableStorage = new MemoryAppStorage();
    const failedStorage = new MemoryAppStorage();
    const preferences = new TestPreferenceStorage();

    await expect(clearAllSavedAppData(unavailableStorage, {
      preferenceStorage: preferences,
      publishInvalidation: () => "unavailable"
    })).resolves.toMatchObject({
      invalidation: { delivery: "unavailable", status: "unavailable" },
      status: "partial"
    });
    await expect(clearAllSavedAppData(failedStorage, {
      preferenceStorage: preferences,
      publishInvalidation: () => {
        throw new Error("Injected publish failure.");
      }
    })).resolves.toMatchObject({
      invalidation: { status: "failed" },
      status: "partial"
    });
  });

  it("never accesses the network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await clearAllSavedAppData(new MemoryAppStorage(), {
      preferenceStorage: new TestPreferenceStorage(),
      publishInvalidation: () => "storage"
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

async function seedEveryStore(storage: MemoryAppStorage): Promise<void> {
  for (const storeName of appStoreNames) {
    await seedStore(storage, storeName);
  }
}

async function seedStore(storage: MemoryAppStorage, storeName: AppStoreName): Promise<void> {
  await storage.put(storeName, { id: `record:${storeName}` } as never);
}

class TestPreferenceStorage {
  readonly removalAttempts: string[] = [];
  private readonly values = new Map<string, string>();

  constructor(private readonly failingKeys = new Set<string>()) {}

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.removalAttempts.push(key);
    if (this.failingKeys.has(key)) throw new Error(`Injected removal failure for ${key}.`);
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
