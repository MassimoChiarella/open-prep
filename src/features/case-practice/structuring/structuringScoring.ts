export interface CaseStructuringHypothesis {
  id: string;
  label: string;
  rationale: string;
}

export interface CaseStructuringBranchOption {
  id: string;
  label: string;
  description: string;
}

export interface CaseStructuringModelBranch {
  branchId: string;
  title: string;
  questions: readonly string[];
}

export interface CaseStructuringPrompt {
  id: string;
  title: string;
  industry: string;
  situation: string;
  objective: string;
  hypotheses: readonly CaseStructuringHypothesis[];
  acceptedHypothesisId: string;
  branchOptions: readonly CaseStructuringBranchOption[];
  maxBranches: number;
  modelStructure: readonly CaseStructuringModelBranch[];
}

export interface CaseStructuringSubmission {
  hypothesisId: string;
  branchIds: readonly string[];
}

export interface CaseStructuringScore {
  totalScore: number;
  maxScore: 100;
  hypothesisPoints: number;
  branchPoints: number;
  hypothesisAccepted: boolean;
  matchedBranchIds: readonly string[];
  missedBranchIds: readonly string[];
  extraBranchIds: readonly string[];
  feedback: readonly string[];
}

const hypothesisMaxPoints = 35;
const branchMaxPoints = 65;

export function scoreCaseStructure(
  prompt: CaseStructuringPrompt,
  submission: CaseStructuringSubmission
): CaseStructuringScore {
  const selectedBranchIds = [...new Set(submission.branchIds)];
  if (selectedBranchIds.length > prompt.maxBranches) {
    throw new RangeError(`Select no more than ${prompt.maxBranches} issue-tree branches.`);
  }

  const acceptedBranchIds = prompt.modelStructure.map((branch) => branch.branchId);
  if (acceptedBranchIds.length === 0) {
    throw new Error("A structuring prompt must define at least one model branch.");
  }

  const acceptedBranchSet = new Set(acceptedBranchIds);
  const selectedBranchSet = new Set(selectedBranchIds);
  const matchedBranchIds = selectedBranchIds.filter((id) => acceptedBranchSet.has(id));
  const missedBranchIds = acceptedBranchIds.filter((id) => !selectedBranchSet.has(id));
  const extraBranchIds = selectedBranchIds.filter((id) => !acceptedBranchSet.has(id));
  const hypothesisAccepted = submission.hypothesisId === prompt.acceptedHypothesisId;
  const pointsPerBranch = branchMaxPoints / acceptedBranchIds.length;
  const branchPoints = Math.max(
    0,
    Math.round(matchedBranchIds.length * pointsPerBranch - extraBranchIds.length * (pointsPerBranch / 2))
  );
  const hypothesisPoints = hypothesisAccepted ? hypothesisMaxPoints : 0;

  return {
    totalScore: hypothesisPoints + branchPoints,
    maxScore: 100,
    hypothesisPoints,
    branchPoints,
    hypothesisAccepted,
    matchedBranchIds,
    missedBranchIds,
    extraBranchIds,
    feedback: buildFeedback(prompt, hypothesisAccepted, matchedBranchIds, missedBranchIds, extraBranchIds)
  };
}

function buildFeedback(
  prompt: CaseStructuringPrompt,
  hypothesisAccepted: boolean,
  matchedBranchIds: readonly string[],
  missedBranchIds: readonly string[],
  extraBranchIds: readonly string[]
): string[] {
  const acceptedHypothesis = prompt.hypotheses.find((hypothesis) => hypothesis.id === prompt.acceptedHypothesisId);
  const feedback = [
    hypothesisAccepted
      ? "Your hypothesis gives the analysis a focused starting point."
      : `A stronger starting hypothesis is: ${acceptedHypothesis?.label ?? prompt.acceptedHypothesisId}. ${acceptedHypothesis?.rationale ?? ""}`.trim()
  ];

  if (missedBranchIds.length === 0 && extraBranchIds.length === 0) {
    feedback.push("Your issue tree covers every model branch without adding a lower-priority workstream.");
  } else {
    feedback.push(`You covered ${matchedBranchIds.length} of ${prompt.modelStructure.length} model branches.`);
    if (missedBranchIds.length > 0) {
      feedback.push(`Add: ${missedBranchIds.map((id) => branchTitle(prompt, id)).join(", ")}.`);
    }
    if (extraBranchIds.length > 0) {
      feedback.push(`Deprioritize: ${extraBranchIds.map((id) => branchTitle(prompt, id)).join(", ")}.`);
    }
  }

  return feedback;
}

function branchTitle(prompt: CaseStructuringPrompt, branchId: string): string {
  return (
    prompt.modelStructure.find((branch) => branch.branchId === branchId)?.title ??
    prompt.branchOptions.find((branch) => branch.id === branchId)?.label ??
    branchId
  );
}
