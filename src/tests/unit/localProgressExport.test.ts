import { describe, expect, it } from "vitest";

import {
  buildLocalProgressExportFileName,
  createLocalProgressExport,
  createLocalProgressImportSummary,
  localProgressExportAppId,
  localProgressExportSchemaVersion,
  localProgressExportStoreNames,
  localProgressImportLimits,
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
    expect(localProgressExportSchemaVersion).toBe(4);
    expect(localProgressExportStoreNames).toEqual(progressStoreNames);
    expect(exported).toEqual({
      app: "consulting_math_drill_tool",
      exportedAt: "2026-06-02T00:00:00.000Z",
      privacyScope: "standard",
      schemaVersion: 4,
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
    expect(serializeLocalProgressExport(exported)).toContain('"schemaVersion": 4');
    expect(buildLocalProgressExportFileName(exported.exportedAt)).toBe("open-prep-progress-2026-06-02.json");
  });

  it("excludes private stories, profile, and notes by default and includes them only in a complete export", async () => {
    const storage = new MemoryAppStorage();
    const story = {
      action: "I aligned the team.",
      competency: "leadership" as const,
      id: "fit-story-1",
      kind: "fit_story" as const,
      reflection: "I would delegate earlier.",
      result: "Delivery recovered.",
      situation: "A private client situation.",
      task: "Recover delivery.",
      title: "Private leadership story",
      updatedAt: "2026-06-02T00:00:00.000Z"
    };

    await storage.put("practice_records", story);
    await storage.put("practice_records", {
      experienceLevel: "intermediate",
      id: "prep-profile",
      kind: "prep_profile",
      targetFirms: ["Firm A"],
      updatedAt: "2026-06-02T00:00:00.000Z",
      weeklySessions: 4
    });
    await storage.put("market_sizing_attempts", {
      id: "market-1",
      note: "Private sizing note",
      startedAt: "2026-06-02T00:00:00.000Z",
      templateId: "market-template-1"
    });

    const standard = await createLocalProgressExport(storage, "2026-06-02T00:01:00.000Z");
    const complete = await createLocalProgressExport(storage, "2026-06-02T00:01:00.000Z", "complete");

    expect(standard.privacyScope).toBe("standard");
    expect(standard.stores.practice_records).toEqual([]);
    expect(standard.stores.market_sizing_attempts[0]).not.toHaveProperty("note");
    expect(serializeLocalProgressExport(standard)).not.toContain(story.situation);
    expect(serializeLocalProgressExport(standard)).not.toContain("Private sizing note");
    expect(complete.privacyScope).toBe("complete");
    expect(complete.stores.practice_records).toEqual([
      story,
      expect.objectContaining({ id: "prep-profile", kind: "prep_profile" })
    ]);
    expect(complete.stores.market_sizing_attempts[0]).toHaveProperty("note", "Private sizing note");
    expect(validateLocalProgressImportPayload(JSON.parse(serializeLocalProgressExport(complete)))).toEqual({
      exportData: complete,
      status: "valid"
    });
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

  it.each([0, 4, 9])("keeps existing progress when atomic replacement fails at operation %i", async (failAt) => {
    const storage = new MemoryAppStorage(failAt);
    const oldSettings = createUserSettingsRecord(createDrillSettings({ questionCount: 3 }), "2026-06-02T00:00:00.000Z");
    const newSettings = createUserSettingsRecord(createDrillSettings({ questionCount: 8 }), "2026-06-03T00:00:00.000Z");
    const importData = emptyProgressExport("2026-06-03T00:01:00.000Z");

    importData.stores.user_settings = [newSettings];
    await storage.put("user_settings", oldSettings);

    await expect(replaceLocalProgressWithImport(storage, importData)).rejects.toThrow("Injected atomic mutation failure");
    expect(await storage.getAll("user_settings")).toEqual([oldSettings]);
    expect(await storage.getAll("responses")).toEqual([]);
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
      errors: ["Import schema version must be 3 or 4."],
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

  it("rejects shallow response impostors and does not mutate existing progress", async () => {
    const storage = new MemoryAppStorage();
    const existing = createUserSettingsRecord(createDrillSettings({ questionCount: 3 }), "2026-06-02T00:00:00.000Z");
    const malformed = {
      ...emptyProgressExport("2026-06-03T00:00:00.000Z"),
      stores: {
        ...emptyProgressExport("2026-06-03T00:00:00.000Z").stores,
        responses: [{ id: "bad" }]
      }
    };

    await storage.put("user_settings", existing);

    expect(validateLocalProgressImportPayload(malformed)).toEqual({
      errors: ['Store "responses" record 1 has invalid or missing fields.'],
      status: "invalid"
    });
    await expect(replaceLocalProgressWithImport(storage, malformed as LocalProgressExportV1)).rejects.toThrow(
      'Store "responses" record 1'
    );
    expect(await storage.getAll("user_settings")).toEqual([existing]);
  });

  it.each([
    { type: "absolute" },
    { type: "absolute", value: -1 },
    { type: "percentage", value: 1.1 },
    { max: 1, min: 2, type: "range" },
    { min: 0, type: "range" }
  ])("rejects an invalid stored answer tolerance: %o", (tolerance) => {
    const malformed = emptyProgressExport("2026-06-03T00:00:00.000Z");

    malformed.stores.drill_sessions = [{
      id: "session-with-invalid-tolerance",
      questionIds: ["question-1"],
      questions: [{
        answer: { tolerance, unit: "none", value: 1 },
        category: "arithmetic",
        difficulty: "beginner",
        explanation: { short: "Add the values.", steps: ["1 + 0 = 1"] },
        id: "question-1",
        prompt: "What is 1 + 0?",
        tags: ["addition"],
        type: "numeric"
      }],
      responses: [],
      settings: createDrillSettings({ questionCount: 1 }),
      startedAt: "2026-06-03T00:00:00.000Z",
      updatedAt: "2026-06-03T00:01:00.000Z"
    } as never];

    expect(validateLocalProgressImportPayload(malformed)).toEqual({
      errors: ['Store "drill_sessions" record 1 has invalid or missing fields.'],
      status: "invalid"
    });
  });

  it("deep-validates every progress store", () => {
    for (const storeName of progressStoreNames) {
      const valid = emptyProgressExport("2026-06-03T00:00:00.000Z");
      const malformed = {
        ...valid,
        stores: {
          ...valid.stores,
          [storeName]: [{ id: storeName === "user_settings" ? "default" : "bad" }]
        }
      };

      expect(validateLocalProgressImportPayload(malformed)).toEqual({
        errors: [`Store "${storeName}" record 1 has invalid or missing fields.`],
        status: "invalid"
      });
    }
  });

  it("enforces byte and nested-string limits at their boundaries", () => {
    const valid = emptyProgressExport("2026-06-02T00:00:00.000Z");
    const story = {
      action: "",
      competency: "impact",
      id: "fit-story-boundary",
      kind: "fit_story",
      reflection: "",
      result: "",
      situation: "x".repeat(localProgressImportLimits.maxStringLength),
      task: "",
      title: "",
      updatedAt: "2026-06-02T00:00:00.000Z"
    };
    const atStringLimit = { ...valid, stores: { ...valid.stores, practice_records: [story] } };

    expect(validateLocalProgressImportPayload(valid, { sourceBytes: localProgressImportLimits.maxFileBytes }).status).toBe("valid");
    expect(
      validateLocalProgressImportPayload(valid, { sourceBytes: localProgressImportLimits.maxFileBytes + 1 })
    ).toEqual({
      errors: [`Import file must be ${localProgressImportLimits.maxFileBytes} bytes or smaller.`],
      status: "invalid"
    });
    expect(validateLocalProgressImportPayload(atStringLimit).status).toBe("valid");
    expect(
      validateLocalProgressImportPayload({
        ...atStringLimit,
        stores: {
          ...atStringLimit.stores,
          practice_records: [{ ...story, situation: `${story.situation}x` }]
        }
      })
    ).toEqual({
      errors: [`Import file strings must be ${localProgressImportLimits.maxStringLength} characters or shorter.`],
      status: "invalid"
    });
  });

  it("accepts count limits exactly and rejects one additional record", () => {
    const valid = emptyProgressExport("2026-06-02T00:00:00.000Z");
    const attempts = Array.from({ length: localProgressImportLimits.maxRecordsPerStore }, (_, index) => ({
      completedAt: "2026-06-02T00:00:00.000Z",
      id: `attempt-${index}`,
      itemId: "item",
      kind: "attempt",
      maxScore: 10,
      module: "questioning",
      score: 5
    }));
    const exhibits = Array.from({ length: localProgressImportLimits.maxRecordsPerStore }, (_, index) => ({
      exhibitId: "exhibit",
      id: `exhibit-${index}`,
      startedAt: "2026-06-02T00:00:00.000Z"
    }));
    const atLimits = {
      ...valid,
      stores: { ...valid.stores, exhibit_attempts: exhibits, practice_records: attempts }
    };

    expect(validateLocalProgressImportPayload(atLimits).status).toBe("valid");

    const oneOverTotal = {
      ...atLimits,
      stores: {
        ...atLimits.stores,
        market_sizing_attempts: [
          { id: "market-over", startedAt: "2026-06-02T00:00:00.000Z", templateId: "template" }
        ]
      }
    };
    const totalResult = validateLocalProgressImportPayload(oneOverTotal);

    expect(totalResult.status).toBe("invalid");
    expect(totalResult).toMatchObject({
      errors: expect.arrayContaining([
        `Import file must contain ${localProgressImportLimits.maxTotalRecords} records or fewer.`
      ])
    });

    const oneOverStore = {
      ...valid,
      stores: {
        ...valid.stores,
        practice_records: [
          ...attempts,
          {
            completedAt: "2026-06-02T00:00:00.000Z",
            id: "attempt-over",
            itemId: "item",
            kind: "attempt",
            maxScore: 10,
            module: "questioning",
            score: 5
          }
        ]
      }
    };
    const storeResult = validateLocalProgressImportPayload(oneOverStore);

    expect(storeResult.status).toBe("invalid");
    expect(storeResult).toMatchObject({
      errors: expect.arrayContaining([
        `Store "practice_records" must contain ${localProgressImportLimits.maxRecordsPerStore} records or fewer.`
      ])
    });
  });

  it("normalizes supported legacy schema 3 exports as complete exports", () => {
    const current = emptyProgressExport("2026-06-02T00:00:00.000Z");
    const legacy = { ...current, privacyScope: undefined, schemaVersion: 3 };

    expect(validateLocalProgressImportPayload(legacy)).toEqual({
      exportData: { ...current, privacyScope: "complete" },
      status: "valid"
    });
  });
});

function emptyProgressExport(exportedAt: string): LocalProgressExportV1 {
  return {
    app: localProgressExportAppId,
    exportedAt,
    privacyScope: "standard",
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
