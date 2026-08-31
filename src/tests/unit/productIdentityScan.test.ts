import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
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
});

function runScan(files: string[]) {
  return spawnSync(process.execPath, [scanScript, ...files], {
    cwd: projectRoot,
    encoding: "utf8"
  });
}
