import type { Metadata } from "next";

import { badgeClass, buttonClass, uiText } from "@/components/uiStyles";

export const metadata: Metadata = {
  title: "Content Pack Downloads",
  description: "Download authoring guides, schemas, starters, and examples for Math Drill content packs."
};

interface DownloadAsset {
  description: string;
  downloadName?: string;
  href: string;
  name: string;
  type: string;
}

interface DownloadGroup {
  assets: readonly DownloadAsset[];
  description: string;
  id: string;
  title: string;
}

const downloadGroups: readonly DownloadGroup[] = [
  {
    id: "core-guides",
    title: "Core authoring guides",
    description: "Start with the short AI handoff, use the complete kit for every supported format, or read the human-oriented author guide.",
    assets: [
      {
        name: "AI Start Here kit",
        description: "A compact prompt attachment that routes an LLM to the right package kind and authoring module.",
        downloadName: "math-drill-ai-pack-authoring-start-2026-08-18.md",
        href: "/math-drill-ai-pack-authoring-start.md?revision=2026-08-18",
        type: "Markdown"
      },
      {
        name: "Complete AI authoring kit",
        description: "The complete LLM reference with requirements, schemas, examples, limits, and repair instructions.",
        downloadName: "math-drill-ai-pack-authoring-kit-2026-08-18.md",
        href: "/math-drill-ai-pack-authoring-kit.md?revision=2026-08-18",
        type: "Markdown"
      },
      {
        name: "Question pack author guide",
        description: "A concise human-readable guide to selecting, writing, validating, and importing a package.",
        href: "/question-pack-author-guide.md",
        type: "Markdown"
      }
    ]
  },
  {
    id: "focused-kits",
    title: "Focused AI kits",
    description: "Attach only the module needed for the package you want an LLM to create.",
    assets: [
      {
        name: "Fixed numeric kit",
        description: "Author reusable questions with fixed prompts, numeric answers, tolerances, explanations, and metadata.",
        href: "/math-drill-ai-pack-fixed-numeric-kit.md",
        type: "Markdown"
      },
      {
        name: "Generated template kit",
        description: "Author variable-driven numeric drills and Interview Math questions with deterministic formulas.",
        href: "/math-drill-ai-pack-generated-template-kit.md",
        type: "Markdown"
      },
      {
        name: "Exhibit and chart kit",
        description: "Author table, bar, line, stacked-bar, scatter, and other supported exhibit exercises.",
        href: "/math-drill-ai-pack-exhibit-kit.md",
        type: "Markdown"
      },
      {
        name: "Market sizing kit",
        description: "Author guided market-sizing exercises with assumptions, formulas, checkpoints, and scoring ranges.",
        href: "/math-drill-ai-pack-market-sizing-kit.md",
        type: "Markdown"
      },
      {
        name: "Benchmark kit",
        description: "Author a consistent benchmark sequence with questions, section timing, and scoring bands.",
        href: "/math-drill-ai-pack-benchmark-kit.md",
        type: "Markdown"
      },
      {
        name: "Case practice kit",
        description: "Author case drills, deterministic questioning rubrics, and complete five-stage simulations.",
        href: "/math-drill-ai-pack-case-practice-kit.md",
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
        type: "Math Drill JSON"
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
        type: "Math Drill JSON"
      },
      {
        name: "Generated template example",
        description: "A generated retail pack showing variables, prompt templates, formulas, and deterministic answer checking.",
        href: "/question-pack-template-example.mathdrill.json",
        type: "Math Drill JSON"
      },
      {
        name: "Interview Math example",
        description: "A generated Interview Math package with case context and specialized evaluation metadata.",
        href: "/question-pack-interview-math-example.mathdrill.json",
        type: "Math Drill JSON"
      },
      {
        name: "Exhibit example",
        description: "A table-based delivery-channel exercise with numeric questions tied to exhibit data.",
        href: "/question-pack-exhibit-example.mathdrill.json",
        type: "Math Drill JSON"
      },
      {
        name: "Bar and line chart example",
        description: "A complete example of authored bar-chart and line-chart exhibits with linked questions.",
        href: "/question-pack-chart-example.mathdrill.json",
        type: "Math Drill JSON"
      },
      {
        name: "Visualization cookbook",
        description: "A chart cookbook covering the supported exhibit visualization subtypes and their data shapes.",
        href: "/question-pack-visualization-cookbook.mathdrill.json",
        type: "Math Drill JSON"
      },
      {
        name: "Market sizing example",
        description: "A guided neighborhood sizing exercise showing assumptions, formulas, hints, and answer ranges.",
        href: "/question-pack-market-sizing-example.mathdrill.json",
        type: "Math Drill JSON"
      },
      {
        name: "Market sizing cookbook",
        description: "Multiple market-sizing methods illustrating reusable calculation structures and checkpoints.",
        href: "/question-pack-market-sizing-cookbook.mathdrill.json",
        type: "Math Drill JSON"
      },
      {
        name: "Benchmark example",
        description: "A foundations benchmark illustrating an authored assessment sequence and scoring configuration.",
        href: "/question-pack-benchmark-example.mathdrill.json",
        type: "Math Drill JSON"
      },
      {
        name: "v2 case-practice example",
        description: "A compact v2 case package combining a prompt, exhibit, calculation, brainstorming, and synthesis.",
        href: "/question-pack-case-practice-example.mathdrill.json",
        type: "Math Drill JSON"
      },
      {
        name: "Questioning example",
        description: "A v3 case-opening exercise with concept groups, aliases, prioritization, and deterministic scoring.",
        href: "/question-pack-case-questioning-example.mathdrill.json",
        type: "Math Drill JSON"
      },
      {
        name: "v3 full-case example",
        description: "A complete five-stage case covering questioning, structuring, calculation, brainstorming, and synthesis.",
        href: "/question-pack-v3-full-case-example.mathdrill.json",
        type: "Math Drill JSON"
      }
    ]
  }
];

