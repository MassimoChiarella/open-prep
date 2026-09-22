import { describe, expect, it } from "vitest";

import { createQuestionPackDrillSession } from "@/features/question-packs/questionPack";
import { createQuestionPackPoolSession } from "@/features/question-packs/questionPackPool";
import type { DrillSessionWriteToken, QuestionPackRecord } from "@/lib/storage/appStorageTypes";
import type { DrillSession, Question } from "@/lib/domain";
import { loadInProgressDrillSession, persistCompletedDrillSession } from "@/features/drills/drillPersistence";
import { submitAnswer } from "@/features/drills/answerSubmission";
import { completeDrillSession } from "@/features/drills/sessionCompletion";
import { createReviewDrillSession } from "@/features/drills/mistakeRetry";
import { createLocalProgressExport, replaceLocalProgressWithImport } from "@/features/settings/localProgressExport";
import { createCompleteBackupFilesFromStorage, restoreCompleteBackupFiles } from "@/features/settings/completeBackupStorage";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("question-pack drill pools", () => {
  it("resumes, reviews and backs up literal legacy IDs alongside new generated IDs", async () => {
    const storage = new MemoryAppStorage();
    // A pre-v2 stored snapshot: do not regenerate this fixture with the current encoder.
    const legacyQuestion: Question = {
      id: "question-pack:consistent-pack:shared-template-value-6", type: "numeric", category: "arithmetic",
      difficulty: "beginner", tags: ["addition"], prompt: "Pack-authored value: 6",
      answer: { value: 6, unit: "none", tolerance: { type: "absolute", value: 0.005 } },
      explanation: { short: "The answer is 6.", steps: ["The answer is 6."] },
      metadata: { sourceType: "generated", sourcePackId: "consistent-pack", sourceQuestionId: "shared-template-value-6", variables: { value: 6 } }
    };
    const legacySession: DrillSession = {
      id: "legacy-session", startedAt: "2026-06-02T00:00:00.000Z", questionIds: [legacyQuestion.id], responses: [],
      settings: { categories: ["arithmetic"], difficulty: "beginner", feedbackMode: "instant", questionCount: 1,
        questionPackId: "consistent-pack", timeMode: "untimed" }
    };
    await storage.put("drill_sessions", { ...legacySession, draftKey: "legacy-draft", questions: [legacyQuestion] });
    const resumed = await loadInProgressDrillSession(storage, "legacy-draft");
    expect(resumed?.questions).toEqual([legacyQuestion]);
    expect(resumed?.session.questionIds).toEqual([legacyQuestion.id]);
    if (resumed === undefined) throw new Error("Legacy draft was not restored.");
    const finish = async (session: DrillSession, questions: Question[], rawInput: string, endedAt: string, expectedToken?: DrillSessionWriteToken) => {
      const submitted = submitAnswer({ session, question: questions[0], rawInput, timeTakenSeconds: 2, submittedAt: endedAt });
      const completed = completeDrillSession({ session: submitted.session, questions, endedAt });
      await persistCompletedDrillSession({ storage, session: completed, questions, expectedToken });
    };
    await finish(resumed.session, resumed.questions, "5", "2026-06-02T00:00:02.000Z", resumed.token);
    const current = createQuestionPackDrillSession(generatedPack("consistent-pack", 6), {
      difficulty: "beginner", questionCount: 1, seed: "new-identity", startedAt: "2026-06-03T00:00:00.000Z"
    });
    expect(current.questions[0].id).toBe('question-pack:consistent-pack:shared-template:v2:[["value",6]]');
    expect(current.questions[0].metadata).toMatchObject({
      sourcePackId: "consistent-pack", sourceQuestionId: 'shared-template:v2:[["value",6]]'
    });
    await finish(current.session, current.questions, "6", "2026-06-03T00:00:02.000Z");

    const exported = await createLocalProgressExport(storage);
    const standardRestored = new MemoryAppStorage();
    await replaceLocalProgressWithImport(standardRestored, JSON.parse(JSON.stringify(exported)));
    expect((await standardRestored.getAll("responses")).map((response) => response.questionId)).toEqual([
      legacyQuestion.id, current.questions[0].id
    ]);
    const restored = new MemoryAppStorage();
    await restoreCompleteBackupFiles(restored, await createCompleteBackupFilesFromStorage(storage));
    const mistakes = await restored.getAll("mistake_notebook");
    const schedules = await restored.getAll("retry_schedules");
    expect(mistakes[0]).toMatchObject({ sourceQuestionId: legacyQuestion.id, sourceSessionId: legacySession.id });
    expect(schedules[0].sourceId).toBe(mistakes[0].id);
    const review = createReviewDrillSession(mistakes, {
      questionCount: 1, retrySchedules: schedules, now: "2026-06-05T00:00:00.000Z", startedAt: "2026-06-05T00:00:00.000Z"
    });
    expect(review.questions[0]).toMatchObject({
      id: `retry-${mistakes[0].id}`, prompt: legacyQuestion.prompt, answer: legacyQuestion.answer,
      metadata: { variables: { mistakeId: mistakes[0].id } }
    });
    expect((await restored.get("drill_sessions", legacySession.id))?.questionIds).toEqual([legacyQuestion.id]);
  });

  it("uses every selected fixed pack without leaking built-in questions in selected-only mode", () => {
    const created = createQuestionPackPoolSession({
      includeBuiltIn: false,
      packs: [fixedPack("pack-a", "a", 4), fixedPack("pack-b", "b", 7)],
      seed: "selected-only",
      settings: {
        categories: ["arithmetic"],
        difficulty: "beginner",
        questionCount: 2,
        tags: ["addition"]
      },
      startedAt: "2026-08-31T12:00:00.000Z"
    });

    expect(created.questions.map((question) => question.metadata?.sourcePackId).sort()).toEqual([
      "pack-a",
      "pack-b"
    ]);
    expect(created.questions.every((question) => question.id.startsWith("question-pack:"))).toBe(true);
    expect(created.session.settings.questionPackId).toBeUndefined();
  });

  it("filters fixed questions and shortens a scarce selected-only pool", () => {
    const pack = fixedPack("filtered", "matching", 10);
    if (pack.kind !== "fixed_numeric") throw new Error("Expected a fixed pack.");
    pack.questions.push({
      ...pack.questions[0],
      id: "wrong-tag",
      tags: ["subtraction"]
    });

    const created = createQuestionPackPoolSession({
      includeBuiltIn: false,
      packs: [pack],
      seed: "filtered",
      settings: {
        categories: ["arithmetic"],
        difficulty: "beginner",
        questionCount: 5,
        tags: ["addition"]
      }
    });

    expect(created.questions).toHaveLength(1);
    expect(created.questions[0].metadata?.sourceQuestionId).toBe("matching");
    expect(created.session.settings.questionCount).toBe(1);
  });

  it("namespaces colliding generated templates and preserves their pack provenance", () => {
    const created = createQuestionPackPoolSession({
      includeBuiltIn: false,
      packs: [generatedPack("generated-a", 3), generatedPack("generated-b", 9)],
      seed: "generated-collisions",
      settings: {
        categories: ["arithmetic"],
        difficulty: "beginner",
        questionCount: 2,
        tags: ["addition"]
      }
    });

    expect(new Set(created.questions.map((question) => question.id)).size).toBe(2);
    expect(created.questions.map((question) => question.metadata?.sourcePackId).sort()).toEqual([
      "generated-a",
      "generated-b"
    ]);
    expect(created.questions.map((question) => question.prompt).sort()).toEqual([
      "Pack-authored value: 3",
      "Pack-authored value: 9"
    ]);
    expect(created.similarQuestionTemplates).toHaveLength(2);
  });

  it("uses the same generated question identity in exact and pooled launches", () => {
    const pack = generatedPack("consistent-pack", 6);
    const exact = createQuestionPackDrillSession(pack, {
      difficulty: "beginner",
      questionCount: 1,
      seed: "exact"
    });
    const pooled = createQuestionPackPoolSession({
      includeBuiltIn: false,
      packs: [pack],
      seed: "pooled",
      settings: {
        categories: ["arithmetic"],
        difficulty: "beginner",
        questionCount: 1,
        tags: ["addition"]
      }
    });

    expect(pooled.questions[0].id).toBe(exact.questions[0].id);
    expect(pooled.questions[0].metadata?.sourceQuestionId).toBe(
      exact.questions[0].metadata?.sourceQuestionId
    );
  });

  it("fails closed when selected-only packs have no compatible standard questions", () => {
    expect(() => createQuestionPackPoolSession({
      includeBuiltIn: false,
      packs: [],
      seed: "empty",
      settings: { categories: ["arithmetic"], difficulty: "beginner", questionCount: 5 }
    })).toThrow("Selected packs only is active");
  });

  it("keeps both built-in and selected sources available in additive mode", () => {
    const pack = fixedPack("additive", "placeholder", 0);
    if (pack.kind !== "fixed_numeric") throw new Error("Expected a fixed pack.");
    pack.questions = Array.from({ length: 20 }, (_, index) => ({
      ...pack.questions[0],
      answer: { unit: "none" as const, value: index + 1 },
      id: `custom-${index}`,
      prompt: `What is ${index + 1}?`
    }));

    const created = createQuestionPackPoolSession({
      includeBuiltIn: true,
      packs: [pack],
      seed: "additive-seed",
      settings: {
        categories: ["arithmetic"],
        difficulty: "beginner",
        questionCount: 20,
        tags: ["addition"]
      }
    });

    expect(created.questions.some((question) => question.metadata?.sourcePackId === "additive")).toBe(true);
    expect(created.questions.some((question) => question.metadata?.sourcePackId === undefined)).toBe(true);
    expect(created.similarQuestionTemplates.some((template) => !template.id.startsWith("question-pack:"))).toBe(true);
  });
});

