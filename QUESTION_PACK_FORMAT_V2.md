# Question Pack Format v2

Schema version 2 supports six deterministic, local content kinds. Each file chooses one `kind` and uses only that kind's collections. The strict [Draft 2020-12 JSON Schema](public/question-pack-v2.schema.json) selects exactly one branch by `kind`.

Save the file with the conventional `.mathdrill.json` extension. It is ordinary UTF-8 JSON, not a proprietary binary format.

| `kind` | Required collection | Purpose | Example |
| --- | --- | --- | --- |
| `fixed_numeric` | `questions` | Practice reusable, authored numeric questions. | [Fixed numeric](public/question-pack-example.mathdrill.json) |
| `generated_template` | `templates` | Generate numeric question variants locally. | [Generated template](public/question-pack-template-example.mathdrill.json) |
| `exhibit` | `datasets` | Practice reading tables and charts. | [Exhibit](public/question-pack-exhibit-example.mathdrill.json) |
| `market_sizing` | `templates` | Run guided assumption-and-formula exercises. | [Market sizing](public/question-pack-market-sizing-example.mathdrill.json) |
| `benchmark` | `benchmarks` | Run fixed, timed numeric tests. | [Benchmark](public/question-pack-benchmark-example.mathdrill.json) |
| `case_practice` | Any nonempty combination of its six optional collections | Practice structuring, brainstorming, synthesis, concepts, fit, and full cases. | [Case practice](public/question-pack-case-practice-example.mathdrill.json) |

A pack cannot mix kinds. The related collections inside `case_practice` are one intentional multi-collection kind.

## Envelope and metadata

The following is an envelope fragment only. Its empty `templates` collection is intentionally **not a valid importable pack**; copy a complete kind-specific example from the table above and keep at least one item in its required collection.

```json
{
  "format": "math-drill-question-pack",
  "schemaVersion": 2,
  "kind": "generated_template",
  "id": "my-generated-pack",
  "packVersion": "1.0",
  "title": "My Generated Pack",
  "templates": []
}
```

`format`, `schemaVersion`, `kind`, `id`, `packVersion`, and `title` are required. Every kind except `case_practice` requires its matching collection. A `case_practice` pack requires at least one of its six collections. `$schema`, `description`, `publisher`, and `license` are optional. `importedAt` is added by local storage and must not appear in an authored file. Pack and content IDs use lowercase letters, numbers, `_`, and `-`, start with a letter or number, and contain at most 80 characters. `__proto__`, `constructor`, and `prototype` are reserved. Keep the pack ID stable and change `packVersion` when publishing an update. `packVersion` is an opaque display string; replacement is based on pack ID rather than semantic-version comparison.

Importing a pack with the same ID replaces its installed version after confirmation. Generation, validation, grading, storage, and practice history remain local to the current browser.

Example publisher, license, IDs, scenarios, and source notes are illustrative. Replace or omit them; never copy a license or attribution unless it is accurate and authorized. The optional `$schema` field is not needed by the importer and should be omitted when its referenced schema file will not accompany the package.

## Fixed-numeric packs

A `fixed_numeric` pack contains 1 to 500 self-contained numeric `questions`. Start with the [minimal starter](public/question-pack-starter.mathdrill.json), use the [advanced example](public/question-pack-example.mathdrill.json) for tolerance and error checks, or use the in-app builder.

Each question requires `id`, `type: "numeric"`, `category`, 1 to 10 `tags`, `difficulty`, `prompt`, `answer`, and `explanation`. Optional `expectedTimeSeconds` is a target from 1 to 3,600 seconds. Answers require a finite `value` and explicit `unit`; use `none` for a unitless answer. Percentages are stored as fractions, so 25% is `0.25`, while five percentage points is `5` with unit `percentage_points`.

Omitting `tolerance` means exact grading. Approximate answers use one of these shapes:

```json
{ "type": "absolute", "value": 0.5 }
{ "type": "percentage", "value": 0.02 }
{ "type": "range", "min": 98, "max": 102 }
```

