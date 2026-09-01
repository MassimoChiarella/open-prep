import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  communityPackCatalogManifestFile,
  communityPackCatalogSourceRoot,
  communityPackContentLicenseIds,
  getCommunityPackFilePath,
  parseCommunityPackReviewMetadata,
  type CommunityPackReviewContext
} from "@/features/question-packs/communityPackCatalog";

const fixtureDirectory = resolve(process.cwd(), "src/tests/fixtures/community-packs");
const expectedPackFile =
  "public/community-packs/profitability-foundations/1.0.0/pack.mathdrill.json";
const context: CommunityPackReviewContext = {
  directoryId: "profitability-foundations",
  directoryVersion: "1.0.0",
  packFile: expectedPackFile,
  pack: {
    id: "profitability-foundations",
    packVersion: "1.0.0",
    title: "Profitability foundations",
    kind: "fixed_numeric",
    schemaVersion: 2
  }
};

describe("community pack catalog review metadata", () => {
  it("freezes the source layout, manifest path, and exact content-license allowlist", () => {
    expect(communityPackCatalogSourceRoot).toBe("public/community-packs");
    expect(communityPackCatalogManifestFile).toBe("public/community-packs/catalog.v1.json");
    expect(getCommunityPackFilePath("profitability-foundations", "1.0.0")).toBe(expectedPackFile);
    expect(communityPackContentLicenseIds).toEqual(["CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0"]);
  });

  it("parses complete repository-owned review metadata deterministically without mutation", () => {
    const payload = fixture("valid-review.json");
    const before = JSON.stringify(payload);
    const first = parseCommunityPackReviewMetadata(payload, context);
    const second = parseCommunityPackReviewMetadata(payload, context);

    expect(first).toEqual(second);
    expect(JSON.stringify(payload)).toBe(before);
    expect(first).toMatchObject({
      status: "valid",
      metadata: {
        id: "profitability-foundations",
        version: "1.0.0",
        file: expectedPackFile,
        language: "en",
        contentLicenseId: "CC-BY-4.0",
        review: {
          checks: {
            editorial: { result: "pass" },
            factual: { result: "pass" },
            answerKey: { result: "pass" },
            accessibility: { result: "pass" },
            rights: { result: "pass" }
          }
        },
        events: [{ type: "accepted" }]
      }
    });
  });

  it.each([
    ["invalid-unsafe-path.json", "$.file must be a safe POSIX repository-relative path."],
    ["invalid-license.json", "$.contentLicenseId must be one of: CC0-1.0, CC-BY-4.0, CC-BY-SA-4.0."],
    ["invalid-checksum.json", "$.sha256 must be a lowercase 64-character SHA-256 checksum."],
    ["invalid-identity-mismatch.json", "$.id must match the repository directory ID."]
  ])("rejects %s with an actionable diagnostic", (fileName, expectedError) => {
    expect(errorsFor(fixture(fileName))).toContain(expectedError);
  });

  it("rejects missing rights, provenance, and accessibility review evidence", () => {
    const errors = errorsFor(fixture("invalid-missing-governance.json"));

    expect(errors).toEqual(
      expect.arrayContaining([
        "$.rights must be an object.",
        "$.provenance must be an object.",
        "$.review.checks.accessibility must be an object."
      ])
    );
  });

  it("rejects reviewed or badge state declared as metadata fields", () => {
    for (const field of ["badge", "repositoryReviewed", "reviewed", "reviewStatus"] as const) {
      const payload = fixture("valid-review.json");
      payload[field] = field === "badge" ? "Repository reviewed" : true;

      expect(errorsFor(payload)).toContain(`$.${field} must not self-declare repository review or badge state.`);
    }
  });

  it("rejects duplicate controlled values and evidence references", () => {
    const payload = fixture("valid-review.json");
    payload.topics = ["case_math", "case_math"];
    payload.difficulties = ["beginner", "beginner"];
    const rights = payload.rights as Record<string, unknown>;
    rights.evidenceReferences = ["pull/42#rights", "pull/42#rights"];

    expect(errorsFor(payload)).toEqual(
      expect.arrayContaining([
        "$.topics must not contain duplicates.",
        "$.difficulties must not contain duplicates.",
        "$.rights.evidenceReferences must not contain duplicates."
      ])
    );
  });

  it("rejects uncontrolled taxonomy values and non-canonical language tags", () => {
    const payload = fixture("valid-review.json");
    payload.kind = "video_course";
    payload.topics = ["general_knowledge"];
    payload.difficulties = ["master"];
    payload.language = "en-us";

    const errors = errorsFor(payload);
    expect(errors.some((error) => error.startsWith("$.kind must be one of:"))).toBe(true);
    expect(errors.some((error) => error.startsWith("$.topics[0] must be one of:"))).toBe(true);
    expect(errors.some((error) => error.startsWith("$.difficulties[0] must be one of:"))).toBe(true);
    expect(errors).toContain("$.language must be a canonical BCP-47 language tag.");
  });

  it("requires SemVer for catalog and compatibility versions", () => {
    const payload = fixture("valid-review.json");
    payload.version = "release-one";
    (payload.compatibility as Record<string, unknown>).minimumAppVersion = "latest";

    expect(errorsFor(payload)).toEqual(
      expect.arrayContaining([
        "$.version must be a valid SemVer value.",
        "$.compatibility.minimumAppVersion must be a valid SemVer value."
      ])
    );
  });

  it("binds review identity, title, kind, schema, and path to the validated pack context", () => {
    const mismatchedContext: CommunityPackReviewContext = {
      directoryId: "profitability-foundations",
      directoryVersion: "1.0.1",
      packFile: expectedPackFile,
      pack: {
        ...context.pack,
        packVersion: "1.0.1",
        title: "A different title",
        kind: "benchmark",
        schemaVersion: 3
      }
    };

    expect(errorsFor(fixture("valid-review.json"), mismatchedContext)).toEqual(
      expect.arrayContaining([
        "$context.packFile must be the matching repository path \"public/community-packs/profitability-foundations/1.0.1/pack.mathdrill.json\".",
        "$.version must match the repository version directory.",
        "$.version must match the pack envelope packVersion.",
        "$.title must match the pack envelope title.",
        "$.kind must match the pack envelope kind.",
        "$.compatibility.packSchemaVersion must match the pack envelope schemaVersion."
      ])
    );
  });

  it("requires complete review checks, conflict detail, and an accepted first lifecycle event", () => {
    const payload = fixture("valid-review.json");
    const conflicts = payload.conflicts as Record<string, unknown>;
    conflicts.declared = true;
    const review = payload.review as Record<string, unknown>;
    const checks = review.checks as Record<string, Record<string, unknown>>;
    checks.factual!.result = "pending";
    const events = payload.events as Array<Record<string, unknown>>;
    events[0]!.type = "corrected";

    expect(errorsFor(payload)).toEqual(
      expect.arrayContaining([
        "$.conflicts.statement must describe the conflict and mitigation when one is declared.",
        "$.review.checks.factual.result must be one of: pass, not_applicable.",
        "$.events[0].type must be accepted."
      ])
    );
  });

  it("requires licensed-work evidence and a stated rationale for not-applicable review checks", () => {
    const payload = fixture("valid-review.json");
    const rights = payload.rights as Record<string, unknown>;
    rights.basis = "licensed";
    const review = payload.review as Record<string, unknown>;
    const checks = review.checks as Record<string, Record<string, unknown>>;
    checks.accessibility = { result: "not_applicable", evidence: "" };

    expect(errorsFor(payload)).toEqual(
      expect.arrayContaining([
        "$.rights.evidenceReferences may be empty only when $.rights.basis is original.",
        "$.review.checks.accessibility.evidence must be non-empty text."
      ])
    );
  });

  it("validates lifecycle dates and replacement identity pairs", () => {
    const payload = fixture("valid-review.json");
    const events = payload.events as Array<Record<string, unknown>>;
    events.push({
      type: "corrected",
      date: "2026-02-30",
      reference: "pull/43",
      reason: "Corrected one answer key.",
      replacementId: "profitability-foundations"
    });

    expect(errorsFor(payload)).toEqual(
      expect.arrayContaining([
        "$.events[1].date must be a valid date in YYYY-MM-DD form.",
        "$.events[1].replacementId and $.events[1].replacementVersion must be provided together."
      ])
    );
  });
});

function fixture(fileName: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(fixtureDirectory, fileName), "utf8")) as Record<string, unknown>;
}

function errorsFor(
  payload: unknown,
  validationContext: CommunityPackReviewContext = context
): string[] {
  const result = parseCommunityPackReviewMetadata(payload, validationContext);
  expect(result.status).toBe("invalid");
  if (result.status === "valid") throw new Error("Expected invalid community-pack review metadata.");
  return result.errors;
}
