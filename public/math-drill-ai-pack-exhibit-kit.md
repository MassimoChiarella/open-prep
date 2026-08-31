# Open Prep AI Pack Kit: Exhibits and Charts

Kit revision: **2026-08-29**

This focused component is included inside the complete exhibit bundle. For advanced modular use, pair it with `math-drill-ai-pack-authoring-start.md`, the named schema, and the complete examples/cookbook below. It covers only `kind: "exhibit"` packages.

## Canonical contract

- Format: `math-drill-question-pack`
- Schema version: `2`
- Kind: `exhibit`
- Required collection: `datasets` (1 to 100)
- Canonical schema: `question-pack-v2.schema.json`
- Copy-ready table example: `question-pack-exhibit-example.mathdrill.json`
- Copy-ready bar/line example: `question-pack-chart-example.mathdrill.json`
- All-type reference: `question-pack-visualization-cookbook.mathdrill.json`

Use the smallest canonical example matching the desired visual. Graphs are generated from structured columns and rows; do not embed an image, spreadsheet, PDF, SVG, HTML, base64 value, or URL.

## Dataset pattern

Each dataset requires `id`, title, description, unit, columns, rows, one visualization, and questions. Optional `sourceNote` should identify synthetic values or the authorized source and relevant scale/date.

Columns use these compatible role/value pairs:

| Role | Allowed value type |
| --- | --- |
| `dimension` | `text`, `year` |
| `metric` | `currency`, `number`, `percentage` |

Every dataset needs at least one dimension column and one numeric metric column. A row has a unique ID, optional label, and a `cells` object whose keys exactly match every column ID. Do not omit cells or add extra keys. Text cells are nonblank strings, year cells are integers, and metric cells are finite JSON numbers. Percentage cells use fractions: `0.25` means 25%.

Practical structured visual fragment:

```json
{
  "id": "channel-orders",
  "title": "Orders by Channel",
  "description": "Synthetic completed orders for a fictional retailer.",
  "sourceNote": "Synthetic figures created for practice.",
  "unit": "units",
  "columns": [
    { "id": "channel", "label": "Channel", "role": "dimension", "valueType": "text" },
    { "id": "orders", "label": "Orders", "role": "metric", "valueType": "number", "unit": "units" }
  ],
  "rows": [
    { "id": "online", "cells": { "channel": "Online", "orders": 140 } },
    { "id": "partner", "cells": { "channel": "Partner", "orders": 210 } }
  ],
  "visualization": {
    "type": "bar_chart",
    "title": "Completed Orders",
    "xColumnId": "channel",
    "yColumnIds": ["orders"]
  },
  "questions": []
}
```

The fragment is not importable because `questions` is empty. Copy a complete canonical example for the question shape and package envelope.

## Visualization selection

| Type | Required references | Use for |
| --- | --- | --- |
| `table` | optional `selectedColumnIds` | precise lookup and calculation |
| `bar_chart` | `xColumnId`, `yColumnIds` | category comparison |
| `line_chart` | `xColumnId`, `yColumnIds` | ordered trend, usually time |
| `pie_chart` | `categoryColumnId`, `valueColumnId` | a small non-negative composition with positive total |
| `scatterplot` | `xColumnId`, exactly one Y in `yColumnIds`; optional category | numeric relationship |
| `stacked_bar` | `xColumnId`, `yColumnIds` | composition across categories |
| `index_chart` | `xColumnId`, `yColumnIds` | indexed trend comparison |
| `waterfall` | `xColumnId`, exactly one Y; optional `totalRowIds` | sequential contributions and totals |

All references must resolve to columns of suitable roles. Plot only metric columns. Scatterplot axes must be numeric metrics; its optional category is a dimension. Other multi-series charts permit no more than eight unique Y series.

## Visual authoring guidance

- Treat hard schema limits as safety ceilings. Prefer about 8 pie categories, 20 categorical bar/stacked/waterfall rows, 50 line/index points, 200 scatter points, and 4 plotted series. Larger valid data belongs in a table or should be divided into focused datasets.
- Keep line, index, and waterfall rows in the exact order they should render. The app does not parse or sort text dates. An `index_chart` plots the authored values as-is and never rebases a series automatically.
- For a percentage pie, author non-negative fractions whose total is between 0.99 and 1.01. A wider total remains structurally possible but is flagged for review because it may not describe a coherent whole.
- A waterfall starts its running total at zero. Each ordinary row adds its stored signed value. A row listed in `totalRowIds` displays its stored value as an absolute total bar but does not seed, replace, or reset the running total. Therefore, do not mark an opening baseline row as a total; author it as an ordinary positive contribution when later deltas must build from it.
- Put the unit and scale in column metadata and visible wording. Stored values, labels, answer keys, and explanations must use the same scale.
- Do not rely on color alone to distinguish a correct answer or series. Name the series/categories in the prompt and ensure labels make the comparison understandable.
- Use a table when exact reading matters; use a chart only when pattern, comparison, distribution, or contribution is the learning goal.
- Do not use null, blank, dash, `N/A`, or missing metric cells. Remove the row, supply an authorized value, or redesign the dataset and question so missingness is explicit text outside a metric series.
- Avoid misleading axis/category choices, truncated context, excessive precision, decorative series, tiny differences that cannot be read, and pie charts with many slices.
- Keep source notes concise and honest. Do not reproduce confidential chart titles, branding, annotations, or footnotes without authorization.
- Recalculate every question from the stored rows, not from a screenshot or visual estimate.

## Questions and runtime behavior

Each dataset has 1 to 50 questions. Both response types require a unique ID, difficulty, prompt, 1 to 10 tags, explanation, and optional `expectedTimeSeconds` from 1 to 3,600.

- Numeric: omit `responseType` or use `numeric`; include a numeric answer with explicit supported unit and optional `tolerance`, `roundingRule`, and `errorChecks`. A displayed rounding instruction does not change grading without a matching tolerance.
- Multiple choice: use `responseType: "multiple_choice"`, 2 to 10 unique choices, and one resolving `correctChoiceId`.

General standalone multiple choice is unsupported; it belongs here only when it tests the accompanying dataset. In standard exhibit practice `expectedTimeSeconds` is a target. In Exhibit Sprint it is the actual countdown, with 60 seconds used when omitted. Installed exhibit packages can run in Exhibit Sprint.

## Authoring quality check

- Row cell keys exactly equal column IDs, and cell types match column roles.
- Every chart reference resolves; plotted series are metrics and categories are dimensions.
- Pie values are non-negative with a positive total; scatterplots have exactly one Y series.
- Percentage pie values total 99%–101%; authored line/index order is intentional; index values are already rebased if rebasing is desired.
- Waterfall totals follow the exact zero-start/no-reset behavior, and the opening row is not an absolute total.
- Questions can be answered from the displayed data, with deterministic keys and consistent units.
- Labels and question wording do not make color perception necessary.
- A human has checked every transcribed value, answer key, date/period, source note, and right to use the visual's underlying data.
- The final response follows the Start Here binding output contract and is ready for app validation.