An optional `errorChecks` object may define `percentagePointValue` or `roundingTolerance` to classify common wrong answers without accepting them. Optional `roundingRule` is one of `exact`, `nearest_whole`, `nearest_0_1`, `nearest_1k`, or `nearest_1m`.

Categories are `arithmetic`, `percentages`, `fractions_decimals_ratios`, `growth_compounding`, `weighted_averages`, `business_math`, `case_math`, `market_sizing`, and `exhibit_math`. Difficulties are `beginner`, `intermediate`, `advanced`, and `expert`. The schema lists the supported tags and units. Explanations require a short summary and 1 to 10 steps, with an optional shortcut.

## Generated-template packs

### Template fields

Each template uses the existing deterministic `QuestionTemplate` shape:

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | Unique stable template ID. |
| `category` | Yes | One supported category value. |
| `tags` | Yes | One to ten unique supported skill tags. |
| `difficulty` | Yes | One to four unique values: `beginner`, `intermediate`, `advanced`, `expert`. |
| `promptTemplate` | Yes | Plain-text prompt containing optional placeholders. |
| `variables` | Yes | One to twenty named variable specifications. |
| `formula` | Yes | Arithmetic expression that computes the answer. |
| `answerUnit` | No | One supported unit value; omit it for no required unit. |
| `explanationTemplate` | Yes | One to ten generated explanation steps and an optional shortcut. |
| `caseStyle` | No | Interview Math configuration described below. |

Generated templates use the same category, tag, unit, difficulty, percentage, scale, ID, privacy, and copyright conventions as fixed-numeric packs.

### Variables and generation

Variable names are case-sensitive identifiers such as `units`, `price`, or `growthRate`. They must start with a letter or `_`, contain only letters, numbers, and `_`, and contain at most 80 characters. `answer`, `__proto__`, `constructor`, and `prototype` are reserved.

Define each variable with exactly one source:

```json
{ "type": "integer", "values": [100, 150, 200] }
{ "type": "decimal", "min": 1.5, "max": 3, "step": 0.5 }
```

- `values` contains 1 to 100 unique choices.
- A range requires `min` and `max`; `step` is optional and must be positive. The default step is `1` for `integer` and `0.1` for other types. A range may contain at most 10,001 reachable values, including both endpoints when the step reaches them.
- Do not combine `values` with `min`, `max`, or `step`.
- `integer` values and range numbers must be whole numbers.
- `decimal`, `percentage`, and `currency` values are ordinary JSON numbers. A percentage variable uses the number shown in the prompt: use `25` for 25%, then divide by `100` in the formula when a fraction is needed.
- Optional variable `unit` metadata does not rescale the stored number.

The app chooses variables with a seeded local generator. The same seed and pack version produce the same sequence. Generated question IDs include the resolved values, and duplicate variants are skipped. Import evaluates up to 256 deterministic representative combinations, including range boundaries, values nearest zero, and bounded single-variable and pairwise probes. This is not an exhaustive proof for a large Cartesian product, so every reachable combination must still be safe. Runtime generation reports an actionable pack error if an unprobed combination fails. Provide enough value combinations for the largest drill users may request.

### Formulas and placeholders

Formula expressions are arithmetic only. They support numeric literals, declared variable names, parentheses, unary `+` and `-`, and these operators:

```text
+  -  *  /  ^
```

Functions, assignments, comparisons, JavaScript, commas, and a `%` operator are not supported. Write `growthRate / 100`, not `growthRate%`. Every formula identifier must name a declared variable, and every sampled result must be finite; division by zero is rejected.

Placeholders use exact, case-sensitive `{identifier}` syntax. Rendered prompt, explanation, and Interview Math text may reference declared variables, the computed `{answer}`, or the optional output name. `formula.outputVariable` creates another name for the same computed answer:

```json
{
  "formula": {
    "expression": "units * price",
    "outputVariable": "revenue"
  },
  "explanationTemplate": {
    "steps": ["{units} x {price} = {revenue}.", "The answer is {answer}."]
  }
}
```

