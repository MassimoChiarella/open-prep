import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";

import { afterEach, describe, expect, it } from "vitest";

import {
  RELEASE_MARKER_FILENAME,
  createArtifactInventory,
  createCacheIdentity,
  createReleaseProvenance,
  hashArtifactInventory,
  selectCorePrecacheInventory,
  sha256,
  writeReleaseMarker
} from "../../../scripts/release-contract.mjs";

const packagingScript = path.resolve("scripts/package-release.mjs");
const temporaryDirectories: string[] = [];
const version = "1.2.3";
const archiveDocuments = [
  "BUNDLED_CONTENT_LICENSE.md",
  "LICENSE",
  "RELEASE_ARCHIVE_README.md",
  "THIRD_PARTY_NOTICES.md"
];
const cleanSource = {
  version,
  commit: "a".repeat(40),
  sourceRef: `refs/tags/v${version}`,
  clean: true,
  workerPolicySha256: sha256("worker-policy")
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("portable release packaging", () => {
  it("wires the documented source-to-archive command through the complete verification gate", async () => {
    const packageJson = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));
    const readme = await readFile(path.resolve("README.md"), "utf8");

    expect(packageJson.scripts.check.split(" && ")).toEqual([
      "npm run clean:web",
      "npm run version:check",
      "npm run actions:check",
      "npm run authoring:check",
      "npm run identity:check",
      "npm run lint",
      "npm run typecheck",
      "npm run test",
      "npm run build",
      "npm run e2e"
    ]);
    expect(packageJson.scripts.build.split(" && ")).toEqual([
      "npm run clean:web",
      "npm run catalog:check",
      "npm run i18n:check",
      "next build",
      "node scripts/finalize-web-build.mjs worker",
      "npm run perf:check",
      "node scripts/finalize-web-build.mjs finalize"
    ]);
    expect(packageJson.scripts["release:artifact"]).toBe(
      "npm run check && node scripts/package-release.mjs"
    );
    expect(packageJson.scripts["postdeploy:check"]).toBe(
      "node scripts/post-deployment-smoke.mjs"
    );
    expect(readme).toContain("npm run release:artifact");
    expect(readme).toContain("npm run postdeploy:check -- https://practice.example.com/");
    expect(readme).toContain("-- --allow-dirty");
  });

  it("creates one deterministic top-level archive with matching provenance and checksums", async () => {
    const project = await seedProject(cleanSource);

    const firstRun = runPackaging(project.directory, cleanSource);
    expect(firstRun.status, firstRun.stderr).toBe(0);

    const releaseName = `open-prep-v${version}`;
    const archiveName = `${releaseName}.tar.gz`;
    const provenanceName = `${releaseName}.provenance.json`;
    expect((await readdir(path.join(project.directory, "dist"))).sort()).toEqual([
      "SHA256SUMS",
      archiveName,
      provenanceName
    ].sort());

    const archive = await readFile(path.join(project.directory, "dist", archiveName));
    const provenanceBytes = await readFile(path.join(project.directory, "dist", provenanceName));
    const provenance = JSON.parse(provenanceBytes.toString("utf8"));
    const checksums = parseChecksums(await readFile(path.join(project.directory, "dist", "SHA256SUMS"), "utf8"));

    expect(checksums).toEqual(new Map([
      [archiveName, digest(archive)],
      [provenanceName, digest(provenanceBytes)]
    ]));
    expect(provenance).toMatchObject({
      product: "Open Prep",
      version,
      release: { official: true, status: "official" },
      source: { commit: cleanSource.commit, ref: cleanSource.sourceRef, clean: true },
      artifact: {
        archive: archiveName,
        archiveSha256: digest(archive),
        topLevelDirectory: `${releaseName}/`,
        packagedFiles: project.inventory.length + archiveDocuments.length + 1,
        verifiedFiles: project.inventory.length,
        inventorySha256: hashArtifactInventory(project.inventory)
      }
    });
    expect(JSON.stringify(provenance)).not.toContain(project.directory);
    expect(JSON.stringify(provenance)).not.toMatch(/[A-Za-z]:\\(?:Users|Documents and Settings)\\/i);

    const tarEntries = readTarEntries(archive);
    expect(tarEntries.get(releaseName)?.type).toBe("5");
    expect([...tarEntries.keys()].every((entry) => !entry.includes("\\"))).toBe(true);
    expect(new Set([...tarEntries.keys()].map((entry) => entry.split("/")[0]))).toEqual(new Set([releaseName]));
    expect([...tarEntries.entries()].filter(([, entry]) => entry.type === "0").map(([entry]) => entry).sort()).toEqual([
      ...project.inventory.map((entry) => `${releaseName}/${entry.path}`),
      ...archiveDocuments.map((document) => `${releaseName}/${document}`),
      `${releaseName}/${RELEASE_MARKER_FILENAME}`
    ].sort());
    expect(tarEntries.get(`${releaseName}/index.html`)?.contents.toString("utf8")).toBe("home");
    expect(JSON.parse(tarEntries.get(`${releaseName}/${RELEASE_MARKER_FILENAME}`)!.contents.toString("utf8"))).toEqual(project.marker);
    for (const document of archiveDocuments) {
      expect(tarEntries.get(`${releaseName}/${document}`)?.contents).toEqual(await readFile(path.resolve(document)));
    }
    expect(tarEntries.get(`${releaseName}/RELEASE_ARCHIVE_README.md`)?.contents.toString("utf8")).toContain("origin root of an HTTP(S) static host");
    expect(tarEntries.get(`${releaseName}/RELEASE_ARCHIVE_README.md`)?.contents.toString("utf8")).toContain("`file://` URL is unsupported");
    expect(tarEntries.get(`${releaseName}/BUNDLED_CONTENT_LICENSE.md`)?.contents.toString("utf8")).toContain("CC-BY-4.0");
    expect(tarEntries.get(`${releaseName}/THIRD_PARTY_NOTICES.md`)?.contents.toString("utf8")).toContain("reviewed inventory");
    expect(tarEntries.get(`${releaseName}/THIRD_PARTY_NOTICES.md`)?.contents.toString("utf8")).toContain("not a legal interpretation");
    expect(tarEntries.get(`${releaseName}/THIRD_PARTY_NOTICES.md`)?.contents.toString("utf8")).toContain("Permission is hereby granted");

    expect(runPackaging(project.directory, cleanSource).status).toBe(0);
    expect(await readFile(path.join(project.directory, "dist", archiveName))).toEqual(archive);
    expect(await readFile(path.join(project.directory, "dist", provenanceName))).toEqual(provenanceBytes);
  });

  it("rejects missing, mismatched, and changed release markers", async () => {
    const missing = await seedProject(cleanSource);
    await unlink(path.join(missing.outputDirectory, RELEASE_MARKER_FILENAME));
    const missingResult = runPackaging(missing.directory, cleanSource);
    expect(missingResult.status).not.toBe(0);
    expect(missingResult.stderr).toContain("Verified release marker is missing");

    const wrongSource = await seedProject(cleanSource);
    const mismatchResult = runPackaging(wrongSource.directory, { ...cleanSource, commit: "b".repeat(40) });
    expect(mismatchResult.status).not.toBe(0);
    expect(mismatchResult.stderr).toContain("Release marker commit mismatch");

    const wrongVersion = await seedProject(cleanSource);
    await writeFile(path.join(wrongVersion.directory, "package.json"), JSON.stringify({ version: "1.2.4" }));
    const versionResult = runPackaging(wrongVersion.directory, cleanSource);
    expect(versionResult.status).not.toBe(0);
    expect(versionResult.stderr).toContain("Release marker version mismatch");

    const unauthorizedSource = { ...cleanSource, sourceRef: "feature/clean-work" };
    const unauthorized = await seedProject(unauthorizedSource);
    const unauthorizedResult = runPackaging(unauthorized.directory, unauthorizedSource);
    expect(unauthorizedResult.status).not.toBe(0);
    expect(unauthorizedResult.stderr).toContain("Clean packages require main or the exact tag");

    const shorthandTagSource = { ...cleanSource, sourceRef: `v${version}` };
    const shorthandTag = await seedProject(shorthandTagSource);
    const shorthandTagResult = runPackaging(shorthandTag.directory, shorthandTagSource);
    expect(shorthandTagResult.status).not.toBe(0);
    expect(shorthandTagResult.stderr).toContain(`refs/tags/v${version}`);

    const changed = await seedProject(cleanSource);
    await writeFile(path.join(changed.outputDirectory, "index.html"), "changed after verification");
    const changedResult = runPackaging(changed.directory, cleanSource);
    expect(changedResult.status).not.toBe(0);
    expect(changedResult.stderr).toContain("does not match its release marker");
  });

  it("packages clean main builds as commit-qualified non-official release candidates", async () => {
    const mainSource = { ...cleanSource, commit: "b".repeat(40), sourceRef: "refs/heads/main" };
    const project = await seedProject(mainSource);

    const result = runPackaging(project.directory, mainSource);

    expect(result.status, result.stderr).toBe(0);
    const releaseName = `open-prep-v${version}-candidate-${mainSource.commit.slice(0, 12)}`;
    const files = await readdir(path.join(project.directory, "dist"));
    expect(files).toContain(`${releaseName}.tar.gz`);
    expect(files).toContain(`${releaseName}.provenance.json`);
    expect(files).not.toContain(`open-prep-v${version}.tar.gz`);
    const provenance = JSON.parse(await readFile(path.join(project.directory, "dist", `${releaseName}.provenance.json`), "utf8"));
    expect(provenance.release).toEqual({ official: false, status: "release-candidate" });
    expect(provenance.source).toMatchObject({ ref: "refs/heads/main", clean: true });
    expect(provenance.artifact.topLevelDirectory).toBe(`${releaseName}/`);
  });

  it("makes dirty rehearsals explicit in filenames, provenance, and archive paths", async () => {
    const dirtySource = { ...cleanSource, clean: false, sourceRef: "feature/local-work" };
    const project = await seedProject(dirtySource);

    const rejected = runPackaging(project.directory, dirtySource);
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain("Release marker is dirty");

    const accepted = runPackaging(project.directory, dirtySource, ["--allow-dirty"]);
    expect(accepted.status, accepted.stderr).toBe(0);
    const releaseName = `open-prep-v${version}-dirty-${dirtySource.commit.slice(0, 12)}`;
    const files = await readdir(path.join(project.directory, "dist"));
    expect(files).toContain(`${releaseName}.tar.gz`);
    expect(files).toContain(`${releaseName}.provenance.json`);
    expect(files).not.toContain(`open-prep-v${version}.tar.gz`);

    const provenance = JSON.parse(await readFile(path.join(project.directory, "dist", `${releaseName}.provenance.json`), "utf8"));
    expect(provenance.release).toEqual({ official: false, status: "dirty-rehearsal" });
    expect(provenance.source.clean).toBe(false);
    const archiveEntries = [...readTarEntries(await readFile(path.join(project.directory, "dist", `${releaseName}.tar.gz`))).keys()];
    expect(archiveEntries.every((entry) => entry === releaseName || entry.startsWith(`${releaseName}/`))).toBe(true);
  });

  it("rejects personal paths even when a hand-written marker matches the bytes", async () => {
    const project = await seedProject(cleanSource, { manualMarker: true, homePath: true });

    const result = runPackaging(project.directory, cleanSource);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("absolute Windows user path");
  });

  it("rejects sensitive content in an archive root document", async () => {
    const project = await seedProject(cleanSource);
    await writeFile(path.join(project.directory, "LICENSE"), `Token: ghp_${"a".repeat(30)}`);

    const result = runPackaging(project.directory, cleanSource);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Release privacy check rejected LICENSE: found GitHub access token");
  });

  it("rejects paths that cannot be represented without USTAR mangling", async () => {
    const project = await seedProject(cleanSource, { longFilename: true });

    const result = runPackaging(project.directory, cleanSource);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("too long for a portable USTAR archive");
  });
});

