import { describe, expect, it, vi } from "vitest";

import {
  clearTimingAccommodationPreference,
  readTimingAccommodationPreference,
  timingAccommodationPreferenceKey,
  writeTimingAccommodationPreference
} from "@/features/timing/timingAccommodationPreference";

describe("remembered timing accommodation", () => {
  it.each([null, "", "legacy", "1.5x"])("normalizes absent or legacy value %j to Standard", (value) => {
    expect(readTimingAccommodationPreference({ getItem: () => value })).toBe("standard");
  });

  it("reads a valid functional preference without any diagnosis or reason", () => {
    expect(readTimingAccommodationPreference({ getItem: () => "time_and_a_half" })).toBe("time_and_a_half");
  });

  it("writes and clears only after the caller explicitly invokes the action", () => {
    const storage = { removeItem: vi.fn(), setItem: vi.fn() };

    expect(storage.setItem).not.toHaveBeenCalled();
    writeTimingAccommodationPreference("double_time", storage);
    expect(storage.setItem).toHaveBeenCalledWith(timingAccommodationPreferenceKey, "double_time");
    clearTimingAccommodationPreference(storage);
    expect(storage.removeItem).toHaveBeenCalledWith(timingAccommodationPreferenceKey);
  });
});
