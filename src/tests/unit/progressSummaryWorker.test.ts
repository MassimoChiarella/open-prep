import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import "@/features/progress/progressSummary.worker";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const { createStorage } = vi.hoisted(() => ({ createStorage: vi.fn() }));
vi.mock("@/lib/storage/indexedDbAppStorage", () => ({ createIndexedDbAppStorage: createStorage }));

describe("progress worker entry", () => {
  afterEach(() => { vi.restoreAllMocks(); });
  afterAll(() => { self.onmessage = null; });

  it("returns only the summary and lifecycle generation, and closes storage", async () => {
    const storage = new MemoryAppStorage();
    createStorage.mockReturnValue(storage);
    const close = vi.spyOn(storage, "close");
    const post = vi.spyOn(self, "postMessage").mockImplementation(() => {});
    await self.onmessage?.(new MessageEvent("message", { data: { timeZone: "UTC" } }));
    expect(post).toHaveBeenCalledWith({ status: "loaded", generation: 0, summary: expect.objectContaining({ isEmpty: true }) });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("reports unavailable IndexedDB rather than leaving the caller pending", async () => {
    createStorage.mockImplementationOnce(() => { throw new Error("IndexedDB unavailable"); });
    const post = vi.spyOn(self, "postMessage").mockImplementation(() => {});
    await self.onmessage?.(new MessageEvent("message", { data: {} }));
    expect(post).toHaveBeenCalledWith({ status: "error" });
  });
});
