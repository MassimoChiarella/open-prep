import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const policy = readFileSync(resolve(process.cwd(), ".github/dependabot.yml"), "utf8");
const updateBlocks = parseUpdateBlocks(policy);

describe("Dependabot policy", () => {
  it("defines only weekly npm and GitHub Actions updates from the repository root", () => {
    expect(policy).toMatch(/^version: 2\r?\n/);
    expect(policy.match(/^  - package-ecosystem:/gm)).toHaveLength(2);
    expect([...updateBlocks.keys()].sort()).toEqual(["github-actions", "npm"]);

    for (const block of updateBlocks.values()) {
      expect(block).toMatch(/^    directory: "\/"$/m);
      expect(block).toMatch(/^    schedule:\r?\n      interval: "weekly"$/m);
    }
  });

  it("groups routine updates and bounds open version-update pull requests", () => {
    for (const block of updateBlocks.values()) {
      expect(block).toMatch(/^    groups:$/m);
      expect(block).toMatch(/^      [a-z][a-z0-9-]*:$/m);

      const limit = Number(block.match(/^    open-pull-requests-limit: (\d+)$/m)?.[1]);
      expect(limit).toBeGreaterThan(0);
      expect(limit).toBeLessThanOrEqual(5);
    }

    expect(updateBlocks.get("npm")).toMatch(/dependency-type: "production"/);
    expect(updateBlocks.get("npm")).toMatch(/dependency-type: "development"/);
    expect(updateBlocks.get("github-actions")).toMatch(/patterns:\r?\n          - "\*"/);

    for (const block of updateBlocks.values()) {
      expect(block).toMatch(/applies-to: "version-updates"/);
      expect(block).toMatch(/update-types:\r?\n          - "minor"\r?\n          - "patch"/);
    }
  });

  it("keeps dependency pull requests under normal CI and central review", () => {
    expect(policy).toContain(
      "# Dependency updates require the repository's normal CI and central review."
    );

    const configuration = policy
      .split(/\r?\n/)
      .filter((line) => !line.trimStart().startsWith("#"))
      .join("\n");

    expect(configuration).not.toMatch(/auto[-_]?merge|merge-method/i);
    expect(configuration).not.toMatch(/^\s*(?:assignees|reviewers|registries):/m);
  });
});

function parseUpdateBlocks(source: string): Map<string, string> {
  const starts = [...source.matchAll(/^  - package-ecosystem: "([^"]+)"$/gm)];

  return new Map(starts.map((match, index) => {
    const ecosystem = match[1];
    const start = match.index;
    const end = starts[index + 1]?.index ?? source.length;
    return [ecosystem, source.slice(start, end).trimEnd()];
  }));
}
