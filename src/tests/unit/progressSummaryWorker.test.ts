import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import "@/features/progress/progressSummary.worker";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";
import { completedSession } from "@/tests/fixtures/completedSession";
import { persistCompletedDrillSession } from "@/features/drills/drillPersistence";

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

  it("routes saved-session requests to compact session display data and closes storage", async () => {
    const storage = new MemoryAppStorage();
    createStorage.mockReturnValue(storage);
    const close = vi.spyOn(storage, "close");
    const post = vi.spyOn(self, "postMessage").mockImplementation(() => {});
    await self.onmessage?.(new MessageEvent("message", { data: { operation: "stored_session", sessionId: "missing" } }));
    expect(post).toHaveBeenCalledWith({ status: "loaded", generation: 0, detail: { newBestLabels: [] } });
    expect(close).toHaveBeenCalledOnce();
  });

  it("posts the bounded session before lifetime reads finish, and retains the final complete response", async () => {
    const storage = new MemoryAppStorage();
    const completed = completedSession("worker-stream");
    await persistCompletedDrillSession({ ...completed, storage });
    createStorage.mockReturnValue(storage);
    const close = vi.spyOn(storage, "close");
    let release!: () => void;
    const history = new Promise<[]>((resolve) => { release = () => resolve([]); });
    vi.spyOn(storage, "getAll").mockReturnValueOnce(history);
    let received!: () => void;
    const snapshotReceived = new Promise<void>((resolve) => { received = resolve; });
    const post = vi.spyOn(self, "postMessage").mockImplementation((message) => { if (message.status === "snapshot") received(); });
    const pending = self.onmessage?.(new MessageEvent("message", { data: { operation: "stored_session", sessionId: completed.session.id } }));
    await snapshotReceived;
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith({ status: "snapshot", generation: 0, snapshot: expect.objectContaining({ id: completed.session.id }) });
    expect(close).not.toHaveBeenCalled();
    release();
    await pending;
    expect(post).toHaveBeenLastCalledWith({ status: "loaded", generation: 0, detail: expect.objectContaining({ snapshot: expect.objectContaining({ id: completed.session.id }) }) });
    expect(close).toHaveBeenCalledOnce();
  });
});
