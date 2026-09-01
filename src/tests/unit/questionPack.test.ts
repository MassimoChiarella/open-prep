import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildQuestionPackDrillHref,
  createQuestionPackDrillSession,
  deleteQuestionPack,
  getQuestionPackDifficultyCounts,
  loadQuestionPacks,
  questionPackMaxFileBytes,
  questionPackMaxQuestions,
  saveQuestionPack,
  serializeQuestionPack,
  toQuestionPackQuestions,
  validateQuestionPackPayload
} from "@/features/question-packs/questionPack";
import {
  buildRepresentativeSamples,
  maxFormulaValidationSamples,
  questionPackMaxValidationErrors
} from "@/features/question-packs/questionPackValidation";
import type { Difficulty } from "@/lib/domain";
import type { FixedNumericQuestionPackRecord } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const publicQuestionPackAssets = [
  "question-pack-benchmark-example.mathdrill.json",
  "question-pack-case-practice-example.mathdrill.json",
  "question-pack-case-questioning-example.mathdrill.json",
  "question-pack-chart-example.mathdrill.json",
  "question-pack-example.mathdrill.json",
  "question-pack-exhibit-example.mathdrill.json",
  "question-pack-interview-math-example.mathdrill.json",
  "question-pack-market-sizing-cookbook.mathdrill.json",
  "question-pack-market-sizing-example.mathdrill.json",
  "question-pack-starter.mathdrill.json",
  "question-pack-template-example.mathdrill.json",
  "question-pack-v3-full-case-example.mathdrill.json",
  "question-pack-visualization-cookbook.mathdrill.json"
] as const;

