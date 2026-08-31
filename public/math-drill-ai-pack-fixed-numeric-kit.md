# Open Prep AI Pack Kit: Fixed Numeric

Kit revision: **2026-08-29**

This focused component is included inside the complete fixed-numeric bundle. For advanced modular use, pair it with `math-drill-ai-pack-authoring-start.md`, the named schema, and the complete examples below. It covers only `kind: "fixed_numeric"` packages.

## Canonical contract

- Format: `math-drill-question-pack`
- Schema version: `2`
- Kind: `fixed_numeric`
- Required collection: `questions` (1 to 500)
- Canonical schema: `question-pack-v2.schema.json`
- Copy-ready minimal example: `question-pack-starter.mathdrill.json`
- Tolerance/error-check example: `question-pack-example.mathdrill.json`

Start from the minimal example file and replace its original content. Do not copy example publisher or license metadata unless it is true for the new material.

## Copy-ready minimal pattern

```json
{
  "$schema": "./question-pack-v2.schema.json",
  "format": "math-drill-question-pack",
  "schemaVersion": 2,
  "kind": "fixed_numeric",
  "id": "original-profit-practice",
  "packVersion": "1.0",
  "title": "Original Profit Practice",
  "questions": [
    {
      "id": "profit-001",
      "type": "numeric",
      "category": "business_math",
      "tags": ["profit", "subtraction"],
      "difficulty": "beginner",
      "prompt": "A fictional kiosk earns $480 in revenue and incurs $315 in costs. What is profit?",
      "answer": { "value": 165, "unit": "currency" },
      "explanation": {
        "short": "Subtract total costs from revenue.",
        "steps": ["Profit = $480 - $315 = $165."]
      }
    }
  ]
}
```

## Question rules

Every question requires:

- a unique stable `id`;
- `type: "numeric"`;
- one supported `category`;
- 1 to 10 unique supported `tags`;
- one `difficulty`: `beginner`, `intermediate`, `advanced`, or `expert`;
- a self-contained plain-text `prompt`;
- `answer.value` as a finite JSON number and an explicit supported `answer.unit` (`none` when unitless);
- `explanation.short` and 1 to 10 `explanation.steps`; `explanation.shortcut` is optional.

Optional `expectedTimeSeconds` is a displayed target from 1 to 3,600 seconds. It is not a scoring rule.

Store percentage answers as fractions: 25% is `0.25` with unit `percentage`. Store a five-percentage-point change as `5` with unit `percentage_points`. Keep scales consistent: if the answer is entered as 2.5 million, use value `2.5` and unit `m`; if it is entered as 2,500,000 currency units, use value `2500000` and unit `currency`.

## Exact, approximate, and diagnostic grading

Omit `tolerance` for exact grading. When approximation is intended, use exactly one supported shape:

```json
{ "type": "absolute", "value": 0.5 }
{ "type": "percentage", "value": 0.02 }
{ "type": "range", "min": 98, "max": 102 }
```

A percentage tolerance is fractional: `0.02` means within 2% of the correct answer. Range endpoints are inclusive and must be ordered.

`roundingRule` is a displayed instruction and never changes grading. If rounding should be accepted, add a matching tolerance. Allowed rules are `exact`, `nearest_whole`, `nearest_0_1`, `nearest_1k`, and `nearest_1m`.

Optional `errorChecks.percentagePointValue` and `errorChecks.roundingTolerance` classify common wrong answers for feedback; they do not make those answers correct. Recalculate the answer, tolerance, and diagnostics independently so they cannot contradict each other.

## Authoring quality check

- The prompt contains all facts needed and asks for one numeric result.
- The answer unit and scale match the number the learner will type.
- The explanation derives the exact authored answer without introducing unstated assumptions.
- Approximation is intentional and represented by tolerance, not vague prompt wording alone.
- Questions are original or authorized and do not require live information.
- A human has independently checked every source fact, answer key, unit, tolerance, date, and explanation; structural validity does not prove factual correctness.
- The final response follows the Start Here binding output contract and is ready for app validation.
