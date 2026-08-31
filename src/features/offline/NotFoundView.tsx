"use client";

import Link from "next/link";

import { buttonClass, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";

export function NotFoundView() {
  const { t } = useI18n();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <section
        aria-labelledby="not-found-heading"
        className="grid w-full content-center gap-5 border border-ink/15 border-t-2 border-t-coral bg-white p-6 sm:min-h-80 sm:p-10"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-coral">404</p>
        <div className="grid max-w-2xl gap-3">
          <h1 className={uiText.pageTitle} id="not-found-heading">
            {t("Page not found")}
          </h1>
          <p className={uiText.pageDescription}>
            {t("This page is not available. It may have moved, or the link may be incorrect.")}
          </p>
        </div>
        <Link className={buttonClass("primary")} href="/">
          {t("Back to Dashboard")}
        </Link>
      </section>
    </main>
  );
}
