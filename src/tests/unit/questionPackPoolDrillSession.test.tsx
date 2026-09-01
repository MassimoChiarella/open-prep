import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createDrillSettings } from "@/features/drills/drillSettings";
import { QuestionPackPoolDrillSession } from "@/features/question-packs/QuestionPackPoolDrillSession";
import { writeQuestionPackPoolPreference } from "@/features/question-packs/questionPackPoolPreference";
import type { QuestionPackRecord } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(() => window.localStorage.clear());

describe("QuestionPackPoolDrillSession", () => {
  it("loads only selected installed numeric packs in selected-only mode", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("question_packs", fixedPack("selected-pack", "Selected pool question"));
    writeQuestionPackPoolPreference({
      mode: "selected_only",
      selectedPackIds: ["selected-pack"]
    });

    render(
      <QuestionPackPoolDrillSession
        interviewMathMode={false}
        seed="selected-only-session"
        settings={createDrillSettings({
          categories: ["arithmetic"],
          difficulty: "beginner",
          questionCount: 1,
          tags: ["addition"]
        })}
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByTestId("active-question-prompt")).toHaveTextContent("Selected pool question");
    expect(screen.queryByText(/What is 20 \+ 10/)).not.toBeInTheDocument();
  });

  it("fails closed with a Settings repair link when exclusive selection has no usable pack", async () => {
    writeQuestionPackPoolPreference({
      mode: "selected_only",
      selectedPackIds: ["missing-pack"]
    });

    render(
      <QuestionPackPoolDrillSession
        interviewMathMode={false}
        seed="missing-selection"
        settings={createDrillSettings({ questionCount: 1 })}
        storageFactory={() => new MemoryAppStorage()}
      />
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Selected packs only is active");
    expect(screen.getByRole("link", { name: "Question Packs" })).toHaveAttribute(
      "href",
      "/settings#question-pool-settings"
    );
  });

  it("runs selected fixed case-math questions as ordinary numeric practice when Interview Math was only inferred", async () => {
    const storage = new MemoryAppStorage();
    await storage.put(
      "question_packs",
      fixedPack("case-pack", "Authored case calculation", "case_math", ["profit"])
    );
    writeQuestionPackPoolPreference({ mode: "selected_only", selectedPackIds: ["case-pack"] });

    render(
      <QuestionPackPoolDrillSession
        interviewMathMode
        interviewMathRequested={false}
        seed="fixed-case-math"
        settings={createDrillSettings({
          categories: ["case_math"],
          difficulty: "beginner",
          questionCount: 1,
          tags: ["profit"]
        })}
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByTestId("active-question-prompt")).toHaveTextContent("Authored case calculation");
    expect(screen.queryByText(/Equation setup/)).not.toBeInTheDocument();
  });
});

function fixedPack(
  id: string,
  prompt: string,
  category: "arithmetic" | "case_math" = "arithmetic",
  tags: Array<"addition" | "profit"> = ["addition"]
): QuestionPackRecord {
  return {
    format: "math-drill-question-pack",
    id,
    importedAt: "2026-08-31T12:00:00.000Z",
    kind: "fixed_numeric",
    packVersion: "1.0.0",
    questions: [{
      answer: { unit: "none", value: 10 },
      category,
      difficulty: "beginner",
      explanation: { short: "Add.", steps: ["Add the values."] },
      id: "question-1",
      prompt,
      tags,
      type: "numeric"
    }],
    schemaVersion: 2,
    title: "Selected Pack"
  };
}
