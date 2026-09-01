import { describe, expect, it, vi } from "vitest";

import {
  clearPersonalData,
  previewPersonalDataClear
} from "@/features/settings/personalDataClear";
import type { AppStorageMutation } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const timestamp = "2026-08-31T12:00:00.000Z";

describe("personal data clear", () => {
  it("previews and atomically removes only private records and note fields", async () => {
    const storage = new TrackingStorage();
    const fitStory = {
      action: "Aligned the team.",
      competency: "leadership" as const,
      id: "fit-story-1",
      kind: "fit_story" as const,
      reflection: "Delegate sooner.",
      result: "Delivered early.",
      situation: "A project was delayed.",
      task: "Recover the plan.",
      title: "Project recovery",
      updatedAt: timestamp
    };
    const profile = {
      experienceLevel: "intermediate" as const,
      id: "prep-profile" as const,
      interviewDate: "2026-09-30",
      kind: "prep_profile" as const,
      targetFirms: ["Example Firm"],
      updatedAt: timestamp,
      weeklySessions: 4
    };
    const practiceAttempt = {
      completedAt: timestamp,
      durationSeconds: 120,
      id: "practice-attempt-1",
      itemId: "case-1",
      kind: "attempt" as const,
      maxScore: 10,
      module: "structuring" as const,
      score: 8
    };
    const noteBearingAttempt = {
      calculatedValue: 125_000,
      completedAt: timestamp,
      finalAnswer: "125k",
      id: "market-1",
      inputValues: { households: "50000", includeBusiness: true },
      note: "Explain the household assumption more clearly.",
      score: 8,
      startedAt: timestamp,
      templateId: "market-template-1"
    };
    const emptyNoteAttempt = {
      id: "market-2",
      note: "",
      startedAt: timestamp,
      templateId: "market-template-2"
    };
    const ordinaryAttempt = {
      id: "market-3",
      startedAt: timestamp,
      templateId: "market-template-3"
    };
    const pack = {
      format: "math-drill-question-pack" as const,
      id: "pack-1",
      importedAt: timestamp,
      kind: "case_practice" as const,
      packVersion: "1.0.0",
      schemaVersion: 2 as const,
      title: "Saved pack"
    };
    localStorage.setItem("consulting_math_locale_preference", "fr");
    await storage.put("practice_records", fitStory);
    await storage.put("practice_records", profile);
    await storage.put("practice_records", practiceAttempt);
    await storage.put("market_sizing_attempts", noteBearingAttempt);
    await storage.put("market_sizing_attempts", emptyNoteAttempt);
    await storage.put("market_sizing_attempts", ordinaryAttempt);
    await storage.put("question_packs", pack);

    const preview = await previewPersonalDataClear(storage);
    const result = await clearPersonalData(storage);

    expect(preview).toEqual({
      fitStories: 1,
      marketSizingNotes: 2,
      preparationProfiles: 1,
      totalItems: 4
    });
    expect(result).toEqual(preview);
    expect(storage.mutationCalls).toBe(1);
    expect(storage.snapshotCalls).toBe(2);
    expect(storage.lastOperations.map((operation) => operation.storeName).sort()).toEqual([
      "market_sizing_attempts",
      "market_sizing_attempts",
      "practice_records",
      "practice_records"
    ]);
    expect(await storage.getAll("practice_records")).toEqual([practiceAttempt]);
    expect(await storage.getAll("market_sizing_attempts")).toEqual([
      {
        calculatedValue: 125_000,
        completedAt: timestamp,
        finalAnswer: "125k",
        id: "market-1",
        inputValues: { households: "50000", includeBusiness: true },
        score: 8,
        startedAt: timestamp,
        templateId: "market-template-1"
      },
      {
        id: "market-2",
        startedAt: timestamp,
        templateId: "market-template-2"
      },
      ordinaryAttempt
    ]);
    expect(await storage.getAll("question_packs")).toEqual([pack]);
    expect(localStorage.getItem("consulting_math_locale_preference")).toBe("fr");
  });

  it("takes a fresh execution snapshot after preview", async () => {
    const storage = new TrackingStorage();

    expect(await previewPersonalDataClear(storage)).toEqual({
      fitStories: 0,
      marketSizingNotes: 0,
      preparationProfiles: 0,
      totalItems: 0
    });
    await storage.put("market_sizing_attempts", {
      id: "late-note",
      note: "Added after preview.",
      startedAt: timestamp,
      templateId: "market-template"
    });

    expect(await clearPersonalData(storage)).toEqual({
      fitStories: 0,
      marketSizingNotes: 1,
      preparationProfiles: 0,
      totalItems: 1
    });
    expect(await storage.get("market_sizing_attempts", "late-note")).toEqual({
      id: "late-note",
      startedAt: timestamp,
      templateId: "market-template"
    });
  });

  it("reports an empty state without calling mutate", async () => {
    const storage = new TrackingStorage();

    const result = await clearPersonalData(storage);

    expect(result).toEqual({
      fitStories: 0,
      marketSizingNotes: 0,
      preparationProfiles: 0,
      totalItems: 0
    });
    expect(storage.mutationCalls).toBe(0);
    expect(storage.snapshotCalls).toBe(1);
  });

  it("rolls back every change when the single mutation fails", async () => {
    const storage = new MemoryAppStorage(1);
    const story = {
      action: "Action",
      competency: "impact" as const,
      id: "fit-story-failure",
      kind: "fit_story" as const,
      reflection: "Reflection",
      result: "Result",
      situation: "Situation",
      task: "Task",
      title: "Failure fixture",
      updatedAt: timestamp
    };
    const attempt = {
      finalAnswer: "500000",
      id: "market-failure",
      note: "Must survive rollback.",
      startedAt: timestamp,
      templateId: "market-template"
    };
    await storage.put("practice_records", story);
    await storage.put("market_sizing_attempts", attempt);

    await expect(clearPersonalData(storage)).rejects.toThrow(
      "Injected atomic mutation failure at operation 1."
    );

    expect(await storage.getAll("practice_records")).toEqual([story]);
    expect(await storage.getAll("market_sizing_attempts")).toEqual([attempt]);
  });

  it("never accesses the network", async () => {
    const storage = new MemoryAppStorage();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await storage.put("market_sizing_attempts", {
      id: "offline-note",
      note: "Local only.",
      startedAt: timestamp,
      templateId: "market-template"
    });

    await previewPersonalDataClear(storage);
    await clearPersonalData(storage);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

class TrackingStorage extends MemoryAppStorage {
  lastOperations: readonly AppStorageMutation[] = [];
  mutationCalls = 0;
  snapshotCalls = 0;

  override async getSnapshot<const TStores extends readonly import("@/lib/storage/appStorageTypes").AppStoreName[]>(
    storeNames: TStores
  ): Promise<import("@/lib/storage/appStorageTypes").AppStorageSnapshot<TStores>> {
    this.snapshotCalls += 1;
    return super.getSnapshot(storeNames);
  }

  override async mutate(operations: readonly AppStorageMutation[]): Promise<void> {
    this.mutationCalls += 1;
    this.lastOperations = structuredClone(operations);
    await super.mutate(operations);
  }
}
