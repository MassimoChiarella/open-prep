import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import * as releaseContract from "../../../scripts/release-contract.mjs";

const {
  RELEASE_MARKER_FILENAME,
  assertPortableArtifactPath,
  createArtifactInventory,
  createCacheIdentity,
  createReleaseProvenance,
  hashArtifactInventory,
  removeStaticOutput,
  selectCorePrecacheInventory,
  sha256,
  validateReleaseOutput,
  writeReleaseMarker
} = releaseContract;

interface InventoryEntry {
  path: string;
  bytes: number;
  sha256: string;
}

const temporaryDirectories: string[] = [];
const source = {
  version: "1.2.3",
  commit: "a".repeat(40),
  sourceRef: "refs/heads/main",
  clean: true,
  workerPolicySha256: sha256("worker-policy")
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("release output freshness", () => {
  it("removes stale output before release prechecks", async () => {
    const outputDirectory = await createTemporaryOutput();
    await writeFile(path.join(outputDirectory, "stale.html"), "stale");

    await removeStaticOutput(outputDirectory);

    await expect(createArtifactInventory(outputDirectory)).rejects.toThrow("Static web build not found");
  });

  it("runs the clean CLI before package metadata can fail", async () => {
    const projectDirectory = await createTemporaryOutput();
    const outputDirectory = path.join(projectDirectory, "out");
    await mkdir(outputDirectory);
    await writeFile(path.join(outputDirectory, "stale.html"), "stale");
    await writeFile(path.join(projectDirectory, "package.json"), "not valid JSON");
    const prepareScript = path.join(process.cwd(), "scripts", "prepare-web-build.mjs");

    const result = spawnSync(process.execPath, [prepareScript, "clean"], {
      cwd: projectDirectory,
      encoding: "utf8",
      timeout: 10_000
    });

    expect(result.status).toBe(0);
    await expect(createArtifactInventory(outputDirectory)).rejects.toThrow("Static web build not found");
  });

  it("rejects missing required files and an absent marker", async () => {
    const partialOutput = await createTemporaryOutput();
    await writeFile(path.join(partialOutput, "index.html"), "home");
    await expect(validateReleaseOutput(partialOutput, { version: source.version })).rejects.toThrow("required file 404.html");

    const completeOutput = await seedStaticOutput();
    await expect(validateReleaseOutput(completeOutput, { version: source.version })).rejects.toThrow(
      `Verified release marker is missing: ${RELEASE_MARKER_FILENAME}`
    );
  });

  it("makes the artifact server reject an unmarked build by default", async () => {
    const projectDirectory = await createTemporaryOutput();
    await writeFile(path.join(projectDirectory, "package.json"), JSON.stringify({ version: source.version }));
    await seedStaticOutput(path.join(projectDirectory, "out"));
    const serverScript = path.join(process.cwd(), "scripts", "serve-web-build.mjs");

    const result = spawnSync(process.execPath, [serverScript], {
      cwd: projectDirectory,
      encoding: "utf8",
      timeout: 10_000
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Verified release marker is missing");
  });

  it("generates one worker identity and finalizes a matching release marker", async () => {
    const projectDirectory = await createTemporaryOutput();
    const outputDirectory = await seedStaticOutput(path.join(projectDirectory, "out"));
    const statePath = path.join(projectDirectory, ".next", "open-prep-build-state.json");
    await writeFile(path.join(projectDirectory, "package.json"), JSON.stringify({ version: source.version }));
    await writeFile(path.join(outputDirectory, "sw.js"), [
      'const CACHE_VERSION = "math-drill-offline-development";',
      "const RECOMMENDED_AUTHORING_ARTIFACT_URLS = [];",
      'const PRECACHED_URLS = ["/", "/404.html", "/manifest.webmanifest"];'
    ].join("\n"));

    const worker = runFinalizer(projectDirectory, "worker", outputDirectory, statePath);
    expect(worker.status, worker.stderr).toBe(0);
    const state = JSON.parse(await readFile(statePath, "utf8"));
    const generatedWorker = await readFile(path.join(outputDirectory, "sw.js"), "utf8");
    expect(generatedWorker).toContain(`const CACHE_VERSION = "${state.cacheId}";`);

    const finalized = runFinalizer(projectDirectory, "finalize", outputDirectory, statePath);
    expect(finalized.status, finalized.stderr).toBe(0);
    await expect(validateReleaseOutput(outputDirectory, {
      cacheId: state.cacheId,
      commit: "b".repeat(40),
      version: source.version
    })).resolves.toMatchObject({ marker: { artifact: { cacheId: state.cacheId } } });
  });

  it("does not write a marker when output changes after worker generation", async () => {
    const projectDirectory = await createTemporaryOutput();
    const outputDirectory = await seedStaticOutput(path.join(projectDirectory, "out"));
    const statePath = path.join(projectDirectory, ".next", "open-prep-build-state.json");
    await writeFile(path.join(projectDirectory, "package.json"), JSON.stringify({ version: source.version }));
    await writeFile(path.join(outputDirectory, "sw.js"), [
      'const CACHE_VERSION = "math-drill-offline-development";',
      "const RECOMMENDED_AUTHORING_ARTIFACT_URLS = [];",
      'const PRECACHED_URLS = ["/", "/404.html", "/manifest.webmanifest"];'
    ].join("\n"));

    expect(runFinalizer(projectDirectory, "worker", outputDirectory, statePath).status).toBe(0);
    await writeFile(path.join(outputDirectory, "index.html"), "changed after generation");

    const finalized = runFinalizer(projectDirectory, "finalize", outputDirectory, statePath);
    expect(finalized.status).not.toBe(0);
    expect(finalized.stderr).toContain("Static output changed after service-worker generation");
    await expect(readFile(path.join(outputDirectory, RELEASE_MARKER_FILENAME))).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("release inventory and marker", () => {
  it("produces a sorted, byte-stable inventory and invalidates changed inputs", async () => {
    const firstOutput = await seedStaticOutput();
    const secondOutput = await seedStaticOutput();
    const first = await createArtifactInventory(firstOutput);
    const second = await createArtifactInventory(secondOutput);

    expect(first.map((entry: InventoryEntry) => entry.path)).toEqual(
      [...first.map((entry: InventoryEntry) => entry.path)].sort()
    );
    expect(first).toEqual(second);
    expect(hashArtifactInventory(first)).toBe(hashArtifactInventory(second));

    await writeFile(path.join(secondOutput, "index.html"), "changed home");
    expect(hashArtifactInventory(await createArtifactInventory(secondOutput))).not.toBe(hashArtifactInventory(first));
    await writeFile(path.join(secondOutput, "new.txt"), "new path");
    expect(hashArtifactInventory(await createArtifactInventory(secondOutput))).not.toBe(hashArtifactInventory(first));
  });

  it("keeps generated release metadata out of its own inventory", async () => {
    const outputDirectory = await seedStaticOutput();
    const before = await createArtifactInventory(outputDirectory);
    await writeFile(path.join(outputDirectory, RELEASE_MARKER_FILENAME), "{}");
    await writeFile(path.join(outputDirectory, "open-prep-v1.2.3.provenance.json"), "{}");
    await writeFile(path.join(outputDirectory, "SHA256SUMS"), "hash  archive");

    expect(await createArtifactInventory(outputDirectory)).toEqual(before);
  });

  it("separates core inventory and changes cache identity with bytes or policy", async () => {
    const outputDirectory = await seedStaticOutput();
    const inventory = await createArtifactInventory(outputDirectory);
    const core = selectCorePrecacheInventory(inventory, ["index.html", "404.html", "_next/static/chunks/app.js"]);
    const base = createCacheIdentity({ ...source, coreInventory: core });
    const changedPolicy = createCacheIdentity({
      ...source,
      workerPolicySha256: sha256("changed-policy"),
      coreInventory: core
    });
    const changedBytes = createCacheIdentity({
      ...source,
      coreInventory: core.map((entry: InventoryEntry) =>
        entry.path === "index.html" ? { ...entry, bytes: entry.bytes + 1 } : entry
      )
    });

    expect(createCacheIdentity({ ...source, coreInventory: [...core].reverse() })).toBe(base);
    expect(changedPolicy).not.toBe(base);
    expect(changedBytes).not.toBe(base);
  });

  it("writes and verifies a marker, then rejects byte and version mismatches", async () => {
    const outputDirectory = await seedStaticOutput();
    const inventory = await createArtifactInventory(outputDirectory);
    const cacheId = createCacheIdentity({
      ...source,
      coreInventory: selectCorePrecacheInventory(inventory, ["index.html", "404.html"])
    });
    const marker = await writeReleaseMarker(outputDirectory, { ...source, cacheId });

    await expect(validateReleaseOutput(outputDirectory, { version: source.version, commit: source.commit })).resolves.toMatchObject({ marker });
    await expect(validateReleaseOutput(outputDirectory, { version: "1.2.4" })).rejects.toThrow("version mismatch");

    await writeFile(path.join(outputDirectory, "index.html"), "tampered");
    await expect(validateReleaseOutput(outputDirectory, { version: source.version })).rejects.toThrow("does not match its release marker");
  });
});

describe("release privacy and path safety", () => {
  it("rejects nonportable paths and absolute provenance fields", () => {
    expect(() => assertPortableArtifactPath("../private.txt")).toThrow("not portable");
    expect(() => assertPortableArtifactPath("C:\\Users\\person\\private.txt")).toThrow("not portable");
    expect(() => createReleaseProvenance({
      ...source,
      sourceRef: "C:\\Users\\person\\project",
      artifactCount: 1,
      inventorySha256: sha256("inventory"),
      cacheId: `math-drill-offline-v${source.version}-0123456789abcdef`
    })).toThrow("absolute local path");
  });

  it("rejects personal directory information embedded in distributable text", async () => {
    const outputDirectory = await seedStaticOutput();
    await writeFile(path.join(outputDirectory, "index.html"), "Built from C:\\Users\\person\\private-project");
    const inventory = await createArtifactInventory(outputDirectory);
    const cacheId = createCacheIdentity({
      ...source,
      coreInventory: selectCorePrecacheInventory(inventory, ["index.html", "404.html"])
    });

    await expect(writeReleaseMarker(outputDirectory, { ...source, cacheId })).rejects.toThrow("absolute Windows user path");
  });
});

async function createTemporaryOutput() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "open-prep-release-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function seedStaticOutput(outputDirectory?: string) {
  const directory = outputDirectory ?? await createTemporaryOutput();
  await mkdir(path.join(directory, "_next", "static", "chunks"), { recursive: true });
  await Promise.all([
    writeFile(path.join(directory, "index.html"), "home"),
    writeFile(path.join(directory, "404.html"), "not found"),
    writeFile(path.join(directory, "manifest.webmanifest"), "{}"),
    writeFile(path.join(directory, "sw.js"), "const worker = true;"),
    writeFile(path.join(directory, "_next", "static", "chunks", "app.js"), "const app = true;")
  ]);
  return directory;
}

function runFinalizer(projectDirectory: string, command: "finalize" | "worker", outputDirectory: string, statePath: string) {
  return spawnSync(
    process.execPath,
    [
      path.join(process.cwd(), "scripts", "finalize-web-build.mjs"),
      command,
      "--output",
      outputDirectory,
      "--state",
      statePath
    ],
    {
      cwd: projectDirectory,
      encoding: "utf8",
      env: {
        ...process.env,
        OPEN_PREP_SOURCE_CLEAN: "true",
        OPEN_PREP_SOURCE_COMMIT: "b".repeat(40),
        OPEN_PREP_SOURCE_REF: "refs/heads/main"
      },
      timeout: 10_000
    }
  );
}
