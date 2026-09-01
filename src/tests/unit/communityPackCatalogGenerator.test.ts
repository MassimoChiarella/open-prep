import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getQuestionPackDifficultyCounts,
  validateQuestionPackPayload
} from "@/features/question-packs/questionPack";
import { reviewQuestionPack } from "@/features/question-packs/questionPackReview";
import { questionPackMaxFileBytes } from "@/features/question-packs/questionPackValidation";
import { parseCommunityPackReviewMetadata } from "@/features/question-packs/communityPackCatalog";

// @ts-expect-error The executable JavaScript generator is exercised directly by this suite.
import { generateCommunityPackCatalog, syncCommunityPackCatalog } from "../../../scripts/sync-community-pack-catalog.mjs";

const fixturePath = resolve("src/tests/fixtures/community-packs/valid-review.json");
const temporaryDirectories: string[] = [];
const canonicalTools = {
  getQuestionPackDifficultyCounts,
  parseCommunityPackReviewMetadata,
  questionPackMaxFileBytes,
  reviewQuestionPack,
  validateQuestionPackPayload
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
});

describe("community pack catalog generator", () => {
  it("generates the byte-stable empty schema without a wall-clock timestamp", async () => {
    const repositoryRoot = await createRepository();
    const first = await generate(repositoryRoot);
    const second = await generate(repositoryRoot);

    expect(first.serialized).toBe(second.serialized);
    expect(first.serialized).toBe(
      '{\n  "catalogSchemaVersion": 1,\n  "entries": [],\n  "tombstones": []\n}\n'
    );
    expect(first.serialized).not.toMatch(/generatedAt|createdAt|updatedAt/);
  });

  it("publishes exact byte metadata and derives repository review from valid review metadata", async () => {
    const repositoryRoot = await createRepository();
    const written = await writeVersion(repositoryRoot);
    const { catalog } = await generate(repositoryRoot);

    expect(catalog.entries).toEqual([
      expect.objectContaining({
        id: "profitability-foundations",
        version: "1.0.0",
        title: "Profitability foundations",
        kind: "fixed_numeric",
        topics: ["business_math"],
        difficulties: ["beginner"],
        file: "/community-packs/profitability-foundations/1.0.0/pack.mathdrill.json",
        bytes: written.packBytes.byteLength,
        sha256: written.sha256,
        repositoryReviewed: true,
        deprecated: false
      })
    ]);
    expect(catalog.tombstones).toEqual([]);
  });

  it("rejects a pack that fails the canonical pack validator", async () => {
    const repositoryRoot = await createRepository();
    await writeVersion(repositoryRoot, {
      mutatePack(pack) {
        const questions = pack.questions as Array<Record<string, unknown>>;
        const answer = questions[0]!.answer as Record<string, unknown>;
        delete answer.unit;
      }
    });

    await expect(generate(repositoryRoot)).rejects.toThrow(
      "$.questions[0].answer.unit is required."
    );
  });

  it("rejects a duplicate payload identity even when hidden behind another directory", async () => {
    const repositoryRoot = await createRepository();
    await writeVersion(repositoryRoot, { id: "shared-pack", directoryId: "shared-pack" });
    await writeVersion(repositoryRoot, { id: "shared-pack", directoryId: "zz-alias" });

    await expect(generate(repositoryRoot)).rejects.toThrow(
      'Duplicate catalog identity "shared-pack" version "1.0.0".'
    );
  });

  it("rejects missing review metadata", async () => {
    const repositoryRoot = await createRepository();
    await writeVersion(repositoryRoot, { omitReview: true });

    await expect(generate(repositoryRoot)).rejects.toThrow("is missing review.json");
  });

  it("rejects a content license outside the exact allowlist", async () => {
    const repositoryRoot = await createRepository();
    await writeVersion(repositoryRoot, {
      mutateReview(review) {
        review.contentLicenseId = "MIT";
      }
    });

    await expect(generate(repositoryRoot)).rejects.toThrow(
      "$.contentLicenseId must be one of: CC0-1.0, CC-BY-4.0, CC-BY-SA-4.0."
    );
  });

  it("rejects checksum drift against the exact UTF-8 pack bytes", async () => {
    const repositoryRoot = await createRepository();
    await writeVersion(repositoryRoot, {
      mutateReview(review) {
        review.sha256 = "0".repeat(64);
      }
    });

    await expect(generate(repositoryRoot)).rejects.toThrow("checksum drift");
  });

  it("rejects unsafe source paths before reading pack content", async () => {
    const repositoryRoot = await createRepository();
    await mkdir(join(repositoryRoot, "public", "community-packs", "Unsafe ID"), {
      recursive: true
    });

    await expect(generate(repositoryRoot)).rejects.toThrow("uses an unsafe catalog ID path");
  });

  it("rejects app and pack-schema incompatibility", async () => {
    const appRepository = await createRepository();
    await writeVersion(appRepository, {
      mutateReview(review) {
        const compatibility = review.compatibility as Record<string, unknown>;
        compatibility.minimumAppVersion = "9.0.0";
      }
    });
    await expect(generate(appRepository)).rejects.toThrow(
      "requires Open Prep 9.0.0, but package.json is 0.1.0"
    );

    const schemaRepository = await createRepository();
    await writeVersion(schemaRepository, {
      mutateReview(review) {
        const compatibility = review.compatibility as Record<string, unknown>;
        compatibility.packSchemaVersion = 3;
      }
    });
    await expect(generate(schemaRepository)).rejects.toThrow(
      "$.compatibility.packSchemaVersion must match the pack envelope schemaVersion."
    );
  });

  it("removes withdrawn versions from discovery and emits a non-downloadable tombstone", async () => {
    const repositoryRoot = await createRepository();
    await writeVersion(repositoryRoot, {
      mutateReview(review) {
        const events = review.events as Array<Record<string, unknown>>;
        events.push({
          type: "withdrawn",
          date: "2026-09-01",
          reference: "issue/50",
          reason: "A rights concern requires removal.",
          replacementId: "replacement-pack",
          replacementVersion: "1.0.0"
        });
      }
    });

    const { catalog } = await generate(repositoryRoot);
    expect(catalog.entries).toEqual([]);
    expect(catalog.tombstones).toEqual([
      {
        id: "profitability-foundations",
        version: "1.0.0",
        status: "withdrawn",
        date: "2026-09-01",
        reason: "A rights concern requires removal.",
        reference: "issue/50",
        replacementId: "replacement-pack",
        replacementVersion: "1.0.0"
      }
    ]);
    expect(catalog.tombstones[0]).not.toHaveProperty("file");
    expect(catalog.tombstones[0]).not.toHaveProperty("sha256");
    expect(catalog.tombstones[0]).not.toHaveProperty("repositoryReviewed");
  });

  it("labels deprecated versions without removing their reviewed download", async () => {
    const repositoryRoot = await createRepository();
    await writeVersion(repositoryRoot, {
      mutateReview(review) {
        const events = review.events as Array<Record<string, unknown>>;
        events.push({
          type: "deprecated",
          date: "2026-09-01",
          reference: "issue/51",
          reason: "Prefer the expanded replacement."
        });
      }
    });

    const { catalog } = await generate(repositoryRoot);
    expect(catalog.entries[0]).toMatchObject({
      deprecated: true,
      deprecation: {
        date: "2026-09-01",
        reason: "Prefer the expanded replacement.",
        reference: "issue/51"
      }
    });
  });

  it("sorts by ID then SemVer and rejects equal-precedence lineage versions", async () => {
    const repositoryRoot = await createRepository();
    for (const version of ["2.0.0", "1.10.0", "2.0.0-alpha", "1.2.0"]) {
      await writeVersion(repositoryRoot, { id: "zeta-pack", version });
    }
    await writeVersion(repositoryRoot, { id: "alpha-pack", version: "4.0.0" });

    const { catalog } = await generate(repositoryRoot);
    expect(catalog.entries.map(({ id, version }: { id: string; version: string }) => `${id}@${version}`)).toEqual([
      "alpha-pack@4.0.0",
      "zeta-pack@1.2.0",
      "zeta-pack@1.10.0",
      "zeta-pack@2.0.0-alpha",
      "zeta-pack@2.0.0"
    ]);

    const duplicatePrecedenceRepository = await createRepository();
    await writeVersion(duplicatePrecedenceRepository, { version: "1.0.0+one" });
    await writeVersion(duplicatePrecedenceRepository, { version: "1.0.0+two" });
    await expect(generate(duplicatePrecedenceRepository)).rejects.toThrow(
      "must use strictly increasing SemVer precedence"
    );
  });

  it("rejects declared topic and difficulty drift from validated content", async () => {
    const repositoryRoot = await createRepository();
    await writeVersion(repositoryRoot, {
      mutateReview(review) {
        review.topics = ["case_math"];
        review.difficulties = ["advanced"];
      }
    });

    await expect(generate(repositoryRoot)).rejects.toThrow(
      "topics must match validated content: business_math"
    );
  });

  it("check mode reports drift without rewriting and sync writes only when needed", async () => {
    const repositoryRoot = await createRepository();
    const manifestPath = join(repositoryRoot, "public", "community-packs", "catalog.v1.json");
    await writeFile(manifestPath, "stale\n", "utf8");

    await expect(
      syncCommunityPackCatalog({ checkOnly: true, repositoryRoot, tools: canonicalTools })
    ).rejects.toThrow("catalog.v1.json is out of date");
    expect(await readFile(manifestPath, "utf8")).toBe("stale\n");

    const firstSync = await syncCommunityPackCatalog({ repositoryRoot, tools: canonicalTools });
    const secondSync = await syncCommunityPackCatalog({ repositoryRoot, tools: canonicalTools });
    const check = await syncCommunityPackCatalog({
      checkOnly: true,
      repositoryRoot,
      tools: canonicalTools
    });

    expect(firstSync.changed).toBe(true);
    expect(secondSync.changed).toBe(false);
    expect(check.changed).toBe(false);
  });
});

