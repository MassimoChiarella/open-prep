# Math Drill AI Pack Kit: Benchmarks

Kit revision: **2026-08-18**

Pair this module with `math-drill-ai-pack-authoring-start.md`. It covers only `kind: "benchmark"` packages.

## Canonical contract

- Format: `math-drill-question-pack`
- Schema version: `2`
- Kind: `benchmark`
- Required collection: `benchmarks` (1 to 25)
- Canonical schema: `question-pack-v2.schema.json`
- Copy-ready complete example: `question-pack-benchmark-example.mathdrill.json`

A benchmark is a fixed timed assessment of authored numeric questions. Use `fixed_numeric` for untimed reusable practice and `generated_template` for generated variants.

## Benchmark rules

Every benchmark requires:

- a stable unique ID, title, and description;
- an overall difficulty: `beginner`, `intermediate`, `advanced`, or `expert`;
- `totalSessionSeconds` as a whole number from 30 to 7,200;
- exactly four ordered `scoreBands`;
- 1 to 50 fixed numeric `questions`.

Nested questions use the fixed-numeric question shape: unique ID across the pack, `type: "numeric"`, category, tags, individual difficulty, prompt, finite answer value, explicit supported answer unit, and explanation. Tolerance, rounding instruction, diagnostic error checks, and target time follow the fixed-numeric schema.

`totalSessionSeconds` controls the actual full-session timer. A nested question's optional `expectedTimeSeconds` is only a displayed per-question target; it does not partition or override the session timer.

## Score-band pattern

Use all four labels exactly once and in this semantic order:

```json
[
  { "label": "needs_work", "minAccuracy": 0, "title": "Needs more practice" },
  { "label": "developing", "minAccuracy": 0.5, "title": "Developing" },
  { "label": "strong", "minAccuracy": 0.75, "title": "Strong" },
  { "label": "excellent", "minAccuracy": 0.9, "title": "Excellent" }
]
```

`minAccuracy` values are fractions from 0 to 1, must strictly increase in label order, and `needs_work` must start at 0. Thresholds need not match the example, but they should be attainable with the number of questions. For 10 questions, thresholds align naturally to 0.1 increments; avoid a threshold such as 0.83 that no raw score can produce.

The complete canonical example supplies the package envelope and nested question fields. Do not copy its publisher/license metadata unless accurate.

## Assessment design guidance

- Prefer 10 to 25 questions for an AI-authored first package; use fewer only for a deliberate quick diagnostic.
- Set a timer that permits careful reading plus the intended mental or written calculation. Confirm it against the sum of target times, while remembering only the session timer governs.
- Sample the stated competencies and difficulty deliberately. Do not duplicate the same calculation with superficial wording changes.
- Ensure each question has one deterministic numeric answer and can be solved without external or changing information.
- Recalculate every answer, tolerance, and explanation. A benchmark's validity does not make a wrong answer key acceptable.
- Make score-band titles descriptive rather than diagnostic of a person or institutionally consequential unless the benchmark has been formally validated for that use.

## Authoring quality check

- Exactly four unique band labels exist, begin at zero, and strictly increase.
- Every threshold is reachable or intentionally conservative for the question count.
- Question IDs are unique across every benchmark in the package.
- Nested answer units/scales and explanations match the expected typed value.
- The session timer is realistic and is not confused with question target times.
- The final response follows the Start Here binding output contract and is ready for app validation.
