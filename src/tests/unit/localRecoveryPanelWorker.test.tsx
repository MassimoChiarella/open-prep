import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalRecordRecoveryPanel } from "@/features/settings/LocalRecordRecoveryPanel";
import { diagnoseLocalRecovery, prepareLocalRecovery, summarizeLocalRecoveryPreview } from "@/features/settings/localRecordRecovery";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

vi.mock("@/lib/storage/indexedDbAppStorage", () => ({ createIndexedDbAppStorage: vi.fn() }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("recovery panel worker lifecycle", () => {
  let storage: MemoryAppStorage;
  beforeEach(() => {
    storage = new MemoryAppStorage();
    storage.seedLegacy("market_sizing_attempts", { id: "bad", startedAt: "2026-10-17T12:00:00.000Z", templateId: "local", note: "PRIVATE ORIGINAL ".repeat(7000) });
    vi.mocked(createIndexedDbAppStorage).mockReturnValue(storage);
    MockWorker.instances = [];
    vi.stubGlobal("Worker", MockWorker);
  });

  it("terminates a pending diagnosis on unmount and ignores a late result", async () => {
    const onRecovered = vi.fn();
    const view = render(<LocalRecordRecoveryPanel storageFactory={createIndexedDbAppStorage} onRecovered={onRecovered} />);
    fireEvent.click(screen.getByText("Recover individual records"));
    fireEvent.click(screen.getByRole("button", { name: "Check local records" }));
    await waitFor(() => expect(MockWorker.instances[0]?.requests).toHaveLength(1));
    const worker = MockWorker.instances[0];
    view.unmount();
    expect(worker.terminate).toHaveBeenCalledOnce();
    worker.reply({ id: 0, result: [] });
    expect(onRecovered).not.toHaveBeenCalled();
    expect((await storage.get("market_sizing_attempts", "bad"))?.note).toContain("PRIVATE ORIGINAL");
  });

  it("keeps reviewed private originals out of the page and disposes the retained worker on Cancel", async () => {
    const [item] = await diagnoseLocalRecovery(storage);
    const summary = summarizeLocalRecoveryPreview(await prepareLocalRecovery(storage, item));
    render(<LocalRecordRecoveryPanel storageFactory={createIndexedDbAppStorage} onRecovered={vi.fn()} />);
    fireEvent.click(screen.getByText("Recover individual records"));
    fireEvent.click(screen.getByRole("button", { name: "Check local records" }));
    await waitFor(() => expect(MockWorker.instances[0]?.requests).toHaveLength(1));
    const worker = MockWorker.instances[0];
    worker.reply({ id: 0, result: [item] });
    fireEvent.click(await screen.findByRole("button", { name: "Review recovery" }));
    await waitFor(() => expect(worker.requests).toHaveLength(2));
    worker.reply({ id: 1, result: summary });
    expect(await screen.findByText("Remove the incompatible note only")).toHaveFocus();
    expect(screen.queryByText(/PRIVATE ORIGINAL/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Check local records" })).toHaveFocus();
    expect((await storage.get("market_sizing_attempts", "bad"))?.note).toContain("PRIVATE ORIGINAL");
  });
});

class MockWorker extends EventTarget {
  static instances: MockWorker[] = [];
  requests: unknown[] = [];
  terminate = vi.fn();
  constructor() { super(); MockWorker.instances.push(this); }
  postMessage(value: unknown) { this.requests.push(value); }
  reply(value: unknown) { this.dispatchEvent(new MessageEvent("message", { data: value })); }
}