async function generate(repositoryRoot: string) {
  return generateCommunityPackCatalog({ repositoryRoot, tools: canonicalTools });
}

async function createRepository(appVersion = "0.1.0"): Promise<string> {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "open-prep-community-catalog-"));
  temporaryDirectories.push(repositoryRoot);
  await mkdir(join(repositoryRoot, "public", "community-packs"), { recursive: true });
  await writeFile(
    join(repositoryRoot, "package.json"),
    `${JSON.stringify({ name: "catalog-fixture", version: appVersion }, null, 2)}\n`,
    "utf8"
  );
  return repositoryRoot;
}

interface WriteVersionOptions {
  directoryId?: string;
  directoryVersion?: string;
  id?: string;
  mutatePack?: (pack: Record<string, unknown>) => void;
  mutateReview?: (review: Record<string, unknown>) => void;
  omitReview?: boolean;
  version?: string;
}

async function writeVersion(repositoryRoot: string, options: WriteVersionOptions = {}) {
  const id = options.id ?? "profitability-foundations";
  const version = options.version ?? "1.0.0";
  const directoryId = options.directoryId ?? id;
  const directoryVersion = options.directoryVersion ?? version;
  const title = id === "profitability-foundations" ? "Profitability foundations" : `${id} title`;
  const pack = validPack({ id, title, version });
  options.mutatePack?.(pack);
  const packSource = `${JSON.stringify(pack, null, 2)}\n`;
  const packBytes = Buffer.from(packSource, "utf8");
  const sha256 = createHash("sha256").update(packBytes).digest("hex");
  const review = JSON.parse(await readFile(fixturePath, "utf8")) as Record<string, unknown>;
  review.id = id;
  review.version = version;
  review.file = `public/community-packs/${directoryId}/${directoryVersion}/pack.mathdrill.json`;
  review.sha256 = sha256;
  review.title = title;
  review.topics = ["business_math"];
  review.difficulties = ["beginner"];
  const compatibility = review.compatibility as Record<string, unknown>;
  compatibility.minimumAppVersion = "0.1.0";
  compatibility.packSchemaVersion = 2;
  options.mutateReview?.(review);

  const versionPath = join(
    repositoryRoot,
    "public",
    "community-packs",
    directoryId,
    directoryVersion
  );
  await mkdir(versionPath, { recursive: true });
  await writeFile(join(versionPath, "pack.mathdrill.json"), packBytes);
  if (!options.omitReview) {
    await writeFile(join(versionPath, "review.json"), `${JSON.stringify(review, null, 2)}\n`, "utf8");
  }
  return { packBytes, sha256 };
}

function validPack({ id, title, version }: { id: string; title: string; version: string }) {
  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "fixed_numeric",
    id,
    packVersion: version,
    title,
    description: "Original fixed numeric consulting practice.",
    publisher: "Open Prep Community",
    license: "CC-BY-4.0",
    questions: [
      {
        id: "revenue-001",
        type: "numeric",
        category: "business_math",
        tags: ["revenue", "multiplication"],
        difficulty: "beginner",
        prompt: "A fictional company sells 2,000 units at $30 each. What is revenue?",
        answer: {
          value: 60_000,
          unit: "currency",
          roundingRule: "exact"
        },
        explanation: {
          short: "Revenue is volume multiplied by price.",
          steps: ["Revenue = 2,000 x $30 = $60,000."]
        },
        expectedTimeSeconds: 30
      }
    ]
  };
}
