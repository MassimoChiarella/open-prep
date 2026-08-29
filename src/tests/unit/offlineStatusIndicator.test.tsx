import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { I18nProvider } from "@/features/i18n/I18nProvider";
import { getCurrentConnectionState, OfflineStatusIndicator } from "@/features/offline/OfflineStatusIndicator";

describe("OfflineStatusIndicator", () => {
  it("reads the current browser connection state", () => {
    expect(getCurrentConnectionState({ onLine: true })).toBe("online");
    expect(getCurrentConnectionState({ onLine: false })).toBe("offline");
    expect(getCurrentConnectionState(undefined)).toBe("online");
  });

  it("updates when the browser moves offline and online", () => {
    setNavigatorOnline(true);
    render(<I18nProvider><OfflineStatusIndicator /></I18nProvider>);

    expect(screen.getByRole("status")).toHaveTextContent("Online");

    setNavigatorOnline(false);
    fireEvent(window, new Event("offline"));

    expect(screen.getByRole("status")).toHaveTextContent("Offline");

    setNavigatorOnline(true);
    fireEvent(window, new Event("online"));

    expect(screen.getByRole("status")).toHaveTextContent("Online");
  });
});

function setNavigatorOnline(isOnline: boolean): void {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: isOnline
  });
}
