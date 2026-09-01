import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocalDrillSessionLoader } from "@/features/drills/AdaptiveDrillSession";
import {
  writeQuestionPackPoolPreference
} from "@/features/question-packs/questionPackPoolPreference";
import type { Question, QuestionTemplate, SkillCategory, SkillTag } from "@/lib/domain";
import type {
  FixedNumericQuestionPackRecord,
  MistakeNotebookRecord,
  RetryScheduleRecord,
  StoredUserResponse
} from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

vi.mock("@/features/drills/ActiveDrillSession", () => ({
  ActiveDrillSession: ({
    questions,
    similarQuestionTemplates
  }: {
    questions: Question[];
    similarQuestionTemplates?: readonly QuestionTemplate[];
  }) => (
    <div
      data-question-ids={questions.map((question) => question.id).join(",")}
      data-similar-template-count={similarQuestionTemplates?.length ?? "default"}
      data-testid="adaptive-session"
    />
  )
}));

afterEach(() => window.localStorage.clear());

describe("LocalDrillSessionLoader question pool", () => {
  it("preserves built-in-only Daily Workout behavior without loading packs", async () => {
    const storage = new MemoryAppStorage();
    const get = vi.spyOn(storage, "get");

    render(
      <LocalDrillSessionLoader
        mode="daily_workout"
        questionCount={10}
        storageFactory={() => storage}
      />
    );

    const session = await screen.findByTestId("adaptive-session");
    expect(questionIds(session)).toHaveLength(10);
    expect(session).toHaveAttribute("data-similar-template-count", "default");
    expect(get.mock.calls.some(([storeName]) => storeName === "question_packs")).toBe(false);
  });

  it("keeps due Daily Workout history and fills selected-only from the selected numeric pack", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("question_packs", fixedPack("selected-pack", "selected-question"));
    await storage.put("question_packs", fixedPack("unselected-pack", "unselected-question"));
    await storage.put("mistake_notebook", mistake("daily-due"));
    await storage.put("retry_schedules", schedule("daily-due"));
    writeQuestionPackPoolPreference({ mode: "selected_only", selectedPackIds: ["selected-pack"] });
    const get = vi.spyOn(storage, "get");

    render(
      <LocalDrillSessionLoader
        mode="daily_workout"
        questionCount={10}
        storageFactory={() => storage}
      />
    );

    const session = await screen.findByTestId("adaptive-session");
    expect(questionIds(session)).toEqual([
      "retry-daily-due",
      "question-pack:selected-pack:selected-question"
    ]);
    expect(session).toHaveAttribute("data-similar-template-count", "0");
    expect(get.mock.calls.filter(([storeName]) => storeName === "question_packs").map(([, id]) => id))
      .toEqual(["selected-pack"]);
  });

  it("keeps due Review Queue history and replaces only its generated fill", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("question_packs", fixedPack("review-pack", "review-fill"));
    await storage.put("mistake_notebook", mistake("review-due"));
    await storage.put("retry_schedules", schedule("review-due"));
    writeQuestionPackPoolPreference({ mode: "selected_only", selectedPackIds: ["review-pack"] });

    render(
      <LocalDrillSessionLoader
        mode="review_queue"
        questionCount={3}
        storageFactory={() => storage}
      />
    );

    expect(questionIds(await screen.findByTestId("adaptive-session"))).toEqual([
      "retry-review-due",
      "question-pack:review-pack:review-fill"
    ]);
  });

  it("uses the selected numeric pool for the whole Weakness Mode session", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("question_packs", fixedPack("weakness-pack", "weakness-question"));
    await Promise.all(Array.from({ length: 10 }, (_, index) =>
      storage.put("responses", response(`weakness-${index}`))
    ));
    writeQuestionPackPoolPreference({ mode: "selected_only", selectedPackIds: ["weakness-pack"] });

    render(
      <LocalDrillSessionLoader
        mode="weakness_mode"
        questionCount={3}
        storageFactory={() => storage}
      />
    );

    expect(questionIds(await screen.findByTestId("adaptive-session"))).toEqual([
      "question-pack:weakness-pack:weakness-question"
    ]);
  });

  it("keeps Retry Missed historical-only even when selected-only is active", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("question_packs", fixedPack("ignored-pack", "ignored-question"));
    await storage.put("mistake_notebook", mistake("retry-only"));
    writeQuestionPackPoolPreference({ mode: "selected_only", selectedPackIds: ["ignored-pack"] });
    const get = vi.spyOn(storage, "get");

    render(
      <LocalDrillSessionLoader
        mode="retry_missed"
        questionCount={1}
        storageFactory={() => storage}
      />
    );

    const session = await screen.findByTestId("adaptive-session");
    expect(questionIds(session)).toEqual(["retry-retry-only"]);
    expect(session).toHaveAttribute("data-similar-template-count", "default");
    expect(get.mock.calls.some(([storeName]) => storeName === "question_packs")).toBe(false);
  });

  it("links selected-only generation failures to Question Pool Settings", async () => {
    const storage = new MemoryAppStorage();
    writeQuestionPackPoolPreference({ mode: "selected_only", selectedPackIds: [] });

    render(
      <LocalDrillSessionLoader
        mode="daily_workout"
        questionCount={10}
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByText(/Selected packs only is active/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Question Pool Settings" })).toHaveAttribute(
      "href",
      "/settings#question-pool-settings"
    );
  });
});

function questionIds(element: HTMLElement): string[] {
  return element.getAttribute("data-question-ids")?.split(",").filter(Boolean) ?? [];
}

function fixedPack(id: string, questionId: string): FixedNumericQuestionPackRecord {
  return {
    format: "math-drill-question-pack",
    id,
    importedAt: "2026-08-31T12:00:00.000Z",
    kind: "fixed_numeric",
    packVersion: "1.0.0",
    questions: [{
      answer: { unit: "none", value: 42 },
      category: "arithmetic",
      difficulty: "beginner",
      explanation: { short: "Add the values.", steps: ["Calculate the sum."] },
      id: questionId,
      prompt: `${id} prompt`,
      tags: ["addition"],
      type: "numeric"
    }],
    schemaVersion: 2,
    title: id
  };
}

function mistake(id: string): MistakeNotebookRecord {
  return {
    answer: { value: 25 },
    category: "arithmetic",
    difficulty: "beginner",
    errorTypes: ["arithmetic_error"],
    explanation: { short: "Add the values.", steps: ["Calculate the sum."] },
    id,
    missedAt: "2026-08-01T12:00:00.000Z",
    prompt: "Historical missed prompt",
    rawInput: "20",
    retryCount: 0,
    sourceQuestionId: `${id}-source`,
    sourceType: "drill",
    status: "unresolved",
    tags: ["addition"]
  };
}

function schedule(sourceId: string): RetryScheduleRecord {
  return {
    attemptCount: 0,
    createdAt: "2026-08-01T12:00:00.000Z",
    dueAt: "2026-08-02T12:00:00.000Z",
    id: `${sourceId}-schedule`,
    intervalDays: 1,
    sourceId,
    sourceType: "mistake_notebook",
    updatedAt: "2026-08-01T12:00:00.000Z"
  };
}

function response(
  id: string,
  category: SkillCategory = "arithmetic",
  tags: SkillTag[] = ["addition"]
): StoredUserResponse {
  return {
    category,
    errorTypes: ["arithmetic_error"],
    id,
    isCorrect: false,
    questionId: id,
    rawInput: "9",
    sessionId: "weakness-history",
    submittedAt: "2026-08-31T12:00:00.000Z",
    tags,
    timeTakenSeconds: 30
  };
}
