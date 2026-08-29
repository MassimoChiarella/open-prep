# Math Drill AI Pack Kit: Market Sizing

Kit revision: **2026-08-18**

Pair this module with `math-drill-ai-pack-authoring-start.md`. It covers only `kind: "market_sizing"` packages.

## Canonical contract

- Format: `math-drill-question-pack`
- Schema version: `2`
- Kind: `market_sizing`
- Required collection: `templates` (1 to 100)
- Canonical schema: `question-pack-v2.schema.json`
- Copy-ready minimal example: `question-pack-market-sizing-example.mathdrill.json`
- All-input/all-method reference: `question-pack-market-sizing-cookbook.mathdrill.json`

Start from the minimal example because the required rubric and sense-check objects are easy to omit when reconstructed from prose.

## Template shape

Each template requires:

- stable `id`, title, prompt, and description;
- difficulty and one supported industry;
- `sizingType`: `capacity_based`, `demand_side`, `revenue_pool`, or `supply_side`;
- 1 to 30 guided `inputSteps`;
- `finalFormula` and `outputUnit`;
- a complete six-dimension `rubric`;
- `senseCheck`.

Use only the input kinds `currency`, `integer`, `number`, `percentage`, `choice`, `boolean`, and `note`.

A numeric input step requires `required: true` and a unique formula `variableName`. It may define an `assumptionRange` with ordered `min`/`max` and an optional unit. A `choice` step has 2 to 20 unique options. Boolean and note steps do not create formula variables. Percentage values and range bounds use fractions (`0.4` means 40%); the form accepts learner input such as `40%` and normalizes it.

Practical numeric step and formula pattern:

```json
{
  "inputSteps": [
    {
      "id": "households",
      "label": "Target households",
      "inputKind": "integer",
      "required": true,
      "variableName": "households",
      "assumptionRange": { "min": 10000, "max": 50000, "unit": "customers" }
    },
    {
      "id": "annual_spend",
      "label": "Annual spend per household",
      "inputKind": "currency",
      "required": true,
      "variableName": "annualSpend",
      "assumptionRange": { "min": 50, "max": 200, "unit": "currency" }
    }
  ],
  "finalFormula": {
    "expression": "households * annualSpend",
    "outputVariable": "marketValue",
    "roundingRule": "nearest_1k",
    "tolerance": { "type": "percentage", "value": 0.05 }
  },
  "outputUnit": "currency"
}
```

This is a shape fragment, not a complete package. Copy the canonical example for the full envelope, rubric, and sense check.

## Formula and scoring rules

The formula language is arithmetic only: numeric literals, declared numeric variables, parentheses, unary signs, and `+ - * / ^`. It has no functions, assignments, comparisons, JavaScript, or `%` operator. The expression must reference every numeric input variable and no undeclared name. `outputVariable` is optional metadata and cannot duplicate an input name.

Evaluate a midpoint and every risky range boundary. Denominators must remain non-zero for plausible learner inputs. If learner assumptions cause division by zero or another non-finite result, the app shows an actionable calculation error and blocks completion and persistence until inputs are corrected.

`roundingRule` only tells the learner how to display the estimate. It never changes grading. `tolerance` controls grading and must be absolute, fractional percentage, or ordered range. Use a tolerance consistent with the requested rounding and the natural uncertainty of the exercise.

The rubric contains each of these IDs exactly once: `structure`, `assumptions`, `math`, `units`, `sense_check`, and `interpretation`. Each has a nonblank label and positive `maxPoints` no greater than 100. Preserve all six even if a beginner exercise makes one dimension easy.

Assumption ranges affect feedback/scoring; they do not clamp learner values. The math score compares the learner's final answer to the result of the learner's own numeric assumptions and authored formula, not to a hidden single market estimate.

## Sense-check behavior

`senseCheck` requires a prompt and `required`. Optional `interpretationOptions` has 2 to 20 unique choices and no correct-answer field: every option should be a legitimate interpretation or checking lens, not a right/wrong distractor set.

For an explicit completion checkbox, add a boolean input step with ID exactly `sense_check`. Otherwise, an interpretation selection or review note completes a required sense check. With `senseCheck.required: false`, completion is optional and points are handled by the deterministic runtime. Use an exhibit multiple-choice question when one interpretation must be objectively correct.

## Authoring quality check

- The estimation approach, variables, units, and formula describe one coherent frame without double counting.
- Every numeric input variable appears in the formula and every formula identifier is declared.
- Ranges are plausible, ordered, scale-consistent, and safe at zero/boundaries.
- The final output unit matches the formula scale; percent values use canonical fractions.
- All six rubric dimensions appear exactly once, and sense-check choices are not disguised correct/incorrect answers.
- The final response follows the Start Here binding output contract and is ready for app validation.
