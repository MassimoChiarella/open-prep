# Open Prep Question Pack Author Guide

Guide revision: 2026-08-31. Supported schemas: v2 and v3 case practice.

Question packs are ordinary UTF-8 JSON files saved with the conventional `.mathdrill.json` extension. They are validated, installed, and used locally in the current browser.

Local import checks structure and runtime safety; it does not prove factual truth, ownership or permission, accessibility, answer-key quality, teaching quality, or catalog review. Authors who want a pack published in the repository-reviewed catalog must also follow the [content policy](https://github.com/MassimoChiarella/open-prep/blob/main/CONTENT_POLICY.md), [community-pack lifecycle](https://github.com/MassimoChiarella/open-prep/blob/main/COMMUNITY_PACK_LIFECYCLE.md), and [community-pack pull-request template](https://github.com/MassimoChiarella/open-prep/blob/main/.github/PULL_REQUEST_TEMPLATE/content-pack.md). The repository's MIT software license does not license practice content.

## Human authoring path

1. **Choose.** Open [Create](/content-packs/?view=create) for a guided builder or download the editable example closest to your content.
2. **Edit.** Replace the sample material in a plain-text or code editor. Keep JSON double quotes and commas; JSON does not allow comments or trailing commas. Give the pack and every item a stable, unique lowercase ID, and change `packVersion` when publishing an update.
3. **Validate.** Open [Import](/content-packs/?view=import), choose the file, and run the canonical structural, semantic, formula, reference, and runtime-safety checks.
4. **Review.** Independently check every fact, answer, formula, unit, explanation, rubric, source, accessibility choice, and right to distribute.
5. **Test.** Install the pack locally, open it from [Installed](/content-packs/?view=installed), and complete the matching practice flow.
6. **License.** For catalog submission, choose one approved content license and record accurate rights, provenance, attribution, language, accessibility, and conflict evidence.
7. **Submit.** Follow the content policy, lifecycle, and submission links in [Resources](/content-packs/?view=resources).

Importing the same pack `id` replaces its installed version after confirmation. A file may be at most 5 MiB (5,242,880 bytes), but that is an import ceiling rather than a content target. Prefer 10–25 ordinary questions or one full case per pack, then split larger curricula by topic or kind.

The in-app builders support fixed numeric questions and deterministic case-questioning rubrics. Authors of other specialized formats should start from the validated examples below and edit the JSON directly.

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
- A catalog submission must declare exactly one approved pack license (`CC0-1.0`, `CC-BY-4.0`, or `CC-BY-SA-4.0`) plus the required rights, provenance, attribution, language, human-review, accessibility, and conflict evidence. Arbitrary local imports remain separate from catalog eligibility.
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
- See the repository's [Question Pack Format v3](https://github.com/MassimoChiarella/open-prep/blob/main/QUESTION_PACK_FORMAT_V3.md) for the complete scoring and authoring contract. The [v2 format](https://github.com/MassimoChiarella/open-prep/blob/main/QUESTION_PACK_FORMAT_V2.md) remains authoritative for the shared envelope and all v2 families.

The v3 schema references definitions in the v2 schema. Supply both files to an external Draft 2020-12 validator. Do not claim executable validation from checklist review alone; the webapp import preview and semantic validator are authoritative.

The schemas catch structural errors; the app also checks cross-references, unique IDs, formulas, ranges, choices, chart roles, full-case calculation questions, and sample generation during import.

## Optional external tools

Human builders, editable starters and examples, this guide, the schemas, and the Open Prep importer are the primary authoring path. No external tool is required.

> External tools are outside Open Prep. Material submitted to them leaves the local app. Share only material you have the rights to share, and do not submit confidential or personal data. Review every fact, answer, formula, unit, rubric, explanation, source, accessibility choice, and rights declaration yourself. The Open Prep importer is authoritative.

For optional external-tool assistance, attach exactly one self-contained family bundle: [fixed numeric](./math-drill-ai-pack-fixed-numeric-complete.md), [generated templates and Interview Math](./math-drill-ai-pack-generated-template-complete.md), [exhibits and charts](./math-drill-ai-pack-exhibit-complete.md), [market sizing](./math-drill-ai-pack-market-sizing-complete.md), [benchmarks](./math-drill-ai-pack-benchmark-complete.md), or [case practice v2/v3](./math-drill-ai-pack-case-practice-complete.md). Each includes its common rules, focused module, schema or schemas, and complete examples; no second attachment is needed.

The smaller [Start Here component](./math-drill-ai-pack-authoring-start.md), focused modules, and standalone schemas/examples are advanced references. The [complete omnibus kit](./math-drill-ai-pack-authoring-kit.md) is the optional all-family reference. These materials do not replace the canonical importer or independent human review.
