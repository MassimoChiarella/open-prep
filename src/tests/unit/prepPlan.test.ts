import { describe, expect, it } from "vitest";

import type { PracticeAttemptRecord, PracticeModuleId } from "@/features/case-practice/practiceTypes";
import {
  createWeeklyPrepRoadmap,
  scorePreparationPriorities,
  type PrepPlanInput,
  type PrepPlanProfile
} from "@/features/case-practice/plan/prepPlan";
import { loadProgressSummary, type ProgressSummary } from "@/features/progress/progressAggregation";
import { createWholeProductActivitySummary } from "@/features/progress/wholeProductActivity";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("preparation roadmap", () => {
  it("prioritizes poor completed exhibit and market-sizing attempts from their actual stores", async () => {
    const poor = createWeeklyPrepRoadmap(input({ progress: await storedModuleProgress(0) }));
    const strong = createWeeklyPrepRoadmap(input({ progress: await storedModuleProgress(100) }));
    for (const id of ["exhibits", "market_sizing"] as const) {
      expect(scoreOf(poor.priorities, id) - scoreOf(strong.priorities, id)).toBe(70);
      expect(poor.items.map((item) => item.id)).toContain(id);
      expect(poor.priorities.find((priority) => priority.id === id)?.reason).toContain("0%");
      expect(strong.items.map((item) => item.id)).not.toContain(id);
    }
  });

  it("requires three scored completed attempts and uses the normalized moderate-score threshold", async () => {
    const insufficient = scorePreparationPriorities(input({ progress: await storedModuleProgress(0, 2) }));
    const moderate = scorePreparationPriorities(input({ progress: await storedModuleProgress(70) }));
    const stable = scorePreparationPriorities(input({ progress: await storedModuleProgress(80) }));
    for (const id of ["exhibits", "market_sizing"] as const) {
      expect(scoreOf(insufficient, id)).toBe(scoreOf(stable, id));
      expect(scoreOf(moderate, id) - scoreOf(stable, id)).toBe(35);
      expect(moderate.find((priority) => priority.id === id)?.reason).toContain("70%");
    }
  });

  it.each([0, 1, 2])("does not use unscored legacy completions to satisfy the sample minimum with %i scored attempts", async (scoredCount) => {
    const progress = await storedModuleProgress(0, 5, scoredCount);
    for (const summary of Object.values(progress.additionalPractice ?? {})) {
      expect(summary).toMatchObject({ completedCount: 5, scoredCount });
      expect(summary.averageScorePercent).toBe(scoredCount === 0 ? undefined : 0);
    }
    const mixed = scorePreparationPriorities(input({ progress }));
    const stable = scorePreparationPriorities(input({ progress: await storedModuleProgress(100) }));
    for (const id of ["exhibits", "market_sizing"] as const) {
      expect(scoreOf(mixed, id)).toBe(scoreOf(stable, id));
    }
  });

  it("starts a new user with a benchmark and allocates the full weekly target", () => {
    const roadmap = createWeeklyPrepRoadmap(input());

    expect(roadmap.items.map((item) => item.id)).toEqual([
      "benchmark",
      "lessons",
      "drills",
      "structuring"
    ]);
    expect(roadmap.items[0]).toMatchObject({ sessions: 2 });
    expect(roadmap.items.reduce((total, item) => total + item.sessions, 0)).toBe(5);
    expect(roadmap.daysUntilInterview).toBeUndefined();
  });

  it("moves a weak scored module to the front without depending on input order", () => {
    const attempts = [
      attempt("synthesis", 4, "2026-08-10T10:00:00.000Z"),
      attempt("structuring", 2, "2026-08-11T10:00:00.000Z"),
      attempt("structuring", 1, "2026-08-12T10:00:00.000Z")
    ];
    const roadmap = createWeeklyPrepRoadmap(
      input({
        attempts,
        profile: { ...profile(), experienceLevel: "intermediate" },
        progress: practicedProgress()
      })
    );

    expect(roadmap.items[0]).toMatchObject({ id: "structuring" });
    expect(roadmap.items[0]?.reason).toContain("38%");
    expect(attempts.map((item) => item.module)).toEqual(["synthesis", "structuring", "structuring"]);
  });

  it("adds interview rehearsal priorities at 14 days but not 15 days", () => {
    const common = input({
      attempts: strongCaseAttempts(),
      profile: { ...profile(), experienceLevel: "advanced", interviewDate: "2026-08-26" },
      progress: practicedProgress()
    });
    const approaching = scorePreparationPriorities(common);
    const outsideWindow = scorePreparationPriorities({
      ...common,
      profile: { ...common.profile, interviewDate: "2026-08-27" }
    });

    expect(scoreOf(approaching, "benchmark") - scoreOf(outsideWindow, "benchmark")).toBe(45);
    expect(scoreOf(approaching, "full_case") - scoreOf(outsideWindow, "full_case")).toBe(40);
    expect(scoreOf(approaching, "synthesis") - scoreOf(outsideWindow, "synthesis")).toBe(35);
    expect(scoreOf(approaching, "fit") - scoreOf(outsideWindow, "fit")).toBe(30);
    expect(createWeeklyPrepRoadmap(common).daysUntilInterview).toBe(14);
  });

  it("counts a weak full case once and also raises its component skills", () => {
    const strongAttempts = strongCaseAttempts();
    const weakAttempts = strongAttempts.map((item) =>
      item.module === "full_case" ? { ...item, score: 1 } : item
    );
    const common = {
      profile: { ...profile(), experienceLevel: "intermediate" as const },
      progress: practicedProgress()
    };
    const strong = scorePreparationPriorities(input({ ...common, attempts: strongAttempts }));
    const weak = scorePreparationPriorities(input({ ...common, attempts: weakAttempts }));

    expect(scoreOf(weak, "full_case") - scoreOf(strong, "full_case")).toBe(70);
    expect(scoreOf(weak, "structuring") - scoreOf(strong, "structuring")).toBe(20);
    expect(scoreOf(weak, "questioning") - scoreOf(strong, "questioning")).toBe(20);
    expect(scoreOf(weak, "synthesis") - scoreOf(strong, "synthesis")).toBe(20);
  });

  it("keeps every supported practice destination in the ranked output", () => {
    const priorities = scorePreparationPriorities(input());

    expect(priorities.map((item) => item.href).sort()).toEqual(
      [
        "/benchmark",
        "/case-practice/brainstorming",
        "/case-practice/fit",
        "/case-practice/simulation",
        "/case-practice/lessons",
        "/case-practice/questioning",
        "/case-practice/structuring",
        "/case-practice/synthesis",
        "/drills",
        "/exhibits",
        "/market-sizing"
      ].sort()
    );
  });
});

