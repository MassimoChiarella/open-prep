import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { npmVersionFromUserAgent, runtimeErrors } from "../../../scripts/check-runtime.mjs";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
  packageManager?: string;
  engines?: Record<string, string>;
};
const packageLock = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8")) as {
  packages?: Record<string, { engines?: Record<string, string> }>;
};

describe("contributor and CI toolchain contract", () => {
  it("pins the tested Node and npm versions in package metadata", () => {
    const engines = {
      node: ">=24.19.0 <25",
      npm: ">=11.17.0 <12"
    };

    expect(packageJson.packageManager).toBe("npm@11.17.0");
    expect(packageJson.engines).toEqual(engines);
    expect(packageLock.packages?.[""]?.engines).toEqual(engines);
    expect(readFileSync(path.join(root, ".node-version"), "utf8")).toBe("24.19.0\n");
  });

  it.each(["ci.yml", "release.yml"])("pins %s to the tested Node patch", (filename) => {
    const workflow = readFileSync(path.join(root, ".github", "workflows", filename), "utf8");
    const versions = [...workflow.matchAll(/node-version:\s*([^\s#]+)/gu)].map((match) => match[1]);

    expect(versions.length).toBeGreaterThan(0);
    for (const version of versions) expect(version).toBe("24.19.0");
  });

  it("fails unsupported runtimes with specific Node and npm requirements", () => {
    expect(runtimeErrors({ nodeVersion: "v16.20.2", npmVersion: "8.19.4" })).toEqual([
      "Node.js 24.19.0 or newer within Node 24 is required; found v16.20.2.",
      "npm 11.17.0 or newer within npm 11 is required; found 8.19.4."
    ]);
    expect(runtimeErrors({ nodeVersion: "v24.19.0", npmVersion: "11.17.0" })).toEqual([]);
    expect(runtimeErrors({ nodeVersion: "v25.0.0", npmVersion: "12.0.0" })).toHaveLength(2);
    expect(npmVersionFromUserAgent("npm/11.17.0 node/v24.19.0 win32 x64")).toBe("11.17.0");
  });

  it("guards the primary repository entry commands with the runtime preflight", () => {
    const scripts = (packageJson as typeof packageJson & { scripts: Record<string, string> }).scripts;

    expect(scripts.preinstall).toBe("node scripts/check-runtime.mjs");
    for (const command of ["dev", "build", "preview", "check", "lint", "typecheck", "test", "e2e", "e2e:cross-browser", "release:artifact"]) {
      expect(scripts[`pre${command}`]).toBe("npm run runtime:check");
    }
  });
});
