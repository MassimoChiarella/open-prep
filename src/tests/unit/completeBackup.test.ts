import { describe, expect, it } from "vitest";

import { createDrillSettings } from "@/features/drills/drillSettings";
import { localePreferenceStorageKey } from "@/features/i18n/i18n";
import {
  defaultQuestionPackPoolPreference,
  questionPackPoolPreferenceStorageKey,
  serializeQuestionPackPoolPreference
} from "@/features/question-packs/questionPackPoolPreference";
import {
  calculateCompleteBackupChecksum,
  completeBackupAppId,
  completeBackupChecksumAlgorithm,
  completeBackupFormat,
  completeBackupSchemaVersion,
  createCompleteBackup,
  serializeCompleteBackup,
  validateCompleteBackupPayload,
  type CompleteBackupSnapshot,
  type CompleteBackupV1
} from "@/features/settings/completeBackup";
import { completeBackupLimits, completeBackupStoreNames } from "@/features/settings/localDataInventory";
import { localProgressExportSchemaVersion } from "@/features/settings/localProgressExport";
import { themePreferenceStorageKey } from "@/features/theme/theme";
import { timingAccommodationPreferenceKey } from "@/features/timing/timingAccommodationPreference";

const exportedAt = "2026-08-31T12:00:00.000Z";