function fixedPack(packId: string, questionId: string, answer: number): QuestionPackRecord {
  return {
    format: "math-drill-question-pack",
    id: packId,
    importedAt: "2026-08-31T12:00:00.000Z",
    kind: "fixed_numeric",
    packVersion: "1.0.0",
    questions: [{
      answer: { unit: "none", value: answer },
      category: "arithmetic",
      difficulty: "beginner",
      explanation: { short: "Add.", steps: ["Add the values."] },
      id: questionId,
      prompt: `What is ${answer}?`,
      tags: ["addition"],
      type: "numeric"
    }],
    schemaVersion: 2,
    title: packId
  };
}

function generatedPack(packId: string, value: number): QuestionPackRecord {
  return {
    format: "math-drill-question-pack",
    id: packId,
    importedAt: "2026-08-31T12:00:00.000Z",
    kind: "generated_template",
    packVersion: "1.0.0",
    schemaVersion: 2,
    templates: [{
      answerUnit: "none",
      category: "arithmetic",
      difficulty: ["beginner"],
      explanationTemplate: { steps: ["The answer is {value}."] },
      formula: { expression: "value" },
      id: "shared-template",
      promptTemplate: "Pack-authored value: {value}",
      tags: ["addition"],
      variables: { value: { type: "integer", values: [value] } }
    }],
    title: packId
  };
}
