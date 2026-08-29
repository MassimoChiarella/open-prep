import { describe, expect, it } from "vitest";

import { validateBenchmarkQuestionPackPayload } from "@/features/question-packs/questionPackBenchmark";
import { questionPackMaxFileBytes } from "@/features/question-packs/questionPackValidation";

describe("validateBenchmarkQuestionPackPayload", () => {
  it("accepts, trims, and rebuilds a strict benchmark pack", () => {
    const result = validateBenchmarkQuestionPackPayload(
      {
        $schema: " ./question-pack-v2.schema.json ",
        ...validPayload(),
        title: " Timed Case Benchmark ",
        description: " A deterministic assessment. ",
        publisher: " Example School ",
        license: " CC-BY-4.0 ",
        benchmarks: [
          {
            ...validBenchmark(),
            title: " Core Case Math ",
            description: " Complete all questions before time expires. ",
            scoreBands: validScoreBands().map((band) => ({ ...band, title: ` ${band.title} ` })),
            questions: [validQuestion("margin-question")]
          }
        ]
      },
      "2026-08-10T16:00:00.000Z"
    );

    expect(result.status).toBe("valid");
    if (result.status === "invalid") throw new Error(result.errors.join("\n"));

    expect(result.pack).toMatchObject({
      format: "math-drill-question-pack",
      schemaVersion: 2,
      kind: "benchmark",
      id: "timed-case-benchmarks",
      packVersion: "1.0.0",
      title: "Timed Case Benchmark",
      description: "A deterministic assessment.",
      publisher: "Example School",
      license: "CC-BY-4.0",
      importedAt: "2026-08-10T16:00:00.000Z"
    });
    expect(result.pack).not.toHaveProperty("$schema");
    expect(result.pack.benchmarks[0]).toMatchObject({
      id: "core-case-math",
      title: "Core Case Math",
      description: "Complete all questions before time expires.",
      difficulty: "intermediate",
      totalSessionSeconds: 900,
      scoreBands: [
        { label: "needs_work", minAccuracy: 0, title: "Needs work" },
        { label: "developing", minAccuracy: 0.6, title: "Developing" },
        { label: "strong", minAccuracy: 0.75, title: "Strong" },
        { label: "excellent", minAccuracy: 0.9, title: "Excellent" }
      ]
    });
    expect(result.pack.benchmarks[0].questions[0]).toMatchObject({
      id: "margin-question",
      type: "numeric",
      category: "business_math",
      tags: ["margin", "division"],
      difficulty: "intermediate",
      expectedTimeSeconds: 45,
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
      }
    });
  });

  it("rejects invalid envelopes, unknown fields, reserved names, and duplicate IDs", () => {
    const first = validBenchmark("shared-benchmark", "shared-question");
    const question = first.questions[0];
    const reservedExplanation = JSON.parse(
      '{"short":"Explain it.","steps":["One step."],"constructor":"blocked"}'
    ) as unknown;
    const errors = expectInvalidErrors(
      validateBenchmarkQuestionPackPayload({
        ...validPayload(),
        format: "other-format",
        schemaVersion: 1,
        kind: "exhibit",
        id: "constructor",
        unexpected: true,
        benchmarks: [
          {
            ...first,
            unexpected: true,
            questions: [{ ...question, explanation: reservedExplanation }]
          },
          validBenchmark("shared-benchmark", "shared-question")
        ]
      })
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        '$.format must be "math-drill-question-pack".',
        "$.schemaVersion must be 2.",
        '$.kind must be "benchmark".',
        '$.id must not use the reserved ID "constructor".',
        "$.unexpected is not an allowed property.",
        "$.benchmarks[0].unexpected is not an allowed property.",
        "$.benchmarks[0].questions[0].explanation.constructor uses a reserved property name.",
        '$.benchmarks[1].id duplicates benchmark ID "shared-benchmark".',
        '$.benchmarks[1].questions[0].id duplicates question ID "shared-question".'
      ])
    );
  });

  it("enforces benchmark timers and the exact score-band contract", () => {
    const timerErrors = expectInvalidErrors(
      validateBenchmarkQuestionPackPayload({
        ...validPayload(),
        benchmarks: [
          { ...validBenchmark("short"), totalSessionSeconds: 29 },
          { ...validBenchmark("fractional", "fractional-question"), totalSessionSeconds: 60.5 },
          { ...validBenchmark("long", "long-question"), totalSessionSeconds: 7_201 }
        ]
      })
    );
    expect(timerErrors).toEqual(
      expect.arrayContaining([
        "$.benchmarks[0].totalSessionSeconds must be a whole number from 30 to 7200.",
        "$.benchmarks[1].totalSessionSeconds must be a whole number from 30 to 7200.",
        "$.benchmarks[2].totalSessionSeconds must be a whole number from 30 to 7200."
      ])
    );

    const tooFew = expectInvalidErrors(
      validateBenchmarkQuestionPackPayload({
        ...validPayload(),
        benchmarks: [{ ...validBenchmark(), scoreBands: validScoreBands().slice(0, 3) }]
      })
    );
    expect(tooFew).toContain("$.benchmarks[0].scoreBands must contain exactly 4 items.");

    const duplicateBands = validScoreBands();
    duplicateBands[1] = { ...duplicateBands[1], label: "needs_work" };
    expect(
      expectInvalidErrors(
        validateBenchmarkQuestionPackPayload({
          ...validPayload(),
          benchmarks: [{ ...validBenchmark(), scoreBands: duplicateBands }]
        })
      )
    ).toContain('$.benchmarks[0].scoreBands[1].label duplicates score-band label "needs_work".');

    const wrongThresholds = validScoreBands();
    wrongThresholds[0] = { ...wrongThresholds[0], minAccuracy: 0.1 };
    wrongThresholds[1] = { ...wrongThresholds[1], minAccuracy: 0.05 };
    const thresholdErrors = expectInvalidErrors(
      validateBenchmarkQuestionPackPayload({
        ...validPayload(),
        benchmarks: [{ ...validBenchmark(), scoreBands: wrongThresholds }]
      })
    );
    expect(thresholdErrors).toEqual(
      expect.arrayContaining([
        "$.benchmarks[0].scoreBands needs_work minAccuracy must be 0.",
        "$.benchmarks[0].scoreBands minAccuracy thresholds must strictly increase from needs_work through excellent."
      ])
    );

    const invalidNumbers = validScoreBands();
    invalidNumbers[2] = { ...invalidNumbers[2], minAccuracy: Number.NaN };
    invalidNumbers[3] = { ...invalidNumbers[3], minAccuracy: 1.1 };
    const numberErrors = expectInvalidErrors(
      validateBenchmarkQuestionPackPayload({
        ...validPayload(),
        benchmarks: [{ ...validBenchmark(), scoreBands: invalidNumbers }]
      })
    );
    expect(numberErrors).toEqual(
      expect.arrayContaining([
        "$.benchmarks[0].scoreBands[2].minAccuracy must be a finite number.",
        "$.benchmarks[0].scoreBands[3].minAccuracy must be from 0 to 1."
      ])
    );
  });

  it("applies the fixed numeric question rules inside each benchmark", () => {
    const question = validQuestion("prototype");
    const errors = expectInvalidErrors(
      validateBenchmarkQuestionPackPayload({
        ...validPayload(),
        benchmarks: [
          {
            ...validBenchmark(),
            questions: [
              {
                ...question,
                type: "multiple_choice",
                category: "sales",
                tags: ["margin", "margin"],
                difficulty: "hard",
                prompt: " ",
                expectedTimeSeconds: 3_601,
                extra: true,
                answer: {
                  ...question.answer,
                  unit: "credits",
                  tolerance: { type: "percentage", value: 1.1, extra: true },
                  errorChecks: {},
                  roundingRule: "bankers",
                  extra: true
                },
                explanation: { short: " ", steps: [], extra: true }
              }
            ]
          }
        ]
      })
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        "$.benchmarks[0].questions[0].extra is not an allowed property.",
        '$.benchmarks[0].questions[0].id must not use the reserved ID "prototype".',
        '$.benchmarks[0].questions[0].type must be "numeric".',
        expect.stringContaining("questions[0].category must be one of:"),
        '$.benchmarks[0].questions[0].tags[1] duplicates tag "margin".',
        expect.stringContaining("questions[0].difficulty must be one of:"),
        "$.benchmarks[0].questions[0].prompt must not be blank.",
        "$.benchmarks[0].questions[0].answer.extra is not an allowed property.",
        expect.stringContaining("questions[0].answer.unit must be one of:"),
        "$.benchmarks[0].questions[0].answer.tolerance.extra is not an allowed property.",
        "$.benchmarks[0].questions[0].answer.tolerance.value must be at most 1 (100%).",
        "$.benchmarks[0].questions[0].answer.errorChecks must define at least one error check.",
        expect.stringContaining("questions[0].answer.roundingRule must be one of:"),
        "$.benchmarks[0].questions[0].explanation.extra is not an allowed property.",
        "$.benchmarks[0].questions[0].explanation.short must not be blank.",
        "$.benchmarks[0].questions[0].explanation.steps must contain 1 to 10 items.",
        "$.benchmarks[0].questions[0].expectedTimeSeconds must be a whole number from 1 to 3600."
      ])
    );
  });

  it("enforces benchmark, question, and file-size caps", () => {
    const tooManyBenchmarks = Array.from({ length: 26 }, (_, index) =>
      validBenchmark(`benchmark-${index}`, `question-${index}`)
    );
    expect(
      expectInvalidErrors(validateBenchmarkQuestionPackPayload({ ...validPayload(), benchmarks: tooManyBenchmarks }))
    ).toContain("$.benchmarks must contain 1 to 25 items.");

    const tooManyQuestions = Array.from({ length: 51 }, (_, index) => validQuestion(`question-${index}`));
    expect(
      expectInvalidErrors(
        validateBenchmarkQuestionPackPayload({
          ...validPayload(),
          benchmarks: [{ ...validBenchmark(), questions: tooManyQuestions }]
        })
      )
    ).toContain("$.benchmarks[0].questions must contain 1 to 50 items.");

    expect(
      expectInvalidErrors(
        validateBenchmarkQuestionPackPayload({
          ...validPayload(),
          padding: "x".repeat(questionPackMaxFileBytes)
        })
      )
    ).toContain("$ exceeds the 5 MiB question-pack file limit.");
  });
});

