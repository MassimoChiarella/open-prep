import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prepareLocalDataInventory } from "@/features/settings/localDataInventoryPreparation";
import { readLocalDataRecordInventory } from "@/features/settings/localDataRecordInventory";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

vi.mock("@/lib/storage/indexedDbAppStorage", () => ({ createIndexedDbAppStorage: vi.fn() }));

const emptyInventory = () => ({ indexedDbRecords: 0, installedPacks: 0, personal: { fitStories: 0, fullCaseDrafts: 0, marketSizingNotes: 0, preparationProfiles: 0, totalItems: 0 } });

describe("local data inventory preparation", () => {
  let storage: MemoryAppStorage;
  beforeEach(() => {
    storage = new MemoryAppStorage();
    vi.mocked(createIndexedDbAppStorage).mockReturnValue(storage);
    MockWorker.instances = [];
    vi.stubGlobal("Worker", MockWorker);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("counts ordinary stores natively and scans only private-bearing stores once", async () => {
    await storage.put("practice_records", { id: "story", kind: "fit_story" } as never);
    await storage.put("market_sizing_attempts", { id: "note", note: "Private note" } as never);
    await storage.put("question_packs", { id: "pack" } as never);
    const snapshot = vi.spyOn(storage, "getSnapshot");
    const scan = vi.spyOn(storage, "scan");
    expect(await readLocalDataRecordInventory(storage)).toEqual({
      indexedDbRecords: 3, installedPacks: 1, personal: { fitStories: 1, fullCaseDrafts: 0, marketSizingNotes: 1, preparationProfiles: 0, totalItems: 2 }
    });
    expect(snapshot).not.toHaveBeenCalled();
    expect(scan.mock.calls.map(([store]) => store)).toEqual(["practice_records", "market_sizing_attempts"]);
  });

  it("sends only the lifecycle generation to the worker and accepts compact counts", async () => {
    const snapshot = vi.spyOn(storage, "getSnapshot");
    const pending = prepareLocalDataInventory(createIndexedDbAppStorage, new AbortController().signal);
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const worker = MockWorker.instances[0];
    expect(worker.request).toEqual({ id: 0, operation: "inventory", expectedGeneration: 0 });
    const inventory = emptyInventory();
    worker.dispatchEvent(new MessageEvent("message", { data: { id: 0, result: inventory } }));
    await expect(pending).resolves.toBe(inventory);
    expect(snapshot).not.toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("terminates canceled workers and ignores late deliveries", async () => {
    const controller = new AbortController();
    const pending = prepareLocalDataInventory(createIndexedDbAppStorage, controller.signal);
    const rejection = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    controller.abort();
    await rejection;
    const worker = MockWorker.instances[0];
    expect(worker.terminate).toHaveBeenCalledOnce();
    worker.dispatchEvent(new MessageEvent("message", { data: { id: 0, result: emptyInventory() } }));
  });

  it("rejects inventory prepared across a reset instead of presenting stale counts", async () => {
    const pending = prepareLocalDataInventory(createIndexedDbAppStorage, new AbortController().signal);
    const rejection = expect(pending).rejects.toMatchObject({ reason: "generation" });
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    await storage.mutate([], { advanceGeneration: true });
    MockWorker.instances[0].dispatchEvent(new MessageEvent("message", { data: { id: 0, result: emptyInventory() } }));
    await rejection;
    expect(MockWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });

  it("reports worker errors without cloning history back onto the UI thread", async () => {
    const scan = vi.spyOn(storage, "scan");
    const pending = prepareLocalDataInventory(createIndexedDbAppStorage, new AbortController().signal);
    const rejection = expect(pending).rejects.toThrow("Local data inventory could not be read.");
    await vi.waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    MockWorker.instances[0].dispatchEvent(new Event("error"));
    await rejection;
    expect(scan).not.toHaveBeenCalled();
    expect(MockWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });

  it("supports injected adapters and unavailable Workers through bounded scans", async () => {
    vi.stubGlobal("Worker", undefined);
    await expect(prepareLocalDataInventory(createIndexedDbAppStorage, new AbortController().signal)).resolves.toEqual(emptyInventory());
    expect(MockWorker.instances).toHaveLength(0);
  });
});

class MockWorker extends EventTarget {
  static instances: MockWorker[] = [];
  request?: unknown;
  terminate = vi.fn();
  constructor() { super(); MockWorker.instances.push(this); }
  postMessage(value: unknown) { this.request = value; }
}
