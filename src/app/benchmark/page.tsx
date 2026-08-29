"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { benchmarkTests } from "@/data/questionBank/benchmarkTests";
import { QuestionPackBenchmarkSelection } from "@/features/question-packs/SpecializedQuestionPackContent";

export default function BenchmarkPage() {
  return (
    <Suspense fallback={<QuestionPackBenchmarkSelection builtInBenchmarks={benchmarkTests} />}>
      <BenchmarkPageContent />
    </Suspense>
  );
}

function BenchmarkPageContent() {
  const searchParams = useSearchParams();

  return (
    <QuestionPackBenchmarkSelection
      builtInBenchmarks={benchmarkTests}
      confirmBenchmarkId={searchParams.get("confirm") ?? undefined}
      packId={searchParams.get("pack") ?? undefined}
      selectedBenchmarkId={searchParams.get("benchmark") ?? undefined}
    />
  );
}