describe("complete backup schema", () => {
  it("creates a standard backup with every progress store and no unselected optional section", async () => {
    const snapshot = populatedSnapshot();
    const backup = await createCompleteBackup(snapshot, { exportedAt });

    expect(completeBackupStoreNames).toHaveLength(10);
    expect(backup).toMatchObject({
      app: completeBackupAppId,
      format: completeBackupFormat,
      schemaVersion: completeBackupSchemaVersion,
      exportedAt,
      selectedScopes: ["progress"],
      checksum: { algorithm: completeBackupChecksumAlgorithm }
    });
    expect(Object.keys(backup.sections.progress.stores).sort()).toEqual(
      completeBackupStoreNames.filter((name) => name !== "question_packs").sort()
    );
    expect(backup.sections).not.toHaveProperty("packs");
    expect(backup.sections).not.toHaveProperty("preferences");
    expect(backup.sections.progress.privacyScope).toBe("standard");
    expect(backup.sections.progress.stores.practice_records).toEqual([
      expect.objectContaining({ id: "attempt-1", kind: "attempt" })
    ]);
    expect(backup.sections.progress.stores.market_sizing_attempts[0]).not.toHaveProperty("note");
    expect(serializeCompleteBackup(backup)).not.toContain("Private client story");
    expect(serializeCompleteBackup(backup)).not.toContain("Private sizing note");
  });

  it("round-trips every store, private record, pack metadata, and supported preference exactly", async () => {
    const snapshot = populatedSnapshot();
    const backup = await createCompleteBackup(snapshot, {
      exportedAt,
      selectedOptionalScopes: ["preferences", "packs", "private_text"],
      preferences: {
        [localePreferenceStorageKey]: "fr",
        [themePreferenceStorageKey]: "dark",
        [timingAccommodationPreferenceKey]: "time_and_a_half",
        [questionPackPoolPreferenceStorageKey]: serializeQuestionPackPoolPreference({
          mode: "built_in_and_selected",
          selectedPackIds: ["pack-1"]
        })
      }
    });
    const validation = await validateCompleteBackupPayload(
      JSON.parse(serializeCompleteBackup(backup)),
      { sourceBytes: new TextEncoder().encode(serializeCompleteBackup(backup)).byteLength }
    );

    expect(backup.selectedScopes).toEqual(["progress", "private_text", "packs", "preferences"]);
    expect(backup.sections.progress.stores).toEqual(
      Object.fromEntries(completeBackupStoreNames.slice(0, -1).map((name) => [name, snapshot[name]]))
    );
    expect(backup.sections.packs).toEqual(snapshot.question_packs);
    expect(backup.sections.preferences).toEqual({
      [localePreferenceStorageKey]: "fr",
      [themePreferenceStorageKey]: "dark",
      [timingAccommodationPreferenceKey]: "time_and_a_half",
      [questionPackPoolPreferenceStorageKey]: serializeQuestionPackPoolPreference({
        mode: "built_in_and_selected",
        selectedPackIds: ["pack-1"]
      })
    });
    expect(validation).toEqual({ backup, status: "valid" });
  });

  it("normalizes missing or invalid preference inputs to their local defaults", async () => {
    const backup = await createCompleteBackup(emptySnapshot(), {
      exportedAt,
      selectedOptionalScopes: ["preferences"],
      preferences: {
        [localePreferenceStorageKey]: "not-a-locale",
        [themePreferenceStorageKey]: null,
        [timingAccommodationPreferenceKey]: "legacy"
      }
    });

    expect(backup.sections.preferences).toEqual({
      [localePreferenceStorageKey]: "auto",
      [themePreferenceStorageKey]: "system",
      [timingAccommodationPreferenceKey]: "standard",
      [questionPackPoolPreferenceStorageKey]: serializeQuestionPackPoolPreference(
        defaultQuestionPackPoolPreference
      )
    });
  });

  it("distinguishes selected empty sections from sections that were not selected", async () => {
    const unselected = await createCompleteBackup(emptySnapshot(), { exportedAt });
    const selected = await createCompleteBackup(emptySnapshot(), {
      exportedAt,
      selectedOptionalScopes: ["private_text", "packs", "preferences"]
    });

    expect(unselected.selectedScopes).toEqual(["progress"]);
    expect(unselected.sections).toEqual({ progress: unselected.sections.progress });
    expect(selected.selectedScopes).toEqual(["progress", "private_text", "packs", "preferences"]);
    expect(selected.sections.progress.privacyScope).toBe("complete");
    expect(selected.sections.packs).toEqual([]);
    expect(selected.sections.preferences).toBeDefined();
  });

  it("accepts legacy v3 progress semantics and normalizes them to current complete progress", async () => {
    const current = await createCompleteBackup(emptySnapshot(), {
      exportedAt,
      selectedOptionalScopes: ["private_text"]
    });
    const legacy = structuredClone(current) as unknown as Record<string, unknown>;
    const sections = legacy.sections as Record<string, unknown>;
    const progress = sections.progress as Record<string, unknown>;
    progress.schemaVersion = 3;
    delete progress.privacyScope;
    const signedLegacy = await resign(legacy);
    const validation = await validateCompleteBackupPayload(signedLegacy);

    expect(validation.status).toBe("valid");
    if (validation.status === "valid") {
      expect(validation.backup.sections.progress).toMatchObject({
        privacyScope: "complete",
        schemaVersion: localProgressExportSchemaVersion
      });
    }
  });

  it.each([
    ["app", (backup: Record<string, unknown>) => { backup.app = "other-app"; }, /not created by this app/i],
    ["format", (backup: Record<string, unknown>) => { backup.format = "other-format"; }, /format must be/i],
    ["schema", (backup: Record<string, unknown>) => { backup.schemaVersion = 2; }, /schema version/i],
    ["scope", (backup: Record<string, unknown>) => { backup.selectedScopes = ["progress", "unknown"]; }, /unsupported scope/i],
    ["duplicate scope", (backup: Record<string, unknown>) => { backup.selectedScopes = ["progress", "progress"]; }, /duplicates/i],
    ["required scope", (backup: Record<string, unknown>) => { backup.selectedScopes = []; }, /must select.*progress/i]
  ])("rejects an incompatible %s even with a matching checksum", async (_label, mutate, error) => {
    const backup = await createCompleteBackup(emptySnapshot(), { exportedAt });
    const candidate = structuredClone(backup) as unknown as Record<string, unknown>;
    mutate(candidate);

    await expectInvalid(await validateCompleteBackupPayload(await resign(candidate)), error);
  });

  it("rejects missing, extra, and malformed stores before restore", async () => {
    const backup = await createCompleteBackup(emptySnapshot(), { exportedAt });
    const missing = structuredClone(backup) as unknown as Record<string, unknown>;
    const missingStores = progressStores(missing);
    delete missingStores.responses;
    await expectInvalid(await validateCompleteBackupPayload(await resign(missing)), /Store "responses" must be an array/i);

    const extra = structuredClone(backup) as unknown as Record<string, unknown>;
    progressStores(extra).future_store = [];
    await expectInvalid(await validateCompleteBackupPayload(await resign(extra)), /future_store.*not supported/i);

    const invalidRecord = structuredClone(backup) as unknown as Record<string, unknown>;
    progressStores(invalidRecord).responses = [{ id: "bad" }];
    await expectInvalid(await validateCompleteBackupPayload(await resign(invalidRecord)), /record 1 has invalid/i);
  });

  it("rejects invalid or incomplete selected preferences", async () => {
    const backup = await createCompleteBackup(emptySnapshot(), {
      exportedAt,
      selectedOptionalScopes: ["preferences"]
    });
    const invalid = structuredClone(backup) as unknown as Record<string, unknown>;
    preferences(invalid)[themePreferenceStorageKey] = "sepia";
    await expectInvalid(await validateCompleteBackupPayload(await resign(invalid)), /theme preference is invalid/i);

    const incomplete = structuredClone(backup) as unknown as Record<string, unknown>;
    delete preferences(incomplete)[localePreferenceStorageKey];
    await expectInvalid(await validateCompleteBackupPayload(await resign(incomplete)), /represent every supported preference/i);

    const invalidPool = structuredClone(backup) as unknown as Record<string, unknown>;
    preferences(invalidPool)[questionPackPoolPreferenceStorageKey] = "not-json";
    await expectInvalid(await validateCompleteBackupPayload(await resign(invalidPool)), /question-pool preference is invalid/i);
  });

  it("accepts a legacy schema-one preference section without a question-pool preference", async () => {
    const backup = await createCompleteBackup(emptySnapshot(), {
      exportedAt,
      selectedOptionalScopes: ["preferences"]
    });
    const legacy = structuredClone(backup) as unknown as Record<string, unknown>;
    delete preferences(legacy)[questionPackPoolPreferenceStorageKey];
    const validation = await validateCompleteBackupPayload(await resign(legacy));

    expect(validation.status).toBe("valid");
    if (validation.status === "valid") {
      expect(validation.backup.schemaVersion).toBe(1);
      expect(validation.backup.sections.preferences?.[questionPackPoolPreferenceStorageKey]).toBe(
        serializeQuestionPackPoolPreference(defaultQuestionPackPoolPreference)
      );
    }
  });

  it("revalidates packs through the production parser and enforces stored provenance", async () => {
    const backup = await createCompleteBackup(populatedSnapshot(), {
      exportedAt,
      selectedOptionalScopes: ["packs"]
    });
    const malformed = structuredClone(backup) as unknown as Record<string, unknown>;
    const pack = packs(malformed)[0] as Record<string, unknown>;
    pack.format = "unknown-pack";
    await expectInvalid(await validateCompleteBackupPayload(await resign(malformed)), /pack 1.*format/i);

    const inconsistent = structuredClone(backup) as unknown as Record<string, unknown>;
    const provenance = (packs(inconsistent)[0] as Record<string, unknown>).catalogProvenance as Record<string, unknown>;
    provenance.version = "9.9.9";
    await expectInvalid(await validateCompleteBackupPayload(await resign(inconsistent)), /provenance.*inconsistent/i);

    const invalidLanguage = structuredClone(backup) as unknown as Record<string, unknown>;
    const invalidProvenance = (packs(invalidLanguage)[0] as Record<string, unknown>).catalogProvenance as Record<string, unknown>;
    invalidProvenance.language = "AR_ar";
    await expectInvalid(await validateCompleteBackupPayload(await resign(invalidLanguage)), /provenance.*inconsistent/i);
  });

  it("enforces inventory file, string, collection, pack, and total-record bounds", async () => {
    const backup = await createCompleteBackup(emptySnapshot(), { exportedAt });
    expect((await validateCompleteBackupPayload(backup, { sourceBytes: completeBackupLimits.maxFileBytes })).status).toBe("valid");
    await expectInvalid(
      await validateCompleteBackupPayload(backup, { sourceBytes: completeBackupLimits.maxFileBytes + 1 }),
      /bytes or smaller/i
    );

    const longString = structuredClone(backup) as unknown as Record<string, unknown>;
    longString.extra = "x".repeat(completeBackupLimits.maxStringLength + 1);
    await expectInvalid(await validateCompleteBackupPayload(await resign(longString)), /strings must be/i);

    const oversizedCollection = structuredClone(backup) as unknown as Record<string, unknown>;
    oversizedCollection.extra = Array.from({ length: completeBackupLimits.maxNestedCollectionItems + 1 }, () => 0);
    await expectInvalid(await validateCompleteBackupPayload(await resign(oversizedCollection)), /collections must contain/i);

    const withPacks = await createCompleteBackup(emptySnapshot(), {
      exportedAt,
      selectedOptionalScopes: ["packs"]
    });
    const tooManyPacks = structuredClone(withPacks) as unknown as Record<string, unknown>;
    (tooManyPacks.sections as Record<string, unknown>).packs = Array.from(
      { length: completeBackupLimits.maxQuestionPacks + 1 },
      (_, index) => questionPack(`pack-${index}`)
    );
    const packResult = await validateCompleteBackupPayload(await resign(tooManyPacks));
    await expectInvalid(packResult, /question packs or fewer/i);

    const tooManyRecords = structuredClone(withPacks) as unknown as Record<string, unknown>;
    progressStores(tooManyRecords).exhibit_attempts = Array.from(
      { length: completeBackupLimits.maxRecordsPerStore },
      () => ({})
    );
    progressStores(tooManyRecords).market_sizing_attempts = Array.from(
      { length: completeBackupLimits.maxRecordsPerStore },
      () => ({})
    );
    (tooManyRecords.sections as Record<string, unknown>).packs = Array.from(
      { length: completeBackupLimits.maxQuestionPacks + 1 },
      () => ({})
    );
    await expectInvalid(
      await validateCompleteBackupPayload(await resign(tooManyRecords)),
      /records or fewer/i
    );
  });

  it("detects checksum tampering and produces the same digest for different object key order", async () => {
    const backup = await createCompleteBackup(emptySnapshot(), { exportedAt });
    const tampered = structuredClone(backup);
    tampered.exportedAt = "2026-09-01T12:00:00.000Z";

    await expectInvalid(await validateCompleteBackupPayload(tampered), /checksum does not match/i);
    expect(await calculateCompleteBackupChecksum({ b: 2, a: 1 })).toBe(
      await calculateCompleteBackupChecksum({ a: 1, b: 2 })
    );
  });

  it("rejects internally inconsistent scope presence, timestamps, and privacy", async () => {
    const selected = await createCompleteBackup(emptySnapshot(), {
      exportedAt,
      selectedOptionalScopes: ["private_text", "packs"]
    });
    const missingPacks = structuredClone(selected) as unknown as Record<string, unknown>;
    delete (missingPacks.sections as Record<string, unknown>).packs;
    await expectInvalid(await validateCompleteBackupPayload(await resign(missingPacks)), /packs section must be present/i);

    const timestamp = structuredClone(selected) as unknown as Record<string, unknown>;
    ((timestamp.sections as Record<string, unknown>).progress as Record<string, unknown>).exportedAt =
      "2026-09-01T12:00:00.000Z";
    await expectInvalid(await validateCompleteBackupPayload(await resign(timestamp)), /timestamps must match/i);

    const privacy = structuredClone(selected) as unknown as Record<string, unknown>;
    ((privacy.sections as Record<string, unknown>).progress as Record<string, unknown>).privacyScope = "standard";
    await expectInvalid(await validateCompleteBackupPayload(await resign(privacy)), /privacyScope must match/i);
  });

  it("rejects malformed payloads and invalid checksum metadata", async () => {
    await expectInvalid(await validateCompleteBackupPayload(null), /JSON object/i);

    const backup = await createCompleteBackup(emptySnapshot(), { exportedAt });
    const malformed = structuredClone(backup) as unknown as Record<string, unknown>;
    malformed.checksum = { algorithm: "MD5", value: "nope" };
    const result = await validateCompleteBackupPayload(malformed);
    await expectInvalid(result, /algorithm must be/i);
    await expectInvalid(result, /lowercase SHA-256/i);
  });
});

