import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type { CommunityPackCatalogEntry } from "@/features/question-packs/communityPackCatalog";
import {
  CommunityPackDownloadError,
  fetchCommunityPackCandidate
} from "@/features/question-packs/communityPackInstaller";

describe("community pack verified download", () => {
  it("fetches one fixed same-origin path and returns repository-owned provenance", async () => {
    const source = JSON.stringify({ id: "profitability-foundations", packVersion: "1.0.0" });
    const entry = catalogEntry(source);
    const fetcher = vi.fn(async () => new Response(source, { status: 200 }));

    await expect(fetchCommunityPackCandidate(entry, { fetcher })).resolves.toMatchObject({
      key: `profitability-foundations:1.0.0:${entry.sha256}`,
      payload: { id: "profitability-foundations", packVersion: "1.0.0" },
      provenance: {
        file: "/community-packs/profitability-foundations/1.0.0/pack.mathdrill.json",
        language: "en",
        publisherId: "open-prep",
        source: "repository_catalog"
      }
    });
    expect(fetcher).toHaveBeenCalledWith(entry.file, {
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });
  });

  it("copies an RTL catalog language into repository-owned provenance", async () => {
    const source = JSON.stringify({ id: "profitability-foundations", packVersion: "1.0.0" });
    const entry = { ...catalogEntry(source), language: "ar" };

    await expect(fetchCommunityPackCandidate(entry, {
      fetcher: async () => new Response(source)
    })).resolves.toMatchObject({
      provenance: { language: "ar", source: "repository_catalog" }
    });
  });

  it("rejects a forged path before making a request", async () => {
    const entry = { ...catalogEntry("{}"), file: "https://example.com/pack.json" };
    const fetcher = vi.fn();

    await expect(fetchCommunityPackCandidate(entry, { fetcher })).rejects.toMatchObject({
      reason: "integrity"
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong exact byte count", (entry: CommunityPackCatalogEntry) => ({ ...entry, bytes: entry.bytes + 1 })],
    ["wrong checksum", (entry: CommunityPackCatalogEntry) => ({ ...entry, sha256: "f".repeat(64) })]
  ])("rejects %s before preview", async (_label, alter) => {
    const source = "{}";
    const entry = alter(catalogEntry(source));

    await expect(fetchCommunityPackCandidate(entry, {
      fetcher: async () => new Response(source)
    })).rejects.toMatchObject({ reason: "integrity" });
  });

  it("distinguishes an offline unseen pack from an online failure", async () => {
    const entry = catalogEntry("{}");
    const rejectFetch = async () => { throw new TypeError("network"); };

    await expect(fetchCommunityPackCandidate(entry, {
      fetcher: rejectFetch,
      online: false
    })).rejects.toMatchObject({ reason: "offline" });
    await expect(fetchCommunityPackCandidate(entry, {
      fetcher: rejectFetch,
      online: true
    })).rejects.toMatchObject({ reason: "unavailable" });
  });

  it("rejects checksum-valid bytes that are not JSON", async () => {
    const source = "not-json";

    await expect(fetchCommunityPackCandidate(catalogEntry(source), {
      fetcher: async () => new Response(source)
    })).rejects.toEqual(expect.objectContaining<Partial<CommunityPackDownloadError>>({ reason: "invalid" }));
  });
});

function catalogEntry(source: string): CommunityPackCatalogEntry {
  return {
    id: "profitability-foundations",
    version: "1.0.0",
    title: "Profitability foundations",
    summary: "Original practice.",
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
    bytes: new TextEncoder().encode(source).byteLength,
    sha256: createHash("sha256").update(source).digest("hex"),
    repositoryReviewed: true,
    deprecated: false
  };
}
