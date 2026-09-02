"use client";

import { FullCaseSimulation } from "@/features/case-practice/simulation/FullCaseSimulation";
import { CasePracticeQuestionPackPage } from "@/features/question-packs/CasePracticeQuestionPackContent";

export default function FullCaseSimulationPage() {
  // Keep every stage's dependencies ready before the learner starts the case.
  return <CasePracticeQuestionPackPage SimulationComponent={FullCaseSimulation} view="simulation" />;
}
