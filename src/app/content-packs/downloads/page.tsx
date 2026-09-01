import type { Metadata } from "next";

import { ContentPackDownloadsView } from "@/features/question-packs/ContentPackDownloadsView";

export const metadata: Metadata = {
  title: "Content Pack Downloads",
  description: "Download authoring guides, schemas, starters, and examples for Open Prep content packs."
};

export interface DownloadViewAsset {
  downloadName?: string;
  href: string;
  name: string;
  type: string;
}

export interface DownloadViewGroup {
  assets: readonly DownloadViewAsset[];
  description: string;
  id: string;
  title: string;
}

const humanGroups: readonly DownloadViewGroup[] = [
  {
    id: "starters-examples",
    title: "Editable starters and examples",
    description: "Choose the closest validated file, replace its sample material, then use the in-app importer to validate and test it.",
    assets: [
      ["Editable starter package", "/question-pack-starter.mathdrill.json"],
      ["Fixed numeric example", "/question-pack-example.mathdrill.json"],
      ["Generated template example", "/question-pack-template-example.mathdrill.json"],
      ["Interview Math example", "/question-pack-interview-math-example.mathdrill.json"],
      ["Exhibit example", "/question-pack-exhibit-example.mathdrill.json"],
      ["Bar and line chart example", "/question-pack-chart-example.mathdrill.json"],
      ["Visualization cookbook", "/question-pack-visualization-cookbook.mathdrill.json"],
      ["Market sizing example", "/question-pack-market-sizing-example.mathdrill.json"],
      ["Market sizing cookbook", "/question-pack-market-sizing-cookbook.mathdrill.json"],
      ["Benchmark example", "/question-pack-benchmark-example.mathdrill.json"],
      ["v2 case-practice example", "/question-pack-case-practice-example.mathdrill.json"],
      ["Questioning example", "/question-pack-case-questioning-example.mathdrill.json"],
      ["v3 full-case example", "/question-pack-v3-full-case-example.mathdrill.json"]
    ].map(([name, href]) => ({ href, name, type: "Open Prep pack" }))
  },
  {
    id: "guide-schemas",
    title: "Human guide and schemas",
    description: "Read the human workflow first. Use schemas as an advanced editing aid; the Open Prep importer remains authoritative.",
    assets: [
      {
        name: "Question pack author guide",
        downloadName: "question-pack-author-guide-2026-08-31.md",
        href: "/question-pack-author-guide.md?revision=2026-08-31",
        type: "Markdown"
      },
      {
        name: "Question pack v2 schema",
        href: "/question-pack-v2.schema.json",
        type: "JSON Schema"
      },
      {
        name: "Case-practice v3 schema",
        href: "/question-pack-v3.schema.json",
        type: "JSON Schema"
      }
    ]
  }
];

const optionalExternalGroups: readonly DownloadViewGroup[] = [
  {
    id: "complete-bundles",
    title: "Recommended one-file AI bundles",
    description: "Each optional family bundle is self-contained for use with an external tool; no second attachment is needed.",
    assets: [
      ["Complete fixed numeric bundle", "fixed-numeric"],
      ["Complete generated template bundle", "generated-template"],
      ["Complete exhibit and chart bundle", "exhibit"],
      ["Complete market sizing bundle", "market-sizing"],
      ["Complete benchmark bundle", "benchmark"],
      ["Complete case practice bundle", "case-practice"]
    ].map(([name, family]) => ({
      downloadName: `math-drill-ai-pack-${family}-complete-2026-08-29.md`,
      href: `/math-drill-ai-pack-${family}-complete.md?revision=2026-08-29`,
      name,
      type: "Markdown"
    }))
  },
  {
    id: "advanced-guides",
    title: "Advanced authoring references",
    description: "Optional provider-neutral references for external-tool workflows and all-family manual assembly.",
    assets: [
      {
        name: "AI Start Here component",
        downloadName: "math-drill-ai-pack-authoring-start-2026-08-29.md",
        href: "/math-drill-ai-pack-authoring-start.md?revision=2026-08-29",
        type: "Markdown"
      },
      {
        name: "Complete all-family AI authoring kit",
        downloadName: "math-drill-ai-pack-authoring-kit-2026-08-29.md",
        href: "/math-drill-ai-pack-authoring-kit.md?revision=2026-08-29",
        type: "Markdown"
      }
    ]
  },
  {
    id: "focused-components",
    title: "Advanced focused components",
    description: "These optional modules are not self-contained attachments. Pair one with Start Here, the matching schema, and its canonical examples.",
    assets: [
      ["Fixed numeric component", "fixed-numeric"],
      ["Generated template component", "generated-template"],
      ["Exhibit and chart component", "exhibit"],
      ["Market sizing component", "market-sizing"],
      ["Benchmark component", "benchmark"],
      ["Case practice component", "case-practice"]
    ].map(([name, family]) => ({
      href: `/math-drill-ai-pack-${family}-kit.md?revision=2026-08-29`,
      name,
      type: "Markdown"
    }))
  }
];

export default function ContentPackDownloadsPage() {
  return <ContentPackDownloadsView groups={humanGroups} optionalGroups={optionalExternalGroups} />;
}
