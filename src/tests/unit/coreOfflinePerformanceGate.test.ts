import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  RELEASE_MARKER_FILENAME,
  createArtifactInventory,
  selectCorePrecacheInventory,
  validateReleaseOutput
} from "../../../scripts/release-contract.mjs";

const outputDirectory = path.resolve("out");
const buildStatePath = path.resolve(".next/open-prep-build-state.json");
const workerSource = readFileSync(path.resolve("public/sw.js"), "utf8");
const precacheUrls = readStringArray(workerSource, "PRECACHED_URLS");
const authoringArtifactUrls = readStringArray(workerSource, "AUTHORING_ARTIFACT_URLS");
const communityPackCatalogUrl = readStringConstant(workerSource, "COMMUNITY_PACK_CATALOG_URL");
const communityPackPrefix = readStringConstant(workerSource, "COMMUNITY_PACK_PREFIX");

describe("core offline and performance release gate", () => {
  it("keeps optional authoring artifacts and community packs out of the core policy", () => {
    expect(authoringArtifactUrls.length).toBeGreaterThan(0);
    expect(authoringArtifactUrls.filter((url) => precacheUrls.includes(url))).toEqual([]);
    expect(precacheUrls).not.toContain(communityPackCatalogUrl);
    expect(precacheUrls.filter((url) => url.startsWith(communityPackPrefix))).toEqual([]);

    const publishedPackUrls = findFiles(path.resolve("public/community-packs"))
      .filter((file) => path.basename(file) === "pack.mathdrill.json")
      .map((file) => `/${path.relative(path.resolve("public"), file).replaceAll(path.sep, "/")}`);

    expect(publishedPackUrls.filter((url) => precacheUrls.includes(url))).toEqual([]);
    expect(workerSource).toContain("AUTHORING_ARTIFACT_URLS.includes(url.pathname)");
    expect(workerSource).toContain("url.pathname.startsWith(COMMUNITY_PACK_PREFIX)");
  });

  const verifiedBuildTest = existsSync(path.join(outputDirectory, RELEASE_MARKER_FILENAME)) ? it : it.skip;

  verifiedBuildTest("measures the verified generated core inventory against the existing budget", async () => {
    const [{ inventory }, state, builtWorkerSource, performanceSource] = await Promise.all([
      validateReleaseOutput(outputDirectory),
      readFile(buildStatePath, "utf8").then((source) => JSON.parse(source) as BuildState),
      readFile(path.join(outputDirectory, "sw.js"), "utf8"),
      readFile(path.resolve("scripts/check-performance-budgets.mjs"), "utf8")
    ]);
    const builtPrecacheUrls = [...new Set(readStringArray(builtWorkerSource, "PRECACHED_URLS"))].sort();
    const generatedCorePaths = builtPrecacheUrls.map(publicUrlToArtifactPath);
    const coreInventory = selectCorePrecacheInventory(inventory, state.corePaths);
    const coreBytes = coreInventory.reduce((total, entry) => total + entry.bytes, 0);
    const authoringPaths = readStringArray(builtWorkerSource, "AUTHORING_ARTIFACT_URLS")
      .map(publicUrlToArtifactPath);
    const authoringBytes = inventory
      .filter((entry) => authoringPaths.includes(entry.path))
      .reduce((total, entry) => total + entry.bytes, 0);

    expect(state.schemaVersion).toBe(1);
    expect(state.precacheUrls).toEqual(builtPrecacheUrls);
    expect(state.corePaths).toEqual(generatedCorePaths);
    expect(coreBytes).toBeLessThanOrEqual(readByteBudget(performanceSource, "serviceWorkerPrecacheBytes"));
    expect(authoringBytes).toBeGreaterThan(0);
    expect(coreBytes + authoringBytes).toBeGreaterThan(coreBytes);
    expect(state.corePaths.filter((entry) => authoringPaths.includes(entry))).toEqual([]);
    expect(state.corePaths.filter((entry) => entry.startsWith(communityPackPrefix.slice(1)))).toEqual([]);
  });
});

interface BuildState {
  corePaths: string[];
  precacheUrls: string[];
  schemaVersion: number;
}

function readStringArray(source: string, name: string, seen = new Set<string>()): string[] {
  if (seen.has(name)) throw new Error(`Circular service-worker array: ${name}`);
  const block = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))?.[1];
  if (block === undefined) throw new Error(`Could not read ${name} from public/sw.js.`);

  const nextSeen = new Set(seen).add(name);
  const literals = [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const spreads = [...block.matchAll(/\.\.\.([A-Z][A-Z0-9_]*)/g)]
    .flatMap((match) => readStringArray(source, match[1], nextSeen));
  return [...spreads, ...literals];
}

function readStringConstant(source: string, name: string): string {
  const value = source.match(new RegExp(`const ${name} = "([^"]+)";`))?.[1];
  if (value === undefined) throw new Error(`Could not read ${name} from public/sw.js.`);
  return value;
}

function readByteBudget(source: string, name: string): number {
  const match = source.match(new RegExp(`${name}:\\s*(\\d+)\\s*\\*\\s*1024`));
  if (match === null) throw new Error(`Could not read ${name} from the performance budget script.`);
  return Number(match[1]) * 1024;
}

function publicUrlToArtifactPath(value: string): string {
  const url = new URL(value, "https://local.invalid");
  if (url.origin !== "https://local.invalid" || url.search !== "" || url.hash !== "") {
    throw new Error(`Core precache URL must be an origin-root path without query or hash: ${value}`);
  }
  if (url.pathname === "/") return "index.html";
  if (url.pathname.endsWith("/")) return `${url.pathname.slice(1)}index.html`;
  return url.pathname.slice(1);
}

function findFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? findFiles(entryPath) : [entryPath];
  });
}
