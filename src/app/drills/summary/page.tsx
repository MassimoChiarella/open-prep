"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { StoredSessionSummaryLoader } from "@/features/drills/StoredSessionSummaryLoader";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { useI18n } from "@/features/i18n/I18nProvider";

export default function DrillSummaryPage() {
  const { t } = useI18n();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: "/drills", label: t("Start Another Drill") }}
        description={t("Review local drill results, mistakes, and saved session details.")}
        eyebrow={t("Review")}
        title={t("Session Summary")}
      />

      <Suspense fallback={<LoadingState label={t("Loading session summary...")} />}>
        <DrillSummaryContent />
      </Suspense>
    </main>
  );
}

function DrillSummaryContent() {
  const sessionId = useSearchParams().get("id")?.trim() || undefined;

  return <StoredSessionSummaryLoader sessionId={sessionId} />;
}
