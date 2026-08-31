import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const publicDirectory = resolve(process.cwd(), "public");
const startFilename = "math-drill-ai-pack-authoring-start.md";
const modules = [
  {
    filename: "math-drill-ai-pack-fixed-numeric-kit.md",
    kind: "fixed_numeric",
    schema: "question-pack-v2.schema.json",
    example: "question-pack-starter.mathdrill.json"
  },
  {
    filename: "math-drill-ai-pack-generated-template-kit.md",
    kind: "generated_template",
    schema: "question-pack-v2.schema.json",
    example: "question-pack-template-example.mathdrill.json"
  },
  {
    filename: "math-drill-ai-pack-exhibit-kit.md",
    kind: "exhibit",
    schema: "question-pack-v2.schema.json",
    example: "question-pack-exhibit-example.mathdrill.json"
  },
  {
    filename: "math-drill-ai-pack-market-sizing-kit.md",
    kind: "market_sizing",
    schema: "question-pack-v2.schema.json",
    example: "question-pack-market-sizing-example.mathdrill.json"
  },
  {
    filename: "math-drill-ai-pack-benchmark-kit.md",
    kind: "benchmark",
    schema: "question-pack-v2.schema.json",
    example: "question-pack-benchmark-example.mathdrill.json"
  },
  {
    filename: "math-drill-ai-pack-case-practice-kit.md",
    kind: "case_practice",
    schema: "question-pack-v3.schema.json",
    example: "question-pack-case-questioning-example.mathdrill.json"
  }
] as const;

describe("focused AI pack authoring kits", () => {
  it("keeps the Start Here contract compact and complete", () => {
    const path = resolve(publicDirectory, startFilename);
    const guide = readFileSync(path, "utf8");
    const size = Buffer.byteLength(guide);

    expect(size).toBeGreaterThanOrEqual(10_000);
    expect(size).toBeLessThanOrEqual(20_000);
    expect(guide).toContain("Kit revision: **2026-08-29**");
    expect(guide).toContain("math-drill-question-pack");
    expect(guide).toContain("return exactly one complete JSON object");
    expect(guide).toContain("5 MiB (5,242,880 bytes)");
    expect(guide).toContain("10 to 25 ordinary questions");
    expect(guide).toContain("copy **all** validation errors");
    expect(guide).toContain("If this text is already inside a complete family bundle, stop here");
    expect(guide).toContain("return concise clarification questions and no JSON");
  });

  it("provides one small module for every supported top-level kind", () => {
    expect(new Set(modules.map(({ kind }) => kind))).toEqual(
      new Set([
        "fixed_numeric",
        "generated_template",
        "exhibit",
        "market_sizing",
        "benchmark",
        "case_practice"
      ])
    );

    for (const { filename, kind, schema, example } of modules) {
      const path = resolve(publicDirectory, filename);

      expect(existsSync(path), filename).toBe(true);
      const guide = readFileSync(path, "utf8");
      expect(Buffer.byteLength(guide), filename).toBeLessThanOrEqual(12_000);
      expect(guide, filename).toContain("Kit revision: **2026-08-29**");
      expect(guide, filename).toContain("math-drill-ai-pack-authoring-start.md");
      expect(guide, filename).toContain("math-drill-question-pack");
      expect(guide, filename).toContain(`Kind: \`${kind}\``);
      expect(guide, filename).toContain(schema);
      expect(guide, filename).toContain(example);
      expect(guide, filename).toContain("binding output contract");
      expect(guide, filename).toContain("ready for app validation");
      expect(guide, filename).toContain("complete");
    }
  });

  it("documents the v3 schema dependency and the visual safety boundary", () => {
    const caseModule = readFileSync(
      resolve(publicDirectory, "math-drill-ai-pack-case-practice-kit.md"),
      "utf8"
    );
    const exhibitModule = readFileSync(
      resolve(publicDirectory, "math-drill-ai-pack-exhibit-kit.md"),
      "utf8"
    );

    expect(caseModule).toContain("relative `$ref` references into `question-pack-v2.schema.json`");
    expect(caseModule).toContain("question-pack-v3-full-case-example.mathdrill.json");
    expect(caseModule).toContain("40 points for unique weighted-intent coverage");
    expect(caseModule).toContain("Unranked attempts therefore have an 85-point maximum");
    expect(exhibitModule).toContain("do not embed an image");
    expect(exhibitModule).toContain("Do not rely on color alone");
    expect(exhibitModule).toContain("does not parse or sort text dates");
    expect(exhibitModule).toContain("does not seed, replace, or reset the running total");
    expect(caseModule).toContain("acceptedHypothesisIds");
    expect(caseModule).toContain("Questioning → Structure → Exhibit and math → Brainstorm → Synthesize");
    expect(caseModule).toContain("cannot be the only alias signal");
  });
});
