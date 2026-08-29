"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { LoadingState } from "@/components/LoadingState";
import { benchmarkTests } from "@/data/questionBank/benchmarkTests";
import { QuestionPackBenchmarkSession } from "@/features/question-packs/SpecializedQuestionPackContent";
import { useI18n } from "@/features/i18n/I18nProvider";

export default function BenchmarkSessionPage() {
  const { t } = useI18n();

  return (
    <Suspense fallback={<LoadingState label={t("Preparing benchmark...")} />}>
      <BenchmarkSessionPageContent />
    </Suspense>
  );
}

function BenchmarkSessionPageContent() {
  const searchParams = useSearchParams();
  return (
    <QuestionPackBenchmarkSession
      benchmarkId={searchParams.get("benchmark") ?? undefined}
      builtInBenchmarks={benchmarkTests}
      packId={searchParams.get("pack") ?? undefined}
    />
  );
}
