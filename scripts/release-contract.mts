import { createHash } from "node:crypto";
import { lstat, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export interface ArtifactInventoryEntry {
  bytes: number;
  path: string;
  sha256: string;
}

export interface ReleaseSource {
  clean: boolean;
  commit: string;
  sourceRef: string;
  version: string;
  workerPolicySha256: string;
}

export interface ReleaseMarker {
  artifact: {
    cacheId: string;
    files: number;
    inventorySha256: string;
    workerPolicySha256: string;
  };
  product: "Open Prep";
  schemaVersion: number;
  source: {
    clean: boolean;
    commit: string;
    ref: string;
  };
  version: string;
}

interface ReleaseFile {
  contents: string | Uint8Array;
  path: string;
}

export const RELEASE_MARKER_FILENAME = "open-prep-release.json";
export const RELEASE_SCHEMA_VERSION = 1;
export const REQUIRED_STATIC_ARTIFACTS = [
  "index.html",
  "404.html",
  "_headers",
  "manifest.webmanifest",
  "sw.js"
];

const RELEASE_MARKER_TEMP_FILENAME = `${RELEASE_MARKER_FILENAME}.tmp`;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".csv",
  ".html",
  ".js",
  ".json",
  ".md",
  ".svg",
  ".txt",
  ".webmanifest",
  ".xml"
]);
const TEXT_FILENAMES = new Set(["LICENSE"]);
const FORBIDDEN_PATH_SEGMENTS = new Set([
  ".git",
  "blob-report",
  "node_modules",
  "playwright-report",
  "test-results"
]);
const WINDOWS_RESERVED_NAMES = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const SENSITIVE_CONTENT_PATTERNS: readonly (readonly [RegExp, string])[] = [
  [/(?:^|[^A-Za-z0-9])[A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/][^\s"'<>]+/i, "absolute Windows user path"],
  [/(?:^|[\s"'=(])\/(?:Users|home)\/[A-Za-z0-9._-]+\/[^\s"'<>]+/, "absolute home-directory path"],
  [/file:\/{2,3}(?:[A-Za-z]:|\/(?:Users|home)\/)/i, "local file URL"],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
  [/AKIA[0-9A-Z]{16}/, "AWS access key"],
  [/gh[pousr]_[A-Za-z0-9]{30,}/, "GitHub access token"],
  [/sk-(?:proj-)?[A-Za-z0-9_-]{20,}/, "API secret token"]
];

export async function removeStaticOutput(outputDirectory = path.resolve("out")): Promise<void> {
  await rm(outputDirectory, { force: true, recursive: true });
}

export async function createArtifactInventory(
  outputDirectory = path.resolve("out")
): Promise<ArtifactInventoryEntry[]> {
  const rootStats = await stat(outputDirectory).catch(() => undefined);
  if (!rootStats?.isDirectory()) {
    throw new Error(`Static web build not found at ${outputDirectory}. Build it from a clean output directory first.`);
  }

  const files: ArtifactInventoryEntry[] = [];
  await visitDirectory(outputDirectory, "", files);
  return files;
}

async function visitDirectory(
  outputDirectory: string,
  relativeDirectory: string,
  files: ArtifactInventoryEntry[]
): Promise<void> {
  const directory = path.join(outputDirectory, ...relativeDirectory.split("/").filter(Boolean));
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);

  for (const entry of entries) {
    const relativePath = relativeDirectory === "" ? entry.name : `${relativeDirectory}/${entry.name}`;
    assertPortableArtifactPath(relativePath);
    const absolutePath = path.join(outputDirectory, ...relativePath.split("/"));
    const fileStats = await lstat(absolutePath);

    if (fileStats.isSymbolicLink()) {
      throw new Error(`Release artifacts cannot contain symbolic links: ${relativePath}`);
    }
    if (fileStats.isDirectory()) {
      await visitDirectory(outputDirectory, relativePath, files);
      continue;
    }
    if (!fileStats.isFile()) {
      throw new Error(`Release artifacts must contain only regular files: ${relativePath}`);
    }
    if (isReleaseMetadataPath(relativePath)) continue;

    const contents = await readFile(absolutePath);
    files.push({
      path: relativePath,
      bytes: contents.byteLength,
      sha256: sha256(contents)
    });
  }
}

export function hashArtifactInventory(inventory: readonly ArtifactInventoryEntry[]): string {
  const sorted = [...inventory].sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const seen = new Set();

  for (const entry of sorted) {
    assertPortableArtifactPath(entry.path);
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !HASH_PATTERN.test(entry.sha256)) {
      throw new Error(`Invalid release inventory entry: ${entry.path}`);
    }
    if (seen.has(entry.path)) throw new Error(`Duplicate release inventory path: ${entry.path}`);
    seen.add(entry.path);
  }

  return sha256(`${JSON.stringify(sorted)}\n`);
}

export function selectCorePrecacheInventory(
  inventory: readonly ArtifactInventoryEntry[],
  corePaths: readonly string[]
): ArtifactInventoryEntry[] {
  const byPath = new Map(inventory.map((entry) => [entry.path, entry]));
  const selected = [...new Set(corePaths)].map((entryPath) => {
    assertPortableArtifactPath(entryPath);
    const entry = byPath.get(entryPath);
    if (entry === undefined) throw new Error(`Core precache artifact is missing: ${entryPath}`);
    return entry;
  });

  return selected.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}

export function createCacheIdentity({
  version,
  commit,
  workerPolicySha256,
  coreInventory
}: Pick<ReleaseSource, "commit" | "version" | "workerPolicySha256"> & {
  coreInventory: readonly ArtifactInventoryEntry[];
}): string {
  assertVersion(version);
  assertCommit(commit);
  assertHash(workerPolicySha256, "worker policy SHA-256");
  const digest = sha256(`${JSON.stringify({
    version,
    commit: commit.toLowerCase(),
    workerPolicySha256,
    coreInventorySha256: hashArtifactInventory(coreInventory)
  })}\n`);
  return `math-drill-offline-v${version}-${digest.slice(0, 16)}`;
}

export function createReleaseProvenance({
  version,
  commit,
  sourceRef,
  clean,
  artifactCount,
  inventorySha256,
  workerPolicySha256,
  cacheId
}: ReleaseSource & {
  artifactCount: number;
  cacheId: string;
  inventorySha256: string;
}): ReleaseMarker {
  assertCommit(commit);
  const provenance = {
    schemaVersion: RELEASE_SCHEMA_VERSION,
    product: "Open Prep",
    version,
    source: {
      commit: commit.toLowerCase(),
      ref: sourceRef,
      clean
    },
    artifact: {
      files: artifactCount,
      inventorySha256,
      workerPolicySha256,
      cacheId
    }
  };
  validateReleaseMarkerData(provenance);
  return provenance;
}

export async function writeReleaseMarker(
  outputDirectory: string,
  source: ReleaseSource & { cacheId: string }
): Promise<ReleaseMarker> {
  const inventory = await createArtifactInventory(outputDirectory);
  await validateRequiredStaticArtifacts(outputDirectory, inventory);
  await assertReleasePrivacy(outputDirectory, inventory);
  const marker = createReleaseProvenance({
    ...source,
    artifactCount: inventory.length,
    inventorySha256: hashArtifactInventory(inventory)
  });
  const markerPath = path.join(outputDirectory, RELEASE_MARKER_FILENAME);
  const temporaryPath = path.join(outputDirectory, RELEASE_MARKER_TEMP_FILENAME);
  await writeFile(temporaryPath, `${JSON.stringify(marker, null, 2)}\n`, "utf8");
  await rename(temporaryPath, markerPath);
  return marker;
}

export async function readReleaseMarker(
  outputDirectory = path.resolve("out")
): Promise<ReleaseMarker> {
  const markerPath = path.join(outputDirectory, RELEASE_MARKER_FILENAME);
  let source;
  try {
    source = await readFile(markerPath, "utf8");
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") {
      throw new Error(`Verified release marker is missing: ${RELEASE_MARKER_FILENAME}`);
    }
    throw error;
  }

  let marker: unknown;
  try {
    marker = JSON.parse(source);
  } catch {
    throw new Error(`Verified release marker is not valid JSON: ${RELEASE_MARKER_FILENAME}`);
  }
  validateReleaseMarkerData(marker);
  return marker;
}

export async function validateReleaseOutput(
  outputDirectory = path.resolve("out"),
  expected: Partial<ReleaseSource & { cacheId: string }> = {}
): Promise<{ inventory: ArtifactInventoryEntry[]; marker: ReleaseMarker }> {
  const inventory = await createArtifactInventory(outputDirectory);
  await validateRequiredStaticArtifacts(outputDirectory, inventory);
  await assertReleasePrivacy(outputDirectory, inventory);
  const marker = await readReleaseMarker(outputDirectory);
  const currentHash = hashArtifactInventory(inventory);

  if (marker.artifact.files !== inventory.length || marker.artifact.inventorySha256 !== currentHash) {
    throw new Error("Static web build does not match its release marker. Rebuild and finalize the artifact.");
  }

  const comparisons: Array<readonly [string, unknown, unknown]> = [
    ["version", marker.version, expected.version],
    ["commit", marker.source.commit, expected.commit?.toLowerCase()],
    ["source ref", marker.source.ref, expected.sourceRef],
    ["clean state", marker.source.clean, expected.clean],
    ["worker policy", marker.artifact.workerPolicySha256, expected.workerPolicySha256],
    ["cache identity", marker.artifact.cacheId, expected.cacheId]
  ];
  for (const [label, actual, wanted] of comparisons) {
    if (wanted !== undefined && actual !== wanted) {
      throw new Error(`Release marker ${label} mismatch: expected ${wanted}, received ${actual}.`);
    }
  }

  return { inventory, marker };
}

export async function validateRequiredStaticArtifacts(
  outputDirectory: string,
  inventory?: readonly ArtifactInventoryEntry[]
): Promise<readonly ArtifactInventoryEntry[]> {
  const entries = inventory ?? await createArtifactInventory(outputDirectory);
  const byPath = new Map(entries.map((entry) => [entry.path, entry]));

  for (const requiredPath of REQUIRED_STATIC_ARTIFACTS) {
    const entry = byPath.get(requiredPath);
    if (entry === undefined || entry.bytes === 0) {
      throw new Error(`Static web build is incomplete: required file ${requiredPath} is missing or empty.`);
    }
  }
  if (!entries.some((entry) => entry.path.startsWith("_next/static/") && entry.path.endsWith(".js") && entry.bytes > 0)) {
    throw new Error("Static web build is incomplete: no generated Next.js static JavaScript was found.");
  }

  return entries;
}

export async function assertReleasePrivacy(
  outputDirectory: string,
  inventory: readonly ArtifactInventoryEntry[]
): Promise<void> {
  const files: ReleaseFile[] = [];
  for (const entry of inventory) {
    assertPortableArtifactPath(entry.path);
    if (!isTextArtifactPath(entry.path)) continue;
    files.push({
      path: entry.path,
      contents: await readFile(path.join(outputDirectory, ...entry.path.split("/")))
    });
  }
  assertReleaseFilePrivacy(files);
}

export function assertReleaseFilePrivacy(files: readonly ReleaseFile[]): void {
  for (const entry of files) {
    assertPortableArtifactPath(entry.path);
    if (!isTextArtifactPath(entry.path)) continue;
    const contents = Buffer.from(entry.contents).toString("utf8");
    const normalized = contents.replaceAll("\\\\", "\\");
    for (const [pattern, label] of SENSITIVE_CONTENT_PATTERNS) {
      if (pattern.test(contents) || pattern.test(normalized)) {
        throw new Error(`Release privacy check rejected ${entry.path}: found ${label}.`);
      }
    }
  }
}

function isTextArtifactPath(relativePath: string): boolean {
  return TEXT_FILENAMES.has(path.posix.basename(relativePath)) || TEXT_EXTENSIONS.has(path.posix.extname(relativePath).toLowerCase());
}

export function assertPortableArtifactPath(relativePath: string): void {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    throw new Error("Release artifact paths must be non-empty strings.");
  }
  if (
    relativePath.includes("\\") ||
    relativePath.includes("\0") ||
    /[\u0000-\u001f\u007f]/.test(relativePath) ||
    path.posix.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath) ||
    path.posix.normalize(relativePath) !== relativePath
  ) {
    throw new Error(`Release artifact path is not portable: ${relativePath}`);
  }

  const segments = relativePath.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === ".." || segment.endsWith(".") || segment.endsWith(" "))) {
    throw new Error(`Release artifact path is not portable: ${relativePath}`);
  }
  for (const segment of segments) {
    const lower = segment.toLowerCase();
    if (FORBIDDEN_PATH_SEGMENTS.has(lower) || lower.startsWith(".env") || lower.endsWith(".map") || WINDOWS_RESERVED_NAMES.test(segment)) {
      throw new Error(`Release artifact path is not allowed: ${relativePath}`);
    }
  }
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function isReleaseMetadataPath(relativePath: string): boolean {
  const filename = path.posix.basename(relativePath);
  return (
    relativePath === RELEASE_MARKER_FILENAME ||
    relativePath === RELEASE_MARKER_TEMP_FILENAME ||
    filename === "SHA256SUMS" ||
    /^open-prep-v[^/]+\.provenance\.json$/.test(filename)
  );
}

