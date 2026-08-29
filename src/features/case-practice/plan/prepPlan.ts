import type {
  PracticeAttemptRecord,
  PracticeModuleId,
  PrepExperienceLevel,
  PrepProfileRecord
} from "@/features/case-practice/practiceTypes";
import type { ProgressSummary } from "@/features/progress/progressAggregation";

export const minimumWeeklySessions = 1;
export const maximumWeeklySessions = 14;

export type PrepPlanFocusId =
  | "benchmark"
  | "brainstorming"
  | "drills"
  | "exhibits"
  | "fit"
  | "full_case"
  | "lessons"
  | "market_sizing"
  | "questioning"
  | "structuring"
  | "synthesis";

export type PrepPlanProfile = Pick<
  PrepProfileRecord,
  "experienceLevel" | "interviewDate" | "targetFirms" | "weeklySessions"
>;

export interface PrepPlanInput {
  attempts: readonly PracticeAttemptRecord[];
  profile: PrepPlanProfile;
  progress: ProgressSummary;
  today: string;
}

export interface PrepPlanPriority {
  description: string;
  href: string;
  id: PrepPlanFocusId;
  reason: string;
  score: number;
  title: string;
}

export interface WeeklyPrepItem extends PrepPlanPriority {
  sessions: number;
}

export interface WeeklyPrepRoadmap {
  daysUntilInterview?: number;
  items: WeeklyPrepItem[];
  priorities: PrepPlanPriority[];
  totalSessions: number;
}

interface FocusDefinition {
  baseScore: Record<PrepExperienceLevel, number>;
  description: string;
  href: string;
  id: PrepPlanFocusId;
  reason: string;
  title: string;
}

interface Evidence {
  points: number;
  reason: string;
}

const focusDefinitions: readonly FocusDefinition[] = [
  {
    baseScore: { advanced: 64, beginner: 68, intermediate: 65 },
    description: "Complete a timed benchmark and compare the result with your earlier baseline.",
    href: "/benchmark",
    id: "benchmark",
    reason: "A benchmark keeps your preparation anchored to measurable interview-speed performance.",
    title: "Benchmark"
  },
  {
    baseScore: { advanced: 62, beginner: 32, intermediate: 50 },
    description: "Rehearse one complete case from opening hypothesis through final recommendation.",
    href: "/case-practice/simulation",
    id: "full_case",
    reason: "Integrated practice reveals whether individual case skills hold together under one decision.",
    title: "Full case simulation"
  },
  {
    baseScore: { advanced: 35, beginner: 70, intermediate: 45 },
    description: "Review one concise method and apply it immediately in the worked practice.",
    href: "/case-practice/lessons",
    id: "lessons",
    reason: "Concept review builds a reliable method before speed and case complexity are added.",
    title: "Concept lesson"
  },
  {
    baseScore: { advanced: 48, beginner: 66, intermediate: 60 },
    description: "Practice a focused set of consulting calculations with immediate feedback.",
    href: "/drills",
    id: "drills",
    reason: "Regular calculation practice protects accuracy and pace across every case type.",
    title: "Math drills"
  },
  {
    baseScore: { advanced: 58, beginner: 60, intermediate: 62 },
    description: "Build a hypothesis-led issue tree and compare it with the bundled model.",
    href: "/case-practice/structuring",
    id: "structuring",
    reason: "Strong opening structures make the rest of a case easier to navigate.",
    title: "Structuring"
  },
  {
    baseScore: { advanced: 55, beginner: 57, intermediate: 60 },
    description: "Practice asking focused questions that clarify the objective and expose the strongest diagnostic paths.",
    href: "/case-practice/questioning",
    id: "questioning",
    reason: "Ask focused clarifying and diagnostic questions, then compare them with an authored rubric.",
    title: "Questioning"
  },
  {
    baseScore: { advanced: 62, beginner: 54, intermediate: 58 },
    description: "Turn case evidence into an answer-first recommendation with risks and next steps.",
    href: "/case-practice/synthesis",
    id: "synthesis",
    reason: "Frequent synthesis practice improves concise, decision-ready communication.",
    title: "Synthesis"
  },
  {
    baseScore: { advanced: 54, beginner: 48, intermediate: 55 },
    description: "Read a business exhibit, calculate the useful signal, and state its implication.",
    href: "/exhibits",
    id: "exhibits",
    reason: "Exhibit practice connects accurate calculations to business interpretation.",
    title: "Exhibit analysis"
  },
  {
    baseScore: { advanced: 52, beginner: 50, intermediate: 52 },
    description: "Generate relevant ideas in clear themes and prioritize the strongest options.",
    href: "/case-practice/brainstorming",
    id: "brainstorming",
    reason: "Structured idea generation helps you broaden a case without losing focus.",
    title: "Brainstorming"
  },
  {
    baseScore: { advanced: 56, beginner: 42, intermediate: 48 },
    description: "Rehearse one behavioral story against the leadership and impact checklist.",
    href: "/case-practice/fit",
    id: "fit",
    reason: "A maintained story bank makes behavioral answers clearer and easier to recall.",
    title: "Fit practice"
  },
  {
    baseScore: { advanced: 50, beginner: 44, intermediate: 50 },
    description: "Work through assumptions, calculations, and a defensible final estimate.",
    href: "/market-sizing",
    id: "market_sizing",
    reason: "Market-sizing practice combines structured assumptions with reliable arithmetic.",
    title: "Market sizing"
  }
];

