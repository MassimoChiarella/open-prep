import { describe, expect, it } from "vitest";

import {
  buildLocalProgressExportFileName,
  createLocalProgressExport,
  createLocalProgressImportSummary,
  localProgressExportAppId,
  localProgressExportSchemaVersion,
  localProgressExportStoreNames,
  replaceLocalProgressWithImport,
  serializeLocalProgressExport,
  validateLocalProgressImportPayload,
  type LocalProgressExportV1
} from "@/features/settings/localProgressExport";
import { createUserSettingsRecord } from "@/features/settings/settingsPersistence";
import { createDrillSettings } from "@/features/drills/drillSettings";
import {
  appDatabaseName,
  progressStoreNames,
  type QuestionPackRecord
} from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("local progress export schema", () => {
  it("defines a versioned export payload for progress stores", () => {
    const exported = emptyProgressExport("2026-06-02T00:00:00.000Z");

    expect(localProgressExportAppId).toBe(appDatabaseName);
    expect(localProgressExportSchemaVersion).toBe(3);
    expect(localProgressExportStoreNames).toEqual(progressStoreNames);
    expect(exported).toEqual({
      app: "consulting_math_drill_tool",
      exportedAt: "2026-06-02T00:00:00.000Z",
      schemaVersion: 3,
      stores: Object.fromEntries(progressStoreNames.map((storeName) => [storeName, []]))
    });
  });

  it("exports progress records without question packs", async () => {
    const storage = new MemoryAppStorage();
    const settings = createUserSettingsRecord(createDrillSettings({ questionCount: 3 }), "2026-06-02T00:00:00.000Z");

    await storage.put("user_settings", settings);
    await storage.put("question_packs", questionPackRecord());

    const exported = await createLocalProgressExport(storage, "2026-06-02T00:01:00.000Z");

    expect(Object.keys(exported.stores).sort()).toEqual([...progressStoreNames].sort());
    expect(exported.stores).not.toHaveProperty("question_packs");
    expect(exported.stores.user_settings).toEqual([settings]);
    expect(exported.stores.drill_sessions).toEqual([]);
    expect(serializeLocalProgressExport(exported)).toContain('"schemaVersion": 3');
    expect(buildLocalProgressExportFileName(exported.exportedAt)).toBe("math-drill-progress-2026-06-02.json");
  });

  it("replaces existing local data with imported records", async () => {
    const storage = new MemoryAppStorage();
    const oldSettings = createUserSettingsRecord(createDrillSettings({ questionCount: 3 }), "2026-06-02T00:00:00.000Z");
    const newSettings = createUserSettingsRecord(createDrillSettings({ questionCount: 8 }), "2026-06-03T00:00:00.000Z");
    const importData = emptyProgressExport("2026-06-03T00:01:00.000Z");
    const questionPack = questionPackRecord();

    importData.stores.user_settings = [newSettings];
    await storage.put("user_settings", oldSettings);
    await storage.put("question_packs", questionPack);

    await replaceLocalProgressWithImport(storage, importData);

    expect(await storage.getAll("user_settings")).toEqual([newSettings]);
    expect(await storage.getAll("drill_sessions")).toEqual([]);
    expect(await storage.getAll("question_packs")).toEqual([questionPack]);
  });

  it("summarizes imported local progress counts", () => {
    const imported = emptyProgressExport("2026-06-03T00:01:00.000Z");
    const settings = createUserSettingsRecord(createDrillSettings({ questionCount: 8 }), "2026-06-03T00:00:00.000Z");
    const score = {
      accuracy: 1,
      averageTimeSeconds: 10,
      categoryBreakdown: [],
      correctCount: 1,
      errorBreakdown: [],
      incorrectCount: 0,
      totalScore: 100
    };

    imported.stores.drill_sessions = [
      {
        id: "session-1",
        questionIds: ["question-1"],
        responses: [],
        settings: createDrillSettings({ questionCount: 1 }),
        startedAt: "2026-06-03T00:00:00.000Z",
        updatedAt: "2026-06-03T00:01:00.000Z"
      }
    ];
    imported.stores.responses = [
      {
        category: "business_math",
        errorTypes: ["none"],
        id: "session-1:question-1",
        isCorrect: true,
        questionId: "question-1",
        rawInput: "10",
        sessionId: "session-1",
        submittedAt: "2026-06-03T00:00:10.000Z",
        tags: ["margin", "revenue"],
        timeTakenSeconds: 10
      },
      {
        category: "business_math",
        errorTypes: ["arithmetic_error"],
        id: "session-1:question-2",
        isCorrect: false,
        questionId: "question-2",
        rawInput: "9",
        sessionId: "session-1",
        submittedAt: "2026-06-03T00:00:20.000Z",
        tags: ["margin"],
        timeTakenSeconds: 12
      }
    ];
    imported.stores.benchmark_results = [
      {
        benchmarkId: "baseline",
        completedAt: "2026-06-03T00:02:00.000Z",
        difficulty: "beginner",
        id: "benchmark-1",
        score,
        sessionId: "session-1"
      }
    ];
    imported.stores.market_sizing_attempts = [
      { id: "market-1", startedAt: "2026-06-03T00:00:00.000Z", templateId: "template-1" }
    ];
    imported.stores.exhibit_attempts = [
      { exhibitId: "exhibit-1", id: "exhibit-1", startedAt: "2026-06-03T00:00:00.000Z" }
    ];
    imported.stores.user_settings = [settings];

    expect(createLocalProgressImportSummary(imported)).toEqual({
      benchmarks: 1,
      exhibitAttempts: 1,
      marketSizingAttempts: 1,
      practiceRecords: 0,
      responses: 2,
      sessions: 1,
      settings: 1,
      skillScores: 2
    });
  });

  it("validates import payload app, schema, stores, and record ids", () => {
    const valid = emptyProgressExport("2026-06-02T00:00:00.000Z");

    expect(validateLocalProgressImportPayload(valid)).toEqual({ exportData: valid, status: "valid" });
    expect(validateLocalProgressImportPayload({ ...valid, app: "other" })).toEqual({
      errors: ["Import file was not created by this app."],
      status: "invalid"
    });
    expect(validateLocalProgressImportPayload({ ...valid, schemaVersion: 999 })).toEqual({
      errors: ["Import schema version must be 3."],
      status: "invalid"
    });
    expect(
      validateLocalProgressImportPayload({
        ...valid,
        stores: { ...valid.stores, user_settings: [{ updatedAt: "2026-06-02T00:00:00.000Z" }] }
      })
    ).toEqual({
      errors: ['Store "user_settings" record 1 must include an id.'],
      status: "invalid"
    });
    expect(validateLocalProgressImportPayload({ ...valid, stores: { ...valid.stores, responses: {} } })).toEqual({
      errors: ['Store "responses" must be an array.'],
      status: "invalid"
    });
  });
});

function emptyProgressExport(exportedAt: string): LocalProgressExportV1 {
  return {
    app: localProgressExportAppId,
    exportedAt,
    schemaVersion: localProgressExportSchemaVersion,
    stores: Object.fromEntries(
      progressStoreNames.map((storeName) => [storeName, []])
    ) as unknown as LocalProgressExportV1["stores"]
  };
}

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
