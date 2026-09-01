import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export async function checkVersionContract({
  rootDirectory = process.cwd(),
  sourceRef = process.env.GITHUB_REF,
  artifactDirectory
} = {}) {
  const [packageJson, packageLock, changelog] = await Promise.all([
    readJson(path.join(rootDirectory, "package.json")),
    readJson(path.join(rootDirectory, "package-lock.json")),
    readFile(path.join(rootDirectory, "CHANGELOG.md"), "utf8")
  ]);
  const version = packageJson.version;

  if (typeof version !== "string" || !SEMVER_PATTERN.test(version)) {
    throw new Error("package.json must contain a valid SemVer version.");
  }
  if (packageLock.version !== version || packageLock.packages?.[""]?.version !== version) {
    throw new Error(`package-lock.json root versions must both equal package.json version ${version}.`);
  }

  const releaseMatches = [...changelog.matchAll(/^## \[([^\]]+)\] - (.+)$/gm)];
  const matchingRelease = releaseMatches.filter((match) => match[1] === version);
  if (!changelog.includes("## [Unreleased]") || matchingRelease.length !== 1) {
    throw new Error(`CHANGELOG.md must contain Unreleased and exactly one release heading for ${version}.`);
  }

  const tag = sourceRef?.startsWith("refs/tags/") ? sourceRef.slice("refs/tags/".length) : undefined;
  if (tag !== undefined) {
    if (tag !== `v${version}`) {
      throw new Error(`Release tag ${tag} does not match package version v${version}.`);
    }
    if (matchingRelease[0][2].trim() === "Pending") {
      throw new Error(`CHANGELOG.md release ${version} must have a release date before tagging.`);
    }
  }

  if (artifactDirectory !== undefined) {
    await checkOfficialArtifacts(path.resolve(rootDirectory, artifactDirectory), version);
  }

  return { version };
}

async function checkOfficialArtifacts(directory, version) {
  const releaseName = `open-prep-v${version}`;
  const archiveName = `${releaseName}.tar.gz`;
  const provenanceName = `${releaseName}.provenance.json`;
  const entries = await readdir(directory);

  for (const required of [archiveName, provenanceName, "SHA256SUMS"]) {
    if (!entries.includes(required)) throw new Error(`Release artifact is missing: ${required}.`);
  }

  const provenance = await readJson(path.join(directory, provenanceName));
  if (
    provenance.version !== version ||
    provenance.artifact?.archive !== archiveName ||
    provenance.artifact?.topLevelDirectory !== `${releaseName}/`
  ) {
    throw new Error(`Release provenance does not agree with version ${version} and archive ${archiveName}.`);
  }

  const checksums = await readFile(path.join(directory, "SHA256SUMS"), "utf8");
  const checksumFiles = checksums.trim().split(/\r?\n/).map((line) => line.trim().split(/\s+/).at(-1));
  if (!checksumFiles.includes(archiveName) || !checksumFiles.includes(provenanceName)) {
    throw new Error("SHA256SUMS must name the version-matched archive and provenance files.");
  }
}

async function readJson(filename) {
  try {
    return JSON.parse(await readFile(filename, "utf8"));
  } catch (error) {
    throw new Error(`Could not read valid JSON from ${filename}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseArguments(argumentsList) {
  if (argumentsList.length === 0) return {};
  if (argumentsList.length === 2 && argumentsList[0] === "--artifacts") {
    return { artifactDirectory: argumentsList[1] };
  }
  throw new Error("Usage: node scripts/check-version-contract.mjs [--artifacts <directory>]");
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await checkVersionContract(parseArguments(process.argv.slice(2)));
    console.log(`Version contract is consistent for Open Prep ${result.version}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
