import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { benchmarkTests } from "@/data/questionBank/benchmarkTests";
import { BenchmarkHistoryView } from "@/features/benchmarks/BenchmarkHistoryView";
import { BenchmarkSelectionView } from "@/features/benchmarks/BenchmarkSelectionView";
import { timingAccommodationPreferenceKey } from "@/features/timing/timingAccommodationPreference";
import type { BenchmarkResultRecord } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("benchmark timing accommodations", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it("loads the remembered choice but writes only after explicit Remember and start", async () => {
    window.localStorage.setItem(timingAccommodationPreferenceKey, "time_and_a_half");
    render(<BenchmarkSelectionView benchmarks={benchmarkTests} />);

    const timingChoice = screen.getByLabelText("Timing choice");
    const remember = screen.getByRole("checkbox", {
      name: "Remember this timing choice on this device"
    });

    await waitFor(() => expect(timingChoice).toHaveValue("time_and_a_half"));
    expect(screen.getByRole("status")).toHaveTextContent("Your limit will be 30 min");
    expect(timingChoice.tabIndex).toBeGreaterThanOrEqual(0);
    expect(remember.tabIndex).toBeGreaterThanOrEqual(0);

    fireEvent.change(timingChoice, { target: { value: "double_time" } });
    const start = screen.getByRole("link", { name: "Begin Benchmark" });
    expect(start).toHaveAttribute(
      "href",
      "/benchmark/session?benchmark=beginner&timingAccommodation=double_time"
    );
    start.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(start);
    expect(window.localStorage.getItem(timingAccommodationPreferenceKey)).toBe("time_and_a_half");

    fireEvent.click(remember);
    fireEvent.click(start);
    expect(window.localStorage.getItem(timingAccommodationPreferenceKey)).toBe("double_time");
  });

  it("keeps accommodated-only history visible without Standard comparisons or celebrations", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("benchmark_results", benchmarkResult("double", "double_time", 900));
    await storage.put("benchmark_results", benchmarkResult("untimed", "untimed", 1_000));

    render(<BenchmarkHistoryView benchmarks={benchmarkTests} storageFactory={() => storage} />);

    expect(await screen.findByRole("heading", { name: "No Standard results yet" })).toBeInTheDocument();
    expect(screen.getByText("Accommodated practice")).toBeInTheDocument();
    expect(screen.getAllByText("Saved practice")).toHaveLength(2);
    expect(screen.getByText("Double time")).toBeInTheDocument();
    expect(screen.getByText("Untimed practice")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Review" })).toHaveLength(2);
    expect(screen.queryByText("New Best")).not.toBeInTheDocument();
    expect(screen.queryByText("New Best benchmark score")).not.toBeInTheDocument();
  });
});

function benchmarkResult(
  id: string,
  timingAccommodation: NonNullable<BenchmarkResultRecord["timingAccommodation"]>,
  totalScore: number
): BenchmarkResultRecord {
  return {
    benchmarkId: "beginner",
    completedAt: id === "untimed" ? "2026-08-31T13:00:00.000Z" : "2026-08-31T12:00:00.000Z",
    difficulty: "beginner",
    id,
    score: {
      accuracy: totalScore / 1_000,
      averageTimeSeconds: 12,
      categoryBreakdown: [],
      correctCount: Math.round(totalScore / 50),
      errorBreakdown: [],
      incorrectCount: Math.max(0, 20 - Math.round(totalScore / 50)),
      totalScore
    },
    sessionId: `${id}-session`,
    timingAccommodation
  };
}
