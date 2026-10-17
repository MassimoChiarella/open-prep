import { describe, expect, it } from "vitest";

import { createDrillSettings } from "@/features/drills/drillSettings";
import type { AppStorageReplacement, AppStoreName } from "@/lib/storage/appStorageTypes";
import {
  compareAbsoluteTimestamps,
  normalizeSnapshotTimestamps,
  normalizeStoredTimestamps
} from "@/lib/storage/storedTimestamps";

const offsetTime = "2026-10-17T10:00:00-04:00";
const canonicalTime = "2026-10-17T14:00:00.000Z";

describe("stored absolute timestamps", () => {
  it("compares offsets and equivalent instants by epoch, including extended years", () => {
    expect(compareAbsoluteTimestamps(offsetTime, "2026-10-17T13:00:00Z")).toBeGreaterThan(0);
    expect(compareAbsoluteTimestamps(offsetTime, canonicalTime)).toBe(0);
    expect(compareAbsoluteTimestamps("2026-10-17T15:00:00+02:00", canonicalTime)).toBeLessThan(0);
    expect(compareAbsoluteTimestamps("+010000-01-01T00:00:00.000Z", canonicalTime)).toBeGreaterThan(0);
    expect(compareAbsoluteTimestamps("-000001-01-01T00:00:00.000Z", canonicalTime)).toBeLessThan(0);
  });

  it("keeps invalid legacy values in a deterministic order before valid instants", () => {
    expect(compareAbsoluteTimestamps("broken-a", "broken-b")).toBeLessThan(0);
    expect(compareAbsoluteTimestamps("broken", offsetTime)).toBeLessThan(0);
    expect(compareAbsoluteTimestamps(offsetTime, "broken")).toBeGreaterThan(0);
    expect(compareAbsoluteTimestamps("broken", "broken")).toBe(0);
  });

  it.each<[AppStoreName, string[]]>([
    ["drill_sessions", ["startedAt", "endedAt", "activeQuestionStartedAt", "updatedAt"]],
    ["responses", ["submittedAt"]],
    ["benchmark_results", ["completedAt"]],
    ["user_settings", ["updatedAt"]],
    ["market_sizing_attempts", ["startedAt", "completedAt"]],
    ["exhibit_attempts", ["startedAt", "completedAt"]],
    ["mistake_notebook", ["missedAt", "lastRetriedAt", "resolvedAt"]],
    ["retry_schedules", ["dueAt", "createdAt", "updatedAt", "lastReviewedAt"]],
    ["practice_records", ["completedAt", "updatedAt", "startedAt"]],
    ["question_packs", ["importedAt"]]
  ])("normalizes only known event fields in %s without mutation", (storeName, fields) => {
    const record: Readonly<Record<string, unknown>> = Object.freeze({ id: "record", ...Object.fromEntries(fields.map((field) => [field, offsetTime])) });
    const normalized = normalizeStoredTimestamps(storeName, record);
    expect(normalized).toEqual({ id: "record", ...Object.fromEntries(fields.map((field) => [field, canonicalTime])) });
    for (const field of fields) expect(record[field]).toBe(offsetTime);
  });

  it("normalizes embedded responses without interpreting authored content or private dates", () => {
    const response = Object.freeze({ submittedAt: offsetTime, rawInput: offsetTime });
    const session = Object.freeze({ startedAt: offsetTime, responses: Object.freeze([response]), questions: [{ prompt: offsetTime }] });
    expect(normalizeStoredTimestamps("drill_sessions", session)).toEqual({
      ...session, startedAt: canonicalTime, responses: [{ submittedAt: canonicalTime, rawInput: offsetTime }]
    });
    expect(session.responses[0]).toBe(response);

    const profile = { kind: "prep_profile", interviewDate: "2026-11-17", targetFirms: [offsetTime], updatedAt: offsetTime };
    expect(normalizeStoredTimestamps("practice_records", profile)).toEqual({ ...profile, updatedAt: canonicalTime });
    const sizing = { startedAt: offsetTime, note: offsetTime, inputValues: { note: offsetTime } };
    expect(normalizeStoredTimestamps("market_sizing_attempts", sizing)).toEqual({ ...sizing, startedAt: canonicalTime });
    const pack = { importedAt: offsetTime, catalogProvenance: { reviewDate: "2026-10-17" } };
    expect(normalizeStoredTimestamps("question_packs", pack)).toEqual({ ...pack, importedAt: canonicalTime });
  });

  it.each([null, undefined, 4, [], { completedAt: "broken" }, { completedAt: null }, { completedAt: 4 }])(
    "retains malformed legacy records and values for Recovery: %j", (record) => {
      expect(normalizeStoredTimestamps("benchmark_results", record)).toBe(record);
    }
  );

  it("retains unchanged references and normalizes only present snapshot stores", () => {
    const unchanged = { completedAt: canonicalTime };
    expect(normalizeStoredTimestamps("benchmark_results", unchanged)).toBe(unchanged);
    const snapshot: AppStorageReplacement = { user_settings: [{ id: "default", settings: createDrillSettings(), updatedAt: offsetTime }] };
    const normalized = normalizeSnapshotTimestamps(snapshot);
    expect(normalized).toEqual({ user_settings: [{ ...snapshot.user_settings![0], updatedAt: canonicalTime }] });
    expect(snapshot.user_settings![0].updatedAt).toBe(offsetTime);
    expect(normalizeSnapshotTimestamps(normalized)).toBe(normalized);
  });
});
