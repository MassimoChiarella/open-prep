import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  RELEASE_MARKER_FILENAME,
  assertPortableArtifactPath,
  assertReleaseFilePrivacy,
  sha256,
  validateReleaseOutput
} from "./release-contract.mts";

const TAR_BLOCK_BYTES = 512;
const TAR_MAX_FILE_BYTES = Number.parseInt("77777777777", 8);
const WINDOWS_INVALID_PATH_CHARACTERS = /[<>:"|?*]/;
const ARCHIVE_ROOT_DOCUMENTS = [
  "BUNDLED_CONTENT_LICENSE.md",
  "LICENSE",
  "RELEASE_ARCHIVE_README.md",
  "THIRD_PARTY_NOTICES.md"
];

try {
  const options = parseArguments(process.argv.slice(2));
  const result = await packageRelease(options);
  console.log(`Packaged ${result.archiveName} and ${result.provenanceName} in ${result.destinationDirectory}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

async function packageRelease({ output, destination, allowDirty }) {
  const outputDirectory = path.resolve(output);
  const destinationDirectory = path.resolve(destination);
  assertSeparateDirectories(outputDirectory, destinationDirectory);

  const packageJson = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));
  const source = readSourceIdentity();
  const { inventory, marker } = await validateReleaseOutput(outputDirectory, {
    version: packageJson.version,
    commit: source.commit,
    sourceRef: source.sourceRef,
    clean: source.clean
  });

  const dirtyRehearsal = marker.source.clean === false;
  if (dirtyRehearsal && !allowDirty) {
    throw new Error("Release marker is dirty. Rebuild from a clean checkout, or use --allow-dirty for a visibly non-official rehearsal.");
  }
  if (!dirtyRehearsal && !isAuthorizedReleaseRef(marker.source.ref, marker.version)) {
    throw new Error(`Clean packages require main or the exact tag refs/tags/v${marker.version}; marker source ref is ${marker.source.ref}.`);
  }

  const official = !dirtyRehearsal && marker.source.ref === `refs/tags/v${marker.version}`;
  const status = dirtyRehearsal ? "dirty-rehearsal" : official ? "official" : "release-candidate";
  const releaseName = official
    ? `open-prep-v${marker.version}`
    : `open-prep-v${marker.version}-${dirtyRehearsal ? "dirty" : "candidate"}-${marker.source.commit.slice(0, 12)}`;
  assertPortableArtifactPath(releaseName);

  const files = [
    ...await readVerifiedFiles(outputDirectory, inventory, marker),
    ...await readArchiveDocuments()
  ];
  assertReleaseFilePrivacy(files);
  const archive = createTarGzip(releaseName, files);
  const archiveName = `${releaseName}.tar.gz`;
  const provenanceName = `${releaseName}.provenance.json`;
  const archiveSha256 = sha256(archive);
  const provenance = {
    schemaVersion: 1,
    product: "Open Prep",
    version: marker.version,
    release: {
      official,
      status
    },
    source: marker.source,
    artifact: {
      archive: archiveName,
      archiveSha256,
      topLevelDirectory: `${releaseName}/`,
      packagedFiles: files.length,
      verifiedFiles: marker.artifact.files,
      inventorySha256: marker.artifact.inventorySha256,
      workerPolicySha256: marker.artifact.workerPolicySha256,
      cacheId: marker.artifact.cacheId
    }
  };
  const provenanceBytes = Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`, "utf8");
  const checksums = Buffer.from(
    `${archiveSha256}  ${archiveName}\n${sha256(provenanceBytes)}  ${provenanceName}\n`,
    "utf8"
  );

  await writePackage(destinationDirectory, new Map([
    [archiveName, archive],
    [provenanceName, provenanceBytes],
    ["SHA256SUMS", checksums]
  ]));

  return { archiveName, provenanceName, destinationDirectory };
}

async function readArchiveDocuments() {
  return Promise.all(ARCHIVE_ROOT_DOCUMENTS.map(async (documentPath) => ({
    path: documentPath,
    contents: await readFile(path.resolve(documentPath))
  })));
}

async function readVerifiedFiles(outputDirectory, inventory, marker) {
  const files = [];
  for (const entry of inventory) {
    assertPackagingPath(entry.path);
    const contents = await readFile(path.join(outputDirectory, ...entry.path.split("/")));
    if (contents.byteLength !== entry.bytes || sha256(contents) !== entry.sha256) {
      throw new Error(`Static output changed while packaging: ${entry.path}. Rebuild and try again.`);
    }
    files.push({ path: entry.path, contents });
  }

  const markerBytes = await readFile(path.join(outputDirectory, RELEASE_MARKER_FILENAME));
  let packagedMarker;
  try {
    packagedMarker = JSON.parse(markerBytes.toString("utf8"));
  } catch {
    throw new Error(`Verified release marker changed while packaging: ${RELEASE_MARKER_FILENAME}.`);
  }
  if (JSON.stringify(packagedMarker) !== JSON.stringify(marker)) {
    throw new Error(`Verified release marker changed while packaging: ${RELEASE_MARKER_FILENAME}.`);
  }
  files.push({ path: RELEASE_MARKER_FILENAME, contents: markerBytes });
  return files;
}

function createTarGzip(topLevelDirectory, files) {
  const directories = new Set([topLevelDirectory]);
  const archiveFiles = [];

  for (const file of files) {
    const archivePath = `${topLevelDirectory}/${file.path}`;
    assertPackagingPath(archivePath);
    const segments = archivePath.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(segments.slice(0, index).join("/"));
    }
    archiveFiles.push({ path: archivePath, contents: file.contents });
  }

  const entries = [
    ...[...directories].map((directory) => ({ path: directory, contents: Buffer.alloc(0), type: "5" })),
    ...archiveFiles.map((file) => ({ ...file, type: "0" }))
  ].sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : left.type.localeCompare(right.type));

  const blocks = [];
  const caseFoldedPaths = new Set();
  for (const entry of entries) {
    assertUniquePortablePath(entry.path, caseFoldedPaths);
    blocks.push(createTarHeader(entry.path, entry.contents.byteLength, entry.type));
    if (entry.type === "0") {
      blocks.push(entry.contents);
      const padding = (TAR_BLOCK_BYTES - (entry.contents.byteLength % TAR_BLOCK_BYTES)) % TAR_BLOCK_BYTES;
      if (padding > 0) blocks.push(Buffer.alloc(padding));
    }
  }
  blocks.push(Buffer.alloc(TAR_BLOCK_BYTES * 2));

  const gzip = gzipSync(Buffer.concat(blocks), { level: 9, mtime: 0 });
  gzip.writeUInt32LE(0, 4);
  gzip[9] = 255;
  return gzip;
}