describe("validateQuestionPackPayload", () => {
  it("accepts the public one-question starter", () => {
    const starter = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/question-pack-starter.mathdrill.json"), "utf8")
    ) as unknown;

    expect(validateQuestionPackPayload(starter).status).toBe("valid");
  });

  it("accepts, trims, and rebuilds a complete fixed-numeric pack", () => {
    const payload = {
      $schema: " ./question-pack-v2.schema.json ",
      ...validPayload(),
      title: " Company Case Prep ",
      description: " Specialized interview practice. ",
      publisher: " Example School ",
      license: " CC-BY-4.0 "
    };

    const result = validateQuestionPackPayload(payload, "2026-08-09T15:00:00.000Z");

    expect(result.status).toBe("valid");
    if (result.status === "invalid") {
      throw new Error(result.errors.join("\n"));
    }
    if (result.pack.kind !== "fixed_numeric") throw new Error("Expected a fixed-numeric pack.");

    expect(result.pack).toMatchObject({
      format: "math-drill-question-pack",
      schemaVersion: 2,
      kind: "fixed_numeric",
      id: "company-case-prep",
      packVersion: "1.0.0",
      title: "Company Case Prep",
      description: "Specialized interview practice.",
      publisher: "Example School",
      license: "CC-BY-4.0",
      importedAt: "2026-08-09T15:00:00.000Z"
    });
    expect(result.pack).not.toHaveProperty("$schema");
    expect(result.pack.questions[0]).toMatchObject({
      answer: {
        value: 0.25,
        unit: "percentage",
        tolerance: { type: "absolute", value: 0.001 },
        errorChecks: {
          percentagePointValue: 0.25,
          roundingTolerance: { type: "percentage", value: 0.01 }
        },
        roundingRule: "nearest_0_1"
      },
      expectedTimeSeconds: 45,
      explanation: {
        short: "Divide profit by revenue.",
        steps: ["Margin = 3 / 12 = 0.25, or 25%."],
        shortcut: "Cancel the millions before dividing."
      }
    });
  });

  it("bounds diagnostics without changing their order or logical validation count", () => {
    const payload = validPayload();
    payload.questions = Array.from({ length: questionPackMaxQuestions }, (_, index) => {
      const question = validQuestion(`invalid-${index + 1}`);
      Reflect.deleteProperty(question.answer, "unit");
      return question;
    });

    const errors = expectInvalidErrors(validateQuestionPackPayload(payload));

    expect(errors).toHaveLength(questionPackMaxValidationErrors + 1);
    expect(errors.slice(0, questionPackMaxValidationErrors)).toEqual(
      Array.from(
        { length: questionPackMaxValidationErrors },
        (_, index) => `$.questions[${index}].answer.unit is required.`
      )
    );
    expect(errors.at(-1)).toBe(
      `${questionPackMaxQuestions - questionPackMaxValidationErrors} additional validation errors were suppressed after the first ${questionPackMaxValidationErrors}.`
    );
  });

  it("accepts the public generated-template v2 example and rejects unsafe template content", () => {
    const payload = readPublicJson("question-pack-template-example.mathdrill.json") as {
      templates: Array<{
        formula: { expression: string };
        promptTemplate: string;
      }>;
    };
    const valid = validateQuestionPackPayload(payload, "2026-08-10T05:00:00.000Z");

    expect(valid.status).toBe("valid");
    if (valid.status === "invalid") throw new Error(valid.errors.join("\n"));
    expect(valid.pack).toMatchObject({
      schemaVersion: 2,
      kind: "generated_template",
      id: "example-generated-retail",
      importedAt: "2026-08-10T05:00:00.000Z"
    });

    payload.templates[0].formula.expression = "Math.max(units, price)";
    const invalid = expectInvalidErrors(validateQuestionPackPayload(payload));
    expect(invalid).toEqual(
      expect.arrayContaining([
        expect.stringContaining("references undeclared variable \"Math\""),
        expect.stringContaining("references undeclared variable \"max\"")
      ])
    );

    const badPlaceholder = readPublicJson("question-pack-template-example.mathdrill.json") as {
      templates: Array<{ promptTemplate: string }>;
    };
    badPlaceholder.templates[0].promptTemplate = "Use {missingValue}.";
    expect(expectInvalidErrors(validateQuestionPackPayload(badPlaceholder))).toEqual(
      expect.arrayContaining([
        expect.stringContaining("unresolved placeholder \"{missingValue}\""),
        expect.stringContaining("Missing template value \"missingValue\"")
      ])
    );
  });

  it("checks default-step range size and representative generated values", () => {
    const oversizedRange = {
      id: "oversized-default-step",
      category: "business_math",
      tags: ["revenue"],
      difficulty: ["beginner"],
      promptTemplate: "Use {value}.",
      variables: { value: { type: "decimal", min: 0, max: 1000.2 } },
      formula: { expression: "value" },
      answerUnit: "none",
      explanationTemplate: { steps: ["The answer is {answer}."] }
    };
    expect(expectInvalidErrors(validateQuestionPackPayload(generatedPayload([oversizedRange])))).toContain(
      "$.templates[0].variables.value range must contain at most 10001 values."
    );

    const unsafeValues = {
      ...oversizedRange,
      id: "representative-formula-check",
      variables: { denominator: { type: "integer", values: [...Array.from({ length: 99 }, (_, index) => index + 1), 0] } },
      promptTemplate: "Divide by {denominator}.",
      formula: { expression: "1 / denominator" }
    };
    expect(expectInvalidErrors(validateQuestionPackPayload(generatedPayload([unsafeValues])))).toEqual(
      expect.arrayContaining([
        expect.stringContaining("formula.expression fails for representative values (denominator=0)"),
        expect.stringContaining("Formula cannot divide by zero")
      ])
    );
  });

  it("validates and preserves generated-template comparison policies", () => {
    const template = {
      id: "generated-rounding-policy",
      category: "arithmetic",
      tags: ["division"],
      difficulty: ["beginner"],
      promptTemplate: "Divide {numerator} by {denominator}.",
      variables: {
        numerator: { type: "integer", values: [2] },
        denominator: { type: "integer", values: [3] }
      },
      formula: { expression: "numerator / denominator" },
      answerUnit: "none",
      tolerance: { type: "absolute", value: 0.005 },
      roundingRule: "nearest_0_1",
      explanationTemplate: { steps: ["The answer is {answer}."] }
    };
    const valid = validateQuestionPackPayload(generatedPayload([template]));

    expect(valid.status).toBe("valid");
    if (valid.status === "invalid" || valid.pack.kind !== "generated_template") return;
    expect(valid.pack.templates[0]).toMatchObject({
      tolerance: { type: "absolute", value: 0.005 },
      roundingRule: "nearest_0_1"
    });

    for (const [tolerance, expectedError] of [
      [{ type: "absolute", value: -1 }, "value must be non-negative"],
      [{ type: "absolute", value: 1_000_000_001 }, "value must be at most 1000000000"],
      [{ type: "percentage", value: 1.1 }, "value must be at most 1"],
      [{ type: "range", min: 2, max: 1 }, "min must be <= max"],
      [{ type: "absolute", value: 1, min: 0 }, "min and $.templates[0].tolerance.max are only allowed"]
    ] as const) {
      const errors = expectInvalidErrors(validateQuestionPackPayload(generatedPayload([{ ...template, tolerance }])));
      expect(errors.some((error) => error.includes(expectedError)), JSON.stringify(tolerance)).toBe(true);
    }
  });

  it("accepts a strict all-case v2 pack with Interview Math choices", () => {
    const result = validateQuestionPackPayload(generatedPayload([validCaseTemplate()]), "2026-08-10T06:00:00.000Z");

    expect(result.status).toBe("valid");
    if (result.status === "invalid") throw new Error(result.errors.join("\n"));
    if (result.pack.schemaVersion !== 2 || result.pack.kind !== "generated_template") {
      throw new Error("Expected a generated-template pack.");
    }
    expect(result.pack.templates[0]).toMatchObject({
      category: "case_math",
      caseStyle: {
        calculationStepCount: 2,
        industry: "retail",
        interviewMath: {
          expectedUnit: "currency",
          equationOptions: expect.arrayContaining([
            expect.objectContaining({ id: "equation-correct", formulaCorrect: true, setupCorrect: true })
          ]),
          interpretationOptions: expect.arrayContaining([
            expect.objectContaining({ id: "interpretation-correct", isCorrect: true })
          ])
        }
      }
    });
  });

  it("rejects mixed case packs, non-case categories, and invalid Interview Math choices", () => {
    const caseTemplate = validCaseTemplate();
    const { caseStyle: _caseStyle, ...plainTemplate } = caseTemplate;
    expect(
      expectInvalidErrors(
        validateQuestionPackPayload(generatedPayload([caseTemplate, { ...plainTemplate, id: "plain-template" }]))
      )
    ).toContain("$.templates must either all define caseStyle or all omit caseStyle.");

    const wrongCategory = { ...caseTemplate, category: "business_math" };
    expect(expectInvalidErrors(validateQuestionPackPayload(generatedPayload([wrongCategory])))).toContain(
      '$.templates[0].category must be "case_math" when caseStyle is defined.'
    );

    const invalidChoices = {
      ...caseTemplate,
      caseStyle: {
        ...caseTemplate.caseStyle,
        interviewMath: {
          ...caseTemplate.caseStyle.interviewMath,
          equationOptions: [
            { id: "same", label: "Same", formulaCorrect: true, setupCorrect: true, extra: true },
            { id: "same", label: "Same", formulaCorrect: true, setupCorrect: true }
          ],
          interpretationOptions: [
            { id: "same", label: "Same", isCorrect: false },
            { id: "same", label: "Same", isCorrect: false }
          ]
        }
      }
    };
    const errors = expectInvalidErrors(validateQuestionPackPayload(generatedPayload([invalidChoices])));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("equationOptions[0].extra is not an allowed property"),
        expect.stringContaining("equationOptions choice IDs must be unique"),
        expect.stringContaining("equationOptions choice labels must be unique"),
        expect.stringContaining("exactly one formula-correct and setup-correct choice"),
        expect.stringContaining("interpretationOptions choice IDs must be unique"),
        expect.stringContaining("interpretationOptions must contain exactly one correct choice")
      ])
    );
  });

  it("validates CaseStyle enums and placeholders in Interview Math labels", () => {
    const template = validCaseTemplate();
    const badEnums = {
      ...template,
      caseStyle: {
        ...template.caseStyle,
        calculationStepCount: 7,
        industry: "space",
        interviewMath: { ...template.caseStyle.interviewMath, expectedUnit: "watts" }
      }
    };
    expect(expectInvalidErrors(validateQuestionPackPayload(generatedPayload([badEnums])))).toEqual(
      expect.arrayContaining([
        expect.stringContaining("calculationStepCount must be one of: 2, 3, 4, 5, 6"),
        expect.stringContaining("industry must be one of"),
        expect.stringContaining("expectedUnit must be one of")
      ])
    );

    const { answerUnit: _answerUnit, ...missingAnswerUnit } = template;
    expect(expectInvalidErrors(validateQuestionPackPayload(generatedPayload([missingAnswerUnit])))).toContain(
      "$.templates[0].answerUnit must match $.templates[0].caseStyle.interviewMath.expectedUnit."
    );

    const badPlaceholder = {
      ...template,
      caseStyle: {
        ...template.caseStyle,
        interviewMath: {
          ...template.caseStyle.interviewMath,
          equationOptions: template.caseStyle.interviewMath.equationOptions.map((option, index) =>
            index === 0 ? { ...option, label: "Use {missingValue}." } : option
          )
        }
      }
    };
    expect(expectInvalidErrors(validateQuestionPackPayload(generatedPayload([badPlaceholder])))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('unresolved placeholder "{missingValue}"'),
        expect.stringContaining('Missing template value "missingValue"')
      ])
    );
  });

  it("rejects unknown and reserved properties, reserved IDs, and duplicate IDs", () => {
    const first = validQuestion("reserved-field-check");
    const payload = {
      ...validPayload(),
      id: "constructor",
      unexpected: true,
      questions: [
        { ...first, answer: { ...first.answer, constructor: "blocked" } },
        validQuestion("shared-id"),
        validQuestion("shared-id")
      ]
    };

    const result = validateQuestionPackPayload(payload);

    expect(expectInvalidErrors(result)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("$.unexpected"),
        expect.stringContaining("$.id must not use the reserved ID"),
        expect.stringContaining("$.questions[0].answer.constructor uses a reserved property name"),
        expect.stringContaining("$.questions[2].id duplicates question ID")
      ])
    );
  });

  it("validates enums, required units, finite answers, timing, tags, and explanations", () => {
    const question = validQuestion("invalid-fields");
    Reflect.deleteProperty(question.answer, "unit");
    question.answer.value = Number.NaN;
    question.category = "algebra";
    question.difficulty = "impossible";
    question.tags = ["margin", "margin", "unsupported_tag"];
    question.expectedTimeSeconds = 3_601;
    question.explanation.steps = [];

    const result = validateQuestionPackPayload({ ...validPayload(), questions: [question] });
    const errors = expectInvalidErrors(result);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("$.questions[0].category must be one of"),
        expect.stringContaining("$.questions[0].difficulty must be one of"),
        expect.stringContaining("$.questions[0].tags[1] duplicates tag"),
        expect.stringContaining("$.questions[0].tags[2] must be one of"),
        expect.stringContaining("$.questions[0].answer.value must be a finite number"),
        expect.stringContaining("$.questions[0].answer.unit is required"),
        expect.stringContaining("$.questions[0].expectedTimeSeconds must be a whole number from 1 to 3600"),
        expect.stringContaining("$.questions[0].explanation.steps must contain at least one step")
      ])
    );
  });

  it("enforces each tolerance shape and non-empty error checks", () => {
    const percentage = validQuestion("bad-percentage");
    percentage.answer.tolerance = { type: "percentage", value: 1.01 };
    percentage.answer.errorChecks = {};
    const range = validQuestion("bad-range");
    range.answer.tolerance = { type: "range", min: 10, max: 5 };
    const absolute = validQuestion("bad-absolute");
    absolute.answer.tolerance = { type: "absolute", value: -0.1, min: 0 };

    const result = validateQuestionPackPayload({
      ...validPayload(),
      questions: [percentage, range, absolute]
    });
    const errors = expectInvalidErrors(result);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("questions[0].answer.tolerance.value must be at most 1"),
        expect.stringContaining("questions[0].answer.errorChecks must define at least one"),
        expect.stringContaining("questions[1].answer.tolerance.min must be less than or equal"),
        expect.stringContaining("questions[2].answer.tolerance.min is not an allowed property"),
        expect.stringContaining("questions[2].answer.tolerance.value must be non-negative")
      ])
    );
  });

  it("enforces file, question, and text caps", () => {
    const oversizedPayload = {
      ...validPayload(),
      padding: "x".repeat(questionPackMaxFileBytes)
    };
    const tooManyQuestions = {
      ...validPayload(),
      questions: Array.from({ length: questionPackMaxQuestions + 1 }, (_, index) =>
        validQuestion(`question-${index}`)
      )
    };
    const longPrompt = validQuestion("long-prompt");
    longPrompt.prompt = "x".repeat(2_001);

    expect(expectInvalidErrors(validateQuestionPackPayload(oversizedPayload))).toContain(
      "$ exceeds the 5 MiB question-pack file limit."
    );
    expect(expectInvalidErrors(validateQuestionPackPayload(tooManyQuestions))).toContain(
      `$.questions must contain at most ${questionPackMaxQuestions} questions.`
    );
    expect(expectInvalidErrors(validateQuestionPackPayload({ ...validPayload(), questions: [longPrompt] }))).toContain(
      "$.questions[0].prompt must contain at most 2000 characters."
    );
  });

  it("measures multibyte JSON content in UTF-8 bytes", () => {
    const payload = {
      ...validPayload(),
      padding: "é".repeat(Math.floor(questionPackMaxFileBytes / 2))
    };
    const serialized = JSON.stringify(payload);

    expect(serialized.length).toBeLessThan(questionPackMaxFileBytes);
    expect(new TextEncoder().encode(serialized).byteLength).toBeGreaterThan(questionPackMaxFileBytes);
    expect(expectInvalidErrors(validateQuestionPackPayload(payload))).toContain(
      "$ exceeds the 5 MiB question-pack file limit."
    );
  });
});

