import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrepPlanView } from "@/features/case-practice/plan/PrepPlanView";
import { DashboardProgressView } from "@/features/progress/ProgressViews";
import { createProgressSummary, type ProgressSummary } from "@/features/progress/progressAggregation";
import { publishLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const { loadProgress, createStorage } = vi.hoisted(() => ({ loadProgress: vi.fn(), createStorage: vi.fn() }));
vi.mock("@/features/progress/browserProgress", () => ({ loadBrowserProgressSummary: loadProgress }));
vi.mock("@/lib/storage/indexedDbAppStorage", () => ({ createIndexedDbAppStorage: createStorage }));

describe("progress loading lifecycle", () => {
  const jobs: { resolve: (summary: ProgressSummary) => void; signal: AbortSignal }[] = [];
  beforeEach(() => {
    jobs.length = 0;
    createStorage.mockReturnValue(new MemoryAppStorage());
    loadProgress.mockImplementation((_options: unknown, signal: AbortSignal) => new Promise<ProgressSummary>((resolve) => jobs.push({ resolve, signal })));
  });

  it("cancels dashboard loading on navigation", () => {
    const view = render(<DashboardProgressView />);
    expect(screen.getByTestId("progress-loading-state")).toBeInTheDocument();
    view.unmount();
    expect(jobs[0].signal.aborted).toBe(true);
  });

  it("refreshes after invalidation and ignores the previous dashboard result", async () => {
    render(<DashboardProgressView />);
    act(() => { publishLocalDataInvalidation("progress_replaced", { broadcastChannelFactory: null, fallbackStorage: null }); });
    expect(jobs).toHaveLength(2);
    expect(jobs[0].signal.aborted).toBe(true);
    await act(async () => { jobs[0].resolve(createProgressSummary({ sessions: [] })); });
    expect(screen.getByTestId("progress-loading-state")).toBeInTheDocument();
    await act(async () => { jobs[1].resolve(createProgressSummary({ sessions: [] })); });
    expect(screen.getByRole("heading", { name: "Choose how to start" })).toBeInTheDocument();
  });

  it("uses background history loading for the prep plan and cancels it on navigation", async () => {
    const view = render(<PrepPlanView />);
    expect(jobs).toHaveLength(1);
    await act(async () => { jobs[0].resolve(createProgressSummary({ sessions: [] })); });
    expect(screen.getByRole("heading", { name: "Preparation profile" })).toBeInTheDocument();
    view.unmount();
    expect(jobs[0].signal.aborted).toBe(true);
  });

  it("restarts a prep-plan load invalidated by restore instead of leaving it pending", async () => {
    render(<PrepPlanView />);
    act(() => { publishLocalDataInvalidation("progress_replaced", { broadcastChannelFactory: null, fallbackStorage: null }); });
    expect(jobs).toHaveLength(2);
    expect(jobs[0].signal.aborted).toBe(true);
    await act(async () => { jobs[0].resolve(createProgressSummary({ sessions: [] })); });
    expect(screen.queryByRole("heading", { name: "Preparation profile" })).not.toBeInTheDocument();
    await act(async () => { jobs[1].resolve(createProgressSummary({ sessions: [] })); });
    expect(screen.getByRole("heading", { name: "Preparation profile" })).toBeInTheDocument();
  });
});
