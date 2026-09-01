import { describe, expect, it, vi } from "vitest";

import { createDrillSettings } from "@/features/drills/drillSettings";
import { localePreferenceStorageKey } from "@/features/i18n/i18n";
import {
  questionPackPoolPreferenceStorageKey,
  serializeQuestionPackPoolPreference
} from "@/features/question-packs/questionPackPoolPreference";
import {
  buildCompleteBackupFileName,
  createCompleteBackupSummary,
  createCompleteBackupFromStorage,
  restoreCompleteBackup
} from "@/features/settings/completeBackupStorage";
import { completeBackupLimits, completeBackupStoreNames } from "@/features/settings/localDataInventory";
import { themePreferenceStorageKey } from "@/features/theme/theme";
import { timingAccommodationPreferenceKey } from "@/features/timing/timingAccommodationPreference";
import type { AppStorageMutation, AppStorageSnapshot } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const exportedAt = "2026-08-31T12:00:00.000Z";

describe("complete backup storage", () => {
  it("round-trips selected stores and preferences exactly without network access", async () => {
    const source = new MemoryAppStorage();
    const sourceSnapshot = populatedSnapshot();
    const sourcePreferences = new MemoryPreferenceStorage({
      [localePreferenceStorageKey]: "fr",
      [themePreferenceStorageKey]: "dark",
      [timingAccommodationPreferenceKey]: "time_and_a_half",
      [questionPackPoolPreferenceStorageKey]: serializeQuestionPackPoolPreference({
        mode: "selected_only",
        selectedPackIds: ["pack-1"]
      })
    });
    const target = new MemoryAppStorage();
    const targetPreferences = new MemoryPreferenceStorage();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await seed(source, sourceSnapshot);

    const backup = await createCompleteBackupFromStorage(source, {
      exportedAt,
      preferenceStorage: sourcePreferences,
      selectedOptionalScopes: ["private_text", "packs", "preferences"]
    });
    const result = await restoreCompleteBackup(target, backup, { preferenceStorage: targetPreferences });

    for (const storeName of completeBackupStoreNames) {
      expect(await target.getAll(storeName)).toEqual(sourceSnapshot[storeName]);
    }
    expect(targetPreferences.toObject()).toEqual(sourcePreferences.toObject());
    expect(result.preferences).toEqual({ failedKeys: [], status: "restored" });
    expect(createCompleteBackupSummary(backup)).toMatchObject({
      packCount: 1,
      preferencesIncluded: true,
      privateEntryCount: 3,
      progressRecordCount: 5,
      schemaVersion: 1
    });
    expect(buildCompleteBackupFileName(backup.exportedAt)).toBe("open-prep-complete-backup-2026-08-31.json");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("preserves private text, packs, and preferences when those scopes are absent", async () => {
    const source = new MemoryAppStorage();
    const target = new MemoryAppStorage();
    const preferences = new MemoryPreferenceStorage({
      [localePreferenceStorageKey]: "de",
      [themePreferenceStorageKey]: "light",
      [timingAccommodationPreferenceKey]: "double_time"
    });
    await source.put("practice_records", practiceAttempt("imported-attempt"));
    await source.put("market_sizing_attempts", {
      id: "shared-market",
      finalAnswer: "200",
      startedAt: exportedAt,
      templateId: "imported-template"
    });
    await target.put("practice_records", fitStory());
    await target.put("practice_records", prepProfile());
    await target.put("market_sizing_attempts", {
      id: "shared-market",
      note: "Keep this private note.",
      startedAt: "2026-08-30T12:00:00.000Z",
      templateId: "old-template"
    });
    await target.put("market_sizing_attempts", {
      id: "private-note-only",
      note: "Keep this record too.",
      startedAt: exportedAt,
      templateId: "private-template"
    });
    await target.put("question_packs", questionPack());

    const backup = await createCompleteBackupFromStorage(source, { exportedAt });
    const result = await restoreCompleteBackup(target, backup, { preferenceStorage: preferences });

    expect(await target.getAll("practice_records")).toEqual([
      practiceAttempt("imported-attempt"),
      fitStory(),
      prepProfile()
    ]);
    expect(await target.getAll("market_sizing_attempts")).toEqual([
      {
        finalAnswer: "200",
        id: "shared-market",
        note: "Keep this private note.",
        startedAt: exportedAt,
        templateId: "imported-template"
      },
      {
        id: "private-note-only",
        note: "Keep this record too.",
        startedAt: exportedAt,
        templateId: "private-template"
      }
    ]);
    expect(await target.getAll("question_packs")).toEqual([questionPack()]);
    expect(preferences.getItem(localePreferenceStorageKey)).toBe("de");
    expect(result.preferences.status).toBe("not_selected");
  });

  it("clears selected empty scopes", async () => {
    const source = new MemoryAppStorage();
    const target = new MemoryAppStorage();
    await target.put("practice_records", fitStory());
    await target.put("question_packs", questionPack());
    const backup = await createCompleteBackupFromStorage(source, {
      exportedAt,
      selectedOptionalScopes: ["private_text", "packs"]
    });

    await restoreCompleteBackup(target, backup);

    expect(await target.getAll("practice_records")).toEqual([]);
    expect(await target.getAll("question_packs")).toEqual([]);
  });

  it("leaves database and preferences unchanged when the atomic mutation fails", async () => {
    const source = new MemoryAppStorage();
    const target = new MemoryAppStorage(1);
    const preferences = new MemoryPreferenceStorage({
      [localePreferenceStorageKey]: "de",
      [themePreferenceStorageKey]: "light",
      [timingAccommodationPreferenceKey]: "standard"
    });
    await source.put("practice_records", practiceAttempt("new-attempt"));
    await target.put("practice_records", practiceAttempt("old-attempt"));
    const backup = await createCompleteBackupFromStorage(source, {
      exportedAt,
      preferenceStorage: new MemoryPreferenceStorage({
        [localePreferenceStorageKey]: "fr",
        [themePreferenceStorageKey]: "dark",
        [timingAccommodationPreferenceKey]: "double_time"
      }),
      selectedOptionalScopes: ["preferences"]
    });

    await expect(restoreCompleteBackup(target, backup, { preferenceStorage: preferences }))
      .rejects.toThrow("Injected atomic mutation failure");

    expect(await target.getAll("practice_records")).toEqual([practiceAttempt("old-attempt")]);
    expect(preferences.getItem(localePreferenceStorageKey)).toBe("de");
    expect(preferences.getItem(themePreferenceStorageKey)).toBe("light");
  });

  it("reports preference failures after the database commits", async () => {
    const source = new MemoryAppStorage();
    const target = new MemoryAppStorage();
    await source.put("practice_records", practiceAttempt("new-attempt"));
    const backup = await createCompleteBackupFromStorage(source, {
      exportedAt,
      preferenceStorage: new MemoryPreferenceStorage({
        [localePreferenceStorageKey]: "fr",
        [themePreferenceStorageKey]: "dark",
        [timingAccommodationPreferenceKey]: "double_time"
      }),
      selectedOptionalScopes: ["preferences"]
    });
    const preferences = new MemoryPreferenceStorage({}, themePreferenceStorageKey);

    const result = await restoreCompleteBackup(target, backup, { preferenceStorage: preferences });

    expect(await target.getAll("practice_records")).toEqual([practiceAttempt("new-attempt")]);
    expect(preferences.getItem(localePreferenceStorageKey)).toBe("fr");
    expect(preferences.getItem(timingAccommodationPreferenceKey)).toBe("double_time");
    expect(preferences.getItem(themePreferenceStorageKey)).toBeNull();
    expect(result.preferences).toEqual({ failedKeys: [themePreferenceStorageKey], status: "partial" });
  });

  it("rejects invalid or oversized input before any write", async () => {
    const source = new MemoryAppStorage();
    const target = new MutationCountingStorage();
    const preferences = new MemoryPreferenceStorage();
    const backup = await createCompleteBackupFromStorage(source, {
      exportedAt,
      selectedOptionalScopes: ["preferences"]
    });
    const tampered = structuredClone(backup);
    tampered.checksum.value = "b".repeat(64);

    await expect(restoreCompleteBackup(target, tampered, { preferenceStorage: preferences }))
      .rejects.toThrow(/checksum/i);
    await expect(restoreCompleteBackup(target, backup, {
      preferenceStorage: preferences,
      sourceBytes: completeBackupLimits.maxFileBytes + 1
    })).rejects.toThrow(/bytes or smaller/i);

    expect(target.mutationCount).toBe(0);
    expect(preferences.toObject()).toEqual({});
  });
});

class MemoryPreferenceStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly values = new Map<string, string>();

  constructor(initial: Record<string, string> = {}, private readonly failingKey?: string) {
    for (const [key, value] of Object.entries(initial)) this.values.set(key, value);
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (key === this.failingKey) throw new Error("Injected preference write failure.");
    this.values.set(key, value);
  }

  toObject(): Record<string, string> {
    return Object.fromEntries(this.values);
  }
}

class MutationCountingStorage extends MemoryAppStorage {
  mutationCount = 0;

  override async mutate(operations: readonly AppStorageMutation[]): Promise<void> {
    this.mutationCount += 1;
    await super.mutate(operations);
  }
}

async function seed(storage: MemoryAppStorage, snapshot: AppStorageSnapshot<typeof completeBackupStoreNames>): Promise<void> {
  const operations: AppStorageMutation[] = [];
  for (const storeName of completeBackupStoreNames) {
    for (const value of snapshot[storeName]) {
      operations.push({ storeName, type: "put", value } as AppStorageMutation);
    }
  }
  await storage.mutate(operations);
}

function populatedSnapshot(): AppStorageSnapshot<typeof completeBackupStoreNames> {
  return {
    benchmark_results: [],
    drill_sessions: [],
    exhibit_attempts: [],
    market_sizing_attempts: [{
      id: "market-1",
      note: "Private sizing note",
      startedAt: exportedAt,
      templateId: "market-template-1"
    }],
    mistake_notebook: [],
    practice_records: [practiceAttempt("attempt-1"), fitStory(), prepProfile()],
    question_packs: [questionPack()],
    responses: [],
    retry_schedules: [],
    user_settings: [{
      id: "default",
      settings: createDrillSettings({ questionCount: 1 }),
      updatedAt: exportedAt
    }]
  };
}

function practiceAttempt(id: string) {
  return {
    completedAt: exportedAt,
    durationSeconds: 60,
    id,
    itemId: "case-1",
    kind: "attempt" as const,
    maxScore: 10,
    module: "full_case" as const,
    score: 8,
    timingAccommodation: "time_and_a_half" as const
  };
}

function fitStory() {
  return {
    action: "I aligned the team.",
    competency: "leadership" as const,
    id: "fit-story-1",
    kind: "fit_story" as const,
    reflection: "I would delegate sooner.",
    result: "Delivery recovered.",
    situation: "Private client story",
    task: "Recover delivery.",
    title: "Leadership story",
    updatedAt: exportedAt
  };
}

function prepProfile() {
  return {
    experienceLevel: "intermediate" as const,
    id: "prep-profile" as const,
    kind: "prep_profile" as const,
    targetFirms: ["Firm A"],
    updatedAt: exportedAt,
    weeklySessions: 4
  };
}

function questionPack() {
  return {
    format: "math-drill-question-pack" as const,
    id: "pack-1",
    importedAt: exportedAt,
    kind: "fixed_numeric" as const,
    packVersion: "1.0.0",
    questions: [{
      answer: { tolerance: { type: "absolute" as const, value: 0 }, unit: "none" as const, value: 10 },
      category: "arithmetic" as const,
      difficulty: "beginner" as const,
      explanation: { short: "Add the values.", steps: ["Four plus six is ten."] },
      id: "addition-1",
      prompt: "What is 4 + 6?",
      tags: ["addition" as const],
      type: "numeric" as const
    }],
    schemaVersion: 2 as const,
    title: "Pack 1"
  };
}
