import type { BenchmarkId, BenchmarkTest } from "@/features/benchmarks/benchmarkTypes";
import type { DrillSession, Question } from "@/lib/domain";

export interface CreateBenchmarkSessionOptions {
  sessionId?: string;
  startedAt?: string;
}

export interface CreatedBenchmarkSession {
  benchmark: BenchmarkTest;
  questions: Question[];
  session: DrillSession;
}

export function createBenchmarkSession(
  benchmark: BenchmarkTest,
  options: CreateBenchmarkSessionOptions = {}
): CreatedBenchmarkSession {
  validateBenchmarkTest(benchmark);

  const startedAt = options.startedAt ?? new Date().toISOString();
  const sessionId = options.sessionId ?? buildBenchmarkSessionId(benchmark.id, startedAt);

  return {
    benchmark,
    questions: benchmark.questions,
    session: {
      id: sessionId,
      questionIds: benchmark.questions.map((question) => question.id),
      responses: [],
      settings: benchmark.settings,
      startedAt
    }
  };
}

export function findBenchmarkTest(
  benchmarks: readonly BenchmarkTest[],
  benchmarkId: string | undefined
): BenchmarkTest | undefined {
  return benchmarks.find((benchmark) => benchmark.id === benchmarkId);
}

export function buildBenchmarkSessionHref(benchmarkId: BenchmarkId, questionPackId?: string): string {
  const params = new URLSearchParams({ benchmark: benchmarkId });
  if (questionPackId !== undefined) params.set("pack", questionPackId);
  return `/benchmark/session?${params.toString()}`;
}

function validateBenchmarkTest(benchmark: BenchmarkTest): void {
  if (benchmark.questions.length === 0) {
    throw new Error(`Benchmark "${benchmark.id}" requires fixed questions.`);
  }

  if (benchmark.settings.questionCount !== benchmark.questions.length) {
    throw new Error(`Benchmark "${benchmark.id}" settings must match fixed question count.`);
  }

  if (
    benchmark.settings.timeMode !== "session" ||
    benchmark.settings.totalSessionSeconds === undefined ||
    benchmark.settings.totalSessionSeconds <= 0
  ) {
    throw new Error(`Benchmark "${benchmark.id}" must use a positive session timer.`);
  }

  if (benchmark.settings.feedbackMode !== "end_of_session") {
    throw new Error(`Benchmark "${benchmark.id}" must use end-of-session feedback.`);
  }

  const questionIds = new Set<string>();

  for (const question of benchmark.questions) {
    if (question.metadata?.sourceType !== "benchmark") {
      throw new Error(`Benchmark question "${question.id}" must have benchmark metadata.`);
    }

    if (questionIds.has(question.id)) {
      throw new Error(`Benchmark "${benchmark.id}" has duplicate question "${question.id}".`);
    }

    questionIds.add(question.id);
  }
}

function buildBenchmarkSessionId(benchmarkId: BenchmarkId, startedAt: string): string {
  const safeStartedAt = startedAt.replace(/[^A-Za-z0-9]/g, "");

  return `benchmark-${benchmarkId}-${safeStartedAt}`;
}
