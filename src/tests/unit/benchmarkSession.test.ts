import { describe, expect, it } from "vitest";

import { benchmarkTests } from "@/data/questionBank/benchmarkTests";
import {
  buildBenchmarkSessionHref,
  createBenchmarkSession,
  findBenchmarkTest,
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
        timeMode: "session"
      },
      startedAt: "2026-06-02T12:00:00.000Z"
    });
    expect(created.session.questionIds).toEqual(benchmark.questions.map((question) => question.id));
    expect(created.session.responses).toEqual([]);
  });

  it("finds benchmark tests and builds session links deterministically", () => {
    expect(findBenchmarkTest(benchmarkTests, "expert-pressure")?.title).toBe("Expert Benchmark");
    expect(findBenchmarkTest(benchmarkTests, "missing")).toBeUndefined();
    expect(buildBenchmarkSessionHref("advanced")).toBe("/benchmark/session?benchmark=advanced");
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
