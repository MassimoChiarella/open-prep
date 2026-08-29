import type { DrillSettings } from "@/lib/domain";

export interface TimerSnapshot {
  elapsedSeconds: number;
  isExpired: boolean;
  label: string;
  limitSeconds?: number;
  remainingSeconds?: number;
}

interface CreateTimerSnapshotOptions {
  nowMs: number;
  questionStartedAtMs: number;
  sessionStartedAtMs: number;
  settings: DrillSettings;
}

export function createTimerSnapshot(options: CreateTimerSnapshotOptions): TimerSnapshot {
  const elapsedSeconds = calculateElapsedSeconds(activeStartedAtMs(options), options.nowMs);
  const limitSeconds = getTimeLimitSeconds(options.settings);

  if (limitSeconds === undefined) {
    return {
      elapsedSeconds,
      isExpired: false,
      label: formatSeconds(elapsedSeconds)
    };
  }

  const remainingSeconds = calculateRemainingSeconds(limitSeconds, elapsedSeconds);

  return {
    elapsedSeconds,
    isExpired: remainingSeconds <= 0,
    label: formatSeconds(remainingSeconds),
    limitSeconds,
    remainingSeconds
  };
}

export function getTimeLimitSeconds(settings: DrillSettings): number | undefined {
  if (settings.timeMode === "per_question") {
    return settings.secondsPerQuestion;
  }

  if (settings.timeMode === "session") {
    return settings.totalSessionSeconds;
  }

  return undefined;
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
