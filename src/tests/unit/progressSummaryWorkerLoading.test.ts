import { afterAll, afterEach, expect, it, vi } from "vitest";

import "@/features/progress/progressSummary.worker";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const { createStorage, loadSessionModule } = vi.hoisted(() => ({ createStorage: vi.fn(), loadSessionModule: vi.fn() }));
vi.mock("@/lib/storage/indexedDbAppStorage", () => ({ createIndexedDbAppStorage: createStorage }));
vi.mock("@/features/drills/storedSessionSummary", () => {
  loadSessionModule();
  throw new Error("Saved-session module unavailable.");
});

afterEach(() => { vi.restoreAllMocks(); });
afterAll(() => { self.onmessage = null; });

it("loads Dashboard progress without saved-session code and handles a failed optional module load", async () => {
  const progressStorage = new MemoryAppStorage();
  createStorage.mockReturnValueOnce(progressStorage);
  const closeProgress = vi.spyOn(progressStorage, "close");
  const post = vi.spyOn(self, "postMessage").mockImplementation(() => {});
  await self.onmessage?.(new MessageEvent("message", { data: { timeZone: "UTC" } }));
  expect(post).toHaveBeenLastCalledWith({ status: "loaded", generation: 0, summary: expect.objectContaining({ isEmpty: true }) });
  expect(loadSessionModule).not.toHaveBeenCalled();
  expect(closeProgress).toHaveBeenCalledOnce();

  const sessionStorage = new MemoryAppStorage();
  createStorage.mockReturnValueOnce(sessionStorage);
  const closeSession = vi.spyOn(sessionStorage, "close");
  await self.onmessage?.(new MessageEvent("message", { data: { operation: "stored_session", sessionId: "missing" } }));
  expect(loadSessionModule).toHaveBeenCalledOnce();
  expect(post).toHaveBeenLastCalledWith({ status: "error" });
  expect(closeSession).toHaveBeenCalledOnce();
});