interface SourceIdentity {
  version: string;
  commit: string;
  sourceRef: string;
  clean: boolean;
  workerPolicySha256: string;
}

async function seedProject(
  source: SourceIdentity,
  options: { manualMarker?: boolean; homePath?: boolean; longFilename?: boolean } = {}
) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "open-prep-packaging-"));
  temporaryDirectories.push(directory);
  const outputDirectory = path.join(directory, "out");
  await mkdir(path.join(outputDirectory, "_next", "static", "chunks"), { recursive: true });
  await writeFile(path.join(directory, "package.json"), JSON.stringify({ version: source.version }));
  await Promise.all([
    ...archiveDocuments.map(async (document) => writeFile(path.join(directory, document), await readFile(path.resolve(document)))),
    writeFile(path.join(outputDirectory, "index.html"), options.homePath ? "C:\\Users\\private-person\\private-project" : "home"),
    writeFile(path.join(outputDirectory, "404.html"), "not found"),
    writeFile(path.join(outputDirectory, "_headers"), "/*\n  X-Content-Type-Options: nosniff\n"),
    writeFile(path.join(outputDirectory, "manifest.webmanifest"), "{}"),
    writeFile(path.join(outputDirectory, "sw.js"), "const worker = true;"),
    writeFile(path.join(outputDirectory, "_next", "static", "chunks", "app.js"), "const app = true;")
  ]);
  if (options.longFilename) await writeFile(path.join(outputDirectory, `${"x".repeat(101)}.txt`), "long path");

  const inventory = await createArtifactInventory(outputDirectory);
  const cacheId = createCacheIdentity({
    ...source,
    coreInventory: selectCorePrecacheInventory(inventory, ["index.html", "404.html"])
  });
  const marker = options.manualMarker
    ? createReleaseProvenance({
        ...source,
        artifactCount: inventory.length,
        inventorySha256: hashArtifactInventory(inventory),
        cacheId
      })
    : await writeReleaseMarker(outputDirectory, { ...source, cacheId });
  if (options.manualMarker) {
    await writeFile(path.join(outputDirectory, RELEASE_MARKER_FILENAME), `${JSON.stringify(marker, null, 2)}\n`);
  }
  return { directory, outputDirectory, inventory, marker };
}