An output name must be a valid non-reserved identifier and cannot duplicate a variable name. Every placeholder must resolve. Keep `{answer}` and the output name out of the prompt because they reveal the answer. The first explanation step is also used as the short hint or summary.

The formula result is stored directly as the answer. If `answerUnit` is `percentage`, the formula must return the canonical fraction (`0.25` for 25%); `percentage_points` returns the point count (`5` for five points). Generated templates currently produce exact answers and do not define tolerance or rounding fields.

### Optional Interview Math

Omit `caseStyle` from every template for a standard generated pack. If it is included, every template in the pack must include it and use `category: "case_math"`.

`caseStyle` requires:

- `calculationStepCount`: `2`, `3`, `4`, `5`, or `6`.
- `industry`: `airlines`, `banking`, `consumer_goods`, `healthcare`, `insurance`, `manufacturing`, `marketplaces`, `retail`, `saas`, or `telecom`.
- `interviewMath.expectedUnit`: the same value as `answerUnit`, or `none` when `answerUnit` is omitted. The selectable values are `none`, `currency`, `percentage`, `percentage_points`, `k`, `m`, `b`, `customers`, `users`, `units`, `years`, `months`, `days`, and `stores`.
- `interviewMath.equationOptions`: 2 to 10 unique choices with `id`, `label`, `formulaCorrect`, and `setupCorrect`.
- `interviewMath.interpretationOptions`: 2 to 10 unique choices with `id`, `label`, and `isCorrect`.

Exactly one equation choice must have `setupCorrect: true`, and that choice must also have `formulaCorrect: true`. Other choices may still recognize the right formula while representing an incorrect setup. Exactly one interpretation choice must have `isCorrect: true`. IDs and labels must be unique within their choice list. Labels may contain valid placeholders and are shuffled locally when a question is generated.

## Exhibit packs

An exhibit pack contains `datasets`. Each dataset requires `id`, `title`, `description`, `unit`, `columns`, `rows`, `visualization`, and `questions`; `sourceNote` is optional. Use the [exhibit example](public/question-pack-exhibit-example.mathdrill.json) as a small copy-and-edit starting point.

Columns have `id`, `label`, `role`, and `valueType`, plus optional `description` and `unit`:

| `role` | Allowed `valueType` |
| --- | --- |
| `dimension` | `text`, `year` |
| `metric` | `currency`, `number`, `percentage` |

Every dataset needs at least one dimension column and one numeric metric column. Every row has an `id`, optional `label`, and a `cells` object. Its keys must exactly match every column ID: no missing or extra cells. Text cells are nonblank strings, year cells are integers, and metric cells are numbers. Percentage cells use canonical fractions (`0.25` for 25%). Column, row, dataset, and question IDs must be unique within their lists.

The visualization is one of:

| `type` | Required references |
| --- | --- |
| `table` | Optional `selectedColumnIds` |
| `pie_chart` | `categoryColumnId`, `valueColumnId` |
| `scatterplot` | `xColumnId`, exactly one `yColumnIds` entry; optional `categoryColumnId` |
| `bar_chart`, `line_chart`, `index_chart`, `stacked_bar` | `xColumnId`, `yColumnIds` |
| `waterfall` | `xColumnId`, exactly one `yColumnIds` entry; optional `totalRowIds` |

Every reference must resolve. Category and chart-axis dimensions must point to suitable dimension columns; plotted values must point to metric columns. A pie chart requires non-negative values with a positive total. Scatterplots require exactly one Y series; other multi-series charts contain at most eight unique Y series.

Hard importer limits are not visual design targets. Prefer about 8 pie categories, 20 categorical bar/stacked/waterfall rows, 50 line/index points, 200 scatter points, and 4 plotted series. Use a table or split a dataset when a chart would be crowded. Do not estimate unreadable source values, encode missing observations as zero, or make a question depend only on color. Put period, population, scale, units, and truthful synthetic/source status in labels, descriptions, and `sourceNote`.