describe("representative formula sampling", () => {
  it("covers small domains completely and caps large domains deterministically", () => {
    expect(buildRepresentativeSamples([
      ["left", [1, 2]],
      ["right", [10, 20]]
    ])).toEqual([
      { left: 1, right: 10 },
      { left: 1, right: 20 },
      { left: 2, right: 10 },
      { left: 2, right: 20 }
    ]);

    const largeDomain = Array.from(
      { length: 10 },
      (_, index) => [`value${index}`, [0, 1, 2, 3]] as const
    );
    const samples = buildRepresentativeSamples(largeDomain);

    expect(samples).toHaveLength(maxFormulaValidationSamples);
    expect(buildRepresentativeSamples(largeDomain)).toEqual(samples);
  });
});

describe("question-pack runtime", () => {
  it("imports, serializes, revalidates, installs, and reloads all 13 public examples", async () => {
    const storage = new MemoryAppStorage();

    for (const assetName of publicQuestionPackAssets) {
      const first = validateQuestionPackPayload(readPublicJson(assetName), "2026-08-29T12:00:00.000Z");
      expect(first.status, first.status === "invalid" ? first.errors.join("\n") : assetName).toBe("valid");
      if (first.status === "invalid") continue;
      const second = validateQuestionPackPayload(
        JSON.parse(serializeQuestionPack(first.pack)),
        "2026-08-29T12:00:00.000Z"
      );
      expect(second.status, second.status === "invalid" ? second.errors.join("\n") : assetName).toBe("valid");
      if (second.status === "valid") await saveQuestionPack(storage, second.pack);
    }

    expect(await loadQuestionPacks(storage)).toHaveLength(publicQuestionPackAssets.length);
  });

  it("serializes a validated pack without local storage metadata", () => {
    const serialized = JSON.parse(serializeQuestionPack({
      ...validatedPack(),
      catalogProvenance: {
        file: "public/community-packs/company-case-prep/1.0.0/pack.mathdrill.json",
        id: "company-case-prep",
        publisherId: "open-prep",
        reviewDate: "2026-08-31",
        sha256: "a".repeat(64),
        source: "repository_catalog",
        version: "1.0.0"
      }
    })) as Record<string, unknown>;

    expect(serialized.$schema).toBe("./question-pack-v2.schema.json");
    expect(serialized).not.toHaveProperty("catalogProvenance");
    expect(serialized).not.toHaveProperty("importedAt");
    expect(serialized).toMatchObject({ id: "company-case-prep", kind: "fixed_numeric", schemaVersion: 2 });
  });

  it("namespaces runtime questions and preserves source provenance", () => {
    const pack = validatedPack();
    const [question] = toQuestionPackQuestions(pack);

    expect(question).toMatchObject({
      id: "question-pack:company-case-prep:margin-001",
      type: "numeric",
      metadata: {
        sourceType: "manual",
        sourcePackId: "company-case-prep",
        sourceQuestionId: "margin-001",
        expectedTimeSeconds: 45
      }
    });

    question.tags.push("profit");
    question.explanation.steps.push("A runtime-only change.");
    expect(pack.questions[0].tags).toEqual(["margin"]);
    expect(pack.questions[0].explanation.steps).toHaveLength(1);
  });

  it("counts difficulties and creates a seeded, clamped drill session", () => {
    const payload = validPayload();
    payload.questions = [
      ...Array.from({ length: 12 }, (_, index) => validQuestion(`intermediate-${index}`, "intermediate")),
      validQuestion("advanced-1", "advanced")
    ];
    const pack = validatedPack(payload);
    const options = {
      difficulty: "intermediate" as const,
      questionCount: 99,
      seed: "repeatable",
      startedAt: "2026-08-09T16:00:00.000Z",
      sessionId: "pack-session"
    };

    const first = createQuestionPackDrillSession(pack, options);
    const second = createQuestionPackDrillSession(pack, options);

    expect(getQuestionPackDifficultyCounts(pack)).toEqual({
      beginner: 0,
      intermediate: 12,
      advanced: 1,
      expert: 0
    });
    expect(first.questions).toHaveLength(12);
    expect(first.questions.map(({ id }) => id)).toEqual(second.questions.map(({ id }) => id));
    expect(first.session).toMatchObject({
      id: "pack-session",
      startedAt: "2026-08-09T16:00:00.000Z",
      settings: {
        difficulty: "intermediate",
        questionCount: 12,
        questionPackId: "company-case-prep"
      }
    });
    expect(first.session.questionIds).toEqual(first.questions.map(({ id }) => id));
    expect(() =>
      createQuestionPackDrillSession(pack, { difficulty: "expert", questionCount: 1, seed: "none" })
    ).toThrow("has no expert questions");
  });

  it("builds the installed-pack drill URL", () => {
    expect(buildQuestionPackDrillHref("company-case-prep", "intermediate", 5)).toBe(
      "/drills/session?source=question_pack&pack=company-case-prep&difficulty=intermediate&count=5"
    );
  });

  it("generates deterministic namespaced variants from a v2 pack", () => {
    const validation = validateQuestionPackPayload(readPublicJson("question-pack-template-example.mathdrill.json"));
    if (validation.status === "invalid") throw new Error(validation.errors.join("\n"));
    if (validation.pack.schemaVersion !== 2) throw new Error("Expected a version-two pack.");

    const options = {
      difficulty: "beginner" as const,
      questionCount: 5,
      seed: "template-pack-seed",
      startedAt: "2026-08-10T05:10:00.000Z"
    };
    const first = createQuestionPackDrillSession(validation.pack, options);
    const second = createQuestionPackDrillSession(validation.pack, options);

    expect(first.interviewMathMode).toBe(false);
    expect(first.questions).toHaveLength(5);
    expect(first.questions.map(({ id }) => id)).toEqual(second.questions.map(({ id }) => id));
    expect(first.questions[0]).toMatchObject({
      id: expect.stringMatching(/^question-pack:example-generated-retail:/),
      metadata: {
        sourcePackId: "example-generated-retail",
        sourceQuestionId: expect.any(String),
        sourceType: "generated",
        variables: expect.any(Object)
      }
    });
    expect(first.session.settings).toMatchObject({
      questionCount: 5,
      questionPackId: "example-generated-retail"
    });
    expect(getQuestionPackDifficultyCounts(validation.pack)).toEqual({
      beginner: 1,
      intermediate: 1,
      advanced: 0,
      expert: 0
    });
    expect(JSON.parse(serializeQuestionPack(validation.pack))).toMatchObject({
      $schema: "./question-pack-v2.schema.json",
      schemaVersion: 2
    });
  });

  it("uses the available generated variants when fewer than requested exist", () => {
    const validation = validateQuestionPackPayload(generatedPayload([
      {
        id: "singleton-template",
        category: "business_math",
        tags: ["revenue"],
        difficulty: ["beginner"],
        promptTemplate: "Double {value}.",
        variables: { value: { type: "integer", values: [2] } },
        formula: { expression: "value * 2" },
        answerUnit: "none",
        explanationTemplate: { steps: ["{value} x 2 = {answer}."] }
      }
    ]));
    if (validation.status === "invalid") throw new Error(validation.errors.join("\n"));

    const options = { difficulty: "beginner" as const, questionCount: 5, seed: "singleton-pack" };
    const first = createQuestionPackDrillSession(validation.pack, options);
    const second = createQuestionPackDrillSession(validation.pack, options);

    expect(first.questions).toHaveLength(1);
    expect(first.questions.map(({ id }) => id)).toEqual(second.questions.map(({ id }) => id));
    expect(first.session.settings.questionCount).toBe(1);
  });

  it("surfaces a clean error if a stored generated pack fails at runtime", () => {
    const validation = validateQuestionPackPayload(generatedPayload([
      {
        id: "runtime-failure",
        category: "business_math",
        tags: ["revenue"],
        difficulty: ["beginner"],
        promptTemplate: "Use {value}.",
        variables: { value: { type: "integer", values: [2] } },
        formula: { expression: "value * 2" },
        answerUnit: "none",
        explanationTemplate: { steps: ["The result is {answer}."] }
      }
    ]));
    if (validation.status === "invalid") throw new Error(validation.errors.join("\n"));
    if (validation.pack.kind !== "generated_template") throw new Error("Expected a generated-template pack.");
    validation.pack.templates[0].formula.expression = "1 / (value - value)";

    expect(() => createQuestionPackDrillSession(validation.pack, {
      difficulty: "beginner",
      questionCount: 1,
      seed: "runtime-failure"
    })).toThrow(
      'Question pack "Case Template Pack" could not generate a safe beginner drill. Review its formulas and variable ranges. Formula cannot divide by zero.'
    );
  });

  it("activates structured Interview Math for a generated all-case pack", () => {
    const validation = validateQuestionPackPayload(generatedPayload([validCaseTemplate()]));
    if (validation.status === "invalid") throw new Error(validation.errors.join("\n"));
    if (validation.pack.schemaVersion !== 2) throw new Error("Expected a version-two pack.");

    const created = createQuestionPackDrillSession(validation.pack, {
      difficulty: "intermediate",
      questionCount: 3,
      seed: "case-pack-seed"
    });

    expect(created.interviewMathMode).toBe(true);
    expect(created.questions).toHaveLength(3);
    expect(created.questions.every((question) => question.metadata?.caseStyle !== undefined)).toBe(true);
    expect(created.questions[0].metadata?.caseStyle?.interviewMath).toMatchObject({
      expectedUnit: "currency",
      equationOptions: expect.arrayContaining([
        expect.objectContaining({ id: "equation-correct", setupCorrect: true })
      ]),
      interpretationOptions: expect.arrayContaining([
        expect.objectContaining({ id: "interpretation-correct", isCorrect: true })
      ])
    });
  });
});