function emptySnapshot(): CompleteBackupSnapshot {
  return Object.fromEntries(
    completeBackupStoreNames.map((storeName) => [storeName, []])
  ) as unknown as CompleteBackupSnapshot;
}

function populatedSnapshot(): CompleteBackupSnapshot {
  const score = {
    accuracy: 1,
    averageTimeSeconds: 20,
    categoryBreakdown: [],
    correctCount: 1,
    errorBreakdown: [],
    incorrectCount: 0,
    totalScore: 100
  };
  const settings = createDrillSettings({ questionCount: 1 });

  return {
    drill_sessions: [{
      id: "session-1",
      questionIds: ["question-1"],
      responses: [],
      settings,
      startedAt: exportedAt,
      updatedAt: exportedAt
    }],
    responses: [{
      category: "arithmetic",
      errorTypes: ["none"],
      id: "response-1",
      isCorrect: true,
      questionId: "question-1",
      rawInput: "10",
      sessionId: "session-1",
      submittedAt: exportedAt,
      tags: ["addition"],
      timeTakenSeconds: 20
    }],
    benchmark_results: [{
      benchmarkId: "benchmark-1",
      completedAt: exportedAt,
      difficulty: "beginner",
      id: "benchmark-result-1",
      score,
      sessionId: "session-1"
    }],
    user_settings: [{ id: "default", settings, updatedAt: exportedAt }],
    market_sizing_attempts: [{
      id: "market-1",
      note: "Private sizing note",
      startedAt: exportedAt,
      templateId: "market-template-1"
    }],
    exhibit_attempts: [{ exhibitId: "exhibit-1", id: "exhibit-attempt-1", startedAt: exportedAt }],
    mistake_notebook: [{
      answer: { tolerance: { type: "absolute", value: 0 }, unit: "none", value: 10 },
      category: "arithmetic",
      difficulty: "beginner",
      errorTypes: ["arithmetic_error"],
      explanation: { short: "Add the values.", steps: ["Four plus six is ten."] },
      id: "mistake-1",
      missedAt: exportedAt,
      prompt: "What is 4 + 6?",
      rawInput: "9",
      retryCount: 0,
      sourceQuestionId: "question-1",
      sourceType: "drill",
      status: "unresolved",
      tags: ["addition"]
    }],
    retry_schedules: [{
      attemptCount: 0,
      createdAt: exportedAt,
      dueAt: exportedAt,
      id: "retry-1",
      intervalDays: 1,
      sourceId: "mistake-1",
      sourceType: "mistake_notebook",
      updatedAt: exportedAt
    }],
    practice_records: [{
      completedAt: exportedAt,
      id: "attempt-1",
      itemId: "case-1",
      kind: "attempt",
      maxScore: 10,
      module: "full_case",
      score: 8
    }, {
      experienceLevel: "intermediate",
      id: "prep-profile",
      kind: "prep_profile",
      targetFirms: ["Firm A"],
      updatedAt: exportedAt,
      weeklySessions: 4
    }, {
      action: "I aligned the team.",
      competency: "leadership",
      id: "fit-story-1",
      kind: "fit_story",
      reflection: "I would delegate sooner.",
      result: "Delivery recovered.",
      situation: "Private client story",
      task: "Recover delivery.",
      title: "Leadership story",
      updatedAt: exportedAt
    }],
    question_packs: [questionPack("pack-1", true)]
  };
}

