"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { LoadingState } from "@/components/LoadingState";
import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { useI18n } from "@/features/i18n/I18nProvider";
import { QuestionPackExhibitSprintContent } from "@/features/question-packs/SpecializedQuestionPackContent";

export default function ExhibitSprintPage() {
  const { t } = useI18n();

  return (
    <Suspense fallback={<LoadingState label={t("Loading exhibit practice...")} />}>
      <ExhibitSprintPageContent />
    </Suspense>
  );
}

function ExhibitSprintPageContent() {
  const packId = useSearchParams().get("pack") ?? undefined;
  return <QuestionPackExhibitSprintContent builtInDatasets={exhibitDatasets} packId={packId} />;
}