function validateReleaseMarkerData(value: unknown): asserts value is ReleaseMarker {
  if (!isRecord(value)) {
    throw new Error("Release marker must be a JSON object.");
  }
  const marker = value;
  if (marker.schemaVersion !== RELEASE_SCHEMA_VERSION || marker.product !== "Open Prep") {
    throw new Error("Release marker schema or product is not supported.");
  }
  const version = marker.version;
  assertVersion(version);
  if (!isRecord(marker.source)) throw new Error("Release marker source is missing.");
  const source = marker.source;
  assertCommit(source.commit);
  assertSafeMetadataString(source.ref, "source ref");
  if (typeof source.clean !== "boolean") throw new Error("Release marker clean state must be boolean.");
  if (!isRecord(marker.artifact)) throw new Error("Release marker artifact data is missing.");
  const artifact = marker.artifact;
  if (typeof artifact.files !== "number" || !Number.isSafeInteger(artifact.files) || artifact.files <= 0) {
    throw new Error("Release marker artifact count must be a positive integer.");
  }
  assertHash(artifact.inventorySha256, "inventory SHA-256");
  assertHash(artifact.workerPolicySha256, "worker policy SHA-256");
  const cacheId = artifact.cacheId;
  assertSafeMetadataString(cacheId, "cache identity");
  if (!cacheId.startsWith(`math-drill-offline-v${version}-`)) {
    throw new Error("Release marker cache identity does not match its version.");
  }
}

function assertVersion(version: unknown): asserts version is string {
  if (typeof version !== "string" || !VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid semantic version: ${String(version)}`);
  }
}

function assertCommit(commit: unknown): asserts commit is string {
  if (typeof commit !== "string" || !COMMIT_PATTERN.test(commit)) {
    throw new Error("Source commit must be a full 40-character hexadecimal revision.");
  }
}

function assertHash(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest.`);
  }
}

function assertSafeMetadataString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 256 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error(`Release ${label} must be a short printable string.`);
  }
  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || /^file:/i.test(value)) {
    throw new Error(`Release ${label} cannot contain an absolute local path.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
