// @vitest-environment node
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { prepareVercelDeployment } from "../../../scripts/prepare-vercel-deployment.mts";
import { sha256, validateReleaseOutput, writeReleaseMarker } from "../../../scripts/release-contract.mts";
import { readStaticSecurityHeaders, writeStaticSecurityHeaders } from "../../../scripts/security-headers.mts";

const roots: string[] = [];
const source = {
  version: "1.2.3",
  commit: "a".repeat(40),
  sourceRef: "main",
  clean: true,
  workerPolicySha256: sha256("worker"),
  cacheId: "math-drill-offline-v1.2.3-0123456789abcdef"
};

interface Route {
  src?: string;
  dest?: string;
  status?: number;
  headers?: Record<string, string>;
  continue?: boolean;
  handle?: string;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Vercel prebuilt deployment", () => {
  it("preserves verified bytes, source identity, generated CSP and project linkage", async () => {
    const root = await fixture();
    await mkdir(path.join(root, ".vercel", "output"), { recursive: true });
    await writeFile(path.join(root, ".vercel", "project.json"), '{"projectId":"synthetic"}');
    await writeFile(path.join(root, ".vercel", "output", "stale.txt"), "old deployment");

    await prepareVercelDeployment(root);

    const original = await validateReleaseOutput(path.join(root, "out"));
    const deployed = await validateReleaseOutput(path.join(root, ".vercel", "output", "static"));
    expect(deployed).toEqual(original);
    expect(await readFile(path.join(root, ".vercel", "project.json"), "utf8")).toBe('{"projectId":"synthetic"}');
    await expect(readFile(path.join(root, ".vercel", "output", "stale.txt"))).rejects.toMatchObject({ code: "ENOENT" });
    const config = await configuration(root);
    expect(config.version).toBe(3);
    const headers = await readStaticSecurityHeaders(path.join(root, "out"));
    expect(responseHeaders(config.routes, "/drills/")).toMatchObject(headers);
    expect(responseHeaders(config.routes, "/sw.js")["Cache-Control"]).toBe("no-cache");
    expect(responseHeaders(config.routes, "/_next/static/chunks/app.js")["Cache-Control"]).toContain("immutable");
    expect(responseHeaders(config.routes, "/open-prep-release.json")["Cache-Control"]).toContain("must-revalidate");
  });

  it("maps direct routes and Next navigation payloads without losing the offline 404 asset", async () => {
    const root = await fixture();
    await prepareVercelDeployment(root);
    const { routes } = await configuration(root);
    expect(terminalRoute(routes, "/").dest).toBe("/index.html");
    expect(terminalRoute(routes, "/drills/").dest).toBe("/drills/index.html");
    const redirect = terminalRoute(routes, "/drills");
    expect(redirect.status).toBe(308);
    expect(redirect.headers?.Location).toBe("/drills/");
    expect(terminalRoute(routes, "/drills/__next.drills.__PAGE__.txt").dest).toBe("/drills/__next.drills/__PAGE__.txt");
    const notFoundAsset = terminalRoute(routes, "/404.html");
    expect(notFoundAsset.dest).toBe("/404.html");
    expect(notFoundAsset.status ?? 200).toBe(200);
    expect(routes.at(-1)).toMatchObject({ dest: "/404.html", status: 404 });
    expect(routes.findIndex((route) => route.handle === "filesystem")).toBeLessThan(routes.length - 1);
  });

  it.each(["dirty", "tampered", "version"])("rejects a %s build before replacing previous output", async (failure) => {
    const root = await fixture();
    const previous = path.join(root, ".vercel", "output", "config.json");
    await mkdir(path.dirname(previous), { recursive: true });
    await writeFile(previous, "previous valid deployment");
    if (failure === "dirty") {
      await writeReleaseMarker(path.join(root, "out"), { ...source, clean: false });
    } else if (failure === "tampered") {
      await writeFile(path.join(root, "out", "index.html"), "changed after verification");
    } else {
      await writeFile(path.join(root, "package.json"), JSON.stringify({ version: "2.0.0" }));
    }

    await expect(prepareVercelDeployment(root)).rejects.toThrow();
    expect(await readFile(previous, "utf8")).toBe("previous valid deployment");
  });

  it("refuses a linked deployment directory without modifying its target", async () => {
    const root = await fixture();
    const target = await mkdtemp(path.join(os.tmpdir(), "open-prep-vercel-target-"));
    roots.push(target);
    await writeFile(path.join(target, "keep.txt"), "keep");
    await symlink(target, path.join(root, ".vercel"), process.platform === "win32" ? "junction" : "dir");

    await expect(prepareVercelDeployment(root)).rejects.toThrow();
    expect(await readFile(path.join(target, "keep.txt"), "utf8")).toBe("keep");
  });
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "open-prep-vercel-"));
  roots.push(root);
  await writeFile(path.join(root, "package.json"), JSON.stringify({ version: source.version }));
  const files = {
    "index.html": '<html><script>self.__next_f=[];</script>Home</html>',
    "drills/index.html": '<html><script>self.__next_f.push([1]);</script>Drills</html>',
    "drills/__next.drills/__PAGE__.txt": "synthetic navigation payload",
    "404.html": "<html>Not found</html>",
    "sw.js": "self.addEventListener('install', () => {});",
    "manifest.webmanifest": '{"name":"Open Prep"}',
    "_next/static/chunks/app.js": "export {};"
  };
  for (const [relative, contents] of Object.entries(files)) {
    const filename = path.join(root, "out", relative);
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, contents);
  }
  await writeStaticSecurityHeaders(path.join(root, "out"));
  await writeReleaseMarker(path.join(root, "out"), source);
  return root;
}

async function configuration(root: string): Promise<{ version: number; routes: Route[] }> {
  return JSON.parse(await readFile(path.join(root, ".vercel", "output", "config.json"), "utf8"));
}

function terminalRoute(routes: Route[], pathname: string): Route {
  const route = routes.find((candidate) => candidate.src && !candidate.continue && new RegExp(candidate.src).test(pathname));
  expect(route, `No route for ${pathname}`).toBeDefined();
  return route!;
}

function responseHeaders(routes: Route[], pathname: string) {
  return Object.assign({}, ...routes.filter((route) => route.src && route.continue && new RegExp(route.src).test(pathname)).map((route) => route.headers));
}
