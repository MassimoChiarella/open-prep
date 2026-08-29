"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { LoadingState } from "@/components/LoadingState";
import { marketSizingTemplates } from "@/data/marketSizing/marketSizingTemplates";
import { useI18n } from "@/features/i18n/I18nProvider";
import { QuestionPackMarketSizingContent } from "@/features/question-packs/SpecializedQuestionPackContent";

export default function MarketSizingPage() {
  const { t } = useI18n();

  return (
    <Suspense fallback={<LoadingState label={t("Loading market-sizing practice...")} />}>
      <MarketSizingPageContent />
    </Suspense>
  );
}

function MarketSizingPageContent() {
  const packId = useSearchParams().get("pack") ?? undefined;
  return <QuestionPackMarketSizingContent builtInTemplates={marketSizingTemplates} packId={packId} />;
}