function questionPack(id: string, withProvenance = false): CompleteBackupSnapshot["question_packs"][number] {
  return {
    format: "math-drill-question-pack",
    id,
    importedAt: exportedAt,
    kind: "fixed_numeric",
    packVersion: "1.0.0",
    questions: [{
      answer: { tolerance: { type: "absolute", value: 0 }, unit: "none", value: 10 },
      category: "arithmetic",
      difficulty: "beginner",
      explanation: { short: "Add the values.", steps: ["Four plus six is ten."] },
      id: "addition-1",
      prompt: "What is 4 + 6?",
      tags: ["addition"],
      type: "numeric"
    }],
    schemaVersion: 2,
    title: `Pack ${id}`,
    ...(withProvenance ? {
      catalogProvenance: {
        file: `/community-packs/${id}/1.0.0/pack.mathdrill.json`,
        id,
        language: "ar",
        publisherId: "open-prep",
        reviewDate: "2026-08-31",
        sha256: "a".repeat(64),
        source: "repository_catalog" as const,
        version: "1.0.0"
      }
    } : {})
  };
}

async function resign(value: Record<string, unknown>): Promise<Record<string, unknown>> {
  const unsigned = structuredClone(value);
  delete unsigned.checksum;
  return {
    ...unsigned,
    checksum: {
      algorithm: completeBackupChecksumAlgorithm,
      value: await calculateCompleteBackupChecksum(unsigned)
    }
  };
}

async function expectInvalid(
  result: Awaited<ReturnType<typeof validateCompleteBackupPayload>>,
  error: RegExp
): Promise<void> {
  expect(result.status).toBe("invalid");
  if (result.status === "invalid") expect(result.errors.join("\n")).toMatch(error);
}

function progressStores(backup: Record<string, unknown>): Record<string, unknown> {
  return (((backup.sections as Record<string, unknown>).progress as Record<string, unknown>).stores) as Record<string, unknown>;
}

function preferences(backup: Record<string, unknown>): Record<string, unknown> {
  return (backup.sections as Record<string, unknown>).preferences as Record<string, unknown>;
}

function packs(backup: Record<string, unknown>): unknown[] {
  return (backup.sections as Record<string, unknown>).packs as unknown[];
}
