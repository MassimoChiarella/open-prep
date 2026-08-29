import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { benchmarkTests } from "@/data/questionBank/benchmarkTests";
import { BenchmarkHistoryView } from "@/features/benchmarks/BenchmarkHistoryView";
import type { SessionScore } from "@/lib/domain";
import type { AppStoreName, AppStoreValue, BenchmarkResultRecord } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("BenchmarkHistoryView", () => {
  it("shows a lightweight loading state while reading saved benchmark results", () => {
    const storage = new PendingReadStorage();

    render(<BenchmarkHistoryView benchmarks={benchmarkTests} storageFactory={() => storage} />);

    const loadingState = screen.getByTestId("benchmark-history-loading");

    expect(loadingState).toHaveAttribute("role", "status");
    expect(loadingState).toHaveAttribute("aria-live", "polite");
    expect(loadingState).toHaveTextContent("Loading benchmark history...");
    expect(loadingState).toHaveTextContent("Reading saved benchmark attempts on this device.");
  });

  it("shows an empty local history state", async () => {
    const storage = new MemoryAppStorage();

    render(<BenchmarkHistoryView benchmarks={benchmarkTests} storageFactory={() => storage} />);

    const history = screen.getByTestId("benchmark-history");

    expect(await within(history).findByRole("heading", { name: "No benchmark history yet." })).toBeInTheDocument();
    expect(
      within(history).getByText("Complete one fixed benchmark to start comparing score, accuracy, and result labels.")
    ).toBeInTheDocument();
    expect(within(history).getByRole("link", { name: "Choose Benchmark" })).toHaveAttribute("href", "/benchmark");
  });

  it("lists saved benchmark results newest first with score labels", async () => {
    const storage = new MemoryAppStorage();

    await storage.put(
      "benchmark_results",
      benchmarkResultRecord({
        accuracy: 0.75,
        benchmarkId: "beginner",
        completedAt: "2026-06-02T12:00:00.000Z",
        correctCount: 15,
        difficulty: "beginner",
        id: "result-older",
        sessionId: "session-older",
        totalScore: 1_500
      })
    );
    await storage.put(
      "benchmark_results",
      benchmarkResultRecord({
        accuracy: 0.8,
        benchmarkId: "expert-pressure",
        completedAt: "2026-06-03T12:00:00.000Z",
        correctCount: 16,
        difficulty: "expert",
        id: "result-expert-older",
        sessionId: "session-expert-older",
        totalScore: 1_700
      })
    );
    await storage.put(
      "benchmark_results",
      benchmarkResultRecord({
        accuracy: 0.95,
        benchmarkId: "expert-pressure",
        completedAt: "2026-06-04T12:00:00.000Z",
        correctCount: 19,
        difficulty: "expert",
        id: "result-newer",
        sessionId: "session-newer",
        totalScore: 2_100
      })
    );

    render(<BenchmarkHistoryView benchmarks={benchmarkTests} storageFactory={() => storage} />);

    const history = screen.getByTestId("benchmark-history");

    expect((await within(history).findAllByText("3 saved")).length).toBeGreaterThanOrEqual(1);
    expect(within(history).getAllByText("Expert Benchmark").length).toBeGreaterThanOrEqual(2);
    expect(within(history).getAllByText("95%").length).toBeGreaterThanOrEqual(2);
    expect(within(history).getAllByText("Excellent").length).toBeGreaterThanOrEqual(2);
    expect(within(screen.getByTestId("benchmark-history-comparison")).getByText("Latest result in context")).toBeInTheDocument();
    expect(within(screen.getByTestId("benchmark-history-comparison")).getByText("New Best benchmark score")).toBeInTheDocument();
    expect(within(screen.getByTestId("benchmark-history-comparison")).getByText("+15 pts vs previous")).toBeInTheDocument();

    const expertSummary = screen.getByTestId("benchmark-history-summary-expert-pressure");

    expect(within(expertSummary).getByText("2 attempts")).toBeInTheDocument();
    expect(within(expertSummary).getByText("New Best")).toBeInTheDocument();
    expect(within(expertSummary).getByText("+15 pts vs previous")).toBeInTheDocument();
    expect(within(expertSummary).getAllByText("95%")).toHaveLength(2);

    const beginnerSummary = screen.getByTestId("benchmark-history-summary-beginner");

    expect(within(beginnerSummary).getByText("1 attempt")).toBeInTheDocument();
    expect(within(beginnerSummary).getByText("First saved run")).toBeInTheDocument();

    const rows = within(history).getAllByRole("row");
    const resultsTable = screen.getByTestId("benchmark-history-results-table");

    expect(resultsTable).toHaveClass("max-h-[30rem]", "overflow-auto");
    expect(within(resultsTable).getByText("Scroll table sideways to compare all columns.")).toBeInTheDocument();
    expect(within(resultsTable).getByRole("table", { name: "Saved benchmark results" })).toBeInTheDocument();
    expect(within(resultsTable).getByRole("columnheader", { name: "Benchmark" })).toHaveClass("sticky", "top-0");
    expect(within(rows[1]).getByRole("rowheader", { name: "Expert Benchmark" })).toBeInTheDocument();
    expect(within(rows[1]).getByText("Expert Benchmark")).toBeInTheDocument();
    expect(within(rows[1]).getByText("2,100 pts")).toBeInTheDocument();
    expect(within(rows[1]).getByRole("link", { name: "Review" })).toHaveAttribute(
      "href",
      "/drills/summary?id=session-newer"
    );
    expect(within(rows[2]).getByText("Expert Benchmark")).toBeInTheDocument();
    expect(within(rows[2]).getByText("80%")).toBeInTheDocument();
    expect(within(rows[3]).getByText("Beginner Benchmark")).toBeInTheDocument();
    expect(within(rows[3]).getByText("75%")).toBeInTheDocument();
    expect(within(rows[3]).getByText("Strong")).toBeInTheDocument();
  });

  it("records a zero-correct first attempt as a baseline without celebrating it", async () => {
    const storage = new MemoryAppStorage();
    await storage.put(
      "benchmark_results",
      benchmarkResultRecord({
        accuracy: 0,
        benchmarkId: "beginner",
        completedAt: "2026-06-02T12:00:00.000Z",
        correctCount: 0,
        difficulty: "beginner",
        id: "result-zero",
        sessionId: "session-zero",
        totalScore: 0
      })
    );

    render(<BenchmarkHistoryView benchmarks={benchmarkTests} storageFactory={() => storage} />);

    expect((await screen.findAllByText("Baseline recorded")).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("New Best benchmark score")).not.toBeInTheDocument();
    expect(screen.queryByText("New Best")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review" })).toHaveAttribute(
      "href",
      "/drills/summary?id=session-zero"
    );
  });

  it("keeps imported benchmark results visible after their pack is removed", async () => {
    const storage = new MemoryAppStorage();
    await storage.put(
      "benchmark_results",
      benchmarkResultRecord({
        accuracy: 1,
        benchmarkId: "question-pack:school-pack:version:1.0:benchmark:foundations-check",
        completedAt: "2026-08-10T12:00:00.000Z",
        correctCount: 20,
        difficulty: "beginner",
        id: "removed-pack-result",
        sessionId: "removed-pack-session",
        totalScore: 2_000
      })
    );

    render(<BenchmarkHistoryView benchmarks={benchmarkTests} storageFactory={() => storage} />);

    expect((await screen.findAllByText("Foundations Check")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Recorded").length).toBeGreaterThanOrEqual(1);
  });

  it("shows an unavailable state when storage cannot be opened", async () => {
    render(
      <BenchmarkHistoryView
        benchmarks={benchmarkTests}
        storageFactory={() => {
          throw new Error("Storage unavailable.");
        }}
      />
    );

    expect(await screen.findByRole("heading", { name: "Benchmark history could not load." })).toBeInTheDocument();
    expect(
      screen.getByText("We could not read saved benchmark results on this device. You can still choose a benchmark and save a new result.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choose Benchmark" })).toHaveAttribute("href", "/benchmark");
  });
});

class PendingReadStorage extends MemoryAppStorage {
  async getAll<TStore extends AppStoreName>(_storeName: TStore): Promise<AppStoreValue<TStore>[]> {
    return new Promise<AppStoreValue<TStore>[]>(() => undefined);
  }
}

function benchmarkResultRecord(input: {
  accuracy: number;
  benchmarkId: string;
  completedAt: string;
  correctCount: number;
  difficulty: BenchmarkResultRecord["difficulty"];
  id: string;
  sessionId: string;
  totalScore: number;
}): BenchmarkResultRecord {
  return {
    id: input.id,
    benchmarkId: input.benchmarkId,
    completedAt: input.completedAt,
    difficulty: input.difficulty,
    score: sessionScore({
      accuracy: input.accuracy,
      correctCount: input.correctCount,
      totalScore: input.totalScore
    }),
    sessionId: input.sessionId
  };
}

function sessionScore(input: {
  accuracy: number;
  correctCount: number;
  totalScore: number;
}): SessionScore {
  const incorrectCount = 20 - input.correctCount;

  return {
    totalScore: input.totalScore,
    accuracy: input.accuracy,
    averageTimeSeconds: 12,
    correctCount: input.correctCount,
    incorrectCount,
    categoryBreakdown: [],
    errorBreakdown: incorrectCount === 0 ? [] : [{ count: incorrectCount, errorType: "arithmetic_error" }]
  };
}
