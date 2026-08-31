import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/features/i18n/I18nProvider";
import {
  getCurrentConnectionState,
  hasControllingServiceWorker,
  OfflineStatusIndicator,
  serviceWorkerStatusEventName,
  verifyOriginReachability
} from "@/features/offline/OfflineStatusIndicator";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setServiceWorkerController(false);
});

describe("OfflineStatusIndicator", () => {
  it("reads the current browser connection state", () => {
    expect(getCurrentConnectionState({ onLine: true })).toBe("online");
    expect(getCurrentConnectionState({ onLine: false })).toBe("offline");
    expect(getCurrentConnectionState(undefined)).toBe("online");
    expect(hasControllingServiceWorker({ onLine: false })).toBe(false);
  });

  it("uses a cache-bypassing HEAD request to verify same-origin reachability", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    await expect(verifyOriginReachability({ onLine: true }, fetchMock, "https://practice.test")).resolves.toBe("online");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBeInstanceOf(URL);
    expect((fetchMock.mock.calls[0]?.[0] as URL).origin).toBe("https://practice.test");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store", method: "HEAD" });

    fetchMock.mockRejectedValueOnce(new TypeError("origin unreachable"));
    await expect(verifyOriginReachability({ onLine: true }, fetchMock, "https://practice.test")).resolves.toBe("unreachable");
    await expect(verifyOriginReachability({ onLine: false }, fetchMock, "https://practice.test")).resolves.toBe("unreachable");
    await expect(verifyOriginReachability({
      onLine: false,
      serviceWorker: { controller: {} } as ServiceWorkerContainer
    }, fetchMock, "https://practice.test")).resolves.toBe("offline-ready");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("updates when the browser moves offline and verifies the origin again when online", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    setNavigatorOnline(true);
    render(<I18nProvider><OfflineStatusIndicator /></I18nProvider>);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Online"));

    setServiceWorkerController(true);
    setNavigatorOnline(false);
    fireEvent(window, new Event("offline"));

    expect(screen.getByRole("status")).toHaveTextContent("Offline ready");

    setNavigatorOnline(true);
    fireEvent(window, new Event("online"));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Online"));
  });

  it("does not claim offline readiness without a controlling service worker", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    setNavigatorOnline(true);
    setServiceWorkerController(false);
    render(<I18nProvider><OfflineStatusIndicator /></I18nProvider>);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Online"));
    setNavigatorOnline(false);
    fireEvent(window, new Event("offline"));

    expect(screen.getByRole("status")).toHaveTextContent("Connection unavailable");
  });

  it("does not let an older reachability probe overwrite a newer offline hint", async () => {
    let resolveProbe: ((response: Response) => void) | undefined;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => {
      resolveProbe = resolve;
    })));
    setNavigatorOnline(true);
    render(<I18nProvider><OfflineStatusIndicator /></I18nProvider>);

    expect(screen.getByRole("status")).toHaveTextContent("Checking connection");
    setServiceWorkerController(true);
    setNavigatorOnline(false);
    fireEvent(window, new Event("offline"));
    expect(screen.getByRole("status")).toHaveTextContent("Offline ready");

    await act(async () => resolveProbe?.(new Response(null, { status: 204 })));
    expect(screen.getByRole("status")).toHaveTextContent("Offline ready");
  });

  it("does not claim to be online when the origin cannot be reached and announces deferred updates", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("origin unreachable")));
    setNavigatorOnline(true);
    render(<I18nProvider><OfflineStatusIndicator /></I18nProvider>);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Connection unavailable"));
    expect(screen.getByRole("status")).toHaveAttribute("data-state", "unreachable");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    fireEvent(window, new Event("online"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Online"));

    fireEvent(window, new CustomEvent(serviceWorkerStatusEventName, { detail: "update-ready" }));
    expect(screen.getByRole("status")).toHaveTextContent("Update ready");
    expect(screen.getByRole("status")).toHaveAccessibleName(/close every app tab/i);
  });
});

function setNavigatorOnline(isOnline: boolean): void {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: isOnline
  });
}

function setServiceWorkerController(isReady: boolean): void {
  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: isReady ? { controller: {} } : undefined
  });
}