function createTarHeader(archivePath, size, type) {
  if (!Number.isSafeInteger(size) || size < 0 || size > TAR_MAX_FILE_BYTES) {
    throw new Error(`Release file is too large for a portable USTAR archive: ${archivePath}`);
  }
  const { name, prefix } = splitTarPath(archivePath);
  const header = Buffer.alloc(TAR_BLOCK_BYTES);
  writeTarString(header, name, 0, 100);
  writeTarOctal(header, type === "5" ? 0o755 : 0o644, 100, 8);
  writeTarOctal(header, 0, 108, 8);
  writeTarOctal(header, 0, 116, 8);
  writeTarOctal(header, size, 124, 12);
  writeTarOctal(header, 0, 136, 12);
  header.fill(0x20, 148, 156);
  header.write(type, 156, 1, "ascii");
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");
  writeTarString(header, prefix, 345, 155);

  let checksum = 0;
  for (const byte of header) checksum += byte;
  const checksumText = checksum.toString(8).padStart(6, "0");
  header.write(`${checksumText}\0 `, 148, 8, "ascii");
  return header;
}

function splitTarPath(archivePath) {
  if (Buffer.byteLength(archivePath, "utf8") <= 100) return { name: archivePath, prefix: "" };
  for (let separator = archivePath.lastIndexOf("/"); separator > 0; separator = archivePath.lastIndexOf("/", separator - 1)) {
    const prefix = archivePath.slice(0, separator);
    const name = archivePath.slice(separator + 1);
    if (Buffer.byteLength(prefix, "utf8") <= 155 && Buffer.byteLength(name, "utf8") <= 100) {
      return { name, prefix };
    }
  }
  throw new Error(`Release path is too long for a portable USTAR archive: ${archivePath}`);
}

function writeTarString(header, value, offset, length) {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.byteLength > length) throw new Error(`USTAR field is too long: ${value}`);
  bytes.copy(header, offset);
}

