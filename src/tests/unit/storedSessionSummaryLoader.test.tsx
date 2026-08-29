import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StoredSessionSummaryLoader } from "@/features/drills/StoredSessionSummaryLoader";
import { persistBenchmarkResult } from "@/features/benchmarks/benchmarkPersistence";
import { submitAnswer } from "@/features/drills/answerSubmission";
import { persistCompletedDrillSession } from "@/features/drills/drillPersistence";
import { completeDrillSession } from "@/features/drills/sessionCompletion";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("StoredSessionSummaryLoader", () => {
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

    expect(repeatUrl.pathname).toBe("/benchmark/session");
    expect(repeatUrl.searchParams.get("benchmark")).toBe(benchmarkId);
    expect(repeatUrl.searchParams.get("pack")).toBe("school-pack");
  });

  it("shows an honest empty state for an unknown session id", async () => {
    const storage = new MemoryAppStorage();
    const latest = completedSession("known-summary", "2026-06-02T00:00:00.000Z");

    await persistCompletedDrillSession({ ...latest, storage });

    render(
      <StoredSessionSummaryLoader
        sessionId="unknown-session"
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByRole("heading", { name: "Saved session not found." })).toBeInTheDocument();
    expect(screen.getByText(/not available in local history on this device/)).toBeInTheDocument();
    expect(screen.queryByText("known-summary prompt")).not.toBeInTheDocument();
  });
});

function completedSession(seed: string, startedAt: string) {
  const created = createDrillSession({
    seed,
    startedAt,
    settings: { questionCount: 1, tags: ["addition"] }
  });
  const questions = [{ ...created.questions[0], prompt: `${seed} prompt` }];
  const submitted = submitAnswer({
    question: questions[0],
    rawInput: String(questions[0].answer.value),
    session: created.session,
    timeTakenSeconds: 5
  });

  return {
    questions,
    session: completeDrillSession({
      endedAt: new Date(Date.parse(startedAt) + 10_000).toISOString(),
      questions,
      session: submitted.session
    })
  };
}
