"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { LoadingState } from "@/components/LoadingState";
import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { useI18n } from "@/features/i18n/I18nProvider";
import { QuestionPackExhibitContent } from "@/features/question-packs/SpecializedQuestionPackContent";

export default function ExhibitsPage() {
  const { t } = useI18n();

  return (
    <Suspense fallback={<LoadingState label={t("Loading exhibit practice...")} />}>
      <ExhibitsPageContent />
    </Suspense>
  );
}

function ExhibitsPageContent() {
  const packId = useSearchParams().get("pack") ?? undefined;
  return <QuestionPackExhibitContent builtInDatasets={exhibitDatasets} packId={packId} />;
}
