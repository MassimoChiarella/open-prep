import { describe, expect, it } from "vitest";

import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { persistExhibitAttempt } from "@/features/exhibits/exhibitPersistence";
import { validateAnswer } from "@/lib/validation/validateAnswer";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("exhibit persistence", () => {
  it("persists a validated attempt record", async () => {
    const storage = new MemoryAppStorage();
    const dataset = exhibitDatasets[0];
    const question = dataset.questions[0];

    await persistExhibitAttempt({
      completedAt: "2026-06-02T12:01:00.000Z",
      dataset,
      id: "attempt-1",
      question,
      rawInput: "  $48.4M  ",
      startedAt: "2026-06-02T12:00:00.000Z",
      storage,
      validation: validateAnswer("$48.4M", question.answer)
    });

    expect((await storage.getAll("exhibit_attempts"))[0]).toMatchObject({
      completedAt: "2026-06-02T12:01:00.000Z",
      correctValue: 48_384_000,
      errorTypes: ["none"],
      exhibitId: "exhibit_retail_formats_001",
      feedbackMessage: "Correct.",
      id: "attempt-1",
      isCorrect: true,
      normalizedValue: 48_400_000,
      questionId: "suburban_gross_profit",
      rawInput: "$48.4M",
      score: 100,
      startedAt: "2026-06-02T12:00:00.000Z",
      timingAccommodation: "standard"
    });
  });

  it("stores an accommodated policy with the attempt", async () => {
    const storage = new MemoryAppStorage();
    const dataset = exhibitDatasets[0];
    const question = dataset.questions[0];

    await persistExhibitAttempt({
      completedAt: "2026-06-02T12:01:00.000Z",
      dataset,
      id: "attempt-double-time",
      question,
      rawInput: "$48.4M",
      startedAt: "2026-06-02T12:00:00.000Z",
      storage,
      timingAccommodation: "double_time",
      validation: validateAnswer("$48.4M", question.answer)
    });

    expect((await storage.get("exhibit_attempts", "attempt-double-time"))?.timingAccommodation).toBe(
      "double_time"
    );
  });
});
