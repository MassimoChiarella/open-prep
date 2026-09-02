import type { Metadata } from "next";

import { CasePracticeQuestionPackPage } from "@/features/question-packs/CasePracticeQuestionPackContent";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function QuestioningPage() {
  return <CasePracticeQuestionPackPage view="questioning" />;
}