async function storedModuleProgress(scorePercent: number, completedCount = 3, scoredCount = completedCount): Promise<ProgressSummary> {
  const storage = new MemoryAppStorage();
  for (let index = 0; index < 5; index += 1) {
    const timestamps = {
      startedAt: "2026-08-10T10:00:00.000Z",
      ...(index < completedCount ? { completedAt: "2026-08-10T10:01:00.000Z" } : {})
    };
    await storage.put("exhibit_attempts", {
      ...timestamps, id: `exhibit-${index}`, exhibitId: "example",
      ...(index < scoredCount ? { score: scorePercent } : index >= completedCount ? { score: 0 } : {})
    });
    await storage.put("market_sizing_attempts", {
      ...timestamps, id: `sizing-${index}`, templateId: "example", maxScore: 20,
      ...(index < scoredCount ? { score: scorePercent / 5 } : index >= completedCount ? { score: 0 } : {})
    });
  }
  return loadProgressSummary(storage);
}

function input(overrides: Partial<PrepPlanInput> = {}): PrepPlanInput {
  return {
    attempts: [],
    profile: profile(),
    progress: emptyProgress(),
    today: "2026-08-12",
    ...overrides
  };
}

function profile(): PrepPlanProfile {
  return {
    experienceLevel: "beginner",
    targetFirms: [],
    weeklySessions: 5
  };
}

function emptyProgress(): ProgressSummary {
  return {
    categoryPerformance: [],
    dashboard: {
      averageTimeSeconds: 0,
      currentStreakDays: 0,
      overallAccuracy: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      totalQuestionsAnswered: 0,
      totalSessions: 0
    },
    errorBreakdown: [],
    isEmpty: true,
    magnitudeErrorCount: 0,
    mistakeNotebook: [],
    personalBests: [],
    recentSessions: [],
    reviewQueue: { dueCount: 0, scheduledCount: 0 },
    skillPerformance: [],
    unitErrorCount: 0,
    wholeProductActivity: createWholeProductActivitySummary()
  };
}

function practicedProgress(): ProgressSummary {
  const progress = emptyProgress();

  return {
    ...progress,
    dashboard: {
      ...progress.dashboard,
      overallAccuracy: 0.9,
      totalCorrect: 18,
      totalIncorrect: 2,
      totalQuestionsAnswered: 20,
      totalSessions: 2
    },
    isEmpty: false
  };
}

function attempt(
  module: PracticeModuleId,
  score: number,
  completedAt: string,
  maxScore = 4
): PracticeAttemptRecord {
  return {
    completedAt,
    id: `${module}-${completedAt}`,
    itemId: `${module}-practice`,
    kind: "attempt",
    maxScore,
    module,
    score
  };
}

function strongCaseAttempts(): PracticeAttemptRecord[] {
  return (["brainstorming", "fit", "full_case", "lessons", "questioning", "structuring", "synthesis"] as const).map((module, index) =>
    attempt(module, 4, `2026-08-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`)
  );
}

function scoreOf(
  priorities: ReturnType<typeof scorePreparationPriorities>,
  id: ReturnType<typeof scorePreparationPriorities>[number]["id"]
): number {
  const priority = priorities.find((item) => item.id === id);

  if (priority === undefined) {
    throw new Error(`Missing priority: ${id}`);
  }

  return priority.score;
}
