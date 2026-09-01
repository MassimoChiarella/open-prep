import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const publicDirectory = resolve(projectRoot, "public");
const scanScript = resolve(projectRoot, "scripts", "check-product-identity.mjs");
const temporaryRoots: string[] = [];

afterAll(() => {
  for (const root of temporaryRoots) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe("product identity scan", () => {
  it("accepts the current authoring and question-pack display surfaces", () => {
    const currentFiles = readdirSync(publicDirectory)
      .filter(
        (filename) =>
          filename === "question-pack-author-guide.md" ||
          filename === "question-pack-v2.schema.json" ||
          filename === "question-pack-v3.schema.json" ||
          (filename.startsWith("math-drill-ai-pack-") && filename.endsWith(".md")) ||
          (filename.startsWith("question-pack-") && filename.endsWith(".mathdrill.json"))
      )
      .map((filename) => join(publicDirectory, filename));

    const result = runScan(currentFiles);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Product identity scan passed");
  });

  it("rejects an unallowlisted old visible product name", () => {
    const root = mkdtempSync(join(tmpdir(), "open-prep-identity-"));
    temporaryRoots.push(root);
    const stalePath = join(root, "stale-copy.md");
    writeFileSync(stalePath, "Consulting Math Practice\n", "utf8"); // identity-scan-fixture

    const result = runScan([stalePath]);
    const expectedName = ["Consulting", "Math", "Practice"].join(" ");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("stale-copy.md:1:1");
    expect(result.stderr).toContain(expectedName);
    expect(result.stderr).toContain("Product identity scan failed with 1 finding.");
  });

  it("includes untracked, non-ignored repository files by default", () => {
    const root = mkdtempSync(join(tmpdir(), "open-prep-identity-repository-"));
    temporaryRoots.push(root);
    const temporaryScript = join(root, "scripts", "check-product-identity.mjs");
    mkdirSync(join(root, "scripts"));
    copyFileSync(scanScript, temporaryScript);
    const gitInit = spawnSync("git", ["init", "--quiet"], { cwd: root, encoding: "utf8" });
    expect(gitInit.status, gitInit.stderr).toBe(0);

    const stalePath = join(root, "identity-scan-untracked.md");
    writeFileSync(stalePath, ["Consulting", "Math", "Practice"].join(" "), "utf8");

    const result = spawnSync(process.execPath, [temporaryScript], {
      cwd: root,
      encoding: "utf8"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("identity-scan-untracked.md:1:1");
  });
});

function runScan(files: string[]) {
  return spawnSync(process.execPath, [scanScript, ...files], {
    cwd: projectRoot,
    encoding: "utf8"
  });
}
