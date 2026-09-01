import { describe, expect, it } from "vitest";

import { benchmarkTests } from "@/data/questionBank/benchmarkTests";
import {
  buildBenchmarkSelectionHref,
  buildBenchmarkSessionHref,
  createBenchmarkSession,
  findBenchmarkTest,
  parseBenchmarkTimingAccommodation,
} from "@/features/benchmarks/benchmarkSession";

describe("benchmark session mode", () => {
  it("creates locked sessions from fixed benchmark questions", () => {
    const benchmark = benchmarkTests[0];
    const created = createBenchmarkSession(benchmark, {
      startedAt: "2026-06-02T12:00:00.000Z"
    });

    expect(created.benchmark).toBe(benchmark);
    expect(created.questions).toBe(benchmark.questions);
    expect(created.session).toMatchObject({
      id: "benchmark-beginner-20260602T120000000Z",
      settings: {
        feedbackMode: "end_of_session",
        questionCount: benchmark.questions.length,
        timingAccommodation: "standard",
        timeMode: "session"
      },
      startedAt: "2026-06-02T12:00:00.000Z"
    });
    expect(created.session.questionIds).toEqual(benchmark.questions.map((question) => question.id));
    expect(created.session.responses).toEqual([]);
    expect(created.session.settings).not.toBe(benchmark.settings);
    expect(benchmark.settings.timingAccommodation).toBeUndefined();
  });

  it("finds benchmark tests and builds session links deterministically", () => {
    expect(findBenchmarkTest(benchmarkTests, "expert-pressure")?.title).toBe("Expert Benchmark");
    expect(findBenchmarkTest(benchmarkTests, "missing")).toBeUndefined();
    expect(buildBenchmarkSessionHref("advanced")).toBe("/benchmark/session?benchmark=advanced");
    expect(buildBenchmarkSessionHref("advanced", "pack-one", "time_and_a_half")).toBe(
      "/benchmark/session?benchmark=advanced&pack=pack-one&timingAccommodation=time_and_a_half"
    );
    expect(buildBenchmarkSelectionHref("advanced", "pack-one")).toBe(
      "/benchmark?benchmark=advanced&pack=pack-one"
    );
    expect(parseBenchmarkTimingAccommodation("double_time")).toBe("double_time");
    expect(parseBenchmarkTimingAccommodation("unsupported")).toBe("standard");
    expect(parseBenchmarkTimingAccommodation(undefined)).toBe("standard");
  });

  it("snapshots learner timing without changing the authored Standard duration", () => {
    const benchmark = benchmarkTests[0];
    const authoredSettings = structuredClone(benchmark.settings);

    const created = createBenchmarkSession(benchmark, { timingAccommodation: "untimed" });

    expect(created.session.settings).toMatchObject({
      timeMode: "session",
      timingAccommodation: "untimed",
      totalSessionSeconds: benchmark.settings.totalSessionSeconds
    });
    expect(benchmark.settings).toEqual(authoredSettings);
  });

  it("rejects benchmark sessions that are not locked", () => {
    const benchmark = benchmarkTests[0];

    expect(() =>
      createBenchmarkSession({
        ...benchmark,
        settings: {
          ...benchmark.settings,
          feedbackMode: "instant"
        }
      })
    ).toThrow("end-of-session feedback");
  });
});