function runPackaging(directory: string, source: SourceIdentity, extraArguments: string[] = []) {
  return spawnSync(process.execPath, [packagingScript, "--output", "out", "--dist", "dist", ...extraArguments], {
    cwd: directory,
    encoding: "utf8",
    env: {
      ...process.env,
      OPEN_PREP_SOURCE_COMMIT: source.commit,
      OPEN_PREP_SOURCE_REF: source.sourceRef,
      OPEN_PREP_SOURCE_CLEAN: String(source.clean)
    },
    timeout: 20_000
  });
}

function digest(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function parseChecksums(contents: string) {
  return new Map(contents.trimEnd().split("\n").map((line) => {
    const match = line.match(/^([a-f0-9]{64})  ([^/\\]+)$/);
    if (match === null) throw new Error(`Invalid checksum line: ${line}`);
    return [match[2], match[1]];
  }));
}

interface TarEntry {
  type: string;
  contents: Buffer;
}

function readTarEntries(archive: Uint8Array) {
  const tar = gunzipSync(archive);
  const entries = new Map<string, TarEntry>();
  for (let offset = 0; offset + 512 <= tar.byteLength;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const entryPath = prefix === "" ? name : `${prefix}/${name}`;
    const size = Number.parseInt(readTarString(header, 124, 12).trim() || "0", 8);
    const type = readTarString(header, 156, 1) || "0";
    offset += 512;
    entries.set(entryPath, { type, contents: Buffer.from(tar.subarray(offset, offset + size)) });
    offset += Math.ceil(size / 512) * 512;
  }
  return entries;
}

function readTarString(buffer: Uint8Array, offset: number, length: number) {
  const field = Buffer.from(buffer.subarray(offset, offset + length));
  const end = field.indexOf(0);
  return field.subarray(0, end === -1 ? field.length : end).toString("utf8");
}
