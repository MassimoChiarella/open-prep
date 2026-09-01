import {
  normalizeTimingAccommodation,
  type TimingAccommodation
} from "@/features/timing/timingAccommodation";

export const timingAccommodationPreferenceKey = "open_prep_timing_accommodation" as const;

type PreferenceReader = Pick<Storage, "getItem">;
type PreferenceWriter = Pick<Storage, "removeItem" | "setItem">;

export function readTimingAccommodationPreference(
  storage: PreferenceReader = window.localStorage
): TimingAccommodation {
  return normalizeTimingAccommodation(storage.getItem(timingAccommodationPreferenceKey));
}

export function writeTimingAccommodationPreference(
  accommodation: TimingAccommodation,
  storage: PreferenceWriter = window.localStorage
): void {
  storage.setItem(timingAccommodationPreferenceKey, accommodation);
}

export function clearTimingAccommodationPreference(
  storage: PreferenceWriter = window.localStorage
): void {
  storage.removeItem(timingAccommodationPreferenceKey);
}