Dataset questions are either numeric or multiple choice. Both require `id`, `difficulty`, `prompt`, one to ten `tags`, `explanation`, and optional `expectedTimeSeconds` from 1 to 3,600. In the standard exhibit flow this value is shown as a target; in Exhibit Sprint it is the actual per-question countdown, with 60 seconds used when omitted. Numeric questions may omit `responseType` or set it to `numeric`; they require `answer.value` and an explicit `answer.unit` (`none` when unitless), and may define the fixed-numeric `tolerance`, `roundingRule`, and `errorChecks` fields. A displayed rounding rule does not alter grading without tolerance. Multiple-choice questions require `responseType: "multiple_choice"`, 2 to 10 unique choices, and a `correctChoiceId` that resolves to one choice. Choice labels contain at most 500 characters.

## Market-sizing packs

A market-sizing pack contains `templates`. Each template is one guided exercise with these required fields:

| Field | Meaning |
| --- | --- |
| `id`, `title`, `prompt`, `description` | Stable identity and author-facing text. |
| `difficulty` | `beginner`, `intermediate`, `advanced`, or `expert`. |
| `industry` | One of the industries listed under Interview Math. |
| `sizingType` | `capacity_based`, `demand_side`, `revenue_pool`, or `supply_side`. |
| `inputSteps` | 1 to 30 guided inputs. |
| `finalFormula` | Arithmetic expression, rounding instruction, and grading tolerance. |
| `outputUnit` | One supported unit value. |
| `rubric` | The six required scoring dimensions. |
| `senseCheck` | A prompt and optional interpretation choices. |

An input step always has `id`, `label`, `inputKind`, and `required`. The numeric kinds `currency`, `integer`, `number`, and `percentage` also require `required: true`, a unique `variableName`, and may define `assumptionRange` with `min`, `max`, and optional `unit`. A `choice` step requires 2 to 20 unique `options`. `boolean` and `note` steps do not create formula variables. Optional `helperText` and `unit` describe any step.

Percentage inputs and percentage range bounds are canonical fractions: use `0.4` for 40%. The form accepts either `40%` or `0.4` from a learner and normalizes both before evaluating the formula.

`finalFormula.expression` uses the same arithmetic-only syntax as generated templates. It must reference every numeric input variable exactly by name, cannot reference undeclared names, and must produce a finite sample result. Optional `outputVariable` cannot duplicate an input name. `roundingRule` controls the display instruction; `tolerance` controls grading. Tolerance uses one of the fixed-numeric shapes: non-negative `absolute`, fractional `percentage` from 0 to 1, or `range` with `min <= max`. If learner-entered assumptions cause division by zero or another non-finite formula result, the form displays the calculation error and blocks completion and persistence until the inputs are corrected.

The rubric contains each ID exactly once: `structure`, `assumptions`, `math`, `units`, `sense_check`, and `interpretation`. Each has a nonblank `label` and `maxPoints` greater than 0 and at most 100. `senseCheck` requires `prompt` and `required`; optional `interpretationOptions` contains 2 to 20 unique choices. To ask for an explicit completion checkbox, add a `boolean` input step whose ID is exactly `sense_check`. Otherwise, selecting an interpretation or entering a review note satisfies a required sense-check. When `senseCheck.required` is `false`, completing it is optional. See the [market-sizing example](public/question-pack-market-sizing-example.mathdrill.json).

## Benchmark packs

A benchmark pack contains 1 to 25 `benchmarks`. Each benchmark requires `id`, `title`, `description`, `difficulty`, `totalSessionSeconds`, `scoreBands`, and `questions`. The session timer is a whole number from 30 to 7,200 seconds.

Each benchmark contains 1 to 50 fixed numeric questions using the shared question shape. Question IDs must be unique across the pack, `type` is `numeric`, and `answer.unit` is required. The benchmark's `difficulty` labels the overall test; every nested question also keeps its own required difficulty value. Optional `expectedTimeSeconds` is a target shown for the individual question; `totalSessionSeconds` is the timer that governs the full benchmark.