function writeTarOctal(header, value, offset, length) {
  const encoded = value.toString(8);
  if (encoded.length > length - 1) throw new Error(`USTAR numeric field is too large: ${value}`);
  header.write(`${encoded.padStart(length - 1, "0")}\0`, offset, length, "ascii");
}

function assertPackagingPath(relativePath) {
  assertPortableArtifactPath(relativePath);
  if (WINDOWS_INVALID_PATH_CHARACTERS.test(relativePath)) {
    throw new Error(`Release artifact path is not portable across Windows and macOS: ${relativePath}`);
  }
  splitTarPath(relativePath);
}

function assertUniquePortablePath(archivePath, seen) {
  const key = archivePath.normalize("NFC").toLowerCase();
  if (seen.has(key)) throw new Error(`Release archive has a cross-platform path collision: ${archivePath}`);
  seen.add(key);
}

function isAuthorizedReleaseRef(sourceRef, version) {
  return ["main", "refs/heads/main", `refs/tags/v${version}`].includes(sourceRef);
}

function readSourceIdentity() {
  const commit = process.env.OPEN_PREP_SOURCE_COMMIT;
  const sourceRef = process.env.OPEN_PREP_SOURCE_REF;
  const clean = process.env.OPEN_PREP_SOURCE_CLEAN;
  if (commit !== undefined || sourceRef !== undefined || clean !== undefined) {
    if (commit === undefined || sourceRef === undefined || !["true", "false"].includes(clean ?? "")) {
      throw new Error("OPEN_PREP_SOURCE_COMMIT, OPEN_PREP_SOURCE_REF, and OPEN_PREP_SOURCE_CLEAN must be set together.");
    }
    return { commit: commit.toLowerCase(), sourceRef, clean: clean === "true" };
  }

  try {
    return {
      commit: git(["rev-parse", "HEAD"]).toLowerCase(),
      sourceRef: process.env.GITHUB_REF ?? git(["symbolic-ref", "--quiet", "--short", "HEAD"], "detached-head"),
      clean: git(["status", "--porcelain", "--untracked-files=all"]) === ""
    };
  } catch {
    throw new Error("Could not identify the current source revision. Run packaging in a Git checkout or set the OPEN_PREP_SOURCE_* variables.");
  }
}

function git(argumentsList, fallback) {
  try {
    return execFileSync("git", argumentsList, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

async function writePackage(destinationDirectory, files) {
  await mkdir(destinationDirectory, { recursive: true });
  const temporaryFiles = [];
  try {
    for (const [filename, contents] of files) {
      assertPortableArtifactPath(filename);
      const temporaryPath = path.join(destinationDirectory, `.${filename}.${process.pid}.tmp`);
      await writeFile(temporaryPath, contents, { flag: "wx" });
      temporaryFiles.push([temporaryPath, path.join(destinationDirectory, filename)]);
    }
    for (const [temporaryPath, finalPath] of temporaryFiles) await rename(temporaryPath, finalPath);
  } finally {
    await Promise.all(temporaryFiles.map(([temporaryPath]) => rm(temporaryPath, { force: true })));
  }
}

function assertSeparateDirectories(outputDirectory, destinationDirectory) {
  const relativeFromOutput = path.relative(outputDirectory, destinationDirectory);
  const relativeFromDestination = path.relative(destinationDirectory, outputDirectory);
  if (
    relativeFromOutput === "" ||
    (!relativeFromOutput.startsWith("..") && !path.isAbsolute(relativeFromOutput)) ||
    (!relativeFromDestination.startsWith("..") && !path.isAbsolute(relativeFromDestination))
  ) {
    throw new Error("Release output and package destination directories cannot overlap.");
  }
}

function parseArguments(argumentsList) {
  const options = { output: "out", destination: "dist", allowDirty: false };
  const seen = new Set();
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--allow-dirty") {
      if (seen.has(argument)) throw new Error(`Duplicate option: ${argument}`);
      seen.add(argument);
      options.allowDirty = true;
      continue;
    }
    if (!["--output", "--dist"].includes(argument) || seen.has(argument)) {
      throw new Error(`Unknown or duplicate option: ${argument}`);
    }
    const value = argumentsList[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Expected a value after ${argument}.`);
    seen.add(argument);
    if (argument === "--output") options.output = value;
    else options.destination = value;
    index += 1;
  }
  return options;
}
