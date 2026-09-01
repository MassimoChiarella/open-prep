import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { checkVersionContract } from "../../../scripts/check-version-contract.mjs";

describe("release version contract", () => {
  it("uses package.json as the one authoritative repository version", async () => {
    await expect(checkVersionContract({ rootDirectory: process.cwd() })).resolves.toEqual({
      version: "0.1.0"
    });
  });

  it("rejects lockfile, changelog, and release-tag mismatches", async () => {
    const root = await createRepositoryFixture();
    const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
    lock.packages[""].version = "0.2.0";
    await writeFile(path.join(root, "package-lock.json"), JSON.stringify(lock), "utf8");
    await expect(checkVersionContract({ rootDirectory: root })).rejects.toThrow("root versions");

    await writeVersionFiles(root);
    await expect(checkVersionContract({
      rootDirectory: root,
      sourceRef: "refs/tags/v0.2.0"
    })).rejects.toThrow("does not match");
    await expect(checkVersionContract({
      rootDirectory: root,
      sourceRef: "refs/tags/v0.1.0"
    })).rejects.toThrow("release date");
  });

  it("requires official archive, provenance, and checksum names to agree", async () => {
    const root = await createRepositoryFixture("2026-08-31");
    const dist = path.join(root, "dist");
    await mkdir(dist);
    await writeFile(path.join(dist, "open-prep-v0.1.0.tar.gz"), "archive", "utf8");
    await writeFile(path.join(dist, "open-prep-v0.1.0.provenance.json"), JSON.stringify({
      version: "0.1.0",
      artifact: {
        archive: "open-prep-v0.1.0.tar.gz",
        topLevelDirectory: "open-prep-v0.1.0/"
      }
    }), "utf8");
    await writeFile(path.join(dist, "SHA256SUMS"), [
      "a".repeat(64) + "  open-prep-v0.1.0.tar.gz",
      "b".repeat(64) + "  open-prep-v0.1.0.provenance.json",
      ""
    ].join("\n"), "utf8");

    await expect(checkVersionContract({
      rootDirectory: root,
      sourceRef: "refs/tags/v0.1.0",
      artifactDirectory: "dist"
    })).resolves.toEqual({ version: "0.1.0" });

    await writeFile(path.join(dist, "open-prep-v0.1.0.provenance.json"), JSON.stringify({
      version: "0.2.0",
      artifact: {
        archive: "open-prep-v0.1.0.tar.gz",
        topLevelDirectory: "open-prep-v0.1.0/"
      }
    }), "utf8");
    await expect(checkVersionContract({
      rootDirectory: root,
      artifactDirectory: "dist"
    })).rejects.toThrow("does not agree");
  });
});

async function createRepositoryFixture(releaseDate = "Pending"): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "open-prep-version-"));
  await writeVersionFiles(root, releaseDate);
  return root;
}

async function writeVersionFiles(root: string, releaseDate = "Pending"): Promise<void> {
  await writeFile(path.join(root, "package.json"), JSON.stringify({ version: "0.1.0" }), "utf8");
  await writeFile(path.join(root, "package-lock.json"), JSON.stringify({
    version: "0.1.0",
    packages: { "": { version: "0.1.0" } }
  }), "utf8");
  await writeFile(path.join(root, "CHANGELOG.md"), [
    "## [Unreleased]",
    "",
    `## [0.1.0] - ${releaseDate}`,
    ""
  ].join("\n"), "utf8");
}
