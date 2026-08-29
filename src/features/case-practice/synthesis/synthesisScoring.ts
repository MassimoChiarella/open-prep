export const SYNTHESIS_DIMENSIONS = ["recommendation", "evidence", "risk", "nextStep"] as const;

export type SynthesisDimension = (typeof SYNTHESIS_DIMENSIONS)[number];

export interface SynthesisOption {
  id: string;
  label: string;
}

export interface SynthesisResponse {
  recommendation: string;
  evidence: string;
  risk: string;
  nextStep: string;
}

export interface SynthesisPrompt {
  id: string;
  title: string;
  client: string;
  situation: string;
  decision: string;
  facts: readonly string[];
  options: Record<SynthesisDimension, readonly SynthesisOption[]>;
  correctResponse: SynthesisResponse;
  modelClose: string;
}

export interface SynthesisCriterionScore {
  dimension: SynthesisDimension;
  earnedPoints: number;
  maxPoints: 1;
  selectedOptionId?: string;
  correctOptionId: string;
}

export interface SynthesisScore {
  totalScore: number;
  maxScore: number;
  criteria: readonly SynthesisCriterionScore[];
}

export function scoreSynthesisResponse(
  prompt: SynthesisPrompt,
  response: Partial<SynthesisResponse>
): SynthesisScore {
  const criteria = SYNTHESIS_DIMENSIONS.map((dimension): SynthesisCriterionScore => {
    const selectedOptionId = response[dimension];
    const correctOptionId = prompt.correctResponse[dimension];

    return {
      dimension,
      earnedPoints: selectedOptionId === correctOptionId ? 1 : 0,
      maxPoints: 1,
      selectedOptionId,
      correctOptionId
    };
  });

  return {
    totalScore: criteria.reduce((total, criterion) => total + criterion.earnedPoints, 0),
    maxScore: criteria.length,
    criteria
  };
}
