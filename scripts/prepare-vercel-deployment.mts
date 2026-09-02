import { execFileSync } from "node:child_process";
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  RELEASE_MARKER_FILENAME,
  validateReleaseOutput,
  type ArtifactInventoryEntry,
  type ReleaseMarker,
  type ReleaseSource
} from "./release-contract.mts";
import { readStaticSecurityHeaders } from "./security-headers.mts";

interface SourceRoute {
  src: string;
  dest?: string;
  headers?: Readonly<Record<string, string>>;
  status?: number;
  continue?: boolean;
}

export async function prepareVercelDeployment(
  rootDirectory = process.cwd()
): Promise<{ outputDirectory: string; marker: ReleaseMarker }> {
  const root = await realpath(rootDirectory);
  const inputDirectory = path.join(root, "out");
  const vercelDirectory = path.join(root, ".vercel");
  const outputDirectory = path.join(vercelDirectory, "output");
  await assertSafeDirectory(root, inputDirectory);
  const expected = await readExpectedSource(root);
  const { inventory, marker } = await validateReleaseOutput(inputDirectory, expected);
  const headers = await readStaticSecurityHeaders(inputDirectory);
  const config = { version: 3, routes: createRoutes(inventory, headers) };

  await assertSafeDirectory(root, vercelDirectory);
  await mkdir(vercelDirectory, { recursive: true });
  await assertSafeDirectory(vercelDirectory, outputDirectory, true);
  const stagingDirectory = await mkdtemp(path.join(vercelDirectory, "output-staging-"));
  const previousDirectory = `${stagingDirectory}-previous`;
  let previousMoved = false;
  let outputInstalled = false;

  try {
    const staticDirectory = path.join(stagingDirectory, "static");
    await mkdir(staticDirectory);
    for (const filePath of [...inventory.map((entry) => entry.path), RELEASE_MARKER_FILENAME]) {
      const destination = path.join(staticDirectory, ...filePath.split("/"));
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(inputDirectory, ...filePath.split("/")), destination);
    }
    const copied = await validateReleaseOutput(staticDirectory, {
      ...expected,
      version: marker.version,
      commit: marker.source.commit,
      sourceRef: marker.source.ref,
      cacheId: marker.artifact.cacheId,
      workerPolicySha256: marker.artifact.workerPolicySha256
    });
    if (copied.marker.artifact.inventorySha256 !== marker.artifact.inventorySha256) {
      throw new Error("Static output changed while preparing the Vercel deployment. Rebuild and retry.");
    }
    await writeFile(path.join(stagingDirectory, "config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
    await validateReleaseOutput(inputDirectory, await readExpectedSource(root));
    await assertSafeDirectory(root, vercelDirectory);
    if (await assertSafeDirectory(vercelDirectory, outputDirectory, true)) {
      await rename(outputDirectory, previousDirectory);
      previousMoved = true;
    }
    try {
      await rename(stagingDirectory, outputDirectory);
      outputInstalled = true;
    } catch (error) {
      if (previousMoved) {
        await rename(previousDirectory, outputDirectory);
        previousMoved = false;
      }
      throw error;
    }
  } finally {
    await removeGeneratedDirectory(vercelDirectory, stagingDirectory);
    if (previousMoved && outputInstalled) await removeGeneratedDirectory(vercelDirectory, previousDirectory);
  }

  return { outputDirectory, marker };
}

function createRoutes(
  inventory: readonly ArtifactInventoryEntry[],
  securityHeaders: Readonly<Record<string, string>>
): Array<SourceRoute | { handle: "filesystem" }> {
  const routes: Array<SourceRoute | { handle: "filesystem" }> = [
    {
      src: "^/.*$",
      headers: { ...securityHeaders, "Cache-Control": "public, max-age=0, must-revalidate" },
      continue: true
    },
    { src: "^/sw\\.js$", headers: { "Cache-Control": "no-cache" }, continue: true },
    {
      src: "^/_next/static/.*$",
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      continue: true
    },
    { src: "^/404\\.html$", dest: "/404.html", status: 200 }
  ];

  for (const { path: filePath } of inventory) {
    if (!filePath.endsWith(".html") || filePath === "404.html") continue;
    const routePath = filePath === "index.html"
      ? "/"
      : `/${filePath.endsWith("/index.html") ? filePath.slice(0, -"index.html".length) : `${filePath.slice(0, -5)}/`}`;
    if (routePath !== "/") {
      // Vercel retains the incoming query when applying a Location redirect.
      routes.push({ src: exactPath(routePath.slice(0, -1)), headers: { Location: routePath }, status: 308 });
    }
    routes.push({ src: exactPath(routePath), dest: `/${filePath}` });
  }

  routes.push({ handle: "filesystem" });
  for (const { path: filePath } of inventory) {
    if (!filePath.endsWith(".txt")) continue;
    const segments = filePath.split("/");
    const segmentIndex = segments.findIndex((segment) => segment.startsWith("__next."));
    if (segmentIndex < 0 || segmentIndex === segments.length - 1) continue;
    const alias = [...segments.slice(0, segmentIndex), segments.slice(segmentIndex).join(".")].join("/");
    routes.push({ src: exactPath(`/${alias}`), dest: `/${filePath}` });
  }
  routes.push({ src: "^/.*$", dest: "/404.html", status: 404 });
  return routes;
}

function exactPath(value: string): string {
  return `^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
}

async function readExpectedSource(root: string): Promise<Partial<ReleaseSource>> {
  const expected: Partial<ReleaseSource> = { clean: true };
  const packageSource = await readFile(path.join(root, "package.json"), "utf8").catch((error: unknown) => {
    if (isMissing(error)) return undefined;
    throw error;
  });
  if (packageSource !== undefined) {
    expected.version = JSON.parse(packageSource).version;
    if (typeof expected.version !== "string") throw new Error("package.json must declare the application version.");
  }

  const gitEntry = await lstat(path.join(root, ".git")).catch((error: unknown) => {
    if (isMissing(error)) return undefined;
    throw error;
  });
  if (gitEntry !== undefined) {
    const git = (argumentsList: string[], fallback?: string): string => {
      try {
        return execFileSync("git", argumentsList, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      } catch (error) {
        if (fallback !== undefined) return fallback;
        throw error;
      }
    };
    if (await realpath(git(["rev-parse", "--show-toplevel"])) !== root) {
      throw new Error("Vercel preparation must run from the repository root.");
    }
    if (git(["status", "--porcelain", "--untracked-files=all"]) !== "") {
      throw new Error("The source checkout must be clean. Commit changes and rebuild before preparing Vercel output.");
    }
    expected.commit = git(["rev-parse", "HEAD"]).toLowerCase();
    expected.sourceRef = process.env.GITHUB_REF ?? git(["symbolic-ref", "--quiet", "--short", "HEAD"], "detached-head");
  }
  return expected;
}

async function assertSafeDirectory(parent: string, directory: string, recursive = false): Promise<boolean> {
  const stats = await lstat(directory).catch((error: unknown) => {
    if (isMissing(error)) return undefined;
    throw error;
  });
  if (stats === undefined) return false;
  if (stats.isSymbolicLink() || !stats.isDirectory() || path.dirname(await realpath(directory)) !== parent) {
    throw new Error(`Refusing a linked or unexpected deployment directory: ${directory}`);
  }
  if (recursive) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error(`Refusing a linked deployment entry: ${entry.name}`);
      if (entry.isDirectory()) await assertSafeDirectory(directory, path.join(directory, entry.name), true);
    }
  }
  return true;
}

async function removeGeneratedDirectory(parent: string, directory: string): Promise<void> {
  if (await assertSafeDirectory(parent, directory, true)) await rm(directory, { recursive: true });
}

function isMissing(error: unknown): boolean {
  return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT";
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error("Usage: node scripts/prepare-vercel-deployment.mts");
  const { outputDirectory, marker } = await prepareVercelDeployment();
  console.log(`Prepared Open Prep ${marker.version} for Vercel at ${outputDirectory}.`);
}