const moduleFocusIds: ReadonlyArray<readonly [PracticeModuleId, PrepPlanFocusId]> = [
  ["full_case", "full_case"],
  ["lessons", "lessons"],
  ["questioning", "questioning"],
  ["structuring", "structuring"],
  ["brainstorming", "brainstorming"],
  ["synthesis", "synthesis"],
  ["fit", "fit"]
];

export function scorePreparationPriorities(input: PrepPlanInput): PrepPlanPriority[] {
  const priorities = focusDefinitions.map((definition) => ({
    definition,
    evidence: [] as Evidence[],
    score: definition.baseScore[input.profile.experienceLevel]
  }));
  const byId = new Map(priorities.map((priority) => [priority.definition.id, priority]));
  const addEvidence = (id: PrepPlanFocusId, points: number, reason: string) => {
    const priority = byId.get(id);

    if (priority !== undefined) {
      priority.score += points;
      priority.evidence.push({ points, reason });
    }
  };

  if (input.progress.isEmpty) {
    addEvidence("benchmark", 60, "You have no saved baseline yet, so start with a benchmark.");
    addEvidence("lessons", 35, "You have no saved math history yet, so establish the core methods first.");
    addEvidence("drills", 35, "You have no saved math history yet, so build an initial accuracy sample.");
  } else if (input.progress.dashboard.totalQuestionsAnswered >= 5) {
    const accuracy = input.progress.dashboard.overallAccuracy;

    if (accuracy < 0.75) {
      addEvidence("drills", 55, `Your saved math accuracy is ${formatPercent(accuracy)}, so accuracy comes first.`);
    } else if (accuracy < 0.85) {
      addEvidence("drills", 25, `Your saved math accuracy is ${formatPercent(accuracy)}, leaving room to stabilize it.`);
    }
  }

  addWeakCategoryEvidence(input.progress, "exhibit_math", "exhibits", "exhibit", addEvidence);
  addWeakCategoryEvidence(input.progress, "market_sizing", "market_sizing", "market-sizing", addEvidence);

  const setupErrors = errorCount(input.progress, "formula_error") + errorCount(input.progress, "setup_error");
  if (setupErrors >= 2) {
    addEvidence("lessons", 30, "Repeated setup or formula errors make a concept refresher worthwhile.");
  }

  if (errorCount(input.progress, "interpretation_error") >= 2) {
    addEvidence("synthesis", 30, "Repeated interpretation errors point to more conclusion practice.");
  }

  if (input.progress.magnitudeErrorCount + input.progress.unitErrorCount >= 2) {
    addEvidence("market_sizing", 25, "Repeated unit or magnitude errors need assumption-and-scale practice.");
  }

  for (const [module, focusId] of moduleFocusIds) {
    const average = recentAttemptAverage(input.attempts, module);
    const title = byId.get(focusId)?.definition.title.toLowerCase() ?? focusId;

    if (average === undefined) {
      addEvidence(focusId, 10, `No ${title} attempt is saved yet, so establish a starting point.`);
    } else if (average < 0.6) {
      addEvidence(focusId, 70, `Your recent ${title} score averages ${formatPercent(average)}, so focus there first.`);
    } else if (average < 0.8) {
      addEvidence(focusId, 35, `Your recent ${title} score averages ${formatPercent(average)}, so reinforce it this week.`);
    }
  }

  const fullCaseAverage = recentAttemptAverage(input.attempts, "full_case");
  if (fullCaseAverage !== undefined && fullCaseAverage < 0.7) {
    const reason = `Your recent full-case score averages ${formatPercent(fullCaseAverage)}, so strengthen the component skills.`;
    addEvidence("structuring", 20, reason);
    addEvidence("questioning", 20, reason);
    addEvidence("synthesis", 20, reason);
    addEvidence("drills", 15, reason);
    addEvidence("exhibits", 15, reason);
  }

  const daysUntilInterview = calculateDaysUntilInterview(input.profile.interviewDate, input.today);
  if (daysUntilInterview !== undefined && daysUntilInterview >= 0 && daysUntilInterview <= 14) {
    addEvidence("benchmark", 45, "Your interview is within two weeks, so rehearse under timed conditions.");
    addEvidence("full_case", 40, "Your interview is within two weeks, so rehearse an end-to-end case.");
    addEvidence("synthesis", 35, "Your interview is within two weeks, so sharpen final recommendations.");
    addEvidence("fit", 30, "Your interview is within two weeks, so keep behavioral stories ready.");
  }

  return priorities
    .map(({ definition, evidence, score }) => ({
      description: definition.description,
      href: definition.href,
      id: definition.id,
      reason: [...evidence].sort((first, second) => second.points - first.points)[0]?.reason ?? definition.reason,
      score,
      title: definition.title
    }))
    .sort(
      (first, second) =>
        second.score - first.score || focusIndex(first.id) - focusIndex(second.id)
    );
}

