// @vitest-environment-options {"url":"https://openprep.app/"}
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
// eslint-disable-next-line no-restricted-imports -- Mocked adapter verifies the authorized analytics privacy boundary.
import { inject } from "@vercel/analytics";

// eslint-disable-next-line no-restricted-imports -- Exercise production analytics guards.
import { WebAnalytics } from "@/components/WebAnalytics";
// eslint-disable-next-line no-restricted-imports -- Exercise pageview redaction.
import { sanitizeAnalyticsEvent } from "@/lib/webAnalytics";

vi.mock("@vercel/analytics", () => ({ inject: vi.fn() }));

describe("production pageview privacy", () => {
  beforeEach(() => {
    vi.mocked(inject).mockClear();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    Object.defineProperty(navigator, "doNotTrack", { configurable: true, value: null });
  });

  it("removes query strings, fragments, and extra event fields", () => {
    const event = {
      type: "pageview" as const,
      url: "https://openprep.app/drills/session?pack=private-pack&answer=42#private-note",
      payload: { answer: "private-answer" }
    };
    expect(sanitizeAnalyticsEvent(event)).toEqual({ type: "pageview", url: "https://openprep.app/drills/session/" });
  });

  it.each([
    { type: "event" as const, url: "https://openprep.app/" },
    { type: "pageview" as const, url: "https://openprep.app/private-personal-story" },
    { type: "pageview" as const, url: "https://openprep.app/content-packs/private-pack/" },
    { type: "pageview" as const, url: "https://preview.vercel.app/" },
    { type: "pageview" as const, url: "https://example.com/" },
    { type: "pageview" as const, url: "invalid" }
  ])("drops events outside the public pageview boundary: $url", (event) => {
    expect(sanitizeAnalyticsEvent(event)).toBeNull();
  });

  it("uses same-origin production endpoints and suppresses subsequent offline events", () => {
    render(<WebAnalytics />);
    expect(inject).toHaveBeenCalledOnce();
    const options = vi.mocked(inject).mock.calls[0][0]!;
    expect(options).toMatchObject({
      mode: "production",
      scriptSrc: "/_vercel/insights/script.js",
      viewEndpoint: "/_vercel/insights/view"
    });
    const event = { type: "pageview" as const, url: "https://openprep.app/?answer=private" };
    expect(options.beforeSend!(event)).toEqual({ type: "pageview", url: "https://openprep.app/" });
    Object.defineProperty(navigator, "onLine", { value: false });
    expect(options.beforeSend!(event)).toBeNull();
  });

  it.each(["offline", "do-not-track"])("does not load analytics when %s", (setting) => {
    Object.defineProperty(navigator, setting === "offline" ? "onLine" : "doNotTrack", {
      value: setting === "offline" ? false : "1"
    });
    render(<WebAnalytics />);
    expect(inject).not.toHaveBeenCalled();
  });
});
