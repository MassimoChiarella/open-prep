import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalRecordRecoveryPanel } from "@/features/settings/LocalRecordRecoveryPanel";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function showPreview() {
  const storage = new MemoryAppStorage();
  const bad = { id: "old-sizing", startedAt: "2026-09-22T12:00:00.000Z", templateId: "local-sizing", score: 80, note: "PRIVATE ORIGINAL ".repeat(7000) };
  storage.seedLegacy("market_sizing_attempts", bad);
  storage.seedLegacy("market_sizing_attempts", { id: "unrelated", startedAt: bad.startedAt, templateId: bad.templateId, score: 90, note: "Keep this note" });
  const onRecovered = vi.fn();
  render(<LocalRecordRecoveryPanel storageFactory={() => storage} onRecovered={onRecovered} />);
  fireEvent.click(screen.getByText("Recover individual records"));
  fireEvent.click(screen.getByRole("button", { name: "Check local records" }));
  fireEvent.click(await screen.findByRole("button", { name: "Review recovery" }));
  expect(await screen.findByText("Remove the incompatible note only")).toHaveFocus();
  return { storage, bad, onRecovered };
}

describe("scoped recovery confirmation", () => {
  it("diagnoses and previews without exposing private values or changing records, and cancel changes nothing", async () => {
    const { storage, bad } = await showPreview();
    expect(screen.queryByText(/PRIVATE ORIGINAL/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm scoped removal" })).toBeDisabled();
    expect(screen.getByText("The attempt and its score will remain saved.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Check local records" })).toHaveFocus();
    expect(await storage.get("market_sizing_attempts", bad.id)).toEqual(bad);
  });

  it("requires an explicit no-archive choice and confirmation before removing just a bad optional note", async () => {
    const { storage, bad, onRecovered } = await showPreview();
    fireEvent.click(screen.getByLabelText("Remove without an archive; I accept losing the original records."));
    expect(screen.getByRole("button", { name: "Confirm scoped removal" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText("I have saved the archive or chosen to continue without it, and confirm this removal."));
    fireEvent.click(screen.getByRole("button", { name: "Confirm scoped removal" }));
    expect(await screen.findByText("Recovery completed. Refresh this page before preparing a new backup.")).toBeInTheDocument();
    expect(await storage.get("market_sizing_attempts", bad.id)).toEqual({ id: bad.id, startedAt: bad.startedAt, templateId: bad.templateId, score: 80 });
    expect((await storage.get("market_sizing_attempts", "unrelated"))?.note).toBe("Keep this note");
    expect(onRecovered).toHaveBeenCalledOnce();
  });

  it("does not enable removal when an archive download fails", async () => {
    const { storage, bad } = await showPreview();
    vi.stubGlobal("URL", class extends URL { static createObjectURL(): string { throw new Error("Download unavailable"); } });
    fireEvent.click(screen.getByRole("button", { name: "Download original-data archive" }));
    expect(screen.getByText("The recovery archive could not be downloaded. No records were changed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm scoped removal" })).toBeDisabled();
    expect(await storage.get("market_sizing_attempts", bad.id)).toEqual(bad);
  });

  it("rejects a changed record and discards the old confirmation", async () => {
    const { storage, bad, onRecovered } = await showPreview();
    storage.seedLegacy("market_sizing_attempts", { ...bad, score: 100 });
    fireEvent.click(screen.getByLabelText("Remove without an archive; I accept losing the original records."));
    fireEvent.click(screen.getByLabelText("I have saved the archive or chosen to continue without it, and confirm this removal."));
    fireEvent.click(screen.getByRole("button", { name: "Confirm scoped removal" }));
    expect(await screen.findByText("Saved data changed. Check the records again before confirming recovery.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm scoped removal" })).not.toBeInTheDocument();
    expect((await storage.get("market_sizing_attempts", bad.id))?.note).toBe(bad.note);
    expect(onRecovered).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Check local records" })).toHaveFocus();
  });
});
