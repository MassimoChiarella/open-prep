"use client";

import { useEffect, useState } from "react";

import { badgeClass, cx, type StatusTone, uiStatusDots } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";

type ConnectionState = "online" | "offline";
export type ServiceWorkerUpdateState = "update-failed" | "update-ready";
type VerifiedConnectionState = "checking" | "offline-ready" | "online" | "unreachable";
type DisplayState = ServiceWorkerUpdateState | VerifiedConnectionState;

export const serviceWorkerStatusEventName = "consulting-math-service-worker-status";

export function getCurrentConnectionState(navigatorLike: Pick<Navigator, "onLine"> | undefined = globalThis.navigator): ConnectionState {
  return navigatorLike?.onLine === false ? "offline" : "online";
}

export function hasControllingServiceWorker(
  navigatorLike: (Pick<Navigator, "onLine"> & Partial<Pick<Navigator, "serviceWorker">>) | undefined = globalThis.navigator
): boolean {
  return navigatorLike?.serviceWorker?.controller != null;
}

export async function verifyOriginReachability(
  navigatorLike: (Pick<Navigator, "onLine"> & Partial<Pick<Navigator, "serviceWorker">>) | undefined = globalThis.navigator,
  fetchLike: typeof fetch = globalThis.fetch,
  origin = globalThis.location?.origin ?? "http://localhost"
): Promise<Exclude<VerifiedConnectionState, "checking">> {
  if (getCurrentConnectionState(navigatorLike) === "offline") {
    return hasControllingServiceWorker(navigatorLike) ? "offline-ready" : "unreachable";
  }

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 5_000);

  try {
    const url = new URL("/", origin);
    url.searchParams.set("reachability", String(Date.now()));
    const response = await fetchLike(url, {
      cache: "no-store",
      credentials: "same-origin",
      method: "HEAD",
      signal: controller.signal
    });
    return response.ok ? "online" : "unreachable";
  } catch {
    return "unreachable";
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function OfflineStatusIndicator() {
  const { t } = useI18n();
  const [connectionState, setConnectionState] = useState<VerifiedConnectionState>("checking");
  const [updateState, setUpdateState] = useState<ServiceWorkerUpdateState>();

  useEffect(() => {
    let current = true;
    let probeId = 0;

    const updateConnectionState = () => {
      const nextProbeId = ++probeId;
      if (getCurrentConnectionState() === "offline") {
        setConnectionState(hasControllingServiceWorker() ? "offline-ready" : "unreachable");
        return;
      }

      setConnectionState("checking");
      void verifyOriginReachability().then((state) => {
        if (current && nextProbeId === probeId) setConnectionState(state);
      });
    };
    const handleServiceWorkerStatus = (event: Event) => {
      setUpdateState((event as CustomEvent<ServiceWorkerUpdateState>).detail);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") updateConnectionState();
    };

    updateConnectionState();
    window.addEventListener("online", updateConnectionState);
    window.addEventListener("offline", updateConnectionState);
    window.addEventListener(serviceWorkerStatusEventName, handleServiceWorkerStatus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const interval = window.setInterval(updateConnectionState, 30_000);

    return () => {
      current = false;
      window.clearInterval(interval);
      window.removeEventListener("online", updateConnectionState);
      window.removeEventListener("offline", updateConnectionState);
      window.removeEventListener(serviceWorkerStatusEventName, handleServiceWorkerStatus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const state: DisplayState = connectionState === "online" && updateState !== undefined
    ? updateState
    : connectionState;
  const tone = statusTone(state);
  const label = statusLabel(state);

  return (
    <div
      aria-label={t(statusDescription(state))}
      aria-live="polite"
      className={cx(
        badgeClass(tone),
        "inline-flex min-h-11 items-center gap-2 border",
        tone === "error" ? "border-coral/40" : "border-transparent"
      )}
      data-state={state}
      data-testid="offline-status-indicator"
      role="status"
    >
      <span
        aria-hidden="true"
        className={cx("h-2.5 w-2.5 rounded-full", uiStatusDots[tone])}
      />
      {t(label)}
    </div>
  );
}

function statusLabel(state: DisplayState): string {
  return {
    checking: "Checking connection...",
    "offline-ready": "Offline ready",
    online: "Online",
    unreachable: "Connection unavailable",
    "update-failed": "Update failed",
    "update-ready": "Update ready"
  }[state];
}

function statusDescription(state: DisplayState): string {
  return {
    checking: "Checking whether this app can reach its origin.",
    "offline-ready": "Offline ready. Cached practice remains available on this device.",
    online: "Online. The app origin is reachable.",
    unreachable: "Connection unavailable. Cached practice may still work.",
    "update-failed": "The app update could not be prepared. Your current version remains available.",
    "update-ready": "Update ready. Close every app tab when you are ready to apply it."
  }[state];
}

function statusTone(state: DisplayState): StatusTone {
  if (state === "online") return "success";
  if (state === "checking" || state === "offline-ready" || state === "update-ready") return "neutral";
  return "error";
}