export function createWeeklyPrepRoadmap(input: PrepPlanInput): WeeklyPrepRoadmap {
  const priorities = scorePreparationPriorities(input);
  const totalSessions = clampWeeklySessions(input.profile.weeklySessions);
  const itemCount = Math.min(4, totalSessions, priorities.length);
  const items: WeeklyPrepItem[] = priorities.slice(0, itemCount).map((priority) => ({
    ...priority,
    sessions: 1
  }));
  const repeatableItems = Math.min(3, items.length);

  for (let index = itemCount; index < totalSessions; index += 1) {
    items[(index - itemCount) % repeatableItems].sessions += 1;
  }

  return {
    daysUntilInterview: calculateDaysUntilInterview(input.profile.interviewDate, input.today),
    items,
    priorities,
    totalSessions
  };
}

function addWeakCategoryEvidence(
  progress: ProgressSummary,
  category: ProgressSummary["categoryPerformance"][number]["category"],
  focusId: PrepPlanFocusId,
  label: string,
  addEvidence: (id: PrepPlanFocusId, points: number, reason: string) => void
): void {
  const performance = progress.categoryPerformance.find((item) => item.category === category);

  if (performance !== undefined && performance.questionCount >= 3 && performance.accuracy < 0.75) {
    addEvidence(
      focusId,
      50,
      `Your ${label} accuracy is ${formatPercent(performance.accuracy)}, so give it a focused session.`
    );
  }
}

function errorCount(
  progress: ProgressSummary,
  errorType: ProgressSummary["errorBreakdown"][number]["errorType"]
): number {
  return progress.errorBreakdown.find((item) => item.errorType === errorType)?.count ?? 0;
}

function recentAttemptAverage(
  attempts: readonly PracticeAttemptRecord[],
  module: PracticeModuleId
): number | undefined {
  const scores = [...attempts]
    .filter((attempt) => attempt.module === module && attempt.maxScore > 0)
    .sort((first, second) => second.completedAt.localeCompare(first.completedAt))
    .slice(0, 5)
    .map((attempt) => Math.min(1, Math.max(0, attempt.score / attempt.maxScore)));

  return scores.length === 0 ? undefined : scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function calculateDaysUntilInterview(interviewDate: string | undefined, today: string): number | undefined {
  const interviewTime = parseDateKey(interviewDate);
  const todayTime = parseDateKey(today);

  if (interviewTime === undefined || todayTime === undefined) {
    return undefined;
  }

  return Math.round((interviewTime - todayTime) / 86_400_000);
}

function parseDateKey(value: string | undefined): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");

  if (match === null) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? time
    : undefined;
}

function clampWeeklySessions(value: number): number {
  if (!Number.isFinite(value)) {
    return minimumWeeklySessions;
  }

  return Math.min(maximumWeeklySessions, Math.max(minimumWeeklySessions, Math.round(value)));
}

function focusIndex(id: PrepPlanFocusId): number {
  return focusDefinitions.findIndex((definition) => definition.id === id);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
