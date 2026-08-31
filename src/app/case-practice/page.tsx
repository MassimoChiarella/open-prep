import type { Metadata } from "next";

import { CasePracticeQuestionPackPage } from "@/features/question-packs/CasePracticeQuestionPackContent";

export const metadata: Metadata = {
  title: "Case Practice"
};

export default function CasePracticePage() {
  return <CasePracticeQuestionPackPage view="hub" />;
}
