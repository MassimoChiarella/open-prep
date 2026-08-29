"use client";

import { useEffect, useState } from "react";

import { badgeClass, cx, uiStatusDots } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";

type ConnectionState = "online" | "offline";

export function getCurrentConnectionState(navigatorLike: Pick<Navigator, "onLine"> | undefined = globalThis.navigator): ConnectionState {
  return navigatorLike?.onLine === false ? "offline" : "online";
}

export function OfflineStatusIndicator() {
  const { t } = useI18n();
  const [connectionState, setConnectionState] = useState<ConnectionState>("online");

  useEffect(() => {
    const updateConnectionState = () => {
      setConnectionState(getCurrentConnectionState());
    };

    updateConnectionState();
    window.addEventListener("online", updateConnectionState);
    window.addEventListener("offline", updateConnectionState);

    return () => {
      window.removeEventListener("online", updateConnectionState);
      window.removeEventListener("offline", updateConnectionState);
    };
  }, []);

  const isOffline = connectionState === "offline";

  return (
    <div
      aria-live="polite"
      className={cx(
        badgeClass(isOffline ? "error" : "neutral"),
        "inline-flex min-h-11 items-center gap-2 border",
        isOffline ? "border-coral/40" : "border-transparent"
      )}
      data-testid="offline-status-indicator"
      role="status"
    >
      <span
        aria-hidden="true"
        className={cx("h-2.5 w-2.5 rounded-full", uiStatusDots[isOffline ? "error" : "success"])}
      />
      {t(isOffline ? "Offline" : "Online")}
    </div>
  );
}
