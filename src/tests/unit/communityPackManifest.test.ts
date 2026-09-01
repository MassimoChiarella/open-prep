import { describe, expect, it } from "vitest";

import {
  compareCommunityPackSemVer,
  getCommunityPackDownloadPath,
  parseCommunityPackCatalog
} from "@/features/question-packs/communityPackCatalog";

describe("community pack catalog manifest", () => {
  it("parses repository-owned discovery metadata without mutation", () => {
    const payload = validCatalog();
    const before = JSON.stringify(payload);
    const result = parseCommunityPackCatalog(payload);

    expect(result).toMatchObject({
      status: "valid",
      catalog: {
        entries: [{ id: "profitability-foundations", repositoryReviewed: true }],
        tombstones: []
      }
    });
    expect(JSON.stringify(payload)).toBe(before);
    expect(getCommunityPackDownloadPath("profitability-foundations", "1.0.0")).toBe(
      "/community-packs/profitability-foundations/1.0.0/pack.mathdrill.json"
    );
  });

  it("rejects a self-declared review flag, unsafe file, and unsupported license", () => {
    const payload = validCatalog();
    const entry = payload.entries[0]!;
    entry.repositoryReviewed = false;
    entry.file = "https://example.com/pack.mathdrill.json";
    entry.contentLicenseId = "MIT";

    expect(errorsFor(payload)).toEqual(expect.arrayContaining([
      "$.entries[0].repositoryReviewed must be true and is controlled by the repository catalog.",
      "$.entries[0].file must be the matching same-origin pack path \"/community-packs/profitability-foundations/1.0.0/pack.mathdrill.json\".",
      "$.entries[0].contentLicenseId must be one of: CC0-1.0, CC-BY-4.0, CC-BY-SA-4.0."
    ]));
  });

  it("requires lifecycle detail exactly for deprecated entries", () => {
    const payload = validCatalog();
    payload.entries[0]!.deprecated = true;

    expect(errorsFor(payload)).toContain(
      "$.entries[0].deprecation must be present exactly when $.entries[0].deprecated is true."
    );
  });

  it("rejects duplicate active or withdrawn identities", () => {
    const payload = validCatalog();
    payload.tombstones.push({
      id: "profitability-foundations",
      version: "1.0.0",
      status: "withdrawn",
      date: "2026-08-31",
      reason: "Withdrawn after review.",
      reference: "pull/99"
    });

    expect(errorsFor(payload)).toContain(
      "Catalog identity profitability-foundations@1.0.0 must be unique."
    );
  });

  it("compares valid SemVer precedence for compatibility and stable sorting", () => {
    expect(compareCommunityPackSemVer("1.0.0-alpha.2", "1.0.0-alpha.10")).toBeLessThan(0);
    expect(compareCommunityPackSemVer("1.0.0", "1.0.0-rc.1")).toBeGreaterThan(0);
    expect(compareCommunityPackSemVer("2.0.0+one", "2.0.0+two")).toBe(0);
    expect(() => compareCommunityPackSemVer("latest", "1.0.0")).toThrow(TypeError);
  });
});

function validCatalog() {
  return {
    catalogSchemaVersion: 1,
    entries: [{
      id: "profitability-foundations",
      version: "1.0.0",
      title: "Profitability foundations",
      summary: "Original profitability practice.",
      kind: "fixed_numeric",
      topics: ["case_math"],
      difficulties: ["beginner"],
      language: "en",
      publisher: { id: "open-prep", name: "Open Prep" },
      contentLicenseId: "CC-BY-4.0",
      reviewDate: "2026-08-31",
      minimumAppVersion: "0.1.0",
      packSchemaVersion: 2,
      file: "/community-packs/profitability-foundations/1.0.0/pack.mathdrill.json",
      bytes: 1_024,
      sha256: "a".repeat(64),
      repositoryReviewed: true,
      deprecated: false
    }],
    tombstones: [] as Array<Record<string, unknown>>
  };
}

function errorsFor(payload: unknown): string[] {
  const result = parseCommunityPackCatalog(payload);
  expect(result.status).toBe("invalid");
  if (result.status === "valid") throw new Error("Expected invalid catalog manifest.");
  return result.errors;
}
