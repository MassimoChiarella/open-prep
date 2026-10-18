import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StoredSessionSummaryLoader } from "@/features/drills/StoredSessionSummaryLoader";
import { persistBenchmarkResult } from "@/features/benchmarks/benchmarkPersistence";
import { persistCompletedDrillSession } from "@/features/drills/drillPersistence";
import { createSessionSummarySnapshot } from "@/features/drills/sessionSummary";
import * as browserProgress from "@/features/progress/browserProgress";
import type { StoredSessionSummaryDetail } from "@/features/drills/storedSessionSummary";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";
import { completedSession } from "@/tests/fixtures/completedSession";
import { publishLocalDataInvalidation } from "@/features/settings/localDataInvalidation";

describe("StoredSessionSummaryLoader", () => {
  afterEach(() => vi.restoreAllMocks());
  it("loads the exact requested completed session", async () => {
    const storage = new MemoryAppStorage();
    const older = completedSession("older-summary", "2026-06-01T00:00:00.000Z");
    const latest = completedSession("latest-summary", "2026-06-02T00:00:00.000Z");

    await persistCompletedDrillSession({ ...older, storage });
    await persistCompletedDrillSession({ ...latest, storage });

    render(
      <StoredSessionSummaryLoader
        sessionId={older.session.id}
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByText("older-summary prompt")).toBeInTheDocument();
    expect(screen.queryByText("latest-summary prompt")).not.toBeInTheDocument();
  });

  it("falls back to the latest completed session when no id is supplied", async () => {
    const storage = new MemoryAppStorage();
    const older = completedSession("older-fallback", "2026-06-01T00:00:00.000Z");
    const latest = completedSession("latest-fallback", "2026-06-02T00:00:00.000Z");

    await persistCompletedDrillSession({ ...older, storage });
    await persistCompletedDrillSession({ ...latest, storage });

    render(<StoredSessionSummaryLoader storageFactory={() => storage} />);

    expect(await screen.findByText("latest-fallback prompt")).toBeInTheDocument();
    expect(screen.queryByText("older-fallback prompt")).not.toBeInTheDocument();
  });

  it("preserves benchmark and pack identity when repeating a historical benchmark", async () => {
    const storage = new MemoryAppStorage();
    const completed = completedSession("historical-benchmark", "2026-06-02T00:00:00.000Z");
    const benchmarkId = "question-pack:school-pack:version:1.0:benchmark:foundations-check";

    await persistCompletedDrillSession({ ...completed, storage });
    await persistBenchmarkResult({ benchmarkId, session: completed.session, storage });

    render(
      <StoredSessionSummaryLoader
        sessionId={completed.session.id}
        storageFactory={() => storage}
      />
    );

    const repeatLink = await screen.findByRole("link", { name: "Repeat Benchmark" });
    const repeatUrl = new URL(repeatLink.getAttribute("href") ?? "", "http://localhost");

    expect(repeatUrl.pathname).toBe("/benchmark");
    expect(repeatUrl.searchParams.get("benchmark")).toBe(benchmarkId);
    expect(repeatUrl.searchParams.get("pack")).toBe("school-pack");
  });

  it("shows an honest empty state for an unknown session id", async () => {
    const storage = new MemoryAppStorage();
    const latest = completedSession("known-summary", "2026-06-02T00:00:00.000Z");

    await persistCompletedDrillSession({ ...latest, storage });
    const lifetimeRead = vi.spyOn(storage, "getAll");

    render(
      <StoredSessionSummaryLoader
        sessionId="unknown-session"
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByRole("heading", { name: "Saved session not found." })).toBeInTheDocument();
    expect(screen.getByText(/not available in local history on this device/)).toBeInTheDocument();
    expect(screen.queryByText("known-summary prompt")).not.toBeInTheDocument();
    expect(lifetimeRead).not.toHaveBeenCalled();
  });

  it("shows the selected results before lifetime history, then adds personal bests and the correct benchmark repeat", async () => {
    const storage = new MemoryAppStorage();
    const completed = completedSession("progressive-benchmark");
    await persistCompletedDrillSession({ ...completed, storage });
    await persistBenchmarkResult({ benchmarkId: "question-pack:school:version:1:benchmark:check", session: completed.session, storage });
    const benchmarks = await storage.getAll("benchmark_results");
    let release!: () => void;
    const history = new Promise<typeof benchmarks>((resolve) => { release = () => resolve(benchmarks); });
    vi.spyOn(storage, "getAll").mockReturnValueOnce(history);
    render(<StoredSessionSummaryLoader sessionId={completed.session.id} storageFactory={() => storage} />);

    expect(await screen.findByText("progressive-benchmark prompt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Loading repeat option..." })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Repeat Drill" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("session-summary-new-bests")).not.toBeInTheDocument();
    await act(async () => release());
    expect(await screen.findByRole("link", { name: "Repeat Benchmark" })).toHaveAttribute("href", expect.stringContaining("pack=school"));
    expect(screen.getByTestId("session-summary-new-bests")).toBeInTheDocument();
    expect(screen.queryByText("Loading personal-best history and repeat option...")).not.toBeInTheDocument();
  });

  it("retains readable session results when enrichment fails and can retry", async () => {
    const storage = new MemoryAppStorage();
    const completed = completedSession("recoverable-summary");
    await persistCompletedDrillSession({ ...completed, storage });
    vi.spyOn(storage, "getAll").mockRejectedValueOnce(new Error("History unavailable"));
    render(<StoredSessionSummaryLoader sessionId={completed.session.id} storageFactory={() => storage} />);

    expect(await screen.findByText(/Personal-best history and the repeat option could not load/)).toBeInTheDocument();
    expect(screen.getByText("recoverable-summary prompt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Repeat unavailable" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "View Progress" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByText("recoverable-summary prompt")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Repeat Drill" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it.each(["generation", "invalidation"])("discards partially displayed results after %s changes", async (mode) => {
    const storage = new MemoryAppStorage();
    const completed = completedSession("obsolete-summary");
    await persistCompletedDrillSession({ ...completed, storage });
    let release!: () => void;
    const history = new Promise<[]>((resolve) => { release = () => resolve([]); });
    vi.spyOn(storage, "getAll").mockReturnValueOnce(history);
    render(<StoredSessionSummaryLoader sessionId={completed.session.id} storageFactory={() => storage} />);
    expect(await screen.findByText("obsolete-summary prompt")).toBeInTheDocument();
    await act(async () => {
      if (mode === "generation") await storage.clearAll();
      else publishLocalDataInvalidation("all_data_cleared", { broadcastChannelFactory: null, fallbackStorage: null });
      release();
    });
    expect(await screen.findByRole("heading", { name: "Session summary could not load." })).toBeInTheDocument();
    expect(screen.queryByText("obsolete-summary prompt")).not.toBeInTheDocument();
  });

  it("keeps the existing unavailable state when the selected session itself cannot be read", async () => {
    const storage = new MemoryAppStorage();
    vi.spyOn(storage, "get").mockRejectedValueOnce(new Error("Selected session unavailable"));
    render(<StoredSessionSummaryLoader sessionId="unreadable" storageFactory={() => storage} />);
    expect(await screen.findByRole("heading", { name: "Session summary could not load." })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Session Results" })).not.toBeInTheDocument();
  });

  it.each(["reset", "verification failure"])("cannot retain a failed enrichment snapshot after %s without invalidation messaging", async (mode) => {
    const storage = new MemoryAppStorage();
    const completed = completedSession("unverified-summary");
    await persistCompletedDrillSession({ ...completed, storage });
    let failHistory!: () => void;
    const history = new Promise<[]>((_resolve, reject) => { failHistory = () => reject(new Error("History read failed")); });
    vi.spyOn(storage, "getAll").mockReturnValueOnce(history);
    render(<StoredSessionSummaryLoader sessionId={completed.session.id} storageFactory={() => storage} />);
    expect(await screen.findByText("unverified-summary prompt")).toBeInTheDocument();
    await act(async () => {
      if (mode === "reset") await storage.clearAll();
      else vi.spyOn(storage, "atomic").mockRejectedValueOnce(new Error("Generation cannot be read"));
      failHistory();
    });
    expect(await screen.findByRole("heading", { name: "Session summary could not load." })).toBeInTheDocument();
    expect(screen.queryByText("unverified-summary prompt")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("cannot retain a previous attempt after a silent reset and a failed retry before the new snapshot", async () => {
    const storage = new MemoryAppStorage();
    const completed = completedSession("old-retry-summary");
    await persistCompletedDrillSession({ ...completed, storage });
    vi.spyOn(storage, "getAll").mockRejectedValueOnce(new Error("History unavailable"));
    render(<StoredSessionSummaryLoader sessionId={completed.session.id} storageFactory={() => storage} />);
    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(screen.getByText("old-retry-summary prompt")).toBeInTheDocument();
    await storage.clearAll();
    vi.spyOn(storage, "get").mockRejectedValueOnce(new Error("Retry read unavailable"));
    fireEvent.click(retry);
    expect(await screen.findByRole("heading", { name: "Session summary could not load." })).toBeInTheDocument();
    expect(screen.queryByText("old-retry-summary prompt")).not.toBeInTheDocument();
  });

  it("cancels changed session identities and cannot replace a newer summary with a late result", async () => {
    const storage = new MemoryAppStorage();
    const older = completedSession("late-summary", "2026-06-01T00:00:00.000Z");
    const latest = completedSession("current-summary", "2026-06-02T00:00:00.000Z");
    await persistCompletedDrillSession({ ...latest, storage });
    let complete!: (detail: StoredSessionSummaryDetail) => void;
    const load = vi.spyOn(browserProgress, "loadBrowserStoredSessionSummary").mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    const storageFactory = () => storage;
    const view = render(<StoredSessionSummaryLoader sessionId={older.session.id} storageFactory={storageFactory} />);
    const oldSignal = load.mock.calls[0][2];
    view.rerender(<StoredSessionSummaryLoader sessionId={latest.session.id} storageFactory={storageFactory} />);
    expect(oldSignal?.aborted).toBe(true);
    expect(await screen.findByText("current-summary prompt")).toBeInTheDocument();
    await act(async () => { await load.mock.calls[0][3]?.(createSessionSummarySnapshot(older.session, older.questions), 0); });
    await act(async () => complete({ newBestLabels: [], snapshot: createSessionSummarySnapshot(older.session, older.questions) }));
    expect(screen.queryByText("late-summary prompt")).not.toBeInTheDocument();
    view.unmount();
    expect(load.mock.calls[1][2]?.aborted).toBe(true);
  });
});
