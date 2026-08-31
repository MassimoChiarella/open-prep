import type { Metadata } from "next";

import { ContentPackDownloadsView } from "@/features/question-packs/ContentPackDownloadsView";

export const metadata: Metadata = {
  title: "Content Pack Downloads",
  description: "Download authoring guides, schemas, starters, and examples for Math Drill content packs."
};

export interface DownloadAsset {
  description: string;
  downloadName?: string;
  href: string;
  name: string;
  type: string;
}

export interface DownloadGroup {
  assets: readonly DownloadAsset[];
  description: string;
  id: string;
  title: string;
}

export type DownloadViewAsset = Omit<DownloadAsset, "description">;
export type DownloadViewGroup = Omit<DownloadGroup, "assets"> & {
  assets: readonly DownloadViewAsset[];
};

const downloadGroups: readonly DownloadGroup[] = [
  {
    id: "complete-bundles",
    title: "Recommended one-file AI bundles",
    description: "Choose the family you want and attach that single self-contained file to an AI chat. Each bundle includes its instructions, schema, examples, and checklist—no second file is needed.",
    assets: [
      {
        name: "Complete fixed numeric bundle",
        description: "One attachment for fixed prompts, numeric answers, tolerances, explanations, and metadata.",
        downloadName: "math-drill-ai-pack-fixed-numeric-complete-2026-08-29.md",
        href: "/math-drill-ai-pack-fixed-numeric-complete.md?revision=2026-08-29",
        type: "Markdown"
      },
      {
        name: "Complete generated template bundle",
        description: "One attachment for generated numeric variants and Interview Math setup, calculation, and interpretation.",
        downloadName: "math-drill-ai-pack-generated-template-complete-2026-08-29.md",
        href: "/math-drill-ai-pack-generated-template-complete.md?revision=2026-08-29",
        type: "Markdown"
      },
      {
        name: "Complete exhibit and chart bundle",
        description: "One attachment for tables and every supported chart subtype with numeric or multiple-choice questions.",
        downloadName: "math-drill-ai-pack-exhibit-complete-2026-08-29.md",
        href: "/math-drill-ai-pack-exhibit-complete.md?revision=2026-08-29",
        type: "Markdown"
      },
      {
        name: "Complete market sizing bundle",
        description: "One attachment for guided assumptions, formulas, checkpoints, sense checks, and scoring rubrics.",
        downloadName: "math-drill-ai-pack-market-sizing-complete-2026-08-29.md",
        href: "/math-drill-ai-pack-market-sizing-complete.md?revision=2026-08-29",
        type: "Markdown"
      },
      {
        name: "Complete benchmark bundle",
        description: "One attachment for fixed timed assessments with numeric questions and attainable score bands.",
        downloadName: "math-drill-ai-pack-benchmark-complete-2026-08-29.md",
        href: "/math-drill-ai-pack-benchmark-complete.md?revision=2026-08-29",
        type: "Markdown"
      },
      {
        name: "Complete case practice bundle",
        description: "One attachment for v2/v3 structuring, questioning, brainstorming, synthesis, lessons, fit, and full cases.",
        downloadName: "math-drill-ai-pack-case-practice-complete-2026-08-29.md",
        href: "/math-drill-ai-pack-case-practice-complete.md?revision=2026-08-29",
        type: "Markdown"
      }
    ]
  },
  {
    id: "advanced-guides",
    title: "Advanced authoring references",
    description: "Use these for human editing, all-family reference, or manual assembly. Individual Start/module files are components and require their matching schema and examples.",
    assets: [
      {
        name: "AI Start Here component",
        description: "Common trust, privacy, package selection, output, size, preflight, and repair rules for advanced modular assembly.",
        downloadName: "math-drill-ai-pack-authoring-start-2026-08-29.md",
        href: "/math-drill-ai-pack-authoring-start.md?revision=2026-08-29",
        type: "Markdown"
      },
      {
        name: "Complete all-family AI authoring kit",
        description: "The large omnibus reference with every supported format, schema, example, limit, and repair instruction.",
        downloadName: "math-drill-ai-pack-authoring-kit-2026-08-29.md",
        href: "/math-drill-ai-pack-authoring-kit.md?revision=2026-08-29",
        type: "Markdown"
      },
      {
        name: "Question pack author guide",
        description: "A concise human-readable guide to selecting, writing, validating, reviewing, and importing a package.",
        downloadName: "question-pack-author-guide-2026-08-29.md",
        href: "/question-pack-author-guide.md?revision=2026-08-29",
        type: "Markdown"
      }
    ]
  },
  {
    id: "focused-components",
    title: "Advanced focused components",
    description: "These compact modules are not self-contained attachments. Pair one with Start Here, the matching schema or schemas, and every named canonical subtype example.",
    assets: [
      {
        name: "Fixed numeric component",
        description: "Author reusable questions with fixed prompts, numeric answers, tolerances, explanations, and metadata.",
        href: "/math-drill-ai-pack-fixed-numeric-kit.md?revision=2026-08-29",
        type: "Markdown"
      },
      {
        name: "Generated template component",
        description: "Author variable-driven numeric drills and Interview Math questions with deterministic formulas.",
        href: "/math-drill-ai-pack-generated-template-kit.md?revision=2026-08-29",
        type: "Markdown"
      },
      {
        name: "Exhibit and chart component",
        description: "Author table, bar, line, stacked-bar, scatter, and other supported exhibit exercises.",
        href: "/math-drill-ai-pack-exhibit-kit.md?revision=2026-08-29",
        type: "Markdown"
      },
      {
        name: "Market sizing component",
        description: "Author guided market-sizing exercises with assumptions, formulas, checkpoints, and scoring ranges.",
        href: "/math-drill-ai-pack-market-sizing-kit.md?revision=2026-08-29",
        type: "Markdown"
      },
      {
        name: "Benchmark component",
        description: "Author a consistent benchmark sequence with questions, section timing, and scoring bands.",
        href: "/math-drill-ai-pack-benchmark-kit.md?revision=2026-08-29",
        type: "Markdown"
      },
      {
        name: "Case practice component",
        description: "Author case drills, deterministic questioning rubrics, and complete five-stage simulations.",
        href: "/math-drill-ai-pack-case-practice-kit.md?revision=2026-08-29",
        type: "Markdown"
      }
    ]
  },
  {
    id: "schemas-starter",
    title: "Schemas and starter",
    description: "Use the schemas for machine validation or begin with the small editable starter package.",
    assets: [
      {
        name: "Question pack v2 schema",
        description: "The canonical JSON Schema for fixed numeric, generated, exhibit, market-sizing, benchmark, and v2 case packages.",
        href: "/question-pack-v2.schema.json",
        type: "JSON Schema"
      },
      {
        name: "Case-practice v3 schema",
        description: "The schema for questioning and five-stage cases. Download it beside the v2 schema because its relative references depend on that filename.",
        href: "/question-pack-v3.schema.json",
        type: "JSON Schema"
      },
      {
        name: "Editable starter package",
        description: "A minimal fixed-numeric package to rename, edit, validate, and import.",
        href: "/question-pack-starter.mathdrill.json",
        type: "Open Prep pack"
      }
    ]
  },
  {
    id: "examples-cookbooks",
    title: "Examples and cookbooks",
    description: "Download a validated reference close to the content you want to create, then replace its original sample material.",
    assets: [
      {
        name: "Fixed numeric example",
        description: "A small retail practice pack showing fixed prompts, accepted answers, tolerances, and explanations.",
        href: "/question-pack-example.mathdrill.json",
        type: "Open Prep pack"
      },
      {
        name: "Generated template example",
        description: "A generated retail pack showing variables, prompt templates, formulas, and deterministic answer checking.",
        href: "/question-pack-template-example.mathdrill.json",
        type: "Open Prep pack"
      },
      {
        name: "Interview Math example",
        description: "A generated Interview Math package with case context and specialized evaluation metadata.",
        href: "/question-pack-interview-math-example.mathdrill.json",
        type: "Open Prep pack"
      },
      {
        name: "Exhibit example",
        description: "A table-based delivery-channel exercise with numeric questions tied to exhibit data.",
        href: "/question-pack-exhibit-example.mathdrill.json",
        type: "Open Prep pack"
      },
      {
        name: "Bar and line chart example",
        description: "A complete example of authored bar-chart and line-chart exhibits with linked questions.",
        href: "/question-pack-chart-example.mathdrill.json",
        type: "Open Prep pack"
      },
      {
        name: "Visualization cookbook",
        description: "A chart cookbook covering the supported exhibit visualization subtypes and their data shapes.",
        href: "/question-pack-visualization-cookbook.mathdrill.json",
        type: "Open Prep pack"
      },
      {
        name: "Market sizing example",
        description: "A guided neighborhood sizing exercise showing assumptions, formulas, hints, and answer ranges.",
        href: "/question-pack-market-sizing-example.mathdrill.json",
        type: "Open Prep pack"
      },
      {
        name: "Market sizing cookbook",
        description: "Multiple market-sizing methods illustrating reusable calculation structures and checkpoints.",
        href: "/question-pack-market-sizing-cookbook.mathdrill.json",
        type: "Open Prep pack"
      },
      {
        name: "Benchmark example",
        description: "A foundations benchmark illustrating an authored assessment sequence and scoring configuration.",
        href: "/question-pack-benchmark-example.mathdrill.json",
        type: "Open Prep pack"
      },
      {
        name: "v2 case-practice example",
        description: "A compact v2 case package combining a prompt, exhibit, calculation, brainstorming, and synthesis.",
        href: "/question-pack-case-practice-example.mathdrill.json",
        type: "Open Prep pack"
      },
      {
        name: "Questioning example",
        description: "A v3 case-opening exercise with concept groups, aliases, prioritization, and deterministic scoring.",
        href: "/question-pack-case-questioning-example.mathdrill.json",
        type: "Open Prep pack"
      },
      {
        name: "v3 full-case example",
        description: "A complete five-stage case covering questioning, structuring, calculation, brainstorming, and synthesis.",
        href: "/question-pack-v3-full-case-example.mathdrill.json",
        type: "Open Prep pack"
      }
    ]
  }
];

export default function ContentPackDownloadsPage() {
  const viewGroups: readonly DownloadViewGroup[] = downloadGroups.map((group) => ({
    description: group.description,
    id: group.id,
    title: group.title,
    assets: group.assets.map((asset) => ({
      ...(asset.downloadName === undefined ? {} : { downloadName: asset.downloadName }),
      href: asset.href,
      name: asset.name,
      type: asset.type
    }))
  }));

  return <ContentPackDownloadsView groups={viewGroups} />;
}
