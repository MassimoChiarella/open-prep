import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

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
});
