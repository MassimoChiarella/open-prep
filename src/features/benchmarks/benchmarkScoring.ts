import type { BenchmarkScoreBand } from "@/features/benchmarks/benchmarkTypes";

export interface BenchmarkScoreOutcome {
  accuracy: number;
  correctCount: number;
  scoreBandLabel: BenchmarkScoreBand["label"];
}

export interface BenchmarkScoreBandReachability {
  isSelectable: boolean;
  isThresholdAttainable: boolean;
  label: BenchmarkScoreBand["label"];
  minAccuracy: number;
}

export interface BenchmarkReachability {
  areAllBandsSelectable: boolean;
  outcomes: readonly BenchmarkScoreOutcome[];
  scoreBands: readonly BenchmarkScoreBandReachability[];
}

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

export function analyzeBenchmarkReachability(
  questionCount: number,
  scoreBands: readonly BenchmarkScoreBand[]
): BenchmarkReachability {
  if (!Number.isInteger(questionCount) || questionCount < 1) {
    throw new Error("Benchmark question count must be a positive integer.");
  }

  const outcomes = Array.from({ length: questionCount + 1 }, (_, correctCount) => {
    const accuracy = correctCount / questionCount;

    return {
      accuracy,
      correctCount,
      scoreBandLabel: getBenchmarkScoreBand(accuracy, scoreBands).label
    };
  });
  const bandReachability = scoreBands.map(({ label, minAccuracy }) => ({
    isSelectable: outcomes.some((outcome) => outcome.scoreBandLabel === label),
    isThresholdAttainable: outcomes.some((outcome) => outcome.accuracy === minAccuracy),
    label,
    minAccuracy
  }));

  return {
    areAllBandsSelectable: bandReachability.every((band) => band.isSelectable),
    outcomes,
    scoreBands: bandReachability
  };
}
