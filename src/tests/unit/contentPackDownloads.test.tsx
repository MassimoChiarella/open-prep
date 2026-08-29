import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ContentPackDownloadsPage from "@/app/content-packs/downloads/page";

const expectedGroups = {
  "Core authoring guides": [
    "/math-drill-ai-pack-authoring-start.md?revision=2026-08-18",
    "/math-drill-ai-pack-authoring-kit.md?revision=2026-08-18",
    "/question-pack-author-guide.md"
  ],
  "Focused AI kits": [
    "/math-drill-ai-pack-fixed-numeric-kit.md",
    "/math-drill-ai-pack-generated-template-kit.md",
    "/math-drill-ai-pack-exhibit-kit.md",
    "/math-drill-ai-pack-market-sizing-kit.md",
    "/math-drill-ai-pack-benchmark-kit.md",
    "/math-drill-ai-pack-case-practice-kit.md"
  ],
  "Schemas and starter": [
    "/question-pack-v2.schema.json",
    "/question-pack-v3.schema.json",
    "/question-pack-starter.mathdrill.json"
  ],
  "Examples and cookbooks": [
    "/question-pack-example.mathdrill.json",
    "/question-pack-template-example.mathdrill.json",
    "/question-pack-interview-math-example.mathdrill.json",
    "/question-pack-exhibit-example.mathdrill.json",
    "/question-pack-chart-example.mathdrill.json",
    "/question-pack-visualization-cookbook.mathdrill.json",
    "/question-pack-market-sizing-example.mathdrill.json",
    "/question-pack-market-sizing-cookbook.mathdrill.json",
    "/question-pack-benchmark-example.mathdrill.json",
    "/question-pack-case-practice-example.mathdrill.json",
    "/question-pack-case-questioning-example.mathdrill.json",
    "/question-pack-v3-full-case-example.mathdrill.json"
  ]
} as const;

describe("ContentPackDownloadsPage", () => {
  it("groups every authoring asset behind same-origin download links", () => {
    render(<ContentPackDownloadsPage />);

    expect(screen.getByRole("link", { name: "← Back to Settings" })).toHaveAttribute("href", "/settings");

    for (const [groupName, expectedHrefs] of Object.entries(expectedGroups)) {
      const group = screen.getByRole("region", { name: groupName });
      const links = within(group).getAllByRole("link", { name: /^Download / });

      expect(links.map((link) => link.getAttribute("href"))).toEqual(expectedHrefs);
      for (const link of links) {
        expect(link).toHaveAttribute("download");
        expect(link.getAttribute("href")).toMatch(/^\//);
      }
    }

    expect(screen.getByRole("link", { name: "Download AI Start Here kit" })).toHaveAttribute(
      "download",
      "math-drill-ai-pack-authoring-start-2026-08-18.md"
    );
    expect(screen.getByRole("link", { name: "Download Complete AI authoring kit" })).toHaveAttribute(
      "download",
      "math-drill-ai-pack-authoring-kit-2026-08-18.md"
    );

    const publicPackages = readdirSync(resolve(process.cwd(), "public"))
      .filter((fileName) => fileName.endsWith(".mathdrill.json"))
      .map((fileName) => `/${fileName}`)
      .sort();
    const listedPackages = screen
      .getAllByRole("link", { name: /^Download / })
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => href?.endsWith(".mathdrill.json") === true)
      .sort();

    expect(listedPackages).toEqual(publicPackages);
  });
});