function validPayload() {
  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "benchmark",
    id: "timed-case-benchmarks",
    packVersion: "1.0.0",
    title: "Timed Case Benchmarks",
    benchmarks: [validBenchmark()]
  };
}

function validBenchmark(id = "core-case-math", questionId = "margin-question") {
  return {
    id,
    title: "Core Case Math",
    description: "Complete all questions before time expires.",
    difficulty: "intermediate",
    totalSessionSeconds: 900,
    scoreBands: validScoreBands(),
    questions: [validQuestion(questionId)]
  };
}

function validScoreBands() {
  return [
    { label: "needs_work", minAccuracy: 0, title: "Needs work" },
    { label: "developing", minAccuracy: 0.6, title: "Developing" },
    { label: "strong", minAccuracy: 0.75, title: "Strong" },
    { label: "excellent", minAccuracy: 0.9, title: "Excellent" }
  ];
}

function validQuestion(id: string) {
  return {
    id,
    type: "numeric",
    category: "business_math",
    tags: ["margin", "division"],
    difficulty: "intermediate",
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

function expectInvalidErrors(result: ReturnType<typeof validateBenchmarkQuestionPackPayload>): string[] {
  expect(result.status).toBe("invalid");
  if (result.status === "valid") throw new Error("Expected an invalid benchmark pack.");
  return result.errors;
}
