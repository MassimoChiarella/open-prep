# Math Drill Question Pack Author Guide

Guide revision: 2026-08-18. Supported schemas: v2 and v3 case practice.

Question packs are ordinary UTF-8 JSON files saved with the conventional `.mathdrill.json` extension. They are validated, installed, and used locally in the current browser.

## Quick start

1. Download the example closest to the content you want to create.
2. Edit a copy in a plain-text or code editor. Keep JSON double quotes and commas; JSON does not allow comments or trailing commas.
3. Give the pack and every item a stable, unique lowercase ID. Change `packVersion` when publishing an update.
4. Open **Settings > Content Packs**, choose the file, review the preview, and install it.

Importing the same pack `id` replaces its installed version after confirmation. A file may be at most 5 MiB (5,242,880 bytes), but that is the import ceiling rather than an AI-output target. Prefer 10–25 ordinary questions or one full case per AI-generated pack, then split larger curricula by topic or kind.

The in-app builders support fixed numeric questions and deterministic case-questioning rubrics. Authors of other specialized formats should start from the validated examples below and edit the JSON directly.

For an external AI chat, attach [AI Start Here](./math-drill-ai-pack-authoring-start.md) plus exactly one focused module: [fixed numeric](./math-drill-ai-pack-fixed-numeric-kit.md), [generated templates](./math-drill-ai-pack-generated-template-kit.md), [exhibits](./math-drill-ai-pack-exhibit-kit.md), [market sizing](./math-drill-ai-pack-market-sizing-kit.md), [benchmarks](./math-drill-ai-pack-benchmark-kit.md), or [case practice](./math-drill-ai-pack-case-practice-kit.md). Use the [complete omnibus kit](./math-drill-ai-pack-authoring-kit.md) only when the model has enough context for the larger reference.

## Choose a format

| Content | Start here | Schema |
| --- | --- | --- |
| Fixed numeric questions (v2) | [Minimal starter](./question-pack-starter.mathdrill.json) or [advanced example](./question-pack-example.mathdrill.json) | [v2 schema](./question-pack-v2.schema.json) |
| Generated numeric templates (v2) | [Generated-template example](./question-pack-template-example.mathdrill.json) | [v2 schema](./question-pack-v2.schema.json) |
| Exhibit datasets and questions (v2) | [Exhibit example](./question-pack-exhibit-example.mathdrill.json) | [v2 schema](./question-pack-v2.schema.json) |
| Guided market sizing (v2) | [Market-sizing example](./question-pack-market-sizing-example.mathdrill.json) | [v2 schema](./question-pack-v2.schema.json) |
| Timed fixed benchmarks (v2) | [Benchmark example](./question-pack-benchmark-example.mathdrill.json) | [v2 schema](./question-pack-v2.schema.json) |
| Case-practice exercises (v2) | [Case-practice example](./question-pack-case-practice-example.mathdrill.json) | [v2 schema](./question-pack-v2.schema.json) |
| Case-questioning exercises and five-stage cases (v3) | [Questioning example](./question-pack-case-questioning-example.mathdrill.json) or [complete five-stage example](./question-pack-v3-full-case-example.mathdrill.json) | [v3 schema](./question-pack-v3.schema.json) plus [v2 schema definitions](./question-pack-v2.schema.json) |

A file contains exactly one `kind`: `fixed_numeric`, `generated_template`, `exhibit`, `market_sizing`, `benchmark`, or `case_practice`. Every kind except `case_practice` uses one required collection. Version 2 case-practice packs support six collections. Version 3 adds `questioningPrompts` and a required questioning stage to every v3 `fullCases` item.

## Shared conventions

- IDs match `^[a-z0-9][a-z0-9_-]{0,79}$`. Do not use `__proto__`, `constructor`, or `prototype`.
- Percentages stored as answers, exhibit cells, or market-sizing inputs use fractions: `0.25` means 25%. Generated-template percentage variables are display numbers: use `25` for 25% and divide by 100 in the formula.
- Use only the categories, tags, difficulties, units, and rounding rules listed in the schema. Custom units are not supported.
- Text is plain text. HTML, scripts, external assets, data feeds, and APIs are not supported.
- Only import or distribute original, public-domain, or otherwise authorized content. Example publisher, license, source-note, ID, and scenario values are illustrative and must not be copied unless accurate and authorized.
- Downloaded JSON and locally installed IndexedDB records are readable data, not encrypted storage. Do not put confidential material into an online validator or pack unless you are authorized and accept that access boundary.

## Important v2 behavior

- Generated ranges may resolve to at most 10,001 values. Formulas support numeric literals, variables, parentheses, and `+ - * / ^` only. Import checks up to 256 deterministic representative combinations, while runtime generation still reports any combination it cannot safely evaluate.
- For Interview Math, `interviewMath.expectedUnit` must equal `answerUnit`, or `none` when `answerUnit` is omitted. Selectable units are `none`, `currency`, `percentage`, `percentage_points`, `k`, `m`, `b`, `customers`, `users`, `units`, `years`, `months`, `days`, and `stores`.
- An exhibit question's `expectedTimeSeconds` is a target in the standard flow and the actual countdown in Exhibit Sprint, including installed exhibit packs. Sprint uses 60 seconds when it is omitted. Scatterplots require exactly one Y series. Numeric exhibit answers may define `tolerance`, `roundingRule`, and `errorChecks`; a rounding instruction does not change grading without tolerance.
- Prefer visually legible exhibits: about 8 pie categories, 20 categorical bars/rows, 50 line/index points, 200 scatter points, and 4 plotted series. Do not estimate unreadable source values, encode missing values as zero, or make a question depend only on color. Put period, population, scale, units, and truthful source/synthetic status in labels, descriptions, and `sourceNote`.
- Market-sizing numeric input steps must set `required: true`. To show an explicit sense-check checkbox, add a boolean input step with ID `sense_check`; otherwise an interpretation selection or review note completes a required sense-check. Set `senseCheck.required` to `false` to make completion optional. Formula failures from learner-entered assumptions are shown in the form and block completion until the inputs are corrected.
- Benchmark `totalSessionSeconds` controls the full test timer. Each nested question may also define a displayed target with `expectedTimeSeconds`.
- Case-practice packs may omit any of their six collections, but every included collection must be nonempty. A full case embeds its structure, exhibit, brainstorming, and synthesis content; `calculationQuestionId` must identify a numeric question in that embedded exhibit.

## Important v3 questioning behavior

- Version 3 is for `case_practice` packs. Other content kinds remain on version 2.
- A questioning prompt defines canonical `concepts` with aliases and weighted `intents` with required concept groups, feedback, original reference questions, and at least one priority theme.
- The importer rejects unresolved concept IDs and aliases shared across concepts after normalization.
- Grading is local and deterministic. It combines authored concept coverage, reference-word overlap, character-trigram similarity, and bounded typo tolerance. It does not call an AI model or external service.
- Ranking is optional for learners. Unranked attempts have an 85-point maximum; enabling ranking adds a 15-point prioritization dimension.
- A v3 full case must embed `questioning` and uses five 20-point sections. V2 full cases remain valid with four 25-point sections.
- See the repository's `QUESTION_PACK_FORMAT_V3.md` for the complete scoring and authoring contract.

The v3 schema references definitions in the v2 schema. Supply both files to an external Draft 2020-12 validator. Do not claim executable validation from checklist review alone; the webapp import preview and semantic validator are authoritative.

The schemas catch structural errors; the app also checks cross-references, unique IDs, formulas, ranges, choices, chart roles, full-case calculation questions, and sample generation during import.