describe("question-pack persistence", () => {
  it("saves, loads newest first, replaces by ID, and deletes packs", async () => {
    const storage = new MemoryAppStorage();
    const older = validatedPack(validPayload(), "2026-08-08T12:00:00.000Z");
    const newer = {
      ...validatedPack(
        { ...validPayload(), id: "school-pack", title: "School Pack" },
        "2026-08-09T12:00:00.000Z"
      )
    };

    await saveQuestionPack(storage, older);
    await saveQuestionPack(storage, newer);
    expect((await loadQuestionPacks(storage)).map(({ id }) => id)).toEqual(["school-pack", "company-case-prep"]);

    await saveQuestionPack(storage, { ...older, title: "Updated Pack", packVersion: "2.0.0" });
    expect(await storage.get("question_packs", older.id)).toMatchObject({ title: "Updated Pack", packVersion: "2.0.0" });

    await deleteQuestionPack(storage, newer.id);
    expect((await loadQuestionPacks(storage)).map(({ id }) => id)).toEqual(["company-case-prep"]);
  });
});

function validPayload() {
  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "fixed_numeric",
    id: "company-case-prep",
    packVersion: "1.0.0",
    title: "Company Case Prep",
    questions: [validQuestion("margin-001")]
  };
}

interface TestQuestionPayload {
  id: string;
  type: string;
  category: string;
  tags: string[];
  difficulty: string;
  prompt: string;
  answer: Record<string, unknown>;
  explanation: {
    short: string;
    steps: string[];
    shortcut?: string;
  };
  expectedTimeSeconds: number;
}

