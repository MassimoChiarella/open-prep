import type { BenchmarkScoreBand } from "@/features/benchmarks/benchmarkTypes";

export function getBenchmarkScoreBand(
  accuracy: number,
  scoreBands: readonly BenchmarkScoreBand[]
): BenchmarkScoreBand {
  if (scoreBands.length === 0) {
    throw new Error("At least one benchmark score band is required.");
  }

  const clampedAccuracy = Math.max(0, Math.min(1, accuracy));
  const sortedBands = [...scoreBands].sort((first, second) => second.minAccuracy - first.minAccuracy);

  return sortedBands.find((band) => clampedAccuracy >= band.minAccuracy) ?? sortedBands[sortedBands.length - 1];
}
