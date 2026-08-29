import { describe, expect, it } from "vitest";

import { createDrillSettings } from "@/features/drills/drillSettings";
import {
  createUserSettingsRecord,
  defaultUserSettingsId,
  loadUserDrillSettings,
  resetLocalData,
  saveUserDrillSettings
} from "@/features/settings/settingsPersistence";
import type { QuestionPackRecord } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("settings persistence", () => {
  it("stores and loads drill settings from the user settings store", async () => {
    const storage = new MemoryAppStorage();
    const settings = createDrillSettings({
      feedbackMode: "retry_first",
      questionCount: 8,
      tags: ["addition"]
    });

    await saveUserDrillSettings(storage, settings, "2026-06-02T00:00:00.000Z");

    expect(await storage.get("user_settings", defaultUserSettingsId)).toEqual(
      createUserSettingsRecord(settings, "2026-06-02T00:00:00.000Z")
    );
    expect(await loadUserDrillSettings(storage)).toEqual(settings);
  });

  it("returns undefined when no drill settings have been saved", async () => {
    await expect(loadUserDrillSettings(new MemoryAppStorage())).resolves.toBeUndefined();
  });

  it("clears local progress without removing question packs", async () => {
    const storage = new MemoryAppStorage();
    const questionPack = questionPackRecord();

    await storage.put("user_settings", createUserSettingsRecord(createDrillSettings({ questionCount: 3 }), "now"));
    await storage.put("question_packs", questionPack);
    await resetLocalData(storage);

    expect(await storage.getAll("user_settings")).toEqual([]);
    expect(await storage.getAll("question_packs")).toEqual([questionPack]);
  });
});

function questionPackRecord(): QuestionPackRecord {
  return {
    id: "pack-1",
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "fixed_numeric",
    packVersion: "1.0.0",
    title: "Custom arithmetic",
    questions: [],
    importedAt: "2026-06-02T00:00:00.000Z"
  };
}