function validQuestion(id: string, difficulty: Difficulty = "intermediate"): TestQuestionPayload {
  return {
    id,
    type: "numeric",
    category: "business_math",
    tags: ["margin"],
    difficulty,
    prompt: "Revenue is $12M and profit is $3M. What is the profit margin?",
    answer: {
      value: 0.25,
      unit: "percentage",
      tolerance: { type: "absolute", value: 0.001 },
      errorChecks: {
        percentagePointValue: 0.25,
        roundingTolerance: { type: "percentage", value: 0.01 }
      },
      roundingRule: "nearest_0_1"
    },
    explanation: {
      short: "Divide profit by revenue.",
      steps: ["Margin = 3 / 12 = 0.25, or 25%."],
      shortcut: "Cancel the millions before dividing."
    },
    expectedTimeSeconds: 45
  };
}

function validatedPack(payload: unknown = validPayload(), importedAt?: string): FixedNumericQuestionPackRecord {
  const result = validateQuestionPackPayload(payload, importedAt);

  if (result.status === "invalid") {
    throw new Error(result.errors.join("\n"));
  }

  if (result.pack.kind !== "fixed_numeric") throw new Error("Expected a fixed-numeric pack.");
  return result.pack;
}

function expectInvalidErrors(result: ReturnType<typeof validateQuestionPackPayload>): string[] {
  expect(result.status).toBe("invalid");

  if (result.status === "valid") {
    throw new Error("Expected an invalid question pack.");
  }

  return result.errors;
}

