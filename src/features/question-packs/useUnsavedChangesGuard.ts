"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const activeGuards = new Map<symbol, string>();
let mountedGuardCount = 0;
let guardedHistoryEntry: { href: string; state: unknown } | undefined;
let skipBeforeUnload = false;
let skipBeforeUnloadReset: number | undefined;

export function useUnsavedChangesGuard(message: string) {
  const guardId = useRef(Symbol("unsaved-builder"));
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const id = guardId.current;
    mountedGuardCount += 1;
    if (mountedGuardCount === 1) {
      window.addEventListener("beforeunload", preventUnload);
      document.addEventListener("click", confirmSameOriginNavigation, true);
      window.addEventListener("popstate", confirmHistoryNavigation, true);
    }

    return () => {
      deactivateGuard(id);
      mountedGuardCount -= 1;
      if (mountedGuardCount === 0) {
        window.removeEventListener("beforeunload", preventUnload);
        document.removeEventListener("click", confirmSameOriginNavigation, true);
        window.removeEventListener("popstate", confirmHistoryNavigation, true);
      }
    };
  }, []);

  useEffect(() => {
    const id = guardId.current;
    if (isDirty) activateGuard(id, message);
    else deactivateGuard(id);

    return () => {
      deactivateGuard(id);
    };
  }, [isDirty, message]);

  return {
    clearDirty: useCallback(() => setIsDirty(false), []),
    isDirty,
    markDirty: useCallback(() => setIsDirty(true), [])
  };
}

function preventUnload(event: BeforeUnloadEvent): void {
  if (activeGuards.size === 0 || skipBeforeUnload) return;
  event.preventDefault();
  event.returnValue = "";
}

function activateGuard(id: symbol, message: string): void {
  if (activeGuards.size === 0) {
    guardedHistoryEntry = { href: window.location.href, state: window.history.state };
  }
  activeGuards.set(id, message);
}

function deactivateGuard(id: symbol): void {
  activeGuards.delete(id);
  if (activeGuards.size === 0) guardedHistoryEntry = undefined;
}

function allowConfirmedNavigation(): void {
  skipBeforeUnload = true;
  if (skipBeforeUnloadReset !== undefined) window.clearTimeout(skipBeforeUnloadReset);
  skipBeforeUnloadReset = window.setTimeout(() => {
    skipBeforeUnload = false;
    skipBeforeUnloadReset = undefined;
  }, 0);
}

function confirmSameOriginNavigation(event: MouseEvent): void {
  if (
    activeGuards.size === 0 ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const target = event.target;
  const link = target instanceof Element ? target.closest("a[href]") : null;
  if (
    !(link instanceof HTMLAnchorElement) ||
    link.hasAttribute("download") ||
    (link.target !== "" && link.target !== "_self")
  ) {
    return;
  }

  const destination = new URL(link.href, window.location.href);
  if (
    destination.origin !== window.location.origin ||
    (destination.pathname === window.location.pathname && destination.search === window.location.search)
  ) {
    return;
  }

  const message = activeGuards.values().next().value;
  if (message === undefined) return;
  if (window.confirm(message)) {
    allowConfirmedNavigation();
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
}

function confirmHistoryNavigation(event: PopStateEvent): void {
  const message = activeGuards.values().next().value;
  if (message === undefined) return;
  if (window.confirm(message)) {
    allowConfirmedNavigation();
    return;
  }

  event.stopImmediatePropagation();
  if (guardedHistoryEntry !== undefined) {
    window.history.pushState(guardedHistoryEntry.state, "", guardedHistoryEntry.href);
  }
}
