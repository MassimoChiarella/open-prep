"use client";

// eslint-disable-next-line no-restricted-imports -- Only the authorized pageview adapter may initialize analytics.
import { inject } from "@vercel/analytics";
import { useEffect } from "react";

// eslint-disable-next-line no-restricted-imports -- Shared privacy boundary for the authorized pageview adapter.
import { sanitizeAnalyticsEvent, webAnalyticsOrigin, webAnalyticsScriptPath, webAnalyticsViewPath } from "@/lib/webAnalytics";

export function WebAnalytics() {
  useEffect(() => {
    if (window.location.origin !== webAnalyticsOrigin || navigator.doNotTrack === "1" || !navigator.onLine) return;

    inject({
      mode: "production",
      scriptSrc: webAnalyticsScriptPath,
      viewEndpoint: webAnalyticsViewPath,
      beforeSend: (event) => navigator.onLine && navigator.doNotTrack !== "1" ? sanitizeAnalyticsEvent(event) : null
    });
  }, []);

  return null;
}
