import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const workflowPath = path.resolve(".github/workflows/release.yml");
const workflow = readFileSync(workflowPath, "utf8");
const actionPinCheck = path.resolve("scripts/check-action-pins.mjs");

describe("tagged release workflow", () => {
  it("runs only for version tags with read-only default permissions", () => {
    expect(workflow).toMatch(/^on:\n  push:\n    tags:\n      - "v\*"\n/mu);
    expect(workflow).not.toContain("workflow_dispatch:");
    expect(workflow).not.toMatch(/\n\s+branches:/u);
    expect(workflow).toMatch(/^permissions:\n  actions: read\n  contents: read$/mu);
  });

  it("uses only centrally reviewed immutable Actions", () => {
    const references = [...workflow.matchAll(/uses:\s+([^\s]+)\s+#\s+(v[^\s]+)/gu)]
      .map(([, reference, version]) => `${reference} # ${version}`);

    expect(new Set(references)).toEqual(new Set([
      "actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2",
      "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0",
      "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1"
    ]));

    const result = spawnSync(process.execPath, [actionPinCheck, workflowPath], { encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
  });

  it("compares two fresh builds and packages only the verified second artifact", () => {
    const verify = jobBlock("verify", "draft_release");
    const commands = [
      "npm ci",
      "npm run version:check",
      "npm audit --audit-level=high",
      "npx playwright install --with-deps chromium firefox webkit",
      "npm run check",
      "cp out/open-prep-release.json",
      "npm run build",
      "cmp \"$RUNNER_TEMP/open-prep-release.first.json\" out/open-prep-release.json",
      "npm run e2e:cross-browser",
      "node scripts/prepare-web-build.mjs verify --require-clean",
      "rm -rf dist",
      "node scripts/package-release.mjs",
      "node scripts/check-version-contract.mts --artifacts dist"
    ];

    expect(verify).toContain("node-version: 24.19.0");
    expectInOrder(verify, commands);
    expect(verify).toContain("dist/open-prep-v*.tar.gz");
    expect(verify).toContain("dist/open-prep-v*.provenance.json");
    expect(verify).toContain("dist/SHA256SUMS");
    expect(verify).toContain("if-no-files-found: error");
    expect(verify).toContain("if: failure()");
    expect(verify).toContain("test-results/");
    expect(verify).toContain("playwright-report/");
    expect(verify).not.toContain("npm run release:artifact");
    expect(verify.match(/node scripts\/package-release\.mjs/gu)).toHaveLength(1);
    expect(verify).not.toContain("contents: write");
  });

  it("grants write access only to the protected draft-release job", () => {
    const draftRelease = jobBlock("draft_release");

    expect(draftRelease).toContain("needs: verify");
    expect(draftRelease).toContain("environment: release");
    expect(draftRelease).toMatch(/permissions:\n\s+actions: read\n\s+contents: write/u);
    expect(draftRelease).toContain("gh run download");
    expect(draftRelease).toContain("gh release create");
    expect(draftRelease).toContain("--verify-tag");
    expect(draftRelease).toContain("--generate-notes");
    expect(draftRelease).toContain("--draft");
    expect(draftRelease).toContain("dist/open-prep-v*.tar.gz");
    expect(draftRelease).toContain("dist/open-prep-v*.provenance.json");
    expect(draftRelease).toContain("dist/SHA256SUMS");
    expect(draftRelease).not.toContain("gh release edit");
    expect(draftRelease).not.toContain("gh release publish");
    expect(draftRelease).not.toContain("--draft=false");
    expect(draftRelease).not.toContain("--latest");
  });

  it("records the production host while retaining separate tagged-release gates", () => {
    expect(workflow).not.toMatch(/actions\/deploy-pages|cloudflare|netlify|\bvercel\s+(?:deploy|promote)\b/iu);
    expect(workflow).toContain("Production is hosted at https://openprep.app/.");
    expect(workflow).toContain("Main-branch CI can deploy verified artifacts once its dedicated credential and enable flag are configured");
    expect(workflow).toContain("Release gates pending");
    expect(workflow).toContain("The draft remains unpublished");
    expect(workflow).toContain("This tagged draft remains unpublished until its hosted, accessibility, repository-setting, and other release gates are reviewed");
    expect(workflow).toContain("RELEASE_CHECKLIST.md");
    expect(workflow).not.toContain("Publish GitHub release");
    expect(workflow).not.toContain("publishes only the verified GitHub release");
    expect(workflow).not.toContain("verified GitHub release is published");
  });
});

function jobBlock(job: string, nextJob?: string): string {
  const start = workflow.indexOf(`  ${job}:`);
  const end = nextJob === undefined ? workflow.length : workflow.indexOf(`  ${nextJob}:`, start + 1);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return workflow.slice(start, end);
}

function expectInOrder(contents: string, values: string[]): void {
  let cursor = -1;
  for (const value of values) {
    const next = contents.indexOf(value, cursor + 1);
    expect(next, `${value} must appear after the previous release gate`).toBeGreaterThan(cursor);
    cursor = next;
  }
}
