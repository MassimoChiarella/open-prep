"use client";

import { type ReactNode, useEffect } from "react";

import { AppNav } from "@/components/AppNav";
import { I18nProvider, LanguageSelect, useI18n } from "@/features/i18n/I18nProvider";
import { OfflineStatusIndicator } from "@/features/offline/OfflineStatusIndicator";
import { subscribeToLocalDataInvalidation } from "@/features/settings/localDataInvalidation";

export function LocalizedAppShell({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AppChrome>{children}</AppChrome>
    </I18nProvider>
  );
}

function AppChrome({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  useEffect(() => subscribeToLocalDataInvalidation(() => {
    returnToNeutralRoute(window.location);
  }), []);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <a
        className="sr-only z-50 bg-ink px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:start-4 focus:top-4"
        href="#main-content"
      >
        {t("Skip to main content")}
      </a>
      <header className="border-b border-ink/15 border-t-2 border-t-coral bg-white/95">
        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
          <div className="grid gap-2 py-1 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-6 sm:py-4">
            <div className="min-w-0">
              <p className="hidden text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-coral sm:block">
                {t("Consulting interview preparation")}
              </p>
              <p className="text-lg font-semibold leading-6 tracking-tight text-ink sm:mt-0.5 sm:text-xl sm:leading-7">
                Open Prep
              </p>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-2 sm:ml-auto sm:flex-wrap sm:justify-end">
              <LanguageSelect />
              <OfflineStatusIndicator />
            </div>
          </div>
          <AppNav />
        </div>
      </header>
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}

export function returnToNeutralRoute(location: Pick<Location, "replace">): void {
  location.replace("/");
}
