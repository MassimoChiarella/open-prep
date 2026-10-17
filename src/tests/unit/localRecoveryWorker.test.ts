import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { archiveLocalRecovery, diagnoseLocalRecovery, prepareLocalRecovery, summarizeLocalRecoveryPreview } from "@/features/settings/localRecordRecovery";
import { subscribeToLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const { createStorage } = vi.hoisted(() => ({ createStorage: vi.fn() }));
vi.mock("@/lib/storage/indexedDbAppStorage", () => ({ createIndexedDbAppStorage: createStorage }));

let onMessage: (event: MessageEvent) => Promise<void>;
beforeAll(async () => {
  const listen = vi.spyOn(self, "addEventListener").mockImplementation((type, listener) => {
    if (type === "message") onMessage = listener as unknown as typeof onMessage;
  });
  await import("@/features/settings/completeBackupPreparation.worker");
  listen.mockRestore();
});
afterEach(() => { vi.restoreAllMocks(); });

describe("local data worker recovery", () => {
  let storage: MemoryAppStorage;
  beforeEach(() => {
    storage = new MemoryAppStorage();
    storage.seedLegacy("market_sizing_attempts", { id: "bad", startedAt: "2026-10-17T12:00:00.000Z", templateId: "local", note: "PRIVATE ORIGINAL ".repeat(7000) });
    storage.seedLegacy("market_sizing_attempts", { id: "keep", startedAt: "2026-10-17T12:00:00.000Z", templateId: "local", note: "Unrelated private note" });
    createStorage.mockReturnValue(storage);
  });

  async function send(data: Record<string, unknown>) {
    const post = vi.spyOn(self, "postMessage").mockImplementation(() => {});
    await onMessage(new MessageEvent("message", { data }));
    return post.mock.calls.at(-1)?.[0] as { id: number; result?: unknown; error?: string; conflictReason?: string };
  }

  it("retains originals privately, returns compact metadata and a lossless archive Blob, and applies only the selected repair", async () => {
    const before = await storage.getAll("market_sizing_attempts");
    const [item] = await diagnoseLocalRecovery(storage);
    const preview = await prepareLocalRecovery(storage, item);
    const close = vi.spyOn(storage, "close");
    expect(await send({ id: 0, operation: "recovery_diagnose", expectedGeneration: 0 })).toEqual({ id: 0, result: [item] });
    const prepared = await send({ id: 1, operation: "recovery_prepare", expectedGeneration: 0, item });
    expect(prepared).toEqual({ id: 1, result: summarizeLocalRecoveryPreview(preview) });
    expect(JSON.stringify(prepared)).not.toContain("PRIVATE ORIGINAL");
    expect(prepared.result).not.toHaveProperty("records");
    expect(prepared.result).not.toHaveProperty("fingerprint");
    const archived = await send({ id: 2, operation: "recovery_archive" });
    expect(archived.result).toBeInstanceOf(Blob);
    expect(await readBlob(archived.result as Blob)).toBe(archiveLocalRecovery(preview));
    expect(await storage.getAll("market_sizing_attempts")).toEqual(before);
    const invalidation = vi.fn();
    const unsubscribe = subscribeToLocalDataInvalidation(invalidation);
    try {
      expect(await send({ id: 3, operation: "recovery_apply" })).toEqual({ id: 3, result: { removedRecords: 0, updatedRecords: 1 } });
      expect(invalidation).not.toHaveBeenCalled();
      expect((await storage.get("market_sizing_attempts", "bad"))?.note).toBeUndefined();
      expect((await storage.get("market_sizing_attempts", "keep"))?.note).toBe("Unrelated private note");
      expect(await storage.getGeneration()).toBe(1);
      expect(close).toHaveBeenCalledTimes(2);
    } finally { unsubscribe(); }
  });

  it("serializes a generation conflict and discards an obsolete prepared recovery", async () => {
    const [item] = await diagnoseLocalRecovery(storage);
    await send({ id: 0, operation: "recovery_prepare", expectedGeneration: 0, item });
    await storage.mutate([], { advanceGeneration: true });
    expect(await send({ id: 1, operation: "recovery_apply" })).toMatchObject({ id: 1, conflictReason: "generation" });
    expect((await storage.get("market_sizing_attempts", "bad"))?.note).toContain("PRIVATE ORIGINAL");
    expect(await send({ id: 2, operation: "recovery_archive" })).toMatchObject({ error: "Review a record before continuing recovery." });
  });

  it("preserves the original fingerprint comparison at the atomic apply boundary", async () => {
    const [item] = await diagnoseLocalRecovery(storage);
    await send({ id: 0, operation: "recovery_prepare", expectedGeneration: 0, item });
    const original = (await storage.get("market_sizing_attempts", "bad"))!;
    storage.seedLegacy("market_sizing_attempts", { ...original, score: 99 });
    expect(await send({ id: 1, operation: "recovery_apply" })).toMatchObject({ conflictReason: "session" });
    expect((await storage.get("market_sizing_attempts", "bad"))?.note).toBe(original.note);
    expect(await storage.getGeneration()).toBe(0);
  });

  it("checks generation before expensive diagnosis or preparation", async () => {
    const atomic = vi.spyOn(storage, "atomic");
    expect(await send({ id: 0, operation: "recovery_diagnose", expectedGeneration: 9 })).toMatchObject({ conflictReason: "generation" });
    expect(atomic).toHaveBeenCalledOnce();
    expect(atomic.mock.calls[0][0]).toEqual({ stores: [], expectedGeneration: 9 });
  });
});

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}
