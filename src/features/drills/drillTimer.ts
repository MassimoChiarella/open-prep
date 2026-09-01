import type { DrillSettings } from "@/lib/domain";
import {
  getEffectiveDurationSeconds,
  normalizeTimingAccommodation,
  type TimingAccommodation
} from "@/features/timing/timingAccommodation";

export interface TimerSnapshot {
  elapsedSeconds: number;
  isExpired: boolean;
  label: string;
  limitSeconds?: number;
  remainingSeconds?: number;
  standardLimitSeconds?: number;
}

interface CreateTimerSnapshotOptions {
  nowMs: number;
  questionStartedAtMs: number;
  sessionStartedAtMs: number;
  settings: DrillSettings;
}

export function createTimerSnapshot(options: CreateTimerSnapshotOptions): TimerSnapshot {
  const elapsedSeconds = calculateElapsedSeconds(activeStartedAtMs(options), options.nowMs);
  const standardLimitSeconds = getStandardTimeLimitSeconds(options.settings);
  const limitSeconds = getTimeLimitSeconds(options.settings);

  if (limitSeconds === undefined) {
    return {
      elapsedSeconds,
      isExpired: false,
      label: formatSeconds(elapsedSeconds),
      ...(standardLimitSeconds === undefined ? {} : { standardLimitSeconds })
    };
  }

  const remainingSeconds = calculateRemainingSeconds(limitSeconds, elapsedSeconds);

  return {
    elapsedSeconds,
    isExpired: remainingSeconds <= 0,
    label: formatSeconds(remainingSeconds),
    limitSeconds,
    remainingSeconds,
    standardLimitSeconds
  };
}

export function getTimeLimitSeconds(settings: DrillSettings): number | undefined {
  const standardLimitSeconds = getStandardTimeLimitSeconds(settings);

  if (standardLimitSeconds === undefined) {
    return undefined;
  }

  return getEffectiveDurationSeconds(standardLimitSeconds, settings.timingAccommodation) ?? undefined;
}

export function getStandardTimeLimitSeconds(settings: DrillSettings): number | undefined {
  if (settings.timeMode === "per_question") {
    return settings.secondsPerQuestion;
  }

  if (settings.timeMode === "session") {
    return settings.totalSessionSeconds;
  }

  return undefined;
}

export function timingAccommodationLabel(accommodation: unknown): string {
  const normalized = normalizeTimingAccommodation(accommodation);
  const labels: Record<TimingAccommodation, string> = {
    double_time: "Double time",
    standard: "Standard time",
    time_and_a_half: "Time and a half",
    untimed: "Untimed practice"
  };

  return labels[normalized];
}

export function calculateElapsedSeconds(startedAtMs: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
}

export function calculateRemainingSeconds(limitSeconds: number, elapsedSeconds: number): number {
  return Math.max(0, limitSeconds - elapsedSeconds);
}

export function formatSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function activeStartedAtMs(options: CreateTimerSnapshotOptions): number {
  return options.settings.timeMode === "session" ? options.sessionStartedAtMs : options.questionStartedAtMs;
}
