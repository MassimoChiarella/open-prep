import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createArtifactInventory,
  createCacheIdentity,
  hashArtifactInventory,
  selectCorePrecacheInventory,
  sha256,
  writeReleaseMarker
} from "./release-contract.mts";
import { writeStaticSecurityHeaders } from "./security-headers.mts";

const BUILD_STATE_SCHEMA_VERSION = 1;
const CACHE_VERSION_PATTERN = /^const CACHE_VERSION = "([^"]+)";$/m;
const CACHE_VERSION_PLACEHOLDER = "__OPEN_PREP_CACHE_ID__";
const [command, ...rawArguments] = process.argv.slice(2);
const options = parseArguments(rawArguments);
const outputDirectory = path.resolve(options.get("output") ?? "out");
const statePath = path.resolve(options.get("state") ?? ".next/open-prep-build-state.json");
const packageJson = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));

if (command === "worker") {
  await writeStaticSecurityHeaders(outputDirectory);
  const workerPath = path.join(outputDirectory, "sw.js");
  const workerSource = await readFile(workerPath, "utf8");
  const workerPolicySource = replaceCacheVersion(workerSource, CACHE_VERSION_PLACEHOLDER);
  const workerPolicySha256 = sha256(workerPolicySource);
  const precacheUrls = readCorePrecacheUrls(workerSource);
  const corePaths = precacheUrls.map(publicUrlToArtifactPath);
  const source = readSourceIdentity();
  const inventory = await createArtifactInventory(outputDirectory);
  const coreInventory = selectCorePrecacheInventory(inventory, corePaths);
  const cacheId = createCacheIdentity({
    commit: source.commit,
    coreInventory,
    version: packageJson.version,
    workerPolicySha256
  });

  await writeFile(workerPath, replaceCacheVersion(workerSource, cacheId), "utf8");
  const finalizedInventory = await createArtifactInventory(outputDirectory);
  const state = {
    schemaVersion: BUILD_STATE_SCHEMA_VERSION,
    product: "Open Prep",
    version: packageJson.version,
    source,
    workerPolicySha256,
    cacheId,
    precacheUrls,
    corePaths,
    inventorySha256: hashArtifactInventory(finalizedInventory)
  };
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`Generated service-worker cache identity ${cacheId}.`);
} else if (command === "finalize") {
  const state = JSON.parse(await readFile(statePath, "utf8"));
  validateBuildState(state, packageJson.version);

  const workerSource = await readFile(path.join(outputDirectory, "sw.js"), "utf8");
  const workerPolicySha256 = sha256(replaceCacheVersion(workerSource, CACHE_VERSION_PLACEHOLDER));
  if (workerPolicySha256 !== state.workerPolicySha256) {
    throw new Error("Service-worker policy changed after cache generation. Rebuild from a clean output directory.");
  }
  if (readCacheVersion(workerSource) !== state.cacheId) {
    throw new Error("Generated service-worker cache identity does not match the build state.");
  }

  const inventory = await createArtifactInventory(outputDirectory);
  if (hashArtifactInventory(inventory) !== state.inventorySha256) {
    throw new Error("Static output changed after service-worker generation. Rebuild before finalizing it.");
  }

  const currentSource = readSourceIdentity();
  if (
    currentSource.commit !== state.source.commit ||
    currentSource.sourceRef !== state.source.sourceRef ||
    currentSource.clean !== state.source.clean
  ) {
    throw new Error("Source identity changed during the build. Rebuild before finalizing it.");
  }

  const marker = await writeReleaseMarker(outputDirectory, {
    version: state.version,
    ...state.source,
    workerPolicySha256: state.workerPolicySha256,
    cacheId: state.cacheId
  });
  console.log(`Finalized ${marker.product} ${marker.version} (${marker.artifact.files} files).`);
} else {
  throw new Error("Usage: node scripts/finalize-web-build.mjs <worker|finalize> [--output DIR] [--state FILE]");
}

function readCorePrecacheUrls(workerSource) {
  return [...new Set(readStringArray(workerSource, "PRECACHED_URLS"))].sort();
}

function readStringArray(source, name) {
  const block = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))?.[1];
  if (block === undefined) throw new Error(`Could not read ${name} from the service-worker policy.`);
  return [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function publicUrlToArtifactPath(value) {
  const url = new URL(value, "https://local.invalid");
  if (url.origin !== "https://local.invalid" || url.search !== "" || url.hash !== "") {
    throw new Error(`Core precache URL must be an origin-root path without query or hash: ${value}`);
  }
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") return "index.html";
  if (pathname.endsWith("/")) return `${pathname.slice(1)}index.html`;
  return pathname.slice(1);
}

function replaceCacheVersion(source, cacheId) {
  const matches = [...source.matchAll(new RegExp(CACHE_VERSION_PATTERN.source, "gm"))];
  if (matches.length !== 1) throw new Error("Service-worker policy must define exactly one CACHE_VERSION constant.");
  return source.replace(CACHE_VERSION_PATTERN, `const CACHE_VERSION = "${cacheId}";`);
}

function readCacheVersion(source) {
  const match = source.match(CACHE_VERSION_PATTERN);
  if (match === null) throw new Error("Service-worker policy is missing CACHE_VERSION.");
  return match[1];
}

function readSourceIdentity() {
  const environmentCommit = process.env.OPEN_PREP_SOURCE_COMMIT;
  const environmentRef = process.env.OPEN_PREP_SOURCE_REF;
  const environmentClean = process.env.OPEN_PREP_SOURCE_CLEAN;
  if (environmentCommit !== undefined || environmentRef !== undefined || environmentClean !== undefined) {
    if (environmentCommit === undefined || environmentRef === undefined || !["true", "false"].includes(environmentClean ?? "")) {
      throw new Error("OPEN_PREP_SOURCE_COMMIT, OPEN_PREP_SOURCE_REF, and OPEN_PREP_SOURCE_CLEAN must be set together.");
    }
    return {
      commit: environmentCommit.toLowerCase(),
      sourceRef: environmentRef,
      clean: environmentClean === "true"
    };
  }

  try {
    return {
      commit: git(["rev-parse", "HEAD"]).toLowerCase(),
      sourceRef: process.env.GITHUB_REF ?? git(["symbolic-ref", "--quiet", "--short", "HEAD"], "detached-head"),
      clean: git(["status", "--porcelain", "--untracked-files=all"]) === ""
    };
  } catch {
    return {
      commit: "0".repeat(40),
      sourceRef: "source-archive",
      clean: false
    };
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

function validateBuildState(state, expectedVersion) {
  if (
    state?.schemaVersion !== BUILD_STATE_SCHEMA_VERSION ||
    state.product !== "Open Prep" ||
    state.version !== expectedVersion ||
    typeof state.cacheId !== "string" ||
    typeof state.workerPolicySha256 !== "string" ||
    typeof state.inventorySha256 !== "string" ||
    !Array.isArray(state.precacheUrls) ||
    !Array.isArray(state.corePaths) ||
    state.source === null ||
    typeof state.source !== "object"
  ) {
    throw new Error("Open Prep build state is missing, malformed, or for another version.");
  }
}

function parseArguments(argumentsList) {
  const values = new Map();
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    const next = argumentsList[index + 1];
    if (!argument.startsWith("--") || next === undefined || next.startsWith("--")) {
      throw new Error(`Expected --name value, received ${argument}.`);
    }
    const name = argument.slice(2);
    if (!["output", "state"].includes(name) || values.has(name)) throw new Error(`Unknown or duplicate option: --${name}`);
    values.set(name, next);
    index += 1;
  }
  return values;
}
