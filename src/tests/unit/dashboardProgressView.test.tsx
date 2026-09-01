import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardContent, ProgressContent, createTodaysPractice } from "@/features/progress/ProgressViews";
import type { ProgressSummary } from "@/features/progress/progressAggregation";
import { createWholeProductActivitySummary } from "@/features/progress/wholeProductActivity";
import type { FitStoryRecord, PracticeAttemptRecord } from "@/features/case-practice/practiceTypes";
import type { MistakeNotebookRecord } from "@/lib/storage/appStorageTypes";

describe("progress views", () => {
  it("gives a new user direct practice choices", () => {
    render(<DashboardContent summary={emptySummary()} />);

    expect(screen.getByRole("heading", { name: "Choose how to start" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Build my prep plan" })).toHaveAttribute("href", "/case-practice/plan");
    expect(screen.getByRole("link", { name: "Take a baseline" })).toHaveAttribute("href", "/benchmark");
    expect(screen.getByRole("link", { name: "Practice a specific skill" })).toHaveAttribute("href", "/case-practice");
    expect(screen.getByRole("link", { name: "Find or create a content pack" })).toHaveAttribute(
      "href",
      "/content-packs?view=discover"
    );
    expect(screen.getByRole("link", { name: "Skip for now and browse drills" })).toHaveAttribute("href", "/drills");
    expect(screen.queryByTestId("dashboard-priority-panel")).not.toBeInTheDocument();
  });

  it("treats case-only history as returning activity without exposing Fit story prose", () => {
    const sentinels = [
      "PRIVATE STORY TITLE",
      "PRIVATE SITUATION",
      "PRIVATE TASK",
      "PRIVATE ACTION",
      "PRIVATE RESULT",
      "PRIVATE REFLECTION"
    ];
    const story: FitStoryRecord = {
      action: sentinels[3],
      competency: "leadership",
      id: "private-story",
      kind: "fit_story",
      reflection: sentinels[5],
      result: sentinels[4],
      situation: sentinels[1],
      task: sentinels[2],
      title: sentinels[0],
      updatedAt: "2026-06-02T11:00:00.000Z"
    };
    const attempt: PracticeAttemptRecord = {
      completedAt: "2026-06-02T12:00:00.000Z",
      id: "full-case-attempt",
      itemId: "full-case-item",
      kind: "attempt",
      maxScore: 10,
      module: "full_case",
      score: 7
    };
    const wholeProductActivity = createWholeProductActivitySummary({
      practiceRecords: [story, attempt]
    });

    render(
      <DashboardContent
        summary={{ ...emptySummary(), isEmpty: false, wholeProductActivity }}
      />
    );

    expect(screen.queryByTestId("first-run-choices")).not.toBeInTheDocument();
    expect(screen.getByTestId("whole-product-activity")).toHaveTextContent("Case practice");
    expect(screen.getByTestId("whole-product-recent-activity")).toHaveTextContent("Full case");
    expect(screen.getByTestId("latest-whole-product-activity")).toHaveTextContent("Full case");
    expect(within(screen.getByTestId("dashboard-content-packs")).getByRole("link", { name: "Browse Content Packs" })).toHaveAttribute(
      "href",
      "/content-packs?view=discover"
    );
    for (const sentinel of sentinels) expect(screen.queryByText(sentinel)).not.toBeInTheDocument();
  });

  it("shows populated progress and filters the mistake notebook", () => {
    render(<ProgressContent summary={{ ...populatedSummary(), mistakeNotebook: mistakes }} />);

    expect(screen.getByTestId("progress-what-changed")).toBeInTheDocument();
    expect(screen.getByTestId("whole-product-activity")).toBeInTheDocument();
    expect(screen.getByTestId("whole-product-recent-activity")).toHaveTextContent("Exhibit practice");
    expect(screen.getByTestId("progress-next-practice")).toBeInTheDocument();
    expect(screen.getByTestId("progress-details")).toBeInTheDocument();
    const additionalPractice = screen.getByTestId("additional-practice");
    expect(within(additionalPractice).getByText("Exhibit practice")).toBeInTheDocument();
    expect(within(additionalPractice).getByText("Market sizing")).toBeInTheDocument();
    expect(within(additionalPractice).getByText("75%")).toBeInTheDocument();
    expect(within(additionalPractice).getByText("80%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Summary" })).toHaveAttribute(
      "href",
      "/drills/summary?id=session-1"
    );

    const notebook = screen.getByTestId("mistake-notebook");
    expect(within(notebook).getByText("Margin miss")).toBeInTheDocument();
    expect(within(notebook).getByText("Arithmetic miss")).toBeInTheDocument();

    fireEvent.change(within(notebook).getByLabelText("Category"), {
      target: { value: "business_math" }
    });

    expect(within(notebook).getByText("Margin miss")).toBeInTheDocument();
    expect(within(notebook).queryByText("Arithmetic miss")).not.toBeInTheDocument();
  });

  it("builds the deterministic daily workout", () => {
    const practice = createTodaysPractice(populatedSummary());
    const params = new URL(practice.href, "http://localhost").searchParams;

    expect(practice.title).toBe("Daily Workout");
    expect(params.get("source")).toBe("daily_workout");
    expect(params.get("count")).toBe("10");
  });
});

function emptySummary(): ProgressSummary {
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
    recentSessions: [],
    skillPerformance: [],
    unitErrorCount: 0,
    wholeProductActivity: createWholeProductActivitySummary()
  };
}

function populatedSummary(): ProgressSummary {
  const lastSession = {
    accuracy: 0.75,
    averageTimeSeconds: 18,
    categories: ["business_math"],
    correctCount: 3,
    endedAt: "2026-06-02T12:20:00.000Z",
    id: "session-1",
    incorrectCount: 1,
    questionCount: 4,
    startedAt: "2026-06-02T12:00:00.000Z",
    totalScore: 82
  } satisfies ProgressSummary["recentSessions"][number];

  return {
    additionalPractice: {
      exhibits: { attemptCount: 4, averageScorePercent: 75, completedCount: 3 },
      marketSizing: { attemptCount: 2, averageScorePercent: 80, completedCount: 2 }
    },
    categoryPerformance: [
      {
        accuracy: 0.7,
        averageTimeSeconds: 18,
        category: "business_math",
        correctCount: 7,
        questionCount: 10
      }
    ],
    dashboard: {
      averageTimeSeconds: 18,
      currentStreakDays: 1,
      lastSession,
      overallAccuracy: 0.75,
      totalCorrect: 3,
      totalIncorrect: 1,
      totalQuestionsAnswered: 4,
      totalSessions: 1
    },
    errorBreakdown: [{ count: 1, errorType: "arithmetic_error" }],
    isEmpty: false,
    magnitudeErrorCount: 0,
    mistakeNotebook: [],
    recentSessions: [lastSession],
    skillPerformance: [
      {
        accuracy: 0.7,
        averageTimeSeconds: 18,
        correctCount: 7,
        id: "margin",
        questionCount: 10,
        tag: "margin"
      }
    ],
    unitErrorCount: 0,
    wholeProductActivity: createWholeProductActivitySummary({
      exhibitAttempts: [{
        completedAt: "2026-06-02T12:20:00.000Z",
        exhibitId: "exhibit-1",
        id: "exhibit-attempt-1",
        isCorrect: true,
        score: 100,
        startedAt: "2026-06-02T12:00:00.000Z"
      }]
    })
  };
}

const mistakes: MistakeNotebookRecord[] = [
  {
    answer: { value: 25 },
    category: "business_math",
    difficulty: "beginner",
    errorTypes: ["arithmetic_error"],
    explanation: { short: "Use margin.", steps: ["Profit / revenue."] },
    id: "mistake-business",
    missedAt: "2026-06-02T12:00:00.000Z",
    prompt: "Margin miss",
    rawInput: "20",
    retryCount: 0,
    sourceQuestionId: "q-business",
    sourceType: "drill",
    status: "unresolved",
    tags: ["margin"]
  },
  {
    answer: { value: 10 },
    category: "arithmetic",
    difficulty: "beginner",
    errorTypes: ["unit_error"],
    explanation: { short: "Add.", steps: ["5 + 5."] },
    id: "mistake-arithmetic",
    missedAt: "2026-06-01T12:00:00.000Z",
    prompt: "Arithmetic miss",
    rawInput: "9",
    retryCount: 0,
    sourceQuestionId: "q-arithmetic",
    sourceType: "drill",
    status: "unresolved",
    tags: ["addition"]
  }
];
