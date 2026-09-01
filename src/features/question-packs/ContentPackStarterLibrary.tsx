"use client";

import { cx, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";
import type { QuestionPackRecord } from "@/lib/storage/appStorageTypes";

interface StarterAsset {
  href: string;
  label: string;
}

interface StarterChoice {
  assets: readonly StarterAsset[];
  description: string;
  kind: QuestionPackRecord["kind"];
  subtype: string;
  title: string;
}

interface StarterFamily {
  builderFirst?: string;
  description: string;
  guidance: string;
  id: string;
  starters: readonly StarterChoice[];
  title: string;
}

const starterFamilies: readonly StarterFamily[] = [
  {
    builderFirst: "Use the guided fixed-numeric builder above first. It creates the smallest pack without requiring JSON editing.",
    description: "Start with a guided fixed question, a generated template, or a case-style calculation.",
    guidance: "For generated packs, define bounded variables before writing deterministic formulas. Keep answer units aligned with the formula. Interview Math requires caseStyle on every template and an expected unit that agrees with the answer.",
    id: "numeric",
    starters: [
      {
        assets: [
          { href: "/question-pack-starter.mathdrill.json", label: "Download one-question starter" },
          { href: "/question-pack-example.mathdrill.json", label: "Download expanded fixed-numeric example" }
        ],
        description: "Use the guided builder, or edit the one-question starter. The expanded example adds answer and tolerance options.",
        kind: "fixed_numeric",
        subtype: "fixed_numeric",
        title: "Fixed numeric questions"
      },
      {
        assets: [
          { href: "/question-pack-template-example.mathdrill.json", label: "Download generated-template example" }
        ],
        description: "Edit bounded variables, prompt placeholders, formula, answer unit, tolerance, and explanation steps.",
        kind: "generated_template",
        subtype: "generated_template",
        title: "Standard generated template"
      },
      {
        assets: [
          { href: "/question-pack-interview-math-example.mathdrill.json", label: "Download Interview Math example" }
        ],
        description: "Start from a complete caseStyle template with equation choices, interpretation choices, and unit-aware scoring.",
        kind: "generated_template",
        subtype: "caseStyle",
        title: "Interview Math generated template"
      }
    ],
    title: "Fixed, generated, and Interview Math"
  },
  {
    description: "Choose the visualization you want to teach, then edit the closest example or cookbook dataset.",
    guidance: "Record the source or synthetic status, unit, scale, and logical reading order. Add accessible titles and labels, and make every question understandable without color alone. The cookbook covers numeric and multiple-choice responses.",
    id: "exhibits",
    starters: [
      {
        assets: [{ href: "/question-pack-exhibit-example.mathdrill.json", label: "Download table example" }],
        description: "Edit a labeled table with a source note, units, and a numeric question.",
        kind: "exhibit",
        subtype: "table",
        title: "Table"
      },
      {
        assets: [{ href: "/question-pack-chart-example.mathdrill.json", label: "Download bar and line example" }],
        description: "Start from the bar dataset and keep category labels meaningful without relying on color.",
        kind: "exhibit",
        subtype: "bar_chart",
        title: "Bar chart"
      },
      {
        assets: [{ href: "/question-pack-chart-example.mathdrill.json", label: "Download bar and line example" }],
        description: "Start from the line dataset and preserve authored period order, scale, and units.",
        kind: "exhibit",
        subtype: "line_chart",
        title: "Line chart"
      },
      {
        assets: [{ href: "/question-pack-visualization-cookbook.mathdrill.json", label: "Download visualization cookbook" }],
        description: "Copy the pie dataset and keep category totals and labels readable.",
        kind: "exhibit",
        subtype: "pie_chart",
        title: "Pie chart"
      },
      {
        assets: [{ href: "/question-pack-visualization-cookbook.mathdrill.json", label: "Download visualization cookbook" }],
        description: "Copy the scatterplot dataset and retain exactly one Y series.",
        kind: "exhibit",
        subtype: "scatterplot",
        title: "Scatterplot"
      },
      {
        assets: [{ href: "/question-pack-visualization-cookbook.mathdrill.json", label: "Download visualization cookbook" }],
        description: "Copy the stacked-bar dataset and identify categories and series in text.",
        kind: "exhibit",
        subtype: "stacked_bar",
        title: "Stacked bar"
      },
      {
        assets: [{ href: "/question-pack-visualization-cookbook.mathdrill.json", label: "Download visualization cookbook" }],
        description: "Copy the index dataset. Values stay in authored order and are not rebased automatically.",
        kind: "exhibit",
        subtype: "index_chart",
        title: "Index chart"
      },
      {
        assets: [{ href: "/question-pack-visualization-cookbook.mathdrill.json", label: "Download visualization cookbook" }],
        description: "Copy the waterfall dataset and review total-row and running-total behavior.",
        kind: "exhibit",
        subtype: "waterfall",
        title: "Waterfall"
      }
    ],
    title: "Exhibits and charts"
  },
  {
    description: "Start with a complete sizing method and adjust its assumptions to fit the exercise.",
    guidance: "Edit assumptions and typed inputs first, then the formula, output unit, checkpoints, sense check, and rubric. Formula references, units, integer bounds, fractions, tolerance, and rounding are validated deterministically.",
    id: "market-sizing",
    starters: [
      {
        assets: [{ href: "/question-pack-market-sizing-example.mathdrill.json", label: "Download demand-side example" }],
        description: "Use the smallest complete assumptions-to-rubric market-sizing example.",
        kind: "market_sizing",
        subtype: "demand_side",
        title: "Demand-side sizing"
      },
      {
        assets: [{ href: "/question-pack-market-sizing-cookbook.mathdrill.json", label: "Download market-sizing cookbook" }],
        description: "Copy the capacity-based item with required boolean and numeric steps.",
        kind: "market_sizing",
        subtype: "capacity_based",
        title: "Capacity-based sizing"
      },
      {
        assets: [{ href: "/question-pack-market-sizing-cookbook.mathdrill.json", label: "Download market-sizing cookbook" }],
        description: "Copy the revenue-pool item with choice, currency, percentage, and output-unit fields.",
        kind: "market_sizing",
        subtype: "revenue_pool",
        title: "Revenue-pool sizing"
      },
      {
        assets: [{ href: "/question-pack-market-sizing-cookbook.mathdrill.json", label: "Download market-sizing cookbook" }],
        description: "Copy the supply-side item with assumptions, checkpoints, formula, sense check, and rubric.",
        kind: "market_sizing",
        subtype: "supply_side",
        title: "Supply-side sizing"
      }
    ],
    title: "Market sizing"
  },
  {
    description: "Edit the complete timed sequence instead of creating a separate benchmark editor.",
    guidance: "totalSessionSeconds is the standard authored duration. Learner timing accommodation is separate session result state. Check that every score band is attainable from the authored question points.",
    id: "benchmarks",
    starters: [
      {
        assets: [{ href: "/question-pack-benchmark-example.mathdrill.json", label: "Download benchmark example" }],
        description: "Edit the sequence, timer, numeric targets, and attainable score bands in one validated example.",
        kind: "benchmark",
        subtype: "fixed_timed_sequence",
        title: "Fixed timed benchmark sequence"
      }
    ],
    title: "Benchmarks"
  },
  {
    builderFirst: "Use the guided questioning builder above first for clarifying or diagnostic practice. The editable example remains available for detailed concepts and intents.",
    description: "Choose one practice collection or a complete four-stage or five-stage case.",
    guidance: "Keep collection IDs and cross-references valid, including accepted hypotheses, concepts, intents, exhibits, calculations, lessons, and full-case stages. Scoring is deterministic and limited to authored choices, aliases, weights, and rubrics; Fit story text remains local self-review and is not graded.",
    id: "case-practice",
    starters: [
      {
        assets: [{ href: "/question-pack-case-questioning-example.mathdrill.json", label: "Download questioning example" }],
        description: "Use the guided builder or set each questioning prompt to clarifying mode.",
        kind: "case_practice",
        subtype: "questioningPrompts:clarifying",
        title: "Questioning prompts: clarifying"
      },
      {
        assets: [{ href: "/question-pack-case-questioning-example.mathdrill.json", label: "Download questioning example" }],
        description: "Use the guided builder or set each questioning prompt to diagnostic mode.",
        kind: "case_practice",
        subtype: "questioningPrompts:diagnostic",
        title: "Questioning prompts: diagnostic"
      },
      {
        assets: [{ href: "/question-pack-case-practice-example.mathdrill.json", label: "Download case-practice v2 example" }],
        description: "Copy structuringPrompts and preserve accepted-hypothesis references.",
        kind: "case_practice",
        subtype: "structuringPrompts",
        title: "Structuring prompts"
      },
      {
        assets: [{ href: "/question-pack-case-practice-example.mathdrill.json", label: "Download case-practice v2 example" }],
        description: "Copy brainstormingPrompts with authored ideas, themes, and scoring references.",
        kind: "case_practice",
        subtype: "brainstormingPrompts",
        title: "Brainstorming prompts"
      },
      {
        assets: [{ href: "/question-pack-case-practice-example.mathdrill.json", label: "Download case-practice v2 example" }],
        description: "Copy synthesisPrompts with recommendation, evidence, risk, and next-step criteria.",
        kind: "case_practice",
        subtype: "synthesisPrompts",
        title: "Synthesis prompts"
      },
      {
        assets: [{ href: "/question-pack-case-practice-example.mathdrill.json", label: "Download case-practice v2 example" }],
        description: "Copy lessons with worked examples and valid knowledge-check references.",
        kind: "case_practice",
        subtype: "lessons",
        title: "Lessons"
      },
      {
        assets: [{ href: "/question-pack-case-practice-example.mathdrill.json", label: "Download case-practice v2 example" }],
        description: "Copy fitPrompts for competency preparation and learner-led self-review.",
        kind: "case_practice",
        subtype: "fitPrompts",
        title: "Fit prompts"
      },
      {
        assets: [{ href: "/question-pack-case-practice-example.mathdrill.json", label: "Download case-practice v2 example" }],
        description: "Copy fullCases for the v2 four-stage structure, exhibit/calculation, brainstorm, and synthesis flow.",
        kind: "case_practice",
        subtype: "fullCases:v2",
        title: "Full case v2: four stages"
      },
      {
        assets: [{ href: "/question-pack-v3-full-case-example.mathdrill.json", label: "Download full-case v3 example" }],
        description: "Edit the v3 five-stage case, including questioning, and validate against both format schemas.",
        kind: "case_practice",
        subtype: "fullCases:v3",
        title: "Full case v3: five stages"
      }
    ],
    title: "Case practice v2 and v3"
  }
] as const;

const schemaReferences = [
  {
    description: "Fixed, generated, exhibit, market-sizing, benchmark, and case-practice v2 structure.",
    href: "/question-pack-v2.schema.json",
    title: "Question Pack v2 schema"
  },
  {
    description: "Questioning and five-stage full-case additions for case-practice v3.",
    href: "/question-pack-v3.schema.json",
    title: "Question Pack v3 schema"
  }
] as const;

export function ContentPackStarterLibrary() {
  const { t } = useI18n();

  return (
    <section
      aria-labelledby="content-pack-starters-heading"
      className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-7"
      data-testid="content-pack-starter-library"
    >
      <header className="grid min-w-0 max-w-3xl gap-2 text-start">
        <p className="text-xs font-semibold uppercase tracking-wide text-coral">{t("Human-first authoring")}</p>
        <h2 className={uiText.sectionTitle} id="content-pack-starters-heading">{t("Choose a starting point")}</h2>
        <p className={cx(uiText.body, "min-w-0 break-words [overflow-wrap:anywhere]")}>
          {t("Use a guided builder where one is available. Otherwise, download the closest editable example, change one family at a time, then use the canonical preview and importer.")}
        </p>
        <a
          className="w-fit max-w-full break-words text-sm font-semibold text-teal underline decoration-teal/40 underline-offset-4 [overflow-wrap:anywhere]"
          data-human-asset="true"
          download
          href="/question-pack-author-guide.md"
        >
          {t("Download the human author guide")}
        </a>
      </header>

      <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-8">
        {starterFamilies.map((family) => {
          const headingId = `content-pack-starters-${family.id}`;

          return (
            <section
              aria-labelledby={headingId}
              className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-4 border-t border-ink/20 pt-5 lg:grid-cols-[minmax(14rem,1fr)_minmax(0,2fr)] lg:gap-8"
              data-starter-family={family.id}
              key={family.id}
            >
              <div className="grid min-w-0 content-start gap-2 text-start">
                <h3 className={uiText.subsectionTitle} id={headingId}>{t(family.title)}</h3>
                <p className={cx(uiText.body, "min-w-0 break-words [overflow-wrap:anywhere]")}>{t(family.description)}</p>
                {family.builderFirst ? (
                  <p className="min-w-0 border-s-2 border-teal/40 ps-3 text-sm leading-6 text-ink [overflow-wrap:anywhere]" data-builder-first>
                    {t(family.builderFirst)}
                  </p>
                ) : null}
                <p className="min-w-0 text-xs leading-5 text-ink/65 [overflow-wrap:anywhere]">{t(family.guidance)}</p>
              </div>

              <ul className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-px bg-ink/15 sm:grid-cols-2">
                {family.starters.map((starter) => (
                  <li
                    className="grid min-w-0 content-start gap-2 bg-white p-4 text-start"
                    data-pack-kind={starter.kind}
                    data-pack-subtype={starter.subtype}
                    key={starter.subtype}
                  >
                    <div className="grid min-w-0 gap-1">
                      <h4 className="min-w-0 break-words text-sm font-semibold text-ink [overflow-wrap:anywhere]">
                        {t(starter.title)}
                      </h4>
                      <code className="w-fit max-w-full break-all text-xs text-ink/60" dir="ltr">{starter.subtype}</code>
                    </div>
                    <p className="min-w-0 break-words text-xs leading-5 text-ink/70 [overflow-wrap:anywhere]">
                      {t(starter.description)}
                    </p>
                    <div className="mt-auto grid min-w-0 gap-1 pt-1">
                      {starter.assets.map((asset) => (
                        <a
                          className="min-w-0 break-words text-sm font-semibold text-teal underline decoration-teal/40 underline-offset-4 [overflow-wrap:anywhere]"
                          data-human-asset="true"
                          data-pack-asset="true"
                          download
                          href={asset.href}
                          key={asset.href}
                        >
                          {t(asset.label)}
                        </a>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <section
        aria-labelledby="content-pack-schema-heading"
        className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-3 border-t border-ink/20 pt-5 text-start"
      >
        <div className="grid min-w-0 gap-1">
          <h3 className={uiText.subsectionTitle} id="content-pack-schema-heading">{t("Advanced schema references")}</h3>
          <p className={cx(uiText.dense, "min-w-0 break-words [overflow-wrap:anywhere]")}>
            {t("Use these after the examples when you need the complete structural contract. The in-app importer remains authoritative for semantic validation.")}
          </p>
        </div>
        <ul className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          {schemaReferences.map((schema) => (
            <li className="grid min-w-0 gap-1 border-s-2 border-ink/20 ps-3" key={schema.href}>
              <a
                className="min-w-0 break-words text-sm font-semibold text-teal underline decoration-teal/40 underline-offset-4 [overflow-wrap:anywhere]"
                data-advanced-schema="true"
                download
                href={schema.href}
              >
                {t(schema.title)}
              </a>
              <p className="min-w-0 break-words text-xs leading-5 text-ink/65 [overflow-wrap:anywhere]">
                {t(schema.description)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