export default function ContentPackDownloadsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <a className="w-fit text-sm font-semibold text-teal underline-offset-4 hover:underline" href="/settings">
        ← Back to Settings
      </a>

      <header className="grid min-w-0 overflow-hidden border-y border-ink/20 bg-white lg:grid-cols-12">
        <div className="grid min-w-0 gap-5 px-5 py-7 sm:px-7 sm:py-9 lg:col-span-7">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="font-mono text-xs font-semibold text-ink/45">01</span>
            <span aria-hidden="true" className="h-px w-8 bg-coral" />
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-teal">Content packs</p>
          </div>
          <h1 className="break-words text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-ink [overflow-wrap:anywhere] sm:text-5xl">
            Download authoring resources
          </h1>
        </div>
        <div className="grid min-w-0 content-center border-t border-ink/15 px-5 py-7 sm:px-7 lg:col-span-5 lg:border-s lg:border-t-0">
          <p className="min-w-0 max-w-md break-words text-base leading-7 text-ink/70">
            Choose a guide or validated example, download it directly, and attach it to an AI chat or edit it locally. Package imports remain deterministic and local to this browser.
          </p>
        </div>
      </header>

      {downloadGroups.map((group, index) => (
        <DownloadSection group={group} index={index} key={group.id} />
      ))}
    </main>
  );
}

function DownloadSection({ group, index }: { group: DownloadGroup; index: number }) {
  const headingId = `${group.id}-heading`;

  return (
    <section aria-labelledby={headingId} className="grid gap-4">
      <div className="grid gap-2 border-b border-ink/15 pb-4 sm:grid-cols-[2rem_minmax(0,1fr)] sm:gap-x-3">
        <span aria-hidden="true" className="font-mono text-xs font-semibold text-coral sm:pt-2">
          {String(index + 2).padStart(2, "0")}
        </span>
        <div className="grid gap-2">
          <h2 className="text-2xl font-semibold text-ink" id={headingId}>
            {group.title}
          </h2>
          <p className={uiText.body}>{group.description}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.assets.map((asset) => (
          <article
            className="flex min-h-56 flex-col gap-3 border border-ink/15 border-t-2 border-t-teal bg-white p-5 transition-colors hover:border-ink/30 focus-within:border-teal sm:p-6"
            key={asset.href}
          >
            <span className={badgeClass("neutral")}>{asset.type}</span>
            <h3 className="text-lg font-semibold text-ink">{asset.name}</h3>
            <p className={uiText.body}>{asset.description}</p>
            <code className="break-all text-xs leading-5 text-ink/55">{asset.href.slice(1).split("?")[0]}</code>
            <a
              className={buttonClass("secondary", "mt-auto")}
              download={asset.downloadName ?? true}
              href={asset.href}
            >
              Download {asset.name}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
