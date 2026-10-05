import { isWellFormedUnicode } from "@/lib/validation/inputLimits";

/** Keep legacy malformed keys intact and direct their history entries to recovery. */
export function createDrillSummaryLink(sessionId: string, label: string): { href: string; label: string } {
  return isWellFormedUnicode(sessionId)
    ? { href: `/drills/summary?id=${encodeURIComponent(sessionId)}`, label }
    : { href: "/settings#record-recovery", label: "Review recovery" };
}
