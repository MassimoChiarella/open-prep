import type { BrainstormingPrompt } from "@/features/case-practice/brainstorming/brainstormingScoring";
import type { CaseQuestioningPrompt } from "@/features/case-practice/questioning/questioningScoring";
import type { CaseStructuringPrompt } from "@/features/case-practice/structuring/structuringScoring";
import type { SynthesisPrompt } from "@/features/case-practice/synthesis/synthesisScoring";
import type { ExhibitDataset } from "@/features/exhibits/exhibitTypes";

export interface FullCaseSimulationSpec {
  brainstorming: BrainstormingPrompt;
  calculationQuestionId: string;
  client: string;
  exhibit: ExhibitDataset;
  id: string;
  questioning?: CaseQuestioningPrompt;
  situation: string;
  structure: CaseStructuringPrompt;
  synthesis: SynthesisPrompt;
  title: string;
}
