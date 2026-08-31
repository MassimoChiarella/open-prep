"use client";

import { useEffect } from "react";

import {
  serviceWorkerStatusEventName,
  type ServiceWorkerUpdateState
} from "@/features/offline/OfflineStatusIndicator";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let current = true;
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | undefined;

    const notify = (state: ServiceWorkerUpdateState) => {
      if (current) window.dispatchEvent(new CustomEvent(serviceWorkerStatusEventName, { detail: state }));
    };
    const handleWorkerStateChange = () => {
      if (installing?.state === "installed" && navigator.serviceWorker.controller !== null) {
        notify("update-ready");
      } else if (installing?.state === "redundant") {
        notify("update-failed");
      }
    };
    const handleUpdateFound = () => {
      installing?.removeEventListener("statechange", handleWorkerStateChange);
      installing = registration?.installing ?? undefined;
      installing?.addEventListener("statechange", handleWorkerStateChange);
    };

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registered) => {
      if (!current) return;
      registration = registered;
      if (registered.waiting !== null) notify("update-ready");
      registered.addEventListener("updatefound", handleUpdateFound);
      if (registered.installing !== null) handleUpdateFound();
    }).catch(() => notify("update-failed"));

    return () => {
      current = false;
      installing?.removeEventListener("statechange", handleWorkerStateChange);
      registration?.removeEventListener("updatefound", handleUpdateFound);
    };
  }, []);

  return null;
}
