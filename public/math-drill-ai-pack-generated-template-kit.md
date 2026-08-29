# Math Drill AI Pack Kit: Generated Templates

Kit revision: **2026-08-18**

Pair this module with `math-drill-ai-pack-authoring-start.md`. It covers only `kind: "generated_template"` packages.

## Canonical contract

- Format: `math-drill-question-pack`
- Schema version: `2`
- Kind: `generated_template`
- Required collection: `templates` (1 to 500)
- Canonical schema: `question-pack-v2.schema.json`
- Copy-ready standard example: `question-pack-template-example.mathdrill.json`
- Copy-ready Interview Math example: `question-pack-interview-math-example.mathdrill.json`

Use the standard example for ordinary generated math. Use the Interview Math example only when learners should select a setup, calculate, and interpret the result.

## Practical template pattern

A template needs `id`, category, 1 to 10 tags, 1 to 4 difficulty values, prompt template, variables, formula, and explanation template:

```json
{
  "id": "units-times-price",
  "category": "business_math",
  "tags": ["revenue", "multiplication"],
  "difficulty": ["beginner", "intermediate"],
  "promptTemplate": "A fictional shop sells {units} items at ${price} each. What is revenue?",
  "variables": {
    "units": { "type": "integer", "values": [100, 150, 200] },
    "price": { "type": "currency", "min": 8, "max": 12, "step": 2 }
  },
  "formula": { "expression": "units * price", "outputVariable": "revenue" },
  "answerUnit": "currency",
  "explanationTemplate": {
    "steps": ["Revenue equals units times price.", "{units} x ${price} = ${revenue}."]
  }
}
```

Place that object in the `templates` array of the shared version 2 envelope. The two canonical examples are complete importable packages.

## Variable and formula rules

Each template defines 1 to 20 case-sensitive variables. Variable names must be identifiers, and `answer`, `__proto__`, `constructor`, and `prototype` are reserved. Define each variable from exactly one source:

- `values`: 1 to 100 unique values; or
- a range with `min`, `max`, and optional positive `step`.

Variable types are `integer`, `decimal`, `percentage`, and `currency`. Integer values and range fields are whole numbers. A range has at most 10,001 reachable values. The default step is 1 for integer and 0.1 otherwise, but an explicit step is clearer.

Percentage variables are display numbers: use `25` when the prompt shows 25%, then use `rate / 100` in the formula. Variable `unit` is metadata and does not rescale the number.

Formula expressions allow only numeric literals, declared variables, parentheses, unary signs, and `+ - * / ^`. They do not allow functions, assignments, comparisons, commas, JavaScript, or a `%` operator. Every identifier must resolve. Every reachable combination must produce a finite number without division by zero.

Import checks up to 256 deterministic representative combinations, including boundaries and values near zero. This is bounded validation, not an exhaustive proof of a large Cartesian product. Test all risky denominators and sign boundaries yourself. The runtime surfaces an actionable package error if an unprobed combination fails.

## Placeholders and answers

Placeholders are exact, case-sensitive `{identifier}` tokens. Prompts, explanations, and Interview Math labels may reference declared variables. Explanations may also reference `{answer}` or `formula.outputVariable`. Do not put either answer token in a prompt.

Placeholders render raw stored values without commas, currency conversion, percent conversion, or scale formatting. Put visible signs or scale words around the token. The formula result becomes the answer directly. A percentage answer must return a fraction such as `0.25`; percentage points return a point count such as `5`.

Generated answers are exact apart from a tiny floating-point epsilon. This kind cannot define tolerance or rounding. Choose values that produce practical exact inputs; use `fixed_numeric` when an estimated or rounded answer must be accepted.

## Optional Interview Math

Either omit `caseStyle` from every template or include it on every template. An Interview Math pack requires `category: "case_math"` throughout.

`caseStyle` requires:

- `calculationStepCount`: 2 through 6;
- one supported industry;
- `interviewMath.expectedUnit` equal to `answerUnit`, or `none` when no answer unit is set;
- 2 to 10 unique equation choices, exactly one with `setupCorrect: true`, which must also have `formulaCorrect: true`;
- 2 to 10 unique interpretation choices, exactly one with `isCorrect: true`.

Other equation choices may recognize the formula while applying an incorrect setup. Choice labels can use valid variable placeholders and are shuffled locally.

## Authoring quality check

- There are enough distinct combinations for the largest likely drill, and duplicate variants are not the intended content.
- All prompt and explanation placeholders resolve exactly.
- Boundary, zero, negative, and exponent cases are safe and finite.
- The output unit matches the raw formula result.
- Interview Math is consistently enabled or absent across the entire pack.
- The final response follows the Start Here binding output contract and is ready for app validation.
