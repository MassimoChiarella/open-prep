// eslint-disable-next-line no-restricted-imports -- Type-only contract for the authorized pageview sanitizer.
import type { BeforeSendEvent } from "@vercel/analytics";

export const webAnalyticsOrigin = "https://openprep.app";
export const webAnalyticsScriptPath = "/_vercel/insights/script.js";
export const webAnalyticsViewPath = "/_vercel/insights/view";

// Only public, static routes belong in analytics; unknown paths may contain private text.
const publicPaths = new Set([
  "/", "/drills/", "/drills/session/", "/drills/summary/", "/benchmark/", "/benchmark/session/",
  "/formulas/", "/progress/", "/market-sizing/", "/exhibits/", "/exhibits/sprint/", "/settings/",
  "/content-packs/", "/content-packs/downloads/", "/case-practice/", "/case-practice/brainstorming/",
  "/case-practice/fit/", "/case-practice/lessons/", "/case-practice/plan/", "/case-practice/questioning/",
  "/case-practice/simulation/", "/case-practice/structuring/", "/case-practice/synthesis/"
]);

export function sanitizeAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  if (event.type !== "pageview") return null;
  try {
    const url = new URL(event.url);
    const pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    if (url.origin !== webAnalyticsOrigin || !publicPaths.has(pathname)) return null;
    return { type: "pageview", url: `${webAnalyticsOrigin}${pathname}` };
  } catch {
    return null;
  }
}
