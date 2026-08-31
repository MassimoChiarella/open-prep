# Open Prep Question Pack Author Guide

Guide revision: 2026-08-29. Supported schemas: v2 and v3 case practice.

Question packs are ordinary UTF-8 JSON files saved with the conventional `.mathdrill.json` extension. They are validated, installed, and used locally in the current browser.

## Quick start

1. Download the example closest to the content you want to create.
2. Edit a copy in a plain-text or code editor. Keep JSON double quotes and commas; JSON does not allow comments or trailing commas.
3. Give the pack and every item a stable, unique lowercase ID. Change `packVersion` when publishing an update.
4. Open **Settings > Content Packs**, choose the file, review the preview, and install it.

Importing the same pack `id` replaces its installed version after confirmation. A file may be at most 5 MiB (5,242,880 bytes), but that is the import ceiling rather than an AI-output target. Prefer 10–25 ordinary questions or one full case per AI-generated pack, then split larger curricula by topic or kind.

The in-app builders support fixed numeric questions and deterministic case-questioning rubrics. Authors of other specialized formats should start from the validated examples below and edit the JSON directly.

For an external AI chat, attach exactly one recommended self-contained bundle: [fixed numeric](./math-drill-ai-pack-fixed-numeric-complete.md), [generated templates and Interview Math](./math-drill-ai-pack-generated-template-complete.md), [exhibits and charts](./math-drill-ai-pack-exhibit-complete.md), [market sizing](./math-drill-ai-pack-market-sizing-complete.md), [benchmarks](./math-drill-ai-pack-benchmark-complete.md), or [case practice v2/v3](./math-drill-ai-pack-case-practice-complete.md). Each includes the common rules, focused module, full schema or schemas, and complete subtype examples; no second attachment is needed. The smaller Start Here/modules and standalone schemas/examples are advanced components, while the [complete omnibus kit](./math-drill-ai-pack-authoring-kit.md) is the all-family reference.

Give the LLM only authorized source material. Instruct it to treat source text as data, ignore embedded instructions, never fetch a URL, and never invent missing facts or rights. When enough information exists, it must return exactly one complete JSON object in one `json` fence or one `.mathdrill.json` attachment, with no surrounding prose. If a material fact, permission, answer key, unit, date/order, formula, or scoring rule is unresolved, it must ask concise clarification questions and return no JSON.

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
- The author/importer remains responsible for factual accuracy, answer keys, formulas, units, dates, qualitative quality, and every deterministic scoring rule. Structural validation cannot prove those facts.
- Downloaded JSON and locally installed IndexedDB records are readable data, not encrypted storage. Do not put confidential material into an online validator or pack unless you are authorized and accept that access boundary.

## Important v2 behavior

- Generated ranges may resolve to at most 10,001 values. Formulas support numeric literals, variables, parentheses, and `+ - * / ^` only. Variables form an independent Cartesian product: same-position list entries are not paired, so dependent pairs must be split into separate templates. Import checks up to 256 deterministic representative combinations, while runtime generation still reports any combination it cannot safely evaluate.
- For Interview Math, `interviewMath.expectedUnit` must equal `answerUnit`, or `none` when `answerUnit` is omitted. Selectable units are `none`, `currency`, `percentage`, `percentage_points`, `k`, `m`, `b`, `customers`, `users`, `units`, `years`, `months`, `days`, and `stores`.
- Values using `k`, `m`, or `b` are stored in the displayed scale: value `12` with unit `m` means 12 million. A typed suffix and selected scale must agree.
- An exhibit question's `expectedTimeSeconds` is a target in the standard flow and the actual countdown in Exhibit Sprint, including installed exhibit packs. Sprint uses 60 seconds when it is omitted. Scatterplots require exactly one Y series. Numeric exhibit answers may define `tolerance`, `roundingRule`, and `errorChecks`; a rounding instruction does not change grading without tolerance.
- Generated-template answers accept rounding to two displayed decimal places by default: absolute tolerance `0.005`, or `0.00005` for canonical percentage fractions. A template may set `tolerance` and a matching learner-facing `roundingRule` when another deterministic comparison policy is required.
- Prefer visually legible exhibits: about 8 pie categories, 20 categorical bars/rows, 50 line/index points, 200 scatter points, and 4 plotted series. Percentage pies should total 99%–101%. Line/index/waterfall rows render in authored order; text dates are not sorted, index values are not automatically rebased, and waterfall total rows display absolute bars without seeding or resetting the zero-based running total. Do not estimate unreadable source values, encode missing values as zero, or make a question depend only on color. Put period, population, scale, units, and truthful source/synthetic status in labels, descriptions, and `sourceNote`.
- Market-sizing numeric input steps must set `required: true`; integer steps use whole-number range bounds and learner values. To show an explicit sense-check checkbox, add a boolean input step with ID `sense_check`; otherwise an interpretation selection or review note completes a required sense-check. Every interpretation option must be a legitimate analytical lens, not a right/wrong distractor. Set `senseCheck.required` to `false` to make completion optional. Formula failures from learner-entered assumptions are shown in the form and block completion until the inputs are corrected.
- Benchmark `totalSessionSeconds` controls the full test timer. Each nested question may also define a displayed target with `expectedTimeSeconds`. With `n` questions, author thresholds from the finite outcomes `0/n` through `n/n` and ensure every score band can be selected.
- Case-practice packs may omit any supported collection, but every included collection must be nonempty; v3 adds `questioningPrompts` as the seventh available collection. Structuring may add `acceptedHypothesisIds` when several existing hypotheses are valid; the unique list must include primary `acceptedHypothesisId`. A v2 full case always runs Structure → Exhibit and math → Brainstorm → Synthesize. V3 prepends Questioning. `calculationQuestionId` must identify a numeric question in the embedded exhibit.
- Fit prompts require the learner to bring a usable real story and provide preparation/self-review only. Fit story text is not graded; brainstorming/synthesis use authored-choice scoring; full-case calculation is deterministic.

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