function readPublicJson(fileName: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), "public", fileName), "utf8")) as unknown;
}

function generatedPayload(templates: unknown[]) {
  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "generated_template",
    id: "case-template-pack",
    packVersion: "1.0.0",
    title: "Case Template Pack",
    templates
  };
}

function validCaseTemplate() {
  return {
    id: "retail-profit-case",
    category: "case_math",
    tags: ["revenue", "margin"],
    difficulty: ["intermediate"],
    promptTemplate: "A retailer earns ${revenue} at a {margin}% margin. What is profit?",
    variables: {
      revenue: { type: "currency", values: [100, 200, 300] },
      margin: { type: "percentage", values: [10, 20, 30] }
    },
    formula: { expression: "revenue * margin / 100", outputVariable: "profit" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Multiply ${revenue} by {margin}%.", "Profit is ${profit}."]
    },
    caseStyle: {
      calculationStepCount: 2,
      industry: "retail",
      interviewMath: {
        expectedUnit: "currency",
        equationOptions: [
          {
            id: "equation-correct",
            label: "${revenue} x ({margin} / 100)",
            formulaCorrect: true,
            setupCorrect: true
          },
          {
            id: "equation-wrong",
            label: "${revenue} + {margin}",
            formulaCorrect: false,
            setupCorrect: false
          }
        ],
        interpretationOptions: [
          {
            id: "interpretation-correct",
            label: "Profit rises when revenue or margin rises.",
            isCorrect: true
          },
          {
            id: "interpretation-wrong",
            label: "Margin has no effect on profit.",
            isCorrect: false
          }
        ]
      }
    }
  };
}