`scoreBands` contains exactly these four unique labels: `needs_work`, `developing`, `strong`, and `excellent`. Every band has `minAccuracy` from 0 to 1 and a nonblank `title`; `needs_work` must start at `0`. Thresholds must strictly increase in label order. See the [benchmark example](public/question-pack-benchmark-example.mathdrill.json).

## Case-practice packs

A `case_practice` pack may include any nonempty combination of these optional collections. Every included collection must contain at least one item.

| Collection | Existing runtime shape | Maximum items |
| --- | --- | --- |
| `structuringPrompts` | `CaseStructuringPrompt` | 100 |
| `brainstormingPrompts` | `BrainstormingPrompt` | 100 |
| `synthesisPrompts` | `SynthesisPrompt` | 100 |
| `lessons` | `ConceptLesson` | 100 |
| `fitPrompts` | `FitPracticePrompt` | 100 |
| `fullCases` | `FullCaseSimulationSpec` | 25 |

Structuring prompts contain hypotheses, an accepted hypothesis ID, branch options, a branch-selection limit, and a model structure. Brainstorming prompts contain themed ideas, selection and priority limits, and the preferred priority idea IDs. Synthesis prompts contain facts and exactly four option groups: `recommendation`, `evidence`, `risk`, and `nextStep`; `correctResponse` identifies one option from each group.

Lessons contain one of the six supported topics, principles, a worked example, and a multiple-choice knowledge check. Fit prompts use the `conflict`, `failure`, `impact`, or `leadership` competency and provide follow-up questions.

Each full case requires `id`, `client`, `title`, `situation`, `calculationQuestionId`, `structure`, `exhibit`, `brainstorming`, and `synthesis`. These embedded objects use the same shapes as their standalone collections. The exhibit uses the complete exhibit dataset schema described above, including its columns, rows, visualization, and questions. The calculation stage renders the authored table or chart and labels the answer from the referenced numeric question's unit.

The importer checks semantic references in addition to the JSON Schema: accepted hypotheses must exist, model branches must identify branch options, priority ideas must exist, correct synthesis and lesson choices must resolve, exhibit references must resolve, and a full case's `calculationQuestionId` must identify a numeric question in its embedded exhibit. IDs use the shared lowercase ID rules. Start with the [validated case-practice example](public/question-pack-case-practice-example.mathdrill.json). The in-app builders cover fixed numeric and schema-v3 case-questioning packs.

## Validation limits and privacy

- Maximum importer file size: 5 MiB (5,242,880 bytes). This is not an AI-output target; prefer 10–25 ordinary questions or one full case per AI-generated package.
- Collection limits: 500 generated templates, 100 exhibit datasets, 100 market-sizing templates, 25 benchmarks, 100 items in each standard case-practice collection, or 25 full cases per pack.
- Exhibit datasets contain 2 to 20 columns, 1 to 500 rows, and 1 to 50 questions. Benchmarks contain 1 to 50 questions.
- Generated templates contain at most 20 variables and 100 values per variable. Market-sizing templates contain at most 30 input steps and 20 choices per list.
- Maximum tags: 10; generated difficulties: 4; explanation steps: 10.
- Interview Math choice lists contain 2 to 10 choices; labels and explanation text contain at most 1,000 characters.
- Prompts contain at most 2,000 characters; formulas contain at most 500 characters.
- The importer performs semantic checks the schema cannot express cleanly, including unique IDs and labels, cross-references, range order, formula-variable coverage, chart column roles, correct choices, full-case calculation questions, increasing benchmark thresholds, and successful sample evaluation.
- Text is plain text. HTML, scripts, external assets, external data, and external APIs are not supported.
- Packs are parsed, generated, graded, and stored locally, but package JSON and IndexedDB records are not encrypted. Do not paste confidential content into an online validator unless you are authorized to transmit it there.
- Only import or distribute original, public-domain, or otherwise authorized content.
