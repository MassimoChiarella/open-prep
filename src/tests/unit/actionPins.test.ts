import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const script = path.resolve("scripts/check-action-pins.mjs");
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("GitHub Action pin policy", () => {
  it("accepts the repository workflows", () => {
    const result = runCheck(path.resolve(".github/workflows/ci.yml"));

    expect(result.status, result.stderr).toBe(0);
  });

  it("accepts full SHAs with release comments and local actions", async () => {
    const workflow = await writeWorkflow(`steps:
  - uses: actions/example@${"a".repeat(40)} # v1.2.3
  - uses: ./actions/local
`);

    expect(runCheck(workflow).status).toBe(0);
  });

  it("rejects mutable references and undocumented pins", async () => {
    const workflow = await writeWorkflow(`steps:
  - uses: actions/example@v1
  - uses: actions/other@${"b".repeat(40)}
`);
    const result = runCheck(workflow);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("must use a full 40-character commit SHA");
    expect(result.stderr).toContain("needs an inline release-version comment");
  });
});

async function writeWorkflow(contents: string) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "open-prep-action-pins-"));
  temporaryDirectories.push(directory);
  const file = path.join(directory, "workflow.yml");
  await writeFile(file, contents);
  return file;
}

function runCheck(file: string) {
  return spawnSync(process.execPath, [script, file], { encoding: "utf8" });
}
