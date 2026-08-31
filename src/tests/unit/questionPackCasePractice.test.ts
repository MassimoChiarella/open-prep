import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { brainstormingPrompts } from "@/data/casePractice/brainstormingPrompts";
import { conceptLessons } from "@/data/casePractice/conceptLessons";
import { fitPracticePrompts } from "@/data/casePractice/fitPrompts";
import { brightCartFullCase } from "@/data/casePractice/fullCaseSimulations";
import { questioningPrompts } from "@/data/casePractice/questioningPrompts";
import { structuringPrompts } from "@/data/casePractice/structuringPrompts";
import { synthesisPrompts } from "@/data/casePractice/synthesisPrompts";
import {
  serializeQuestionPack,
  toQuestionPackCasePracticeContent,
  validateQuestionPackPayload
} from "@/features/question-packs/questionPack";
import { validateCasePracticeQuestionPackPayload } from "@/features/question-packs/questionPackCasePractice";

describe("case-practice question packs", () => {
  it("sanitizes every supported case-practice collection", () => {
    const result = validateCasePracticeQuestionPackPayload(
      {
        $schema: " ./question-pack-v2.schema.json ",
        ...validPayload(),
        title: " Case Practice Lab ",
        description: " Original local exercises. ",
        publisher: " Example School ",
        license: " CC-BY-4.0 "
      },
      "2026-08-12T12:00:00.000Z"
    );

    expect(result.status).toBe("valid");
    if (result.status === "invalid") throw new Error(result.errors.join("\n"));
    expect(result.pack).toMatchObject({
      id: "case-practice-lab",
      kind: "case_practice",
      schemaVersion: 2,
      title: "Case Practice Lab",
      description: "Original local exercises.",
      publisher: "Example School",
      license: "CC-BY-4.0",
      importedAt: "2026-08-12T12:00:00.000Z"
    });
    expect(result.pack.structuringPrompts).toHaveLength(1);
    expect(result.pack.brainstormingPrompts).toHaveLength(1);
    expect(result.pack.synthesisPrompts).toHaveLength(1);
    expect(result.pack.lessons).toHaveLength(1);
    expect(result.pack.fitPrompts).toHaveLength(1);
    expect(result.pack.fullCases).toHaveLength(1);
    expect(result.pack).not.toHaveProperty("$schema");
  });

  it("dispatches through the shared uploader and serializes as version two", () => {
    const result = validateQuestionPackPayload(validPayload(), "2026-08-12T12:00:00.000Z");

    expect(result.status).toBe("valid");
    if (result.status === "invalid") throw new Error(result.errors.join("\n"));
    expect(result.pack).toMatchObject({ kind: "case_practice", id: "case-practice-lab" });
    expect(JSON.parse(serializeQuestionPack(result.pack))).toMatchObject({
      $schema: "./question-pack-v2.schema.json",
      kind: "case_practice"
    });
  });

  it("preserves accepted hypothesis alternatives through standalone and full-case serialization", () => {
    const payload: unknown = clone(validPayload());
    const pack = asRecord(payload);
    const standalone = asRecord(asArray(pack.structuringPrompts)[0]);
    const fullCaseStructure = asRecord(asRecord(asArray(pack.fullCases)[0]).structure);
    const standaloneAlternate = asRecord(asArray(standalone.hypotheses)[1]).id;
    const fullCaseAlternate = asRecord(asArray(fullCaseStructure.hypotheses)[1]).id;
    standalone.acceptedHypothesisIds = [standalone.acceptedHypothesisId, standaloneAlternate];
    fullCaseStructure.acceptedHypothesisIds = [fullCaseStructure.acceptedHypothesisId, fullCaseAlternate];

    const result = validateQuestionPackPayload(payload, "2026-08-12T12:00:00.000Z");
    if (result.status === "invalid") throw new Error(result.errors.join("\n"));
    const serialized = serializeQuestionPack(result.pack);
    const revalidated = validateQuestionPackPayload(JSON.parse(serialized) as unknown);

    expect(revalidated.status).toBe("valid");
    if (revalidated.status === "invalid") throw new Error(revalidated.errors.join("\n"));
    expect(revalidated.pack).toMatchObject({
      structuringPrompts: [{ acceptedHypothesisIds: standalone.acceptedHypothesisIds }],
      fullCases: [{ structure: { acceptedHypothesisIds: fullCaseStructure.acceptedHypothesisIds } }]
    });
  });

  it("defines accepted hypothesis alternatives in the canonical v2 schema", () => {
    const schema = asRecord(JSON.parse(
      readFileSync(resolve(process.cwd(), "public", "question-pack-v2.schema.json"), "utf8")
    ) as unknown);
    const definition = asRecord(asRecord(schema.$defs).caseStructuringPrompt);
    const property = asRecord(asRecord(definition.properties).acceptedHypothesisIds);

    expect(property).toMatchObject({
      type: "array",
      minItems: 1,
      maxItems: 10,
      uniqueItems: true
    });
    expect(asRecord(property.items).$ref).toBe("#/$defs/id");
  });

  it("preserves accepted hypothesis alternatives in version-three full cases", () => {
    const payload: unknown = clone(validV3Payload());
    const structure = asRecord(asRecord(asArray(asRecord(payload).fullCases)[0]).structure);
    structure.acceptedHypothesisIds = [
      structure.acceptedHypothesisId,
      asRecord(asArray(structure.hypotheses)[1]).id
    ];

    const validated = validateQuestionPackPayload(payload);
    if (validated.status === "invalid") throw new Error(validated.errors.join("\n"));
    const revalidated = validateQuestionPackPayload(
      JSON.parse(serializeQuestionPack(validated.pack)) as unknown
    );

    expect(revalidated.status).toBe("valid");
    if (revalidated.status === "invalid") throw new Error(revalidated.errors.join("\n"));
    expect(revalidated.pack).toMatchObject({
      schemaVersion: 3,
      fullCases: [{ structure: { acceptedHypothesisIds: structure.acceptedHypothesisIds } }]
    });
  });

  it("accepts the shipped case-practice authoring example", () => {
    const payload = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "public", "question-pack-case-practice-example.mathdrill.json"),
        "utf8"
      )
    ) as unknown;
    const result = validateQuestionPackPayload(payload, "2026-08-12T12:00:00.000Z");

    expect(result.status).toBe("valid");
    if (result.status === "invalid") throw new Error(result.errors.join("\n"));
    expect(result.pack).toMatchObject({
      id: "example-harborfresh-case-practice",
      kind: "case_practice"
    });
  });

  it("accepts and serializes the shipped version-three questioning example", () => {
    const payload = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "public", "question-pack-case-questioning-example.mathdrill.json"),
        "utf8"
      )
    ) as unknown;
    const result = validateQuestionPackPayload(payload, "2026-08-12T12:00:00.000Z");

    expect(result.status).toBe("valid");
    if (result.status === "invalid") throw new Error(result.errors.join("\n"));
    expect(result.pack).toMatchObject({
      id: "customer-retention-questioning",
      kind: "case_practice",
      schemaVersion: 3,
      questioningPrompts: [expect.objectContaining({ id: "subscription_churn_questions" })]
    });
    expect(JSON.parse(serializeQuestionPack(result.pack))).toMatchObject({
      $schema: "./question-pack-v3.schema.json",
      schemaVersion: 3
    });
  });

  it("accepts the shipped version-three five-stage full-case example", () => {
    const payload = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "public", "question-pack-v3-full-case-example.mathdrill.json"),
        "utf8"
      )
    ) as unknown;
    const result = validateQuestionPackPayload(payload, "2026-08-12T12:00:00.000Z");

    if (result.status === "invalid") throw new Error(result.errors.join("\n"));
    expect(result.status).toBe("valid");
    expect(result.pack).toMatchObject({
      id: "aster-bikes-mobile-repair-full-case",
      kind: "case_practice",
      schemaVersion: 3,
      fullCases: [
        expect.objectContaining({
          calculationQuestionId: "river-weekly-contribution",
          id: "aster-bikes-repair-rollout",
          questioning: expect.objectContaining({ id: "aster-bikes-rollout-questions" })
        })
      ]
    });
    expect(JSON.parse(serializeQuestionPack(result.pack))).toMatchObject({
      $schema: "./question-pack-v3.schema.json",
      schemaVersion: 3
    });
  });

  it("accepts version-three questioning prompts and requires questioning in version-three full cases", () => {
    const valid = validateCasePracticeQuestionPackPayload(validV3Payload());
    expect(valid.status).toBe("valid");
    if (valid.status === "invalid") throw new Error(valid.errors.join("\n"));
    expect(valid.pack.questioningPrompts).toHaveLength(1);
    expect(valid.pack.fullCases?.[0]?.questioning).toBeDefined();
    const content = toQuestionPackCasePracticeContent(valid.pack);
    expect(content.questioningPrompts?.[0]?.id).toContain(":questioning:");
    expect(content.fullCases?.[0]?.questioning?.id).toContain(":full-case-questioning:");

    const missingQuestioning = clone(validV3Payload());
    delete asRecord(asArray(missingQuestioning.fullCases)[0]).questioning;
    expect(expectInvalid(missingQuestioning)).toContain(
      "$.fullCases[0].questioning is required in a schemaVersion 3 full case."
    );
  });

  it("rejects ambiguous or broken questioning rubrics", () => {
    const payload: unknown = clone(validV3Payload());
    const prompt = asRecord(asArray(asRecord(payload).questioningPrompts)[0]);
    const concepts = asArray(prompt.concepts);
    asRecord(concepts[1]).aliases = [asRecord(concepts[0]).aliases].flat();
    const intents = asArray(prompt.intents);
    asRecord(intents[0]).requiredConceptGroups = [["missing"]];
    for (const intent of intents) asRecord(intent).priority = false;
    const errors = expectInvalid(payload);

    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining("is shared by concepts"),
      expect.stringContaining("references unknown concept \"missing\""),
      expect.stringContaining("must mark at least one intent as a priority")
    ]));
  });

  it("limits partial-match concepts to an intent's required groups", () => {
    const payload: unknown = clone(validV3Payload());
    const prompt = asRecord(asArray(asRecord(payload).questioningPrompts)[0]);
    const intent = asRecord(asArray(prompt.intents)[0]);
    intent.supportingConceptIds = ["food"];

    expect(expectInvalid(payload)).toContain(
      "$.questioningPrompts[0].intents[0].supportingConceptIds must reference concepts used by requiredConceptGroups."
    );
  });

  it("requires content and validates semantic references", () => {
    const empty = expectInvalid({
      format: "math-drill-question-pack",
      schemaVersion: 2,
      kind: "case_practice",
      id: "empty-case-pack",
      packVersion: "1.0",
      title: "Empty Case Pack"
    });
    expect(empty).toContain(
      "$ must define at least one case-practice collection: structuringPrompts, brainstormingPrompts, synthesisPrompts, lessons, fitPrompts, questioningPrompts, fullCases."
    );

    const payload: unknown = clone(validPayload());
    const pack = asRecord(payload);
    pack.unexpected = true;
    asRecord(asArray(pack.structuringPrompts)[0]).acceptedHypothesisId = "missing";
    asRecord(asArray(pack.brainstormingPrompts)[0]).priorityIdeaIds = ["missing", "batch_routes"];
    asRecord(asRecord(asArray(pack.synthesisPrompts)[0]).correctResponse).recommendation = "missing";
    asRecord(asRecord(asArray(pack.lessons)[0]).knowledgeCheck).correctOptionId = "missing";
    asRecord(asArray(pack.fullCases)[0]).calculationQuestionId = "missing";
    const errors = expectInvalid(payload);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("$.unexpected is not an allowed property"),
        expect.stringContaining("acceptedHypothesisId must reference a hypothesis ID"),
        expect.stringContaining("priorityIdeaIds[0] must reference an idea ID"),
        expect.stringContaining("correctResponse.recommendation must reference an option ID"),
        expect.stringContaining("knowledgeCheck.correctOptionId must reference an option ID"),
        expect.stringContaining("calculationQuestionId must reference an exhibit question ID")
      ])
    );
  });

  it("rejects invalid accepted hypothesis alternatives", () => {
    const duplicatePayload: unknown = clone(validPayload());
    const duplicatePrompt = asRecord(asArray(asRecord(duplicatePayload).structuringPrompts)[0]);
    duplicatePrompt.acceptedHypothesisIds = [
      duplicatePrompt.acceptedHypothesisId,
      duplicatePrompt.acceptedHypothesisId
    ];
    expect(expectInvalid(duplicatePayload)).toContain(
      "$.structuringPrompts[0].acceptedHypothesisIds must not contain duplicate IDs."
    );

    const unknownPayload: unknown = clone(validPayload());
    const unknownPrompt = asRecord(asArray(asRecord(unknownPayload).structuringPrompts)[0]);
    unknownPrompt.acceptedHypothesisIds = [unknownPrompt.acceptedHypothesisId, "missing"];
    expect(expectInvalid(unknownPayload)).toContain(
      "$.structuringPrompts[0].acceptedHypothesisIds[1] must reference a hypothesis ID."
    );

    const missingPrimaryPayload: unknown = clone(validPayload());
    const missingPrimaryPrompt = asRecord(asArray(asRecord(missingPrimaryPayload).structuringPrompts)[0]);
    missingPrimaryPrompt.acceptedHypothesisIds = [
      asRecord(asArray(missingPrimaryPrompt.hypotheses)[1]).id
    ];
    expect(expectInvalid(missingPrimaryPayload)).toContain(
      "$.structuringPrompts[0].acceptedHypothesisIds must include acceptedHypothesisId."
    );
  });

  it("enforces collection limits and duplicate IDs", () => {
    const repeated = Array.from({ length: 101 }, () => fitPracticePrompts[0]);
    const errors = expectInvalid({ ...basePayload(), fitPrompts: repeated });

    expect(errors).toContain("$.fitPrompts must contain 1 to 100 items.");
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining("duplicates fit prompt ID")]));
  });

  it("namespaces runtime item IDs without changing local references or source content", () => {
    const result = validateCasePracticeQuestionPackPayload(validPayload());
    if (result.status === "invalid") throw new Error(result.errors.join("\n"));
    const sourceId = result.pack.fullCases?.[0]?.id;
    const content = toQuestionPackCasePracticeContent(result.pack);

    expect(content.structuringPrompts?.[0]?.id).toContain("question-pack:case-practice-lab:version:1.0:structuring:");
    expect(content.fitPrompts?.[0]?.id).toContain(":fit:");
    expect(content.fullCases?.[0]).toMatchObject({
      calculationQuestionId: brightCartFullCase.calculationQuestionId,
      exhibit: expect.objectContaining({ questions: expect.arrayContaining([expect.objectContaining({ id: brightCartFullCase.calculationQuestionId })]) })
    });
    expect(result.pack.fullCases?.[0]?.id).toBe(sourceId);
  });
});

function validPayload() {
  return clone({
    ...basePayload(),
    structuringPrompts: [structuringPrompts[0]],
    brainstormingPrompts: [brainstormingPrompts[0]],
    synthesisPrompts: [synthesisPrompts[0]],
    lessons: [conceptLessons[0]],
    fitPrompts: [fitPracticePrompts[0]],
    fullCases: [legacyFullCase()]
  });
}

function validV3Payload() {
  return clone({
    ...basePayload(),
    schemaVersion: 3,
    questioningPrompts: [questioningPrompts[0]],
    fullCases: [brightCartFullCase]
  });
}

function legacyFullCase() {
  const { questioning: _questioning, ...fullCase } = brightCartFullCase;
  return fullCase;
}

function basePayload() {
  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "case_practice",
    id: "case-practice-lab",
    packVersion: "1.0",
    title: "Case Practice Lab"
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Expected an object.");
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Expected an array.");
  return value;
}

function expectInvalid(payload: unknown): string[] {
  const result = validateCasePracticeQuestionPackPayload(payload);
  expect(result.status).toBe("invalid");
  if (result.status === "valid") throw new Error("Expected an invalid case-practice pack.");
  return result.errors;
}
