import { describe, expect, it, vi } from "vitest";

import { publishLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

function openHarness() {
  const requests: IDBOpenDBRequest[] = [];
  const factory = {
    open: vi.fn(() => {
      const request = {} as IDBOpenDBRequest;
      requests.push(request);
      return request;
    })
  } as unknown as IDBFactory;
  return { factory, requests };
}

function databaseStub() {
  const database = {
    close: vi.fn(),
    transaction: vi.fn(() => {
      const transaction = {
        objectStore: () => ({
          count: () => {
            const request = { result: 0 } as IDBRequest<number>;
            queueMicrotask(() => {
              request.onsuccess?.call(request, new Event("success"));
              transaction.oncomplete?.(new Event("complete"));
            });
            return request;
          }
        }),
        oncomplete: undefined as ((event: Event) => void) | undefined
      };
      return transaction;
    })
  };
  return database as unknown as IDBDatabase;
}

function succeed(request: IDBOpenDBRequest, database: IDBDatabase) {
  Object.defineProperty(request, "result", { value: database });
  request.onsuccess?.call(request, new Event("success"));
}

describe("IndexedDB connection recovery", () => {
  it("recovers after an open rejection and safely closes the rejected handle", async () => {
    const { factory, requests } = openHarness();
    const storage = createIndexedDbAppStorage({ indexedDB: factory });
    const failed = storage.count("responses");
    const rejected = expect(failed).rejects.toThrow("Unable to open IndexedDB");
    requests[0].onerror?.call(requests[0], new Event("error"));
    storage.close();
    await rejected;
    const recovered = storage.count("responses");
    succeed(requests[1], databaseStub());
    await expect(recovered).resolves.toBe(0);
    storage.close();
  });

  it("reopens instead of reusing a connection closed by versionchange", async () => {
    const { factory, requests } = openHarness();
    const storage = createIndexedDbAppStorage({ indexedDB: factory });
    const first = storage.count("responses");
    const database = databaseStub();
    succeed(requests[0], database);
    await first;
    database.onversionchange?.call(database, new Event("versionchange") as IDBVersionChangeEvent);
    expect(database.close).toHaveBeenCalledOnce();
    const next = storage.count("responses");
    expect(requests).toHaveLength(2);
    succeed(requests[1], databaseStub());
    await expect(next).resolves.toBe(0);
    storage.close();
  });

  it("closes a blocked open request that succeeds after rejection", async () => {
    const { factory, requests } = openHarness();
    const storage = createIndexedDbAppStorage({ indexedDB: factory });
    const failed = storage.count("responses");
    const rejected = expect(failed).rejects.toThrow("blocked by another tab");
    requests[0].onblocked?.call(requests[0], new Event("blocked") as IDBVersionChangeEvent);
    await rejected;
    const database = databaseStub();
    succeed(requests[0], database);
    expect(database.close).toHaveBeenCalledOnce();
    storage.close();
  });

  it("rejects an old write resumed after local data was replaced", async () => {
    const { factory, requests } = openHarness();
    const storage = createIndexedDbAppStorage({ indexedDB: factory });
    const pending = storage.put("responses", { id: "old-response" } as never);
    const rejected = expect(pending).rejects.toThrow("Local data changed");
    publishLocalDataInvalidation("progress_replaced", { broadcastChannelFactory: null, fallbackStorage: null });
    const database = databaseStub();
    succeed(requests[0], database);
    await rejected;
    expect(database.transaction).not.toHaveBeenCalled();
    storage.close();
  });

  it("does not resurrect a pending write after its owning view closes the connection", async () => {
    const { factory, requests } = openHarness();
    const storage = createIndexedDbAppStorage({ indexedDB: factory });
    const pending = storage.put("responses", { id: "old-response" } as never);
    const rejected = expect(pending).rejects.toThrow("Storage connection is closed");
    storage.close();
    const database = databaseStub();
    succeed(requests[0], database);
    await rejected;
    expect(database.transaction).not.toHaveBeenCalled();
  });
});
