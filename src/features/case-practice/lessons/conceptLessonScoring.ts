export type ConceptLessonTopic =
  | "brainstorming"
  | "business_economics"
  | "exhibit_reading"
  | "issue_tree"
  | "mental_math"
  | "synthesis";

export interface ConceptKnowledgeCheckOption {
  id: string;
  label: string;
}

export interface ConceptKnowledgeCheck {
  correctOptionId: string;
  explanation: string;
  options: readonly ConceptKnowledgeCheckOption[];
  prompt: string;
}

export interface ConceptWorkedExample {
  answer: string;
  prompt: string;
  steps: readonly string[];
}

export interface ConceptLesson {
  id: string;
  knowledgeCheck: ConceptKnowledgeCheck;
  objective: string;
  principles: readonly string[];
  title: string;
  topic: ConceptLessonTopic;
  workedExample: ConceptWorkedExample;
}

export interface ConceptCheckScore {
  answerId?: string;
  feedback: string;
  isCorrect: boolean;
  maxScore: 1;
  score: 0 | 1;
}

export function scoreConceptKnowledgeCheck(
  check: ConceptKnowledgeCheck,
  answerId: string | undefined
): ConceptCheckScore {
  const isCorrect = answerId === check.correctOptionId;

  return {
    answerId,
    feedback: `${isCorrect ? "Correct." : "Not quite."} ${check.explanation}`,
    isCorrect,
    maxScore: 1,
    score: isCorrect ? 1 : 0
  };
}
